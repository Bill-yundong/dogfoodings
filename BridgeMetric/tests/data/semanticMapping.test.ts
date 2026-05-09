import { describe, it, expect } from 'vitest'
import { sensorTypeLabels, structureTypeLabels, semanticMapping, recommendationRules } from '../../src/data/semanticMapping'

describe('semanticMapping', () => {
  describe('传感器类型标签', () => {
    it('应该包含所有传感器类型的中英文标签', () => {
      expect(sensorTypeLabels.strain_gauge).toBeDefined()
      expect(sensorTypeLabels.strain_gauge.cn).toBe('应变片')
      expect(sensorTypeLabels.strain_gauge.en).toBe('Strain Gauge')

      expect(sensorTypeLabels.displacement).toBeDefined()
      expect(sensorTypeLabels.displacement.cn).toBe('位移传感器')

      expect(sensorTypeLabels.acceleration).toBeDefined()
      expect(sensorTypeLabels.acceleration.cn).toBe('加速度传感器')

      expect(sensorTypeLabels.temperature).toBeDefined()
      expect(sensorTypeLabels.temperature.cn).toBe('温度传感器')
    })
  })

  describe('结构类型标签', () => {
    it('应该包含所有结构类型的中英文标签', () => {
      expect(structureTypeLabels.main_girder).toBeDefined()
      expect(structureTypeLabels.main_girder.cn).toBe('主梁')

      expect(structureTypeLabels.pier).toBeDefined()
      expect(structureTypeLabels.pier.cn).toBe('桥墩')

      expect(structureTypeLabels.cable).toBeDefined()
      expect(structureTypeLabels.cable.cn).toBe('拉索')

      expect(structureTypeLabels.deck).toBeDefined()
      expect(structureTypeLabels.deck.cn).toBe('桥面')

      expect(structureTypeLabels.bearing).toBeDefined()
      expect(structureTypeLabels.bearing.cn).toBe('支座')
    })
  })

  describe('语义映射', () => {
    it('运维中枢应该包含完整的语义映射', () => {
      const mapping = semanticMapping.operationCenter
      
      // 主梁相关映射
      expect(mapping['strain_gauge_main_girder']).toBe('主梁应力监测')
      expect(mapping['displacement_main_girder']).toBe('主梁挠度监测')
      expect(mapping['acceleration_main_girder']).toBe('主梁振动监测')
      expect(mapping['temperature_main_girder']).toBe('主梁温度监测')

      // 桥墩相关映射
      expect(mapping['strain_gauge_pier']).toBe('桥墩应力监测')
      expect(mapping['displacement_pier']).toBe('桥墩位移监测')

      // 拉索相关映射
      expect(mapping['strain_gauge_cable']).toBe('拉索张力监测')

      // 桥面相关映射
      expect(mapping['strain_gauge_deck']).toBe('桥面应力监测')

      // 支座相关映射
      expect(mapping['strain_gauge_bearing']).toBe('支座受力监测')
    })

    it('应急指挥应该包含完整的语义映射', () => {
      const mapping = semanticMapping.emergencyCommand
      
      // 应急映射应该有预警/警报语义
      expect(mapping['strain_gauge_main_girder']).toContain('异常')
      expect(mapping['strain_gauge_pier']).toContain('预警')
      expect(mapping['displacement_main_girder']).toContain('警报')
    })

    it('运维中枢和应急指挥的语义描述应该有区别', () => {
      const operationKey = 'strain_gauge_main_girder'
      
      expect(semanticMapping.operationCenter[operationKey]).not.toBe(
        semanticMapping.emergencyCommand[operationKey]
      )
    })
  })

  describe('建议规则', () => {
    it('应该包含所有健康状态的建议', () => {
      expect(recommendationRules.normal).toBeDefined()
      expect(recommendationRules.warning).toBeDefined()
      expect(recommendationRules.danger).toBeDefined()
      expect(recommendationRules.critical).toBeDefined()
    })

    it('正常状态应该有积极建议', () => {
      expect(recommendationRules.normal.length).toBeGreaterThan(0)
      expect(recommendationRules.normal).toContain('继续常规监测')
    })

    it('警告状态应该有检查建议', () => {
      expect(recommendationRules.warning.length).toBeGreaterThan(0)
      expect(recommendationRules.warning).toContain('增加监测频率')
    })

    it('危险状态应该有应急建议', () => {
      expect(recommendationRules.danger.length).toBeGreaterThan(0)
      expect(recommendationRules.danger).toContain('启动应急监测预案')
    })

    it('紧急状态应该有紧急响应建议', () => {
      expect(recommendationRules.critical.length).toBeGreaterThan(0)
      expect(recommendationRules.critical).toContain('启动紧急响应程序')
      expect(recommendationRules.critical).toContain('疏散人员')
    })
  })
})
