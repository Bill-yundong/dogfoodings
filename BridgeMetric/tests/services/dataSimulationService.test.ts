import { describe, it, expect, beforeEach } from 'vitest'
import { DataSimulationService } from '../../src/services/dataSimulationService'

describe('DataSimulationService', () => {
  let service: DataSimulationService

  beforeEach(() => {
    service = DataSimulationService.getInstance()
    service.resetBaseValues()
  })

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = DataSimulationService.getInstance()
      const instance2 = DataSimulationService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('传感器数据生成', () => {
    it('应该为所有配置的传感器生成数据', () => {
      const timestamp = Date.now()
      const allData = service.generateAllSensorData(timestamp)

      expect(allData.length).toBeGreaterThan(0)
      allData.forEach(data => {
        expect(data.id).toBeDefined()
        expect(data.sensorId).toBeDefined()
        expect(data.type).toBeDefined()
        expect(data.timestamp).toBe(timestamp)
        expect(data.value).toBeDefined()
      })
    })

    it('应该生成有效的应变片数据', () => {
      const data = service.generateSensorData('SG-001', Date.now())
      expect(data).not.toBeNull()
      expect(data?.type).toBe('strain_gauge')
      expect(data?.value).toBeDefined()
      expect(typeof data?.value).toBe('number')
    })

    it('应该生成有效的位移传感器数据', () => {
      const data = service.generateSensorData('DS-001', Date.now())
      expect(data).not.toBeNull()
      expect(data?.type).toBe('displacement')
    })

    it('应该生成有效的加速度传感器数据', () => {
      const data = service.generateSensorData('ACC-001', Date.now())
      expect(data).not.toBeNull()
      expect(data?.type).toBe('acceleration')
    })

    it('应该生成有效的温度传感器数据', () => {
      const data = service.generateSensorData('TEMP-001', Date.now())
      expect(data).not.toBeNull()
      expect(data?.type).toBe('temperature')
    })

    it('对于不存在的传感器应返回null', () => {
      const data = service.generateSensorData('NONEXISTENT', Date.now())
      expect(data).toBeNull()
    })
  })

  describe('桥体位姿生成', () => {
    it('应该生成包含变形的位姿数据', () => {
      const pose = service.generateBridgePose(Date.now())

      expect(pose.timestamp).toBeDefined()
      expect(pose.deformations).toBeDefined()
      expect(typeof pose.deformations).toBe('object')
      expect(pose.overallHealthScore).toBeDefined()
      expect(pose.overallHealthScore).toBeGreaterThanOrEqual(0)
      expect(pose.overallHealthScore).toBeLessThanOrEqual(100)
    })

    it('每个传感器应该有对应的变形数据', () => {
      const pose = service.generateBridgePose(Date.now())
      const sensors = ['SG-001', 'SG-002', 'SG-003', 'SG-004', 'DS-001', 'ACC-001', 'TEMP-001']

      sensors.forEach(sensorId => {
        expect(pose.deformations[sensorId]).toBeDefined()
        expect(pose.deformations[sensorId].dx).toBeDefined()
        expect(pose.deformations[sensorId].dy).toBeDefined()
        expect(pose.deformations[sensorId].dz).toBeDefined()
      })
    })

    it('应变片应该有对应的应力数据', () => {
      const pose = service.generateBridgePose(Date.now())

      expect(pose.stresses['SG-001']).toBeDefined()
      expect(typeof pose.stresses['SG-001']).toBe('number')
    })
  })

  describe('异常模拟', () => {
    it('应该能够开启异常模拟', () => {
      service.setAnomalyProbability(0.5)
      const data = service.generateSensorData('SG-001', Date.now())
      expect(data).not.toBeNull()
    })

    it('应该能够关闭异常模拟', () => {
      service.setAnomalyProbability(0)
      const data = service.generateSensorData('SG-001', Date.now())
      expect(data).not.toBeNull()
    })

    it('异常概率应该在有效范围内', () => {
      service.setAnomalyProbability(0)
      expect(() => service.setAnomalyProbability(-0.1)).toThrow()
      expect(() => service.setAnomalyProbability(1.1)).toThrow()
    })
  })

  describe('历史数据生成', () => {
    it('应该能够生成指定天数的历史数据', () => {
      const historicalData = service.generateHistoricalData(1, 60000)
      expect(historicalData.length).toBeGreaterThan(0)
    })
  })
})
