import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticAlignmentService } from '../../src/services/semanticAlignmentService'
import { DataSimulationService } from '../../src/services/dataSimulationService'
import type { SensorData, NormalizedData } from '../../src/types'

describe('SemanticAlignmentService', () => {
  let service: SemanticAlignmentService
  let simulationService: DataSimulationService

  beforeEach(() => {
    service = SemanticAlignmentService.getInstance()
    simulationService = DataSimulationService.getInstance()
    simulationService.resetBaseValues()
  })

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = SemanticAlignmentService.getInstance()
      const instance2 = SemanticAlignmentService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('传感器信息获取', () => {
    it('应该能够获取已配置的传感器信息', () => {
      const sensorInfo = service.getSensorInfo('SG-001')
      expect(sensorInfo).toBeDefined()
      expect(sensorInfo?.id).toBe('SG-001')
      expect(sensorInfo?.type).toBe('strain_gauge')
    })

    it('对于不存在的传感器应返回undefined', () => {
      const sensorInfo = service.getSensorInfo('NONEXISTENT')
      expect(sensorInfo).toBeUndefined()
    })
  })

  describe('语义键生成', () => {
    it('应该生成正确的语义键', () => {
      const key = service.getSemanticKey('strain_gauge', 'main_girder')
      expect(key).toBe('strain_gauge_main_girder')
    })
  })

  describe('健康状态判定', () => {
    it('应该正确判定正常状态', () => {
      const status = service.determineHealthStatus(50, {
        warning: 100,
        danger: 200,
        critical: 300
      })
      expect(status).toBe('normal')
    })

    it('应该正确判定警告状态', () => {
      const status = service.determineHealthStatus(150, {
        warning: 100,
        danger: 200,
        critical: 300
      })
      expect(status).toBe('warning')
    })

    it('应该正确判定危险状态', () => {
      const status = service.determineHealthStatus(250, {
        warning: 100,
        danger: 200,
        critical: 300
      })
      expect(status).toBe('danger')
    })

    it('应该正确判定紧急状态', () => {
      const status = service.determineHealthStatus(350, {
        warning: 100,
        danger: 200,
        critical: 300
      })
      expect(status).toBe('critical')
    })

    it('应该使用绝对值进行判定', () => {
      const status = service.determineHealthStatus(-150, {
        warning: 100,
        danger: 200,
        critical: 300
      })
      expect(status).toBe('warning')
    })
  })

  describe('运维中枢语义对齐', () => {
    it('应该将传感器数据转换为运维中枢格式', () => {
      const rawData = simulationService.generateSensorData('SG-001', Date.now())!
      const normalized = service.normalizeForSystem(rawData, 'operation_center')

      expect(normalized.sensorId).toBe(rawData.sensorId)
      expect(normalized.semanticType).toBeDefined()
      expect(normalized.value).toBe(rawData.value)
      expect(normalized.unit).toBeDefined()
      expect(normalized.healthStatus).toBeDefined()
      expect(normalized.recommendations).toBeDefined()
      expect(Array.isArray(normalized.recommendations)).toBe(true)
    })

    it('运维中枢应该有运维视角的语义描述', () => {
      const rawData = simulationService.generateSensorData('SG-001', Date.now())!
      const normalized = service.normalizeForSystem(rawData, 'operation_center')

      expect(normalized.semanticType).toContain('监测')
    })
  })

  describe('应急指挥系统语义对齐', () => {
    it('应该将传感器数据转换为应急指挥系统格式', () => {
      const rawData = simulationService.generateSensorData('SG-001', Date.now())!
      const normalized = service.normalizeForSystem(rawData, 'emergency_command')

      expect(normalized.sensorId).toBe(rawData.sensorId)
      expect(normalized.semanticType).toBeDefined()
      expect(normalized.healthStatus).toBeDefined()
      expect(normalized.recommendations).toBeDefined()
    })

    it('应急指挥系统应该有应急视角的语义描述', () => {
      const rawData = simulationService.generateSensorData('SG-001', Date.now())!
      const normalized = service.normalizeForSystem(rawData, 'emergency_command')

      expect(normalized.semanticType).toMatch(/异常|预警|警报/)
    })
  })

  describe('批量数据转换', () => {
    it('应该能够批量转换传感器数据', () => {
      const rawDataList = simulationService.generateAllSensorData(Date.now())
      const normalizedList = service.normalizeBatchForSystem(rawDataList, 'operation_center')

      expect(normalizedList.length).toBe(rawDataList.length)
      normalizedList.forEach(normalized => {
        expect(normalized.sensorId).toBeDefined()
        expect(normalized.semanticType).toBeDefined()
      })
    })

    it('批量转换应该支持两种系统类型', () => {
      const rawDataList = simulationService.generateAllSensorData(Date.now())

      const operationCenterList = service.normalizeBatchForSystem(rawDataList, 'operation_center')
      const emergencyList = service.normalizeBatchForSystem(rawDataList, 'emergency_command')

      expect(operationCenterList.length).toBe(rawDataList.length)
      expect(emergencyList.length).toBe(rawDataList.length)

      // 两种系统的语义描述应该不同
      const ocTypes = operationCenterList.map(n => n.semanticType)
      const ecTypes = emergencyList.map(n => n.semanticType)

      // 至少有一些语义类型是不同的
      const hasDifference = ocTypes.some((type, idx) => type !== ecTypes[idx])
      expect(hasDifference).toBe(true)
    })
  })

  describe('健康分数计算', () => {
    it('应该能够计算整体健康分数', () => {
      const rawDataList = simulationService.generateAllSensorData(Date.now())
      const normalizedList = service.normalizeBatchForSystem(rawDataList, 'operation_center')
      const score = service.calculateHealthScore(normalizedList)

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('空数据应该返回100分', () => {
      const score = service.calculateHealthScore([])
      expect(score).toBe(100)
    })
  })

  describe('状态强调信息', () => {
    it('应该为运维中枢返回正确的强调信息', () => {
      const emphasis = service.getStatusEmphasis('normal', 'operation_center')
      expect(emphasis.level).toBe('正常')
      expect(emphasis.color).toBe('#00ff88')
      expect(emphasis.priority).toBe(4)
    })

    it('应该为应急指挥返回正确的强调信息', () => {
      const emphasis = service.getStatusEmphasis('critical', 'emergency_command')
      expect(emphasis.level).toBe('紧急')
      expect(emphasis.color).toBe('#ff0000')
      expect(emphasis.priority).toBe(1)
    })

    it('不同健康状态应该有正确的优先级', () => {
      const normalPriority = service.getStatusEmphasis('normal', 'operation_center').priority
      const warningPriority = service.getStatusEmphasis('warning', 'operation_center').priority
      const dangerPriority = service.getStatusEmphasis('danger', 'operation_center').priority
      const criticalPriority = service.getStatusEmphasis('critical', 'operation_center').priority

      expect(normalPriority).toBeGreaterThan(warningPriority)
      expect(warningPriority).toBeGreaterThan(dangerPriority)
      expect(dangerPriority).toBeGreaterThan(criticalPriority)
    })
  })

  describe('应力计算', () => {
    it('应该能够从应变计算应力', () => {
      const strain = 100e-6
      const stress = service.calculateStressFromStrain(strain)
      expect(typeof stress).toBe('number')
      expect(stress).toBe(20e6)
    })

    it('应该支持自定义弹性模量', () => {
      const strain = 100e-6
      const elasticModulus = 100e9
      const stress = service.calculateStressFromStrain(strain, elasticModulus)
      expect(stress).toBe(10e6)
    })
  })
})
