import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InstructionType, InstructionStatus } from '../src/core/types'
import { instructionFlow } from '../src/core/instructionFlow'

describe('Instruction Flow System', () => {
  let cleanupFunctions = []

  beforeEach(() => {
    cleanupFunctions = []
  })

  afterEach(() => {
    cleanupFunctions.forEach(fn => fn())
  })

  describe('Instruction Creation', () => {
    it('should create instruction from TOS data with all required fields', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0001',
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 10, y: 10 },
        priority: 3,
        metadata: { origin: 'TOS-System-A' }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)

      expect(instruction).toBeDefined()
      expect(instruction.id).toMatch(/^INSTR-\d+-\w+$/)
      expect(instruction.type).toBe(InstructionType.TRANSFER)
      expect(instruction.containerId).toBe('CNTR-0001')
      expect(instruction.sourceLocation).toEqual({ x: 0, y: 0 })
      expect(instruction.targetLocation).toEqual({ x: 10, y: 10 })
      expect(instruction.priority).toBe(3)
      expect(instruction.status).toBe(InstructionStatus.PENDING)
      expect(instruction.createdAt).toBeDefined()
      expect(instruction.updatedAt).toBeDefined()
      expect(instruction.metadata.origin).toBe('TOS-System-A')
    })

    it('should create unique IDs for each instruction', () => {
      const tosData = {
        type: InstructionType.LOAD,
        containerId: 'CNTR-0002',
        sourceLocation: { x: 1, y: 1 },
        targetLocation: { x: 5, y: 5 }
      }

      const instr1 = instructionFlow.createInstructionFromTOS(tosData)
      const instr2 = instructionFlow.createInstructionFromTOS(tosData)

      expect(instr1.id).not.toBe(instr2.id)
    })

    it('should set default priority to 1 when not provided', () => {
      const tosData = {
        type: InstructionType.UNLOAD,
        containerId: 'CNTR-0003',
        sourceLocation: { x: 2, y: 2 },
        targetLocation: { x: 8, y: 8 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      expect(instruction.priority).toBe(1)
    })

    it('should create empty metadata object when not provided', () => {
      const tosData = {
        type: InstructionType.PARK,
        containerId: 'CNTR-0004',
        sourceLocation: { x: 3, y: 3 },
        targetLocation: { x: 3, y: 3 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      expect(instruction.metadata).toEqual({})
    })
  })

  describe('Instruction Status Transitions', () => {
    it('should assign instruction to AGV and update status', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0010',
        sourceLocation: { x: 0, y: 0 },
        targetLocation: { x: 15, y: 15 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-001')

      expect(assigned.assignedAgvId).toBe('AGV-001')
      expect(assigned.status).toBe(InstructionStatus.ASSIGNED)
      expect(assigned.updatedAt).toBeDefined()
      expect(assigned.updatedAt).toBeGreaterThanOrEqual(instruction.createdAt)
    })

    it('should start execution and update timing fields', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0011',
        sourceLocation: { x: 1, y: 1 },
        targetLocation: { x: 16, y: 16 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-002')
      const started = instructionFlow.startExecution(assigned)

      expect(started.status).toBe(InstructionStatus.EXECUTING)
      expect(started.startedAt).toBeDefined()
    })

    it('should complete instruction successfully', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0012',
        sourceLocation: { x: 2, y: 2 },
        targetLocation: { x: 17, y: 17 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-003')
      const started = instructionFlow.startExecution(assigned)
      const completed = instructionFlow.completeInstruction(started, true)

      expect(completed.status).toBe(InstructionStatus.COMPLETED)
      expect(completed.completedAt).toBeDefined()
    })

    it('should mark instruction as failed', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0013',
        sourceLocation: { x: 3, y: 3 },
        targetLocation: { x: 18, y: 18 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-004')
      const started = instructionFlow.startExecution(assigned)
      const failed = instructionFlow.completeInstruction(started, false)

      expect(failed.status).toBe(InstructionStatus.FAILED)
      expect(failed.completedAt).toBeDefined()
    })

    it('should cancel instruction', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0014',
        sourceLocation: { x: 4, y: 4 },
        targetLocation: { x: 19, y: 19 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const cancelled = instructionFlow.cancelInstruction(instruction)

      expect(cancelled.status).toBe(InstructionStatus.CANCELLED)
      expect(cancelled.updatedAt).toBeDefined()
    })
  })

  describe('Event Listener System', () => {
    it('should notify listeners when instruction is received from TOS', () => {
      const listener = vi.fn()
      const unsubscribe = instructionFlow.addListener('tos-received', listener)
      cleanupFunctions.push(unsubscribe)

      const tosData = {
        type: InstructionType.LOAD,
        containerId: 'CNTR-0020',
        sourceLocation: { x: 5, y: 5 },
        targetLocation: { x: 10, y: 10 }
      }

      instructionFlow.createInstructionFromTOS(tosData)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'CNTR-0020',
          status: InstructionStatus.PENDING
        })
      )
    })

    it('should notify listeners when AGV is assigned', () => {
      const listener = vi.fn()
      const unsubscribe = instructionFlow.addListener('agv-assigned', listener)
      cleanupFunctions.push(unsubscribe)

      const tosData = {
        type: InstructionType.UNLOAD,
        containerId: 'CNTR-0021',
        sourceLocation: { x: 6, y: 6 },
        targetLocation: { x: 11, y: 11 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      instructionFlow.assignToAGV(instruction, 'AGV-005')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedAgvId: 'AGV-005',
          status: InstructionStatus.ASSIGNED
        })
      )
    })

    it('should notify listeners when execution starts', () => {
      const listener = vi.fn()
      const unsubscribe = instructionFlow.addListener('execution-started', listener)
      cleanupFunctions.push(unsubscribe)

      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0022',
        sourceLocation: { x: 7, y: 7 },
        targetLocation: { x: 12, y: 12 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-006')
      instructionFlow.startExecution(assigned)

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should notify listeners when execution completes', () => {
      const listener = vi.fn()
      const unsubscribe = instructionFlow.addListener('execution-completed', listener)
      cleanupFunctions.push(unsubscribe)

      const tosData = {
        type: InstructionType.PARK,
        containerId: 'CNTR-0023',
        sourceLocation: { x: 8, y: 8 },
        targetLocation: { x: 13, y: 13 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-007')
      const started = instructionFlow.startExecution(assigned)
      instructionFlow.completeInstruction(started, true)

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should remove listener when unsubscribe is called', () => {
      const listener = vi.fn()
      const unsubscribe = instructionFlow.addListener('tos-received', listener)

      const tosData1 = {
        type: InstructionType.LOAD,
        containerId: 'CNTR-0024',
        sourceLocation: { x: 9, y: 9 },
        targetLocation: { x: 14, y: 14 }
      }
      instructionFlow.createInstructionFromTOS(tosData1)

      unsubscribe()

      const tosData2 = {
        type: InstructionType.LOAD,
        containerId: 'CNTR-0025',
        sourceLocation: { x: 10, y: 10 },
        targetLocation: { x: 15, y: 15 }
      }
      instructionFlow.createInstructionFromTOS(tosData2)

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Instruction History', () => {
    it('should track all state changes in history', () => {
      const tosData = {
        type: InstructionType.TRANSFER,
        containerId: 'CNTR-0030',
        sourceLocation: { x: 1, y: 1 },
        targetLocation: { x: 5, y: 5 }
      }

      const instruction = instructionFlow.createInstructionFromTOS(tosData)
      const assigned = instructionFlow.assignToAGV(instruction, 'AGV-008')
      const started = instructionFlow.startExecution(assigned)
      instructionFlow.completeInstruction(started, true)

      const history = instructionFlow.getInstructionHistory(instruction.id)

      expect(history.length).toBe(4)
      expect(history[0].status).toBe(InstructionStatus.PENDING)
      expect(history[1].status).toBe(InstructionStatus.ASSIGNED)
      expect(history[2].status).toBe(InstructionStatus.EXECUTING)
      expect(history[3].status).toBe(InstructionStatus.COMPLETED)
    })
  })
})
