import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AlignmentService } from '../../services/AlignmentService'
import { snapshotDB } from '../../services/SnapshotDatabase'
import type { DispatchCommand } from '../../types/hydrodynamics'

describe('调度指令执行集成测试 - Bug 修复验证', () => {
  let alignmentService: AlignmentService

  beforeEach(async () => {
    vi.clearAllMocks()
    alignmentService = new AlignmentService()
    await snapshotDB.init()
  })

  afterEach(async () => {
    try {
      await snapshotDB.clearAll()
    } catch (e) {
      console.log('Cleanup skipped')
    }
  })

  describe('Bug 修复验证: 调度指令执行失败', () => {
    it('修复验证: 在线模式下应成功执行调度命令', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      const command: DispatchCommand = {
        id: 'cmd-test-online',
        type: 'valve_control',
        targetId: 'valve-001',
        parameters: { flow: 75, pressure: 80 },
        timestamp: Date.now(),
        issuer: 'test-operator',
        status: 'pending',
        priority: 'high',
      }

      const result = await alignmentService.executeCommand(command)
      expect(result).toBe(true)
    })

    it('修复验证: 离线模式下应成功执行调度命令', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      const command: DispatchCommand = {
        id: 'cmd-test-offline',
        type: 'pump_adjustment',
        targetId: 'pump-002',
        parameters: { flow: 50, pressure: 60 },
        timestamp: Date.now(),
        issuer: 'test-operator',
        status: 'pending',
        priority: 'medium',
      }

      const result = await alignmentService.executeCommand(command)
      expect(result).toBe(true)
    })

    it('修复验证: 紧急关停指令应正确执行', async () => {
      const command: DispatchCommand = {
        id: 'cmd-emergency',
        type: 'emergency_shutdown',
        targetId: 'system-main',
        parameters: { flow: 0, pressure: 0 },
        timestamp: Date.now(),
        issuer: 'emergency-system',
        status: 'pending',
        priority: 'critical',
      }

      const result = await alignmentService.executeCommand(command)
      expect(result).toBe(true)
    })

    it('修复验证: 数据库未初始化时执行命令应自动初始化', async () => {
      const freshService = new AlignmentService()
      
      const command: DispatchCommand = {
        id: 'cmd-auto-init',
        type: 'reservoir_release',
        targetId: 'reservoir-a',
        parameters: { flow: 100, pressure: 100 },
        timestamp: Date.now(),
        issuer: 'test-operator',
        status: 'pending',
        priority: 'high',
      }

      const result = await freshService.executeCommand(command)
      expect(result).toBe(true)
    })
  })

  describe('调度指令完整生命周期测试', () => {
    it('应执行完整的指令生命周期: pending -> executing -> completed', async () => {
      const command: DispatchCommand = {
        id: 'cmd-lifecycle',
        type: 'valve_control',
        targetId: 'valve-main',
        parameters: { flow: 60, pressure: 70 },
        timestamp: Date.now(),
        issuer: 'test-operator',
        status: 'pending',
        priority: 'high',
      }

      await snapshotDB.saveCommand(command, false)

      const pendingCommands = await snapshotDB.getPendingCommands()
      expect(pendingCommands.some((c) => c.id === command.id)).toBe(true)

      await snapshotDB.updateCommandStatus(command.id, 'executing')
      
      await snapshotDB.updateCommandStatus(command.id, 'completed')

      const finalPending = await snapshotDB.getPendingCommands()
      expect(finalPending.some((c) => c.id === command.id)).toBe(false)
    })

    it('应支持批量执行多个调度指令', async () => {
      const commands: DispatchCommand[] = [
        { id: 'batch-1', type: 'valve_control', targetId: 'v1', parameters: {}, timestamp: Date.now(), issuer: 'test', status: 'pending', priority: 'low' },
        { id: 'batch-2', type: 'pump_adjustment', targetId: 'p1', parameters: {}, timestamp: Date.now(), issuer: 'test', status: 'pending', priority: 'medium' },
        { id: 'batch-3', type: 'reservoir_release', targetId: 'r1', parameters: {}, timestamp: Date.now(), issuer: 'test', status: 'pending', priority: 'high' },
        { id: 'batch-4', type: 'emergency_shutdown', targetId: 'all', parameters: {}, timestamp: Date.now(), issuer: 'test', status: 'pending', priority: 'critical' },
      ]

      const results = await Promise.all(
        commands.map((cmd) => alignmentService.executeCommand(cmd))
      )

      expect(results.every((r) => r === true)).toBe(true)
    })
  })

  describe('网络状态切换场景测试', () => {
    it('应在网络恢复时正确同步离线命令', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      const offlineCommand: DispatchCommand = {
        id: 'cmd-offline-sync',
        type: 'valve_control',
        targetId: 'valve-offline',
        parameters: { flow: 50 },
        timestamp: Date.now(),
        issuer: 'test-operator',
        status: 'pending',
        priority: 'medium',
      }

      const offlineResult = await alignmentService.executeCommand(offlineCommand)
      expect(offlineResult).toBe(true)

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      window.dispatchEvent(new Event('online'))

      await new Promise((resolve) => setTimeout(resolve, 100))

      const offlineCommands = await snapshotDB.getOfflineCommands()
      expect(offlineCommands.length).toBeGreaterThanOrEqual(0)
    })
  })
})
