import { describe, it, expect } from 'vitest'
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

describe('Core Module Index', () => {
  describe('Type Exports', () => {
    it('should export all instruction types', () => {
      expect(InstructionType).toBeDefined()
      expect(InstructionType.LOAD).toBe('LOAD')
      expect(InstructionType.UNLOAD).toBe('UNLOAD')
      expect(InstructionType.TRANSFER).toBe('TRANSFER')
      expect(InstructionType.PARK).toBe('PARK')
    })

    it('should export all instruction statuses', () => {
      expect(InstructionStatus).toBeDefined()
      expect(InstructionStatus.PENDING).toBe('PENDING')
      expect(InstructionStatus.QUEUED).toBe('QUEUED')
      expect(InstructionStatus.ASSIGNED).toBe('ASSIGNED')
      expect(InstructionStatus.EXECUTING).toBe('EXECUTING')
      expect(InstructionStatus.COMPLETED).toBe('COMPLETED')
      expect(InstructionStatus.FAILED).toBe('FAILED')
      expect(InstructionStatus.CANCELLED).toBe('CANCELLED')
    })

    it('should export all device statuses', () => {
      expect(DeviceStatus).toBeDefined()
      expect(DeviceStatus.IDLE).toBe('IDLE')
      expect(DeviceStatus.MOVING).toBe('MOVING')
      expect(DeviceStatus.LOADING).toBe('LOADING')
      expect(DeviceStatus.UNLOADING).toBe('UNLOADING')
      expect(DeviceStatus.CHARGING).toBe('CHARGING')
      expect(DeviceStatus.MAINTENANCE).toBe('MAINTENANCE')
      expect(DeviceStatus.ERROR).toBe('ERROR')
    })

    it('should export all device types', () => {
      expect(DeviceType).toBeDefined()
      expect(DeviceType.AGV).toBe('AGV')
      expect(DeviceType.RTG).toBe('RTG')
      expect(DeviceType.STS).toBe('STS')
    })
  })

  describe('Service Singletons', () => {
    it('should export instructionFlow singleton', () => {
      expect(instructionFlow).toBeDefined()
      expect(typeof instructionFlow.createInstructionFromTOS).toBe('function')
      expect(typeof instructionFlow.assignToAGV).toBe('function')
      expect(typeof instructionFlow.startExecution).toBe('function')
      expect(typeof instructionFlow.completeInstruction).toBe('function')
      expect(typeof instructionFlow.addListener).toBe('function')
      expect(typeof instructionFlow.getInstructionHistory).toBe('function')
    })

    it('should export pathPlanner singleton', () => {
      expect(pathPlanner).toBeDefined()
      expect(typeof pathPlanner.setObstacles).toBe('function')
      expect(typeof pathPlanner.addObstacle).toBe('function')
      expect(typeof pathPlanner.removeObstacle).toBe('function')
      expect(typeof pathPlanner.isWalkable).toBe('function')
      expect(typeof pathPlanner.findPathSync).toBe('function')
      expect(typeof pathPlanner.planPath).toBe('function')
      expect(typeof pathPlanner.addListener).toBe('function')
      expect(typeof pathPlanner.getQueueSize).toBe('function')
      expect(typeof pathPlanner.clearQueue).toBe('function')
    })

    it('should export deviceCache singleton', () => {
      expect(deviceCache).toBeDefined()
      expect(typeof deviceCache.init).toBe('function')
      expect(typeof deviceCache.saveDeviceStatus).toBe('function')
      expect(typeof deviceCache.getDeviceStatus).toBe('function')
      expect(typeof deviceCache.getAllDevices).toBe('function')
      expect(typeof deviceCache.getDevicesByType).toBe('function')
      expect(typeof deviceCache.getDevicesByStatus).toBe('function')
      expect(typeof deviceCache.getDeviceSnapshots).toBe('function')
      expect(typeof deviceCache.addListener).toBe('function')
    })

    it('should export dispatcher singleton', () => {
      expect(dispatcher).toBeDefined()
      expect(typeof dispatcher.init).toBe('function')
      expect(typeof dispatcher.submitTOSInstruction).toBe('function')
      expect(typeof dispatcher.findBestAGV).toBe('function')
      expect(typeof dispatcher.assignInstruction).toBe('function')
      expect(typeof dispatcher.planAndExecute).toBe('function')
      expect(typeof dispatcher.completeExecution).toBe('function')
      expect(typeof dispatcher.getInstructions).toBe('function')
      expect(typeof dispatcher.getInstruction).toBe('function')
      expect(typeof dispatcher.getAllDevices).toBe('function')
      expect(typeof dispatcher.getPathPlannerQueueSize).toBe('function')
      expect(typeof dispatcher.addListener).toBe('function')
    })
  })
})
