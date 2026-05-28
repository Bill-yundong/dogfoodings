import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataSyncService } from '../services/dataSync'
import type { Device } from '../types'

vi.mock('../services/database', () => ({
  dbService: {
    saveDevice: vi.fn().mockResolvedValue(undefined),
    getDevices: vi.fn().mockResolvedValue([]),
    getSkinScans: vi.fn().mockResolvedValue([])
  }
}))

describe('数据同步服务 - 智能硬件/诊断系统/护理终端实时数据对齐', () => {
  let syncService: DataSyncService

  beforeEach(() => {
    syncService = new DataSyncService()
  })

  describe('设备连接管理 (PRD: 设备管理页-设备连接)', () => {
    it('应成功连接已注册设备并返回 true', async () => {
      const result = await syncService.connect('device-001')
      expect(result).toBe(true)
    })

    it('连接设备后状态应从 connecting 变为 idle', async () => {
      const statusChanges: string[] = []
      syncService.on('statusChange', (status: unknown) => {
        statusChanges.push(status as string)
      })
      await syncService.connect('device-001')
      expect(statusChanges).toContain('connecting')
      expect(statusChanges).toContain('idle')
    })

    it('连接设备时应触发 deviceConnected 事件', async () => {
      let connectedDevice: Device | undefined
      syncService.on('deviceConnected', (device: unknown) => {
        connectedDevice = device as Device
      })
      await syncService.connect('device-001')
      expect(connectedDevice).toBeDefined()
      expect(connectedDevice!.id).toBe('device-001')
      expect(connectedDevice!.status).toBe('connected')
    })

    it('连接后设备 lastSync 应更新为当前时间', async () => {
      const before = Date.now()
      let connectedDevice: Device | undefined
      syncService.on('deviceConnected', (device: unknown) => {
        connectedDevice = device as Device
      })
      await syncService.connect('device-001')
      const after = Date.now()
      expect(new Date(connectedDevice!.lastSync).getTime()).toBeGreaterThanOrEqual(before)
      expect(new Date(connectedDevice!.lastSync).getTime()).toBeLessThanOrEqual(after)
    })

    it('连接不存在的设备不应抛出错误', async () => {
      const result = await syncService.connect('device-999')
      expect(result).toBe(true)
    })
  })

  describe('设备断开连接 (PRD: 设备管理页-设备列表)', () => {
    it('应成功断开已连接设备', async () => {
      await syncService.connect('device-001')
      await syncService.disconnect('device-001')
    })

    it('断开连接应触发 deviceDisconnected 事件', async () => {
      let disconnectedId: string | undefined
      syncService.on('deviceDisconnected', (id: unknown) => {
        disconnectedId = id as string
      })
      await syncService.disconnect('device-001')
      expect(disconnectedId).toBe('device-001')
    })

    it('断开后设备状态应变为 disconnected', async () => {
      await syncService.connect('device-001')
      await syncService.disconnect('device-001')
      const devices = syncService.getDevices()
      const device = devices.find(d => d.id === 'device-001')
      expect(device!.status).toBe('disconnected')
    })
  })

  describe('数据同步流程 (PRD: 智能硬件采集→数据实时对齐)', () => {
    it('同步应依次经历 syncing → idle 状态', async () => {
      const statusChanges: string[] = []
      syncService.on('statusChange', (status: unknown) => {
        statusChanges.push(status as string)
      })
      await syncService.syncData()
      expect(statusChanges).toContain('syncing')
      expect(statusChanges[statusChanges.length - 1]).toBe('idle')
    })

    it('同步应触发进度事件 0→100', async () => {
      const progressValues: number[] = []
      syncService.on('syncProgress', (progress: unknown) => {
        progressValues.push(progress as number)
      })
      await syncService.syncData()
      expect(progressValues[0]).toBe(0)
      expect(progressValues[progressValues.length - 1]).toBe(100)
      expect(progressValues.length).toBe(11)
    })

    it('同步完成应触发 syncComplete 事件', async () => {
      let completed = false
      syncService.on('syncComplete', () => {
        completed = true
      })
      await syncService.syncData()
      expect(completed).toBe(true)
    })

    it('同步后状态应恢复为 idle', async () => {
      await syncService.syncData()
      expect(syncService.getStatus()).toBe('idle')
    })
  })

  describe('WebSocket 实时通信 (PRD: 诊断系统与护理终端实时对齐)', () => {
    it('应能创建 WebSocket 连接', () => {
      syncService.connectWebSocket('ws://localhost:8080')
    })

    it('WebSocket open 应触发 wsConnected 事件', () => {
      let wsConnected = false
      syncService.on('wsConnected', () => {
        wsConnected = true
      })
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      ws.onopen()
      expect(wsConnected).toBe(true)
    })

    it('WebSocket 收到消息应触发 wsData 事件', () => {
      let receivedData: unknown
      syncService.on('wsData', (data: unknown) => {
        receivedData = data
      })
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      ws.onmessage({ data: JSON.stringify({ type: 'scan', value: 42 }) })
      expect(receivedData).toEqual({ type: 'scan', value: 42 })
    })

    it('WebSocket 错误应触发 wsError 事件', () => {
      let errorFired = false
      syncService.on('wsError', () => {
        errorFired = true
      })
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      ws.onerror(new Event('error'))
      expect(errorFired).toBe(true)
    })

    it('WebSocket 关闭应触发 wsClosed 事件', () => {
      let closed = false
      syncService.on('wsClosed', () => {
        closed = true
      })
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      ws.onclose()
      expect(closed).toBe(true)
    })

    it('sendData 应在 WebSocket OPEN 时发送 JSON 数据', () => {
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      syncService.sendData({ type: 'command', action: 'scan' })
      expect(ws.send).toHaveBeenCalledWith('{"type":"command","action":"scan"}')
    })
  })

  describe('事件订阅/取消机制', () => {
    it('on 应注册事件回调', () => {
      let received = false
      syncService.on('testEvent', () => { received = true })
      ;(syncService as any).emit('testEvent')
      expect(received).toBe(true)
    })

    it('off 应取消事件回调', () => {
      let received = false
      const callback = () => { received = true }
      syncService.on('testEvent', callback)
      syncService.off('testEvent', callback)
      ;(syncService as any).emit('testEvent')
      expect(received).toBe(false)
    })

    it('同一事件应支持多个回调', () => {
      let count = 0
      syncService.on('multiEvent', () => { count++ })
      syncService.on('multiEvent', () => { count++ })
      ;(syncService as any).emit('multiEvent')
      expect(count).toBe(2)
    })
  })

  describe('设备列表查询 (PRD: 设备管理页-设备列表)', () => {
    it('应返回内置的模拟设备列表', () => {
      const devices = syncService.getDevices()
      expect(devices.length).toBe(2)
      expect(devices.find(d => d.id === 'device-001')).toBeDefined()
      expect(devices.find(d => d.id === 'device-002')).toBeDefined()
    })

    it('设备类型应包含 scanner 和 analyzer', () => {
      const devices = syncService.getDevices()
      const types = devices.map(d => d.type)
      expect(types).toContain('scanner')
      expect(types).toContain('analyzer')
    })

    it('初始设备状态应为 disconnected', () => {
      const devices = syncService.getDevices()
      devices.forEach(d => {
        expect(d.status).toBe('disconnected')
      })
    })
  })

  describe('close 资源释放', () => {
    it('关闭时应关闭 WebSocket 连接', () => {
      syncService.connectWebSocket('ws://localhost:8080')
      const ws = (syncService as any).ws
      syncService.close()
      expect(ws.close).toHaveBeenCalled()
    })

    it('关闭时应清空所有事件监听器', () => {
      let received = false
      syncService.on('testEvent', () => { received = true })
      syncService.close()
      ;(syncService as any).emit('testEvent')
      expect(received).toBe(false)
    })
  })
})
