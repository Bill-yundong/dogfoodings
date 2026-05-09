import { InstructionStatus } from './types'

class InstructionFlow {
  constructor() {
    this.listeners = new Map()
    this.instructionHistory = []
  }

  generateId() {
    return `INSTR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  createInstructionFromTOS(tosData) {
    const instruction = {
      id: this.generateId(),
      type: tosData.type,
      containerId: tosData.containerId,
      sourceLocation: tosData.sourceLocation,
      targetLocation: tosData.targetLocation,
      priority: tosData.priority || 1,
      status: InstructionStatus.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: tosData.metadata || {}
    }
    this.instructionHistory.push({ ...instruction })
    this.notifyListeners('tos-received', instruction)
    return instruction
  }

  assignToAGV(instruction, agvId) {
    const updated = {
      ...instruction,
      assignedAgvId: agvId,
      status: InstructionStatus.ASSIGNED,
      updatedAt: Date.now()
    }
    this.instructionHistory.push({ ...updated })
    this.notifyListeners('agv-assigned', updated)
    return updated
  }

  startExecution(instruction) {
    const updated = {
      ...instruction,
      status: InstructionStatus.EXECUTING,
      startedAt: Date.now(),
      updatedAt: Date.now()
    }
    this.instructionHistory.push({ ...updated })
    this.notifyListeners('execution-started', updated)
    return updated
  }

  completeInstruction(instruction, success = true) {
    const updated = {
      ...instruction,
      status: success ? InstructionStatus.COMPLETED : InstructionStatus.FAILED,
      completedAt: Date.now(),
      updatedAt: Date.now()
    }
    this.instructionHistory.push({ ...updated })
    this.notifyListeners('execution-completed', updated)
    return updated
  }

  cancelInstruction(instruction) {
    const updated = {
      ...instruction,
      status: InstructionStatus.CANCELLED,
      updatedAt: Date.now()
    }
    this.instructionHistory.push({ ...updated })
    this.notifyListeners('cancelled', updated)
    return updated
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
          console.error(`Error in listener for ${eventType}:`, e)
        }
      })
    }
  }

  getInstructionHistory(instructionId) {
    return this.instructionHistory.filter(i => i.id === instructionId)
  }
}

export const instructionFlow = new InstructionFlow()
