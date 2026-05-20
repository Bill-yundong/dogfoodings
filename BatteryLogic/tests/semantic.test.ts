import { describe, it, expect } from 'vitest'
import {
  BMS_TAGS,
  FIRE_TAGS,
  transformValue,
  generateFireControlSignals,
  getBmsTagLabel,
  getFireTagLabel,
  DEFAULT_MAPPING_RULES
} from '@/utils/semantic'
import type { CellData, MappingRule, ThermalRunawayPrediction } from '@/types'

describe('语义对齐引擎', () => {
  const testCells: CellData[] = [
    {
      id: 'cell_001',
      moduleId: 1,
      row: 0,
      col: 0,
      voltage: 3.7,
      temperature: 35,
      soc: 85,
      internalResistance: 2.5,
      status: 'normal',
      timestamp: Date.now()
    },
    {
      id: 'cell_002',
      moduleId: 1,
      row: 0,
      col: 1,
      voltage: 3.2,
      temperature: 120,
      soc: 60,
      internalResistance: 2.6,
      status: 'thermal_runaway',
      timestamp: Date.now()
    }
  ]

  const testPredictions: ThermalRunawayPrediction[] = [
    {
      cellId: 'cell_001',
      riskLevel: 'low',
      timeToRunaway: 3600,
      temperatureCurve: [35, 36, 37],
      timePoints: [0, 1, 2]
    },
    {
      cellId: 'cell_002',
      riskLevel: 'extreme',
      timeToRunaway: 60,
      temperatureCurve: [120, 150, 200],
      timePoints: [0, 1, 2]
    }
  ]

  describe('语义标签定义', () => {
    it('BMS标签应该包含必要的字段', () => {
      expect(BMS_TAGS.length).toBeGreaterThan(0)
      BMS_TAGS.forEach(tag => {
        expect(tag).toHaveProperty('id')
        expect(tag).toHaveProperty('label')
        expect(tag).toHaveProperty('dataType')
        expect(tag.domain).toBe('bms')
      })
    })

    it('消防标签应该包含必要的字段', () => {
      expect(FIRE_TAGS.length).toBeGreaterThan(0)
      FIRE_TAGS.forEach(tag => {
        expect(tag).toHaveProperty('id')
        expect(tag).toHaveProperty('label')
        expect(tag).toHaveProperty('dataType')
        expect(tag.domain).toBe('fire')
      })
    })

    it('BMS标签应该包含温度、电压等关键指标', () => {
      const tagIds = BMS_TAGS.map(t => t.id)
      expect(tagIds).toContain('bms_cell_temp')
      expect(tagIds).toContain('bms_cell_voltage')
      expect(tagIds).toContain('bms_pack_current')
    })

    it('消防标签应该包含探测器、灭火装置等设备', () => {
      const tagIds = FIRE_TAGS.map(t => t.id)
      expect(tagIds).toContain('fire_smoke_detector')
      expect(tagIds).toContain('fire_temperature_sensor')
      expect(tagIds).toContain('fire_extinguisher_status')
    })

    it('应该有默认的映射规则', () => {
      expect(DEFAULT_MAPPING_RULES.length).toBeGreaterThan(0)
    })
  })

  describe('值转换', () => {
    it('直接转换应该返回原值', () => {
      const rule: MappingRule = {
        id: 'test_rule',
        source: 'bms_cell_temp',
        target: 'fire_temperature_sensor',
        transformType: 'direct',
        enabled: true
      }
      
      expect(transformValue(50, rule)).toBe(50)
    })

    it('阈值转换应该根据阈值返回动作', () => {
      const rule: MappingRule = {
        id: 'test_rule',
        source: 'bms_cell_temp',
        target: 'fire_fan_status',
        transformType: 'threshold',
        transformConfig: {
          threshold: 50,
          aboveAction: true,
          belowAction: false
        },
        enabled: true
      }
      
      expect(transformValue(60, rule)).toBe(true)
      expect(transformValue(40, rule)).toBe(false)
    })

    it('阈值转换应该支持多阈值配置', () => {
      const rule: MappingRule = {
        id: 'test_rule',
        source: 'bms_thermal_runaway_prediction',
        target: 'fire_extinguisher_status',
        transformType: 'threshold',
        transformConfig: {
          thresholds: [
            { value: 'high', action: 'standby' },
            { value: 'extreme', action: 'activate' }
          ]
        },
        enabled: true
      }
      
      expect(transformValue('extreme', rule)).toBe('activate')
    })

    it('线性转换应该正确计算', () => {
      const rule: MappingRule = {
        id: 'test_rule',
        source: 'bms_cell_temp',
        target: 'fire_temperature_sensor',
        transformType: 'linear',
        transformConfig: {
          slope: 2,
          intercept: 0
        },
        enabled: true
      }
      
      expect(transformValue(50, rule)).toBe(100)
    })
  })

  describe('消防控制信号生成', () => {
    it('应该为高温电芯生成报警信号', () => {
      const signals = generateFireControlSignals(testCells, testPredictions, DEFAULT_MAPPING_RULES)
      expect(signals.length).toBeGreaterThan(0)
      
      const tempSignals = signals.filter(s => s.target === 'fire_temperature_sensor')
      expect(tempSignals.length).toBeGreaterThan(0)
    })

    it('信号应该包含必要的字段', () => {
      const signals = generateFireControlSignals(testCells, testPredictions, DEFAULT_MAPPING_RULES)
      signals.forEach(signal => {
        expect(signal).toHaveProperty('id')
        expect(signal).toHaveProperty('target')
        expect(signal).toHaveProperty('action')
        expect(signal).toHaveProperty('value')
        expect(signal).toHaveProperty('timestamp')
        expect(signal).toHaveProperty('level')
      })
    })

    it('高风险预测应该触发更高优先级的信号', () => {
      const signals = generateFireControlSignals(testCells, testPredictions, DEFAULT_MAPPING_RULES)
      const criticalSignals = signals.filter(s => s.level === 'critical')
      expect(criticalSignals.length).toBeGreaterThan(0)
    })

    it('空预测应该也能生成信号', () => {
      const signals = generateFireControlSignals(testCells, [], DEFAULT_MAPPING_RULES)
      expect(Array.isArray(signals)).toBe(true)
    })
  })

  describe('标签查询', () => {
    it('应该正确返回BMS标签名称', () => {
      expect(getBmsTagLabel('bms_cell_temp')).toBe('电芯温度')
      expect(getBmsTagLabel('unknown')).toBe('unknown')
    })

    it('应该正确返回消防标签名称', () => {
      expect(getFireTagLabel('fire_smoke_detector')).toBe('烟雾探测器')
      expect(getFireTagLabel('unknown')).toBe('unknown')
    })
  })

  describe('映射规则', () => {
    it('默认规则应该都是启用的', () => {
      const enabledRules = DEFAULT_MAPPING_RULES.filter(r => r.enabled)
      expect(enabledRules.length).toBe(DEFAULT_MAPPING_RULES.length)
    })

    it('规则应该有正确的源和目标标签', () => {
      const bmsIds = new Set(BMS_TAGS.map(t => t.id))
      const fireIds = new Set(FIRE_TAGS.map(t => t.id))
      
      DEFAULT_MAPPING_RULES.forEach(rule => {
        expect(bmsIds.has(rule.source)).toBe(true)
        expect(fireIds.has(rule.target)).toBe(true)
      })
    })
  })
})
