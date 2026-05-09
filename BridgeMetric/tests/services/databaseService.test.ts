import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DatabaseService } from '../../src/services/databaseService'
import type { HealthRecord, DailyHealthReport, SensorData } from '../../src/types'

// 模拟 indexedDB
const mockIDBDatabase = {
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true),
    length: 4
  },
  transaction: vi.fn(),
  close: vi.fn(),
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn()
}

const mockObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  openCursor: vi.fn(),
  createIndex: vi.fn()
}

const mockTransaction = {
  objectStore: vi.fn().mockReturnValue(mockObjectStore),
  complete: vi.fn(),
  oncomplete: null as any,
  onerror: null as any,
  abort: vi.fn()
}

const indexedDB = {
  open: vi.fn().mockImplementation(() => ({
    onsuccess: null as any,
    onerror: null as any,
    onupgradeneeded: null as any,
    result: mockIDBDatabase
  })),
  deleteDatabase: vi.fn()
}

vi.stubGlobal('indexedDB', indexedDB)

describe('DatabaseService', () => {
  let service: DatabaseService

  beforeEach(async () => {
    vi.clearAllMocks()
    mockIDBDatabase.transaction = vi.fn().mockReturnValue(mockTransaction)
    mockObjectStore.add = vi.fn().mockReturnValue({ onsuccess: null, onerror: null })
    mockObjectStore.put = vi.fn().mockReturnValue({ onsuccess: null, onerror: null })
    mockObjectStore.count = vi.fn().mockReturnValue({ onsuccess: () => {}, onerror: null, result: 0 })
    mockTransaction.complete = vi.fn()
    
    service = DatabaseService.getInstance()
    await service.init()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = DatabaseService.getInstance()
      const instance2 = DatabaseService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('数据库初始化', () => {
    it('应该能够初始化数据库', async () => {
      const db = await service.init()
      expect(db).toBeDefined()
      expect(indexedDB.open).toHaveBeenCalled()
    })

    it('应该创建必要的对象存储', async () => {
      await service.init()
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('healthRecords', expect.any(Object))
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('dailyReports', expect.any(Object))
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('rawSensorData', expect.any(Object))
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('bridgePoses', expect.any(Object))
    })
  })

  describe('健康记录操作', () => {
    it('应该能够添加单条健康记录', async () => {
      const record: HealthRecord = {
        id: 'test-record-1',
        timestamp: Date.now(),
        sensorId: 'SG-001',
        sensorType: 'strain_gauge',
        structureType: 'main_girder',
        value: 100,
        unit: 'με',
        healthStatus: 'normal',
        threshold: { warning: 100, danger: 200, critical: 300 }
      }

      await service.addHealthRecord(record)
      expect(mockObjectStore.add).toHaveBeenCalledWith(record)
    })

    it('应该能够批量添加健康记录', async () => {
      const records: HealthRecord[] = [
        {
          id: 'test-1',
          timestamp: Date.now(),
          sensorId: 'SG-001',
          sensorType: 'strain_gauge',
          structureType: 'main_girder',
          value: 100,
          unit: 'με',
          healthStatus: 'normal',
          threshold: { warning: 100, danger: 200, critical: 300 }
        },
        {
          id: 'test-2',
          timestamp: Date.now(),
          sensorId: 'SG-002',
          sensorType: 'strain_gauge',
          structureType: 'main_girder',
          value: 150,
          unit: 'με',
          healthStatus: 'warning',
          threshold: { warning: 100, danger: 200, critical: 300 }
        }
      ]

      await service.addHealthRecords(records)
      expect(mockObjectStore.add).toHaveBeenCalledTimes(2)
    })
  })

  describe('日报操作', () => {
    it('应该能够添加日报', async () => {
      const report: DailyHealthReport = {
        date: '2024-01-01',
        bridgeId: 'bridge-001',
        averageHealthScore: 85,
        sensorCount: 7,
        anomalyCount: 2,
        criticalAlerts: 0,
        topConcerns: []
      }

      await service.addDailyReport(report)
      expect(mockObjectStore.put).toHaveBeenCalledWith(report)
    })
  })

  describe('数据库统计', () => {
    it('应该能够获取数据库统计信息', async () => {
      const stats = await service.getDatabaseStats()

      expect(stats).toHaveProperty('healthRecordCount')
      expect(stats).toHaveProperty('rawDataCount')
      expect(stats).toHaveProperty('reportCount')
      expect(stats.healthRecordCount).toBe(0)
    })
  })

  describe('数据清理', () => {
    it('应该能够清理旧数据', async () => {
      const deletedCount = await service.cleanOldData(30)
      expect(typeof deletedCount).toBe('number')
    })
  })
})
