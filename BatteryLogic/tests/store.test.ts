import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBatteryStore } from '@/stores/battery'

vi.mock('@/composables/useIndexedDB', () => ({
  useIndexedDB: () => ({
    isReady: { value: true },
    saveSnapshot: vi.fn(),
    getSnapshots: vi.fn().mockResolvedValue([]),
    clearOldData: vi.fn(),
    saveAlarm: vi.fn(),
    getAlarms: vi.fn().mockResolvedValue([])
  })
}))

describe('BatteryStore 状态管理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初始化', () => {
    it('应该正确初始化电池包', () => {
      const store = useBatteryStore()
      expect(store.pack).not.toBeNull()
      expect(store.allCells.length).toBe(96)
    })

    it('应该有默认的阿伦尼乌斯参数', () => {
      const store = useBatteryStore()
      expect(store.arrheniusParams.activationEnergy).toBe(100000)
      expect(store.arrheniusParams.preExponentialFactor).toBe(1e10)
    })

    it('应该有默认的映射规则', () => {
      const store = useBatteryStore()
      expect(store.mappingRules.length).toBeGreaterThan(0)
    })

    it('初始状态下预测结果应该为空', () => {
      const store = useBatteryStore()
      expect(store.predictions.length).toBe(0)
      expect(store.propagationMap.size).toBe(0)
    })

    it('初始状态下不应该正在计算', () => {
      const store = useBatteryStore()
      expect(store.isCalculating).toBe(false)
      expect(store.calculationProgress).toBe(0)
    })
  })

  describe('电芯数据', () => {
    it('allCells 应该返回所有电芯', () => {
      const store = useBatteryStore()
      expect(store.allCells.length).toBe(96)
    })

    it('getCellById 应该返回正确的电芯', () => {
      const store = useBatteryStore()
      const cell = store.allCells[0]
      const foundCell = store.getCellById(cell.id)
      expect(foundCell?.id).toBe(cell.id)
    })

    it('getCellById 对于不存在的ID应该返回undefined', () => {
      const store = useBatteryStore()
      const cell = store.getCellById('non_existent')
      expect(cell).toBeUndefined()
    })

    it('getPredictionForCell 应该返回正确的预测', () => {
      const store = useBatteryStore()
      const cell = store.allCells[0]
      const prediction = store.getPredictionForCell(cell.id)
      expect(prediction).toBeUndefined()
    })
  })

  describe('统计数据', () => {
    it('stats 应该返回正确的统计数据', () => {
      const store = useBatteryStore()
      expect(store.stats).toHaveProperty('avgTemp')
      expect(store.stats).toHaveProperty('maxTemp')
      expect(store.stats).toHaveProperty('minTemp')
      expect(store.stats).toHaveProperty('avgVoltage')
      expect(store.stats).toHaveProperty('avgSoc')
    })

    it('overallStatus 应该根据状态返回正确的值', () => {
      const store = useBatteryStore()
      expect(['normal', 'warning', 'critical']).toContain(store.overallStatus)
    })
  })

  describe('告警功能', () => {
    it('初始状态下告警应该为空', () => {
      const store = useBatteryStore()
      expect(store.alarms.length).toBe(0)
    })

    it('应该能够确认告警', () => {
      const store = useBatteryStore()
      const alarmId = 'test_ack_alarm'
      
      store.alarms = [{
        id: alarmId,
        type: 'temperature',
        level: 'warning',
        message: '测试告警',
        cellId: 'test_cell',
        moduleId: 1,
        timestamp: Date.now(),
        acknowledged: false
      }]
      
      store.acknowledgeAlarm(alarmId)
      const alarm = store.alarms.find(a => a.id === alarmId)
      expect(alarm?.acknowledged).toBe(true)
      expect(alarm?.acknowledgedAt).toBeDefined()
    })

    it('unacknowledgedAlarms 应该只返回未确认的告警', () => {
      const store = useBatteryStore()
      store.alarms = []
      
      store.alarms.push({
        id: 'unack',
        type: 'temperature',
        level: 'warning',
        message: '未确认',
        cellId: 'test',
        moduleId: 1,
        timestamp: Date.now(),
        acknowledged: false
      })
      
      store.alarms.push({
        id: 'ack',
        type: 'temperature',
        level: 'warning',
        message: '已确认',
        cellId: 'test',
        moduleId: 1,
        timestamp: Date.now(),
        acknowledged: true
      })
      
      expect(store.unacknowledgedAlarms.length).toBe(1)
      expect(store.unacknowledgedAlarms[0].id).toBe('unack')
    })
  })

  describe('映射规则管理', () => {
    it('应该能够更新映射规则', () => {
      const store = useBatteryStore()
      const newRules = [
        {
          id: 'custom_rule',
          source: 'bms_cell_temp',
          target: 'fire_temperature_sensor',
          transformType: 'direct',
          enabled: true
        }
      ]
      
      store.updateMappingRules(newRules)
      expect(store.mappingRules.length).toBe(1)
      expect(store.mappingRules[0].id).toBe('custom_rule')
    })
  })

  describe('模拟控制', () => {
    it('startSimulation 应该启动模拟', () => {
      const store = useBatteryStore()
      store.startSimulation(100)
      expect(store.isSimulating).toBe(true)
      store.stopSimulation()
    })

    it('stopSimulation 应该停止模拟', () => {
      const store = useBatteryStore()
      store.startSimulation(100)
      store.stopSimulation()
      expect(store.isSimulating).toBe(false)
    })

    it('triggerThermalRunaway 应该设置热失控电芯', () => {
      const store = useBatteryStore()
      const cellId = store.allCells[0].id
      store.triggerThermalRunaway(cellId)
      expect(store.thermalRunawayCellId).toBe(cellId)
    })

    it('resetSimulation 应该重置所有状态', () => {
      const store = useBatteryStore()
      store.alarms = [{ id: 'test', type: 'temperature', level: 'warning', message: 'test', cellId: 'cell', moduleId: 1, timestamp: Date.now(), acknowledged: false }]
      store.predictions = [{ cellId: 'test', riskLevel: 'low', timeToRunaway: 3600, temperatureCurve: [], timePoints: [] }]
      
      store.resetSimulation()
      
      expect(store.isSimulating).toBe(false)
      expect(store.thermalRunawayCellId).toBeUndefined()
      expect(store.alarms.length).toBe(0)
      expect(store.predictions.length).toBe(0)
    })
  })

  describe('高风险预测', () => {
    it('highRiskPredictions 应该只返回高风险和极端风险', () => {
      const store = useBatteryStore()
      store.predictions = [
        { cellId: 'low', riskLevel: 'low', timeToRunaway: 3600, temperatureCurve: [], timePoints: [] },
        { cellId: 'medium', riskLevel: 'medium', timeToRunaway: 1800, temperatureCurve: [], timePoints: [] },
        { cellId: 'high', riskLevel: 'high', timeToRunaway: 600, temperatureCurve: [], timePoints: [] },
        { cellId: 'extreme', riskLevel: 'extreme', timeToRunaway: 60, temperatureCurve: [], timePoints: [] }
      ]
      
      expect(store.highRiskPredictions.length).toBe(2)
      expect(store.highRiskPredictions.map(p => p.cellId)).toContain('high')
      expect(store.highRiskPredictions.map(p => p.cellId)).toContain('extreme')
    })
  })

  describe('阿伦尼乌斯参数更新', () => {
    it('应该能够更新阿伦尼乌斯参数', () => {
      const store = useBatteryStore()
      store.updateArrheniusParams({ activationEnergy: 120000 })
      expect(store.arrheniusParams.activationEnergy).toBe(120000)
      expect(store.arrheniusParams.preExponentialFactor).toBe(1e10)
    })
  })
})
