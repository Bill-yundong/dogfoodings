import { describe, it, expect } from 'vitest'
import {
  synchronizer,
  useSyncStatus,
  createDieSyncState,
} from './sync'
import { DieHealthRecord } from '../types'
import { createEmptyStressAccumulation } from './fatigue'

describe('SemanticSynchronizer', () => {
  describe('初始化', () => {
    it('应正确初始化同步器', () => {
      expect(synchronizer).toBeDefined()
      expect(synchronizer.syncStatus()).toBeDefined()
    })

    it('初始同步状态应为空闲', () => {
      const status = synchronizer.syncStatus()
      expect(status.syncState).toBe('idle')
      expect(status.lastSyncTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('useSyncStatus', () => {
    it('应返回同步状态信号', () => {
      const status = useSyncStatus()
      expect(status).toBeDefined()
      expect(status().syncState).toBeDefined()
    })
  })

  describe('createDieSyncState', () => {
    it('应创建模具同步状态', () => {
      const testDie: DieHealthRecord = {
        id: 'test_die',
        name: '测试模具',
        model: 'CR12MOV-001',
        installDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        currentHealth: 80,
        predictedRemainingLife: 100,
        failureProbability: 0.1,
        stressAccumulation: createEmptyStressAccumulation(),
        sensorIds: ['sensor_001'],
        maintenanceHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const { record, setRecord } = createDieSyncState(testDie)
      
      expect(record).toBeDefined()
      expect(record().id).toBe('test_die')
      expect(setRecord).toBeDefined()
    })

    it('应能更新模具记录', () => {
      const testDie: DieHealthRecord = {
        id: 'test_die_2',
        name: '测试模具',
        model: 'CR12MOV-001',
        installDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        currentHealth: 80,
        predictedRemainingLife: 100,
        failureProbability: 0.1,
        stressAccumulation: createEmptyStressAccumulation(),
        sensorIds: ['sensor_001'],
        maintenanceHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const { record, setRecord } = createDieSyncState(testDie)
      
      setRecord({ ...testDie, currentHealth: 60 })
      
      expect(record().currentHealth).toBe(60)
    })
  })

  describe('订阅机制', () => {
    it('应能订阅和取消订阅', () => {
      let received = false
      
      const unsubscribe = synchronizer.subscribe('test', () => {
        received = true
      })
      
      expect(unsubscribe).toBeTypeOf('function')
      unsubscribe()
    })
  })
})
