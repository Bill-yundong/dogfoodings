import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initDB,
  closeDB,
  saveDieRecord,
  getDieRecord,
  getAllDieRecords,
  updateDieHealth,
  deleteDieRecord,
  batchSaveDieRecords,
  getDieCount,
  getDiesPaginated,
  saveMaintenanceRecord,
  getMaintenanceRecordsByDieId,
  saveCycles,
  getCyclesByDieId,
  enqueueSyncItem,
  getSyncQueue,
  removeFromSyncQueue,
  clearAllData,
  getDieRecordsByHealthRange,
} from './index'
import { DieHealthRecord, createEmptyStressAccumulation } from '../utils/fatigue'

describe('IndexedDB 模具健康档案库', () => {
  beforeEach(async () => {
    await initDB()
  })

  afterEach(async () => {
    await clearAllData()
    await closeDB()
  })

  const createTestDie = (id: string, health: number = 80): DieHealthRecord => ({
    id,
    name: `测试模具 ${id}`,
    model: 'CR12MOV-001',
    installDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastMaintenanceDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    currentHealth: health,
    predictedRemainingLife: 100,
    failureProbability: 0.1,
    stressAccumulation: createEmptyStressAccumulation(),
    sensorIds: ['sensor_001'],
    maintenanceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  describe('基础CRUD操作', () => {
    it('应保存并读取单个模具记录', async () => {
      const die = createTestDie('die_1')
      await saveDieRecord(die)
      
      const retrieved = await getDieRecord('die_1')
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('die_1')
      expect(retrieved?.name).toBe('测试模具 die_1')
    })

    it('应返回所有模具记录', async () => {
      await saveDieRecord(createTestDie('die_1'))
      await saveDieRecord(createTestDie('die_2'))
      await saveDieRecord(createTestDie('die_3'))
      
      const allDies = await getAllDieRecords()
      
      expect(allDies).toHaveLength(3)
    })

    it('应更新模具健康状态', async () => {
      const die = createTestDie('die_1', 80)
      await saveDieRecord(die)
      
      await updateDieHealth('die_1', {
        currentHealth: 60,
        predictedRemainingLife: 50,
        failureProbability: 0.3,
      })
      
      const updated = await getDieRecord('die_1')
      
      expect(updated?.currentHealth).toBe(60)
      expect(updated?.predictedRemainingLife).toBe(50)
      expect(updated?.failureProbability).toBe(0.3)
    })

    it('应删除模具记录', async () => {
      await saveDieRecord(createTestDie('die_1'))
      
      await deleteDieRecord('die_1')
      
      const retrieved = await getDieRecord('die_1')
      
      expect(retrieved).toBeUndefined()
    })

    it('应批量保存模具记录', async () => {
      const dies = [
        createTestDie('batch_1'),
        createTestDie('batch_2'),
        createTestDie('batch_3'),
      ]
      
      await batchSaveDieRecords(dies)
      
      const allDies = await getAllDieRecords()
      expect(allDies).toHaveLength(3)
    })
  })

  describe('查询功能', () => {
    it('应返回正确的模具数量', async () => {
      await saveDieRecord(createTestDie('die_1'))
      await saveDieRecord(createTestDie('die_2'))
      
      const count = await getDieCount()
      
      expect(count).toBe(2)
    })

    it('应按健康度范围查询模具', async () => {
      await saveDieRecord(createTestDie('die_health_1', 90))
      await saveDieRecord(createTestDie('die_health_2', 60))
      await saveDieRecord(createTestDie('die_health_3', 30))
      
      const healthyDies = await getDieRecordsByHealthRange(70, 100)
      const mediumDies = await getDieRecordsByHealthRange(40, 70)
      const criticalDies = await getDieRecordsByHealthRange(0, 40)
      
      expect(healthyDies).toHaveLength(1)
      expect(healthyDies[0].currentHealth).toBe(90)
      expect(mediumDies).toHaveLength(1)
      expect(criticalDies).toHaveLength(1)
    })

    it('应分页获取模具', async () => {
      for (let i = 0; i < 10; i++) {
        await saveDieRecord(createTestDie(`paginate_${i}`))
      }
      
      const page1 = await getDiesPaginated(0, 3)
      const page2 = await getDiesPaginated(3, 3)
      
      expect(page1).toHaveLength(3)
      expect(page2).toHaveLength(3)
    })
  })

  describe('维护记录', () => {
    it('应保存并读取维护记录', async () => {
      const die = createTestDie('die_maintenance')
      await saveDieRecord(die)
      
      const maintenanceRecord = {
        id: 'maint_1',
        dieId: 'die_maintenance',
        type: 'repair' as const,
        date: Date.now(),
        description: '测试维修',
        technician: '测试人员',
        cost: 1000,
      }
      
      await saveMaintenanceRecord(maintenanceRecord)
      
      const records = await getMaintenanceRecordsByDieId('die_maintenance')
      
      expect(records).toHaveLength(1)
      expect(records[0].description).toBe('测试维修')
    })

    it('应按模具ID查询维护记录', async () => {
      await saveDieRecord(createTestDie('die_1'))
      await saveDieRecord(createTestDie('die_2'))
      
      await saveMaintenanceRecord({
        id: 'maint_1',
        dieId: 'die_1',
        type: 'inspection' as const,
        date: Date.now(),
        description: '检查1',
        technician: '人员A',
        cost: 0,
      })
      
      await saveMaintenanceRecord({
        id: 'maint_2',
        dieId: 'die_1',
        type: 'repair' as const,
        date: Date.now(),
        description: '维修1',
        technician: '人员B',
        cost: 500,
      })
      
      const records = await getMaintenanceRecordsByDieId('die_1')
      const emptyRecords = await getMaintenanceRecordsByDieId('die_2')
      
      expect(records).toHaveLength(2)
      expect(emptyRecords).toHaveLength(0)
    })
  })

  describe('雨流循环存储', () => {
    it('应保存并读取雨流循环数据', async () => {
      const die = createTestDie('die_cycles')
      await saveDieRecord(die)
      
      const cycles = [
        { range: 500, mean: 100, count: 1, startIndex: 0, endIndex: 1 },
        { range: 300, mean: 50, count: 2, startIndex: 1, endIndex: 2 },
      ]
      
      await saveCycles('die_cycles', cycles)
      
      const retrievedCycles = await getCyclesByDieId('die_cycles')
      
      expect(retrievedCycles).toHaveLength(2)
    })

    it('应限制返回的循环数量', async () => {
      const die = createTestDie('die_cycles_limit')
      await saveDieRecord(die)
      
      for (let i = 0; i < 10; i++) {
        await saveCycles('die_cycles_limit', [
          { range: 100 + i * 50, mean: 0, count: 1, startIndex: i, endIndex: i + 1 },
        ])
      }
      
      const limitedCycles = await getCyclesByDieId('die_cycles_limit', 3)
      
      expect(limitedCycles.length).toBeLessThanOrEqual(3)
    })
  })

  describe('同步队列', () => {
    it('应添加同步项到队列', async () => {
      await enqueueSyncItem('test_type', { data: 'test' })
      
      const queue = await getSyncQueue()
      
      expect(queue).toHaveLength(1)
      expect(queue[0].type).toBe('test_type')
    })

    it('应从队列中移除同步项', async () => {
      await enqueueSyncItem('to_remove', { data: 'remove_me' })
      
      const queueBefore = await getSyncQueue()
      expect(queueBefore).toHaveLength(1)
      
      await removeFromSyncQueue(queueBefore[0].id)
      
      const queueAfter = await getSyncQueue()
      expect(queueAfter).toHaveLength(0)
    })

    it('应保留多个同步项', async () => {
      await enqueueSyncItem('type1', {})
      await enqueueSyncItem('type2', {})
      await enqueueSyncItem('type3', {})
      
      const queue = await getSyncQueue()
      
      expect(queue).toHaveLength(3)
    })
  })

  describe('数据清理', () => {
    it('应清空所有数据', async () => {
      await saveDieRecord(createTestDie('die_1'))
      await saveDieRecord(createTestDie('die_2'))
      await enqueueSyncItem('test', {})
      
      await clearAllData()
      
      const dies = await getAllDieRecords()
      const queue = await getSyncQueue()
      
      expect(dies).toHaveLength(0)
      expect(queue).toHaveLength(0)
    })
  })

  describe('并发操作', () => {
    it('应处理连续的保存操作', async () => {
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(saveDieRecord(createTestDie(`concurrent_${i}`)))
      }
      
      await Promise.all(promises)
      
      const count = await getDieCount()
      expect(count).toBe(5)
    })
  })
})
