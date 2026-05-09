import { describe, it, expect } from 'vitest'
import { InstructionType, InstructionStatus, DeviceStatus, DeviceType } from '../src/core/types'

describe('Core Types Module', () => {
  describe('InstructionType', () => {
    it('should define all instruction types', () => {
      expect(InstructionType.LOAD).toBe('LOAD')
      expect(InstructionType.UNLOAD).toBe('UNLOAD')
      expect(InstructionType.TRANSFER).toBe('TRANSFER')
      expect(InstructionType.PARK).toBe('PARK')
    })

    it('should have 4 instruction types', () => {
      const types = Object.keys(InstructionType)
      expect(types.length).toBe(4)
    })
  })

  describe('InstructionStatus', () => {
    it('should define all instruction statuses', () => {
      expect(InstructionStatus.PENDING).toBe('PENDING')
      expect(InstructionStatus.QUEUED).toBe('QUEUED')
      expect(InstructionStatus.ASSIGNED).toBe('ASSIGNED')
      expect(InstructionStatus.EXECUTING).toBe('EXECUTING')
      expect(InstructionStatus.COMPLETED).toBe('COMPLETED')
      expect(InstructionStatus.FAILED).toBe('FAILED')
      expect(InstructionStatus.CANCELLED).toBe('CANCELLED')
    })

    it('should have 7 instruction statuses', () => {
      const statuses = Object.keys(InstructionStatus)
      expect(statuses.length).toBe(7)
    })
  })

  describe('DeviceStatus', () => {
    it('should define all device statuses', () => {
      expect(DeviceStatus.IDLE).toBe('IDLE')
      expect(DeviceStatus.MOVING).toBe('MOVING')
      expect(DeviceStatus.LOADING).toBe('LOADING')
      expect(DeviceStatus.UNLOADING).toBe('UNLOADING')
      expect(DeviceStatus.CHARGING).toBe('CHARGING')
      expect(DeviceStatus.MAINTENANCE).toBe('MAINTENANCE')
      expect(DeviceStatus.ERROR).toBe('ERROR')
    })

    it('should have 7 device statuses', () => {
      const statuses = Object.keys(DeviceStatus)
      expect(statuses.length).toBe(7)
    })
  })

  describe('DeviceType', () => {
    it('should define all device types', () => {
      expect(DeviceType.AGV).toBe('AGV')
      expect(DeviceType.RTG).toBe('RTG')
      expect(DeviceType.STS).toBe('STS')
    })

    it('should have 3 device types', () => {
      const types = Object.keys(DeviceType)
      expect(types.length).toBe(3)
    })
  })
})
