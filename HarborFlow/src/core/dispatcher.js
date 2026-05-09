import { instructionFlow } from './instructionFlow'
import { pathPlanner } from './pathPlanner'
import { deviceCache } from './deviceCache'
import { InstructionStatus, DeviceStatus, DeviceType } from './types'

class Dispatcher {
  constructor() {
    this.instructions = new Map()
    this.listeners = new Map()
    this.isRunning = false
  }

  async init() {
    await deviceCache.init()
    const existingDevices = await deviceCache.getAllDevices()
    if (existingDevices.length === 0) {
      await deviceCache.createInitialDevices()
    }

    instructionFlow.addListener('tos-received', (instr) => {
      this.instructions.set(instr.id, instr)
      this.notifyListeners('instruction-added', instr)
    })

    instructionFlow.addListener('agv-assigned', (instr) => {
      this.instructions.set(instr.id, instr)
      this.notifyListeners('instruction-updated', instr)
    })

    instructionFlow.addListener('execution-started', (instr) => {
      this.instructions.set(instr.id, instr)
      this.notifyListeners('instruction-updated', instr)
    })

    instructionFlow.addListener('execution-completed', (instr) => {
      this.instructions.set(instr.id, instr)
      this.notifyListeners('instruction-updated', instr)
    })

    pathPlanner.addListener('task-completed', (result) => {
      this.notifyListeners('path-planned', result)
    })

    pathPlanner.addListener('task-failed', (result) => {
      this.notifyListeners('path-failed', result)
    })
  }

  submitTOSInstruction(tosData) {
    return instructionFlow.createInstructionFromTOS(tosData)
  }

  async findBestAGV(instruction) {
    const allDevices = await deviceCache.getAllDevices()
    const idleAGVs = allDevices.filter(
      d => d.type === DeviceType.AGV && 
           d.status === DeviceStatus.IDLE &&
           d.battery > 20
    )

    if (idleAGVs.length === 0) {
      return null
    }

    let bestAGV = null
    let bestScore = Infinity

    for (const agv of idleAGVs) {
      const distance = Math.abs(agv.position.x - instruction.sourceLocation.x) +
                       Math.abs(agv.position.y - instruction.sourceLocation.y)
      
      const batteryScore = (100 - agv.battery) / 100
      const score = distance + batteryScore * 10

      if (score < bestScore) {
        bestScore = score
        bestAGV = agv
      }
    }

    return bestAGV
  }

  async assignInstruction(instructionId) {
    const instruction = this.instructions.get(instructionId)
    if (!instruction) {
      throw new Error(`Instruction ${instructionId} not found`)
    }

    const bestAGV = await this.findBestAGV(instruction)
    if (!bestAGV) {
      throw new Error('No available AGV found')
    }

    const updatedInstruction = instructionFlow.assignToAGV(instruction, bestAGV.id)

    await deviceCache.saveDeviceStatus({
      ...bestAGV,
      status: DeviceStatus.MOVING,
      currentTask: updatedInstruction.id
    })

    return updatedInstruction
  }

  async planAndExecute(instructionId) {
    const instruction = this.instructions.get(instructionId)
    if (!instruction) {
      throw new Error(`Instruction ${instructionId} not found`)
    }

    if (!instruction.assignedAgvId) {
      throw new Error(`Instruction ${instructionId} not assigned to any AGV`)
    }

    const agv = await deviceCache.getDeviceStatus(instruction.assignedAgvId)

    const pathToSource = await pathPlanner.planPath(
      agv.position,
      instruction.sourceLocation,
      instruction.priority
    )

    const pathToTarget = await pathPlanner.planPath(
      instruction.sourceLocation,
      instruction.targetLocation,
      instruction.priority
    )

    this.notifyListeners('path-calculated', {
      instructionId: instruction.id,
      pathToSource: pathToSource.path,
      pathToTarget: pathToTarget.path,
      totalDistance: pathToSource.distance + pathToTarget.distance
    })

    instructionFlow.startExecution(instruction)

    return {
      pathToSource,
      pathToTarget
    }
  }

  async completeExecution(instructionId, success = true) {
    const instruction = this.instructions.get(instructionId)
    if (!instruction) {
      throw new Error(`Instruction ${instructionId} not found`)
    }

    const updatedInstruction = instructionFlow.completeInstruction(instruction, success)

    if (instruction.assignedAgvId) {
      const agv = await deviceCache.getDeviceStatus(instruction.assignedAgvId)
      await deviceCache.saveDeviceStatus({
        ...agv,
        status: DeviceStatus.IDLE,
        currentTask: null,
        battery: Math.max(0, agv.battery - 5)
      })
    }

    return updatedInstruction
  }

  getInstructions() {
    return Array.from(this.instructions.values()).sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      return b.createdAt - a.createdAt
    })
  }

  getInstruction(instructionId) {
    return this.instructions.get(instructionId)
  }

  async getAllDevices() {
    return deviceCache.getAllDevices()
  }

  getPathPlannerQueueSize() {
    return pathPlanner.getQueueSize()
  }

  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType).add(callback)
    return () => {
      this.listeners.get(eventType).delete(callback)
    }
  }

  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in dispatcher listener for ${eventType}:`, e)
        }
      })
    }
  }
}

export const dispatcher = new Dispatcher()
