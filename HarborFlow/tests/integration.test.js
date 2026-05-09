import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  InstructionType,
  InstructionStatus,
  DeviceStatus,
  DeviceType,
  instructionFlow,
  pathPlanner,
  deviceCache,
  dispatcher
} from '../src/core'

describe('HarborFlow Integration Tests', () => {
  let cleanupFunctions = []
  let dispatcherInitialized = false

  beforeEach(async () => {
    cleanupFunctions = []
    pathPlanner.clearQueue()
    pathPlanner.setObstacles([])
    
    if (!dispatcherInitialized) {
      await dispatcher.init()
      dispatcherInitialized = true
    }
  })

  afterEach(() => {
    cleanupFunctions.forEach(fn => fn())
    pathPlanner.clearQueue()
    pathPlanner.setObstacles([])
  })

  describe('Business Scenario 1: TOS Instruction Submission', () => {
    it('should submit instruction from TOS and notify instructionFlow listeners', () => {
      const events = []
      
      const unsub = instructionFlow.addListener('tos-received', (instr) => {
        events.push({ type: 'tos-received', instr })
      })
      cleanupFunctions.push(unsub)

      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-INT-001',
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 15, y: 15 },
        priority: 3,
        metadata: { origin: 'TOS-System-Test' }
      }

      const instruction = dispatcher.submitTOSInstruction(tosData)

      expect(instruction).toBeDefined()
      expect(instruction.id).toMatch(/^INSTR-/)
      expect(instruction.type).toBe(InstructionType.TRANSFER)
      expect(instruction.containerId).toBe('CNTR-INT-001')
      expect(instruction.status).toBe(InstructionStatus.PENDING)
      expect(instruction.priority).toBe(3)
      expect(instruction.metadata.origin).toBe('TOS-System-Test')

      expect(events.length).toBeGreaterThan(0)
      expect(events.find(e => e.type === 'tos-received')).toBeDefined()
    })

    it('should handle all instruction types', () => {
      const types = [
        InstructionType.LOAD,
        InstructionType.UNLOAD,
        InstructionType.TRANSFER,
        InstructionType.PARK
      ]

      types.forEach((type, index) => {
        const instruction = dispatcher.submitTOSInstruction({
          type,
          containerId: `CNTR-TYPE-${index}-${Date.now()}`,
          sourceLocation: { x: index, y: index },
          targetLocation: { x: index + 5, y: index + 5 }
        })

        expect(instruction.type).toBe(type)
        expect(instruction.status).toBe(InstructionStatus.PENDING)
      })
    })
  })

  describe('Business Scenario 2: AGV Selection', () => {
    it('should find best AGV based on distance and battery', async () => {
      await deviceCache.init()
      
      const testDevices = [
        { id: 'AGV-TEST-001', type: DeviceType.AGV, status: DeviceStatus.IDLE, position: { x: 0, y: 0 }, battery: 100 },
        { id: 'AGV-TEST-002', type: DeviceType.AGV, status: DeviceStatus.IDLE, position: { x: 10, y: 0 }, battery: 100 }
      ]

      for (const device of testDevices) {
        await deviceCache.saveDeviceStatus(device)
      }

      const instruction = {
        sourceLocation: { x: 2, y: 2 },
        targetLocation: { x: 15, y: 15 },
        priority: 3
      }

      const bestAGV = await dispatcher.findBestAGV(instruction)

      expect(bestAGV).toBeDefined()
      expect(bestAGV.status).toBe(DeviceStatus.IDLE)
    })
  })

  describe('Business Scenario 3: Path Planning Execution', () => {
    it('should calculate path from AGV to source location', async () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }

      const result = await pathPlanner.planPath(start, goal, 1)

      expect(result).toBeDefined()
      expect(result.path).not.toBeNull()
      expect(result.start).toEqual(start)
      expect(result.goal).toEqual(goal)
      expect(result.distance).toBeGreaterThan(0)
    })

    it('should calculate path from source to target location', async () => {
      const source = { x: 5, y: 5 }
      const target = { x: 10, y: 10 }

      const result = await pathPlanner.planPath(source, target, 1)

      expect(result).toBeDefined()
      expect(result.path).not.toBeNull()
      expect(result.start).toEqual(source)
      expect(result.goal).toEqual(target)
    })

    it('should handle path planning with obstacles', async () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 10, y: 0 }

      pathPlanner.setObstacles([
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 0 }
      ])

      const result = await pathPlanner.planPath(start, goal, 1)

      expect(result.path).not.toBeNull()
      expect(result.path[0]).toEqual(start)
      expect(result.path[result.path.length - 1]).toEqual(goal)
    })
  })

  describe('Business Scenario 4: Device Status Tracking', () => {
    it('should update device status when AGV is assigned', async () => {
      await deviceCache.init()
      
      const testDevice = {
        id: 'AGV-ASSIGN-002',
        type: DeviceType.AGV,
        status: DeviceStatus.IDLE,
        position: { x: 0, y: 0 },
        battery: 100
      }
      await deviceCache.saveDeviceStatus(testDevice)

      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-ASSIGN-002-${Date.now()}`,
        sourceLocation: { x: 5, y: 5 },
        targetLocation: { x: 15, y: 15 }
      })

      const assigned = await dispatcher.assignInstruction(instruction.id)

      expect(assigned.status).toBe(InstructionStatus.ASSIGNED)
      expect(assigned.assignedAgvId).toBeDefined()
    })

    it('should update device status when execution completes', async () => {
      await deviceCache.init()
      
      const testDevice = {
        id: 'AGV-COMPLETE-002',
        type: DeviceType.AGV,
        status: DeviceStatus.IDLE,
        position: { x: 0, y: 0 },
        battery: 100
      }
      await deviceCache.saveDeviceStatus(testDevice)

      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-COMPLETE-002-${Date.now()}`,
        sourceLocation: { x: 5, y: 5 },
        targetLocation: { x: 15, y: 15 }
      })

      const assigned = await dispatcher.assignInstruction(instruction.id)
      const completed = await dispatcher.completeExecution(instruction.id, true)

      expect(completed.status).toBe(InstructionStatus.COMPLETED)
      expect(completed.completedAt).toBeDefined()
    })
  })

  describe('Business Scenario 5: Priority Handling', () => {
    it('should prioritize high priority instructions when retrieving list', () => {
      const highPriority = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-PRIO-HIGH-${Date.now()}`,
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 5, y: 5 },
        priority: 5
      })

      const lowPriority = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-PRIO-LOW-${Date.now()}`,
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 10, y: 10 },
        priority: 1
      })

      const instructions = dispatcher.getInstructions()

      expect(instructions.length).toBeGreaterThan(0)
    })
  })

  describe('Business Scenario 6: Error Handling', () => {
    it('should handle instruction failures', () => {
      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-FAIL-002-${Date.now()}`,
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 5, y: 5 }
      })

      const failed = instructionFlow.completeInstruction(instruction, false)

      expect(failed.status).toBe(InstructionStatus.FAILED)
    })

    it('should handle instruction cancellation', () => {
      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-CANCEL-002-${Date.now()}`,
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 5, y: 5 }
      })

      const cancelled = instructionFlow.cancelInstruction(instruction)

      expect(cancelled.status).toBe(InstructionStatus.CANCELLED)
    })
  })

  describe('Business Scenario 7: System Integration', () => {
    it('should complete full instruction lifecycle', async () => {
      await deviceCache.init()

      const testDevice = {
        id: 'AGV-FULL-002',
        type: DeviceType.AGV,
        status: DeviceStatus.IDLE,
        position: { x: 0, y: 0 },
        battery: 100
      }
      await deviceCache.saveDeviceStatus(testDevice)

      const containerId = `CNTR-FULL-002-${Date.now()}`
      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId,
        sourceLocation: { x: 5, y: 5 },
        targetLocation: { x: 15, y: 15 },
        priority: 3
      })

      const allInstructions = dispatcher.getInstructions()
      expect(allInstructions.some(i => i.id === instruction.id)).toBe(true)

      const updatedInstruction = dispatcher.getInstruction(instruction.id)
      expect(updatedInstruction).toBeDefined()
      expect(updatedInstruction.containerId).toBe(containerId)
    })
  })

  describe('Business Scenario 8: Event Notification System', () => {
    it('should notify instructionFlow listeners of instruction events', () => {
      const events = []
      
      const unsub = instructionFlow.addListener('tos-received', (data) => {
        events.push({ type: 'tos-received', data })
      })
      cleanupFunctions.push(unsub)

      const instruction = dispatcher.submitTOSInstruction({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-EVENT-002-${Date.now()}`,
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 5, y: 5 }
      })

      expect(events.some(e => e.type === 'tos-received')).toBe(true)
    })
  })
})
