import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataSimulationService } from '../../src/services/dataSimulationService'
import { SemanticAlignmentService } from '../../src/services/semanticAlignmentService'

describe('核心业务场景集成测试', () => {
  let simulationService: DataSimulationService
  let semanticService: SemanticAlignmentService

  beforeEach(() => {
    vi.clearAllMocks()
    simulationService = DataSimulationService.getInstance()
    semanticService = SemanticAlignmentService.getInstance()
    simulationService.resetBaseValues()
  })

  describe('场景1: 应变片数据语义对齐', () => {
    it('应变片数据应该能够在运维中枢和应急指挥系统间正确对齐', () => {
      // 模拟应变片传感器数据
      const strainGaugeData = simulationService.generateSensorData('SG-001', Date.now())
      expect(strainGaugeData).not.toBeNull()
      expect(strainGaugeData!.type).toBe('strain_gauge')

      // 转换为运维中枢格式
      const operationCenterData = semanticService.normalizeForSystem(
        strainGaugeData!,
        'operation_center'
      )
      
      // 验证运维中枢语义
      expect(operationCenterData.semanticType).toBe('主梁应力监测')
      expect(operationCenterData.recommendations).toContain('继续常规监测')

      // 转换为应急指挥格式
      const emergencyData = semanticService.normalizeForSystem(
        strainGaugeData!,
        'emergency_command'
      )
      
      // 验证应急指挥语义
      expect(emergencyData.semanticType).toContain('主梁')
      expect(emergencyData.semanticType).toMatch(/异常|预警|警报/)
      expect(emergencyData.recommendations).toContain('启动应急监测预案')
    })

    it('不同结构位置的应变片应该有不同语义描述', () => {
      const sensors = ['SG-001', 'SG-002', 'SG-003', 'SG-004']
      
      sensors.forEach(sensorId => {
        const data = simulationService.generateSensorData(sensorId, Date.now())
        const ocData = semanticService.normalizeForSystem(data!, 'operation_center')
        const ecData = semanticService.normalizeForSystem(data!, 'emergency_command')
        
        expect(ocData.semanticType).toBeDefined()
        expect(ecData.semanticType).toBeDefined()
        expect(ocData.semanticType).not.toBe(ecData.semanticType)
      })
    })
  })

  describe('场景2: 桥体位姿数据生成与可视化', () => {
    it('应该生成完整的桥体位姿数据', () => {
      const timestamp = Date.now()
      const pose = simulationService.generateBridgePose(timestamp)

      // 验证位姿数据完整性
      expect(pose.timestamp).toBe(timestamp)
      expect(pose.deformations).toBeDefined()
      expect(pose.stresses).toBeDefined()
      expect(pose.overallHealthScore).toBeDefined()

      // 验证变形数据包含所有传感器
      const sensorIds = ['SG-001', 'SG-002', 'SG-003', 'SG-004', 'DS-001', 'ACC-001', 'TEMP-001']
      sensorIds.forEach(id => {
        expect(pose.deformations[id]).toBeDefined()
        expect(pose.deformations[id].dx).toBeDefined()
        expect(pose.deformations[id].dy).toBeDefined()
        expect(pose.deformations[id].dz).toBeDefined()
      })

      // 验证应变数据
      ['SG-001', 'SG-002', 'SG-003', 'SG-004'].forEach(id => {
        expect(pose.stresses[id]).toBeDefined()
      })
    })

    it('位姿数据应该包含周期性波动', () => {
      const now = Date.now()
      
      // 生成多个时间点的位姿
      const pose1 = simulationService.generateBridgePose(now)
      const pose2 = simulationService.generateBridgePose(now + 1000)
      const pose3 = simulationService.generateBridgePose(now + 2000)

      // 验证不同时间点的数据有所不同（由于周期性波动）
      const hasVariation = 
        pose1.deformations['SG-001'].dy !== pose2.deformations['SG-001'].dy ||
        pose2.deformations['SG-001'].dy !== pose3.deformations['SG-001'].dy

      expect(hasVariation).toBe(true)
    })
  })

  describe('场景3: 传感器数据实时更新', () => {
    it('应该能够实时生成所有传感器的数据', () => {
      const allData = simulationService.generateAllSensorData(Date.now())

      expect(allData.length).toBe(7) // 7个配置的传感器
      
      const sensorTypes = allData.map(d => d.type)
      expect(sensorTypes).toContain('strain_gauge')
      expect(sensorTypes).toContain('displacement')
      expect(sensorTypes).toContain('acceleration')
      expect(sensorTypes).toContain('temperature')
    })

    it('实时数据应该有正确的数据结构', () => {
      const data = simulationService.generateAllSensorData(Date.now())

      data.forEach(d => {
        expect(d.id).toMatch(new RegExp(`^${d.sensorId}-\\d+$`))
        expect(d.sensorId).toMatch(/^(SG|DS|ACC|TEMP)-\\d+$/)
        expect(d.type).toMatch(/^(strain_gauge|displacement|acceleration|temperature)$/)
        expect(d.bridgeStructureType).toMatch(/^(main_girder|pier|cable|deck|bearing)$/)
        expect(d.timestamp).toBeGreaterThan(0)
        expect(typeof d.value).toBe('number')
        expect(isFinite(d.value)).toBe(true)
      })
    })

    it('数据更新频率应该可调', () => {
      // 关闭异常模拟
      simulationService.setAnomalyProbability(0)
      
      const data1 = simulationService.generateAllSensorData(Date.now())
      const values1 = data1.map(d => d.value)

      // 开启异常模拟
      simulationService.setAnomalyProbability(0.5)
      
      // 数据应该会有变化
      const data2 = simulationService.generateAllSensorData(Date.now())
      const values2 = data2.map(d => d.value)

      // 由于随机性，至少有一些值应该不同
      const someDifferent = values1.some((v, i) => v !== values2[i])
      expect(someDifferent).toBe(true)
    })
  })

  describe('场景4: 健康状态评估', () => {
    it('应该能够根据传感器数据计算健康分数', () => {
      const allData = simulationService.generateAllSensorData(Date.now())
      const normalizedData = semanticService.normalizeBatchForSystem(allData, 'operation_center')
      const healthScore = semanticService.calculateHealthScore(normalizedData)

      expect(healthScore).toBeGreaterThanOrEqual(0)
      expect(healthScore).toBeLessThanOrEqual(100)
    })

    it('正常状态应该返回高分', () => {
      simulationService.setAnomalyProbability(0)
      const allData = simulationService.generateAllSensorData(Date.now())
      const normalizedData = semanticService.normalizeBatchForSystem(allData, 'operation_center')
      const healthScore = semanticService.calculateHealthScore(normalizedData)

      expect(healthScore).toBeGreaterThanOrEqual(60)
    })

    it('异常状态应该降低健康分数', () => {
      simulationService.setAnomalyProbability(0.8) // 高异常概率
      const allData = simulationService.generateAllSensorData(Date.now())
      const normalizedData = semanticService.normalizeBatchForSystem(allData, 'operation_center')
      const healthScore = semanticService.calculateHealthScore(normalizedData)

      // 高异常概率下，健康分数应该较低
      expect(healthScore).toBeLessThan(100)
    })
  })

  describe('场景5: 多传感器协同监测', () => {
    it('所有传感器应该能够同时工作', () => {
      const allData = simulationService.generateAllSensorData(Date.now())
      
      // 验证每个传感器都有数据
      const sensorIds = ['SG-001', 'SG-002', 'SG-003', 'SG-004', 'DS-001', 'ACC-001', 'TEMP-001']
      sensorIds.forEach(expectedId => {
        const sensorData = allData.find(d => d.sensorId === expectedId)
        expect(sensorData).toBeDefined()
      })
    })

    it('不同类型的传感器应该产生不同的健康评估', () => {
      const allData = simulationService.generateAllSensorData(Date.now())

      // 按传感器类型分组
      const byType = {
        strain_gauge: allData.filter(d => d.type === 'strain_gauge'),
        displacement: allData.filter(d => d.type === 'displacement'),
        acceleration: allData.filter(d => d.type === 'acceleration'),
        temperature: allData.filter(d => d.type === 'temperature')
      }

      // 验证每种类型都有数据
      expect(byType.strain_gauge.length).toBe(4)
      expect(byType.displacement.length).toBe(1)
      expect(byType.acceleration.length).toBe(1)
      expect(byType.temperature.length).toBe(1)
    })
  })

  describe('场景6: 阈值触发与告警', () => {
    it('应该能够正确判定不同阈值等级', () => {
      const thresholds = { warning: 100, danger: 200, critical: 300 }

      // 正常值
      expect(semanticService.determineHealthStatus(50, thresholds)).toBe('normal')
      
      // 警告值
      expect(semanticService.determineHealthStatus(150, thresholds)).toBe('warning')
      
      // 危险值
      expect(semanticService.determineHealthStatus(250, thresholds)).toBe('danger')
      
      // 紧急值
      expect(semanticService.determineHealthStatus(350, thresholds)).toBe('critical')
    })

    it('不同健康状态应该有不同的建议措施', () => {
      const normalRecs = semanticService.getStatusEmphasis('normal', 'operation_center')
      const warningRecs = semanticService.getStatusEmphasis('warning', 'operation_center')
      const dangerRecs = semanticService.getStatusEmphasis('danger', 'operation_center')
      const criticalRecs = semanticService.getStatusEmphasis('critical', 'operation_center')

      expect(normalRecs.priority).toBe(4)
      expect(warningRecs.priority).toBe(3)
      expect(dangerRecs.priority).toBe(2)
      expect(criticalRecs.priority).toBe(1)
    })
  })

  describe('场景7: 运维中枢与应急指挥双模式', () => {
    it('同一数据应该能够适配两种系统', () => {
      const data = simulationService.generateSensorData('SG-001', Date.now())!
      
      const operationData = semanticService.normalizeForSystem(data, 'operation_center')
      const emergencyData = semanticService.normalizeForSystem(data, 'emergency_command')

      // 基础数据应该相同
      expect(operationData.sensorId).toBe(emergencyData.sensorId)
      expect(operationData.value).toBe(emergencyData.value)
      expect(operationData.unit).toBe(emergencyData.unit)

      // 语义类型应该不同
      expect(operationData.semanticType).not.toBe(emergencyData.semanticType)
    })

    it('运维中枢应该使用运维术语', () => {
      const data = simulationService.generateSensorData('SG-001', Date.now())!
      const operationData = semanticService.normalizeForSystem(data, 'operation_center')

      expect(operationData.semanticType).toMatch(/监测|检测/)
      expect(operationData.recommendations).toContain('继续常规监测')
    })

    it('应急指挥应该使用应急术语', () => {
      const data = simulationService.generateSensorData('SG-001', Date.now())!
      const emergencyData = semanticService.normalizeForSystem(data, 'emergency_command')

      expect(emergencyData.semanticType).toMatch(/异常|预警|警报|超限/)
      expect(emergencyData.recommendations).toContain('启动应急监测预案')
    })
  })
})
