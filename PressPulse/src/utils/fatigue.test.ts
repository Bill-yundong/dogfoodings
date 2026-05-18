import { describe, it, expect, beforeEach } from 'vitest'
import {
  FatigueLifePredictor,
  createEmptyStressAccumulation,
  generateSampleLoadData,
  defaultPredictor,
} from './fatigue'
import { RainflowCycle, StressAccumulation } from '../types'

describe('FatigueLifePredictor', () => {
  let predictor: FatigueLifePredictor

  beforeEach(() => {
    predictor = new FatigueLifePredictor('CR12MOV')
  })

  describe('材料属性', () => {
    it('应正确初始化材料属性', () => {
      const skd11Predictor = new FatigueLifePredictor('SKD11')
      expect(skd11Predictor).toBeDefined()
    })

    it('应支持D2材料', () => {
      const d2Predictor = new FatigueLifePredictor('D2')
      expect(d2Predictor).toBeDefined()
    })

    it('应默认使用CR12MOV材料', () => {
      expect(defaultPredictor).toBeDefined()
    })
  })

  describe('损伤计算', () => {
    it('无循环时损伤应为0', () => {
      const damage = predictor.calculateDamage([])
      expect(damage).toBe(0)
    })

    it('应力低于疲劳极限时不应产生损伤', () => {
      const cycles: RainflowCycle[] = [
        { range: 100, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      const damage = predictor.calculateDamage(cycles)
      expect(damage).toBe(0)
    })

    it('高应力循环应产生可测量的损伤', () => {
      const cycles: RainflowCycle[] = [
        { range: 600, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      const damage = predictor.calculateDamage(cycles)
      expect(damage).toBeGreaterThan(0)
    })

    it('多个循环的损伤应为线性累积', () => {
      const singleCycle: RainflowCycle[] = [
        { range: 500, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      const doubleCycles: RainflowCycle[] = [
        { range: 500, mean: 0, count: 2, startIndex: 0, endIndex: 1 },
      ]
      
      const damage1 = predictor.calculateDamage(singleCycle)
      const damage2 = predictor.calculateDamage(doubleCycles)
      
      expect(damage2).toBeCloseTo(damage1 * 2, 5)
    })
  })

  describe('寿命预测', () => {
    it('无损伤时应有较长的剩余寿命', () => {
      const life = predictor.predictRemainingLife(0, 300)
      expect(life.days).toBeGreaterThanOrEqual(0)
      expect(life.cycles).toBeGreaterThanOrEqual(0)
    })

    it('高损伤时剩余寿命应较短', () => {
      const life = predictor.predictRemainingLife(0.8, 300)
      expect(life.days).toBeLessThan(100)
    })

    it('损伤超过1时剩余寿命应为0', () => {
      const life = predictor.predictRemainingLife(1.5, 300)
      expect(life.days).toBe(0)
      expect(life.hours).toBe(0)
      expect(life.cycles).toBe(0)
    })

    it('更高的应力率应导致更短的寿命', () => {
      const lifeLowStress = predictor.predictRemainingLife(0.2, 300)
      const lifeHighStress = predictor.predictRemainingLife(0.2, 400)
      
      expect(lifeHighStress.days).toBeLessThanOrEqual(lifeLowStress.days)
    })
  })

  describe('失效概率', () => {
    it('无损伤时失效概率应很低', () => {
      const prob = predictor.calculateFailureProbability(0, 100)
      expect(prob).toBeLessThan(0.1)
    })

    it('高损伤时失效概率应很高', () => {
      const prob = predictor.calculateFailureProbability(0.9, 100)
      expect(prob).toBeGreaterThan(0.5)
    })

    it('使用时间越长失效概率越高', () => {
      const probNew = predictor.calculateFailureProbability(0.3, 10)
      const probOld = predictor.calculateFailureProbability(0.3, 1000)
      
      expect(probOld).toBeGreaterThan(probNew)
    })

    it('失效概率应在0到1之间', () => {
      const prob1 = predictor.calculateFailureProbability(-0.5, 100)
      const prob2 = predictor.calculateFailureProbability(2, 100)
      
      expect(prob1).toBeGreaterThanOrEqual(0)
      expect(prob2).toBeLessThanOrEqual(1)
    })
  })

  describe('健康指数', () => {
    it('无损伤时健康指数应为100', () => {
      const health = predictor.calculateHealthIndex(0)
      expect(health).toBe(100)
    })

    it('完全损坏时健康指数应为0', () => {
      const health = predictor.calculateHealthIndex(1)
      expect(health).toBe(0)
    })

    it('健康指数与损伤程度成反比', () => {
      const health1 = predictor.calculateHealthIndex(0.2)
      const health2 = predictor.calculateHealthIndex(0.5)
      
      expect(health1).toBeGreaterThan(health2)
    })

    it('健康指数不应为负数', () => {
      const health = predictor.calculateHealthIndex(1.5)
      expect(health).toBe(0)
    })
  })

  describe('应力累积更新', () => {
    it('空累积添加新循环后应正确更新', () => {
      const empty = createEmptyStressAccumulation()
      const newCycles: RainflowCycle[] = [
        { range: 800, mean: 0, count: 10, startIndex: 0, endIndex: 1 },
      ]
      
      const updated = predictor.updateStressAccumulation(empty, newCycles)
      
      expect(updated.totalCycles).toBe(10)
      expect(updated.damageAccumulated).toBeGreaterThan(0)
      expect(updated.maxStress).toBe(400)
      expect(updated.minStress).toBe(400)
      expect(updated.cycleHistory).toHaveLength(1)
    })

    it('多次更新应正确累积损伤', () => {
      let accumulation = createEmptyStressAccumulation()
      const cycles: RainflowCycle[] = [
        { range: 500, mean: 0, count: 5, startIndex: 0, endIndex: 1 },
      ]
      
      accumulation = predictor.updateStressAccumulation(accumulation, cycles)
      const damageAfterFirst = accumulation.damageAccumulated
      
      accumulation = predictor.updateStressAccumulation(accumulation, cycles)
      const damageAfterSecond = accumulation.damageAccumulated
      
      expect(damageAfterSecond).toBeGreaterThan(damageAfterFirst)
      expect(accumulation.totalCycles).toBe(10)
    })

    it('应正确更新最大最小应力', () => {
      let accumulation = createEmptyStressAccumulation()
      
      const cycles1: RainflowCycle[] = [
        { range: 600, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      accumulation = predictor.updateStressAccumulation(accumulation, cycles1)
      
      const cycles2: RainflowCycle[] = [
        { range: 300, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      accumulation = predictor.updateStressAccumulation(accumulation, cycles2)
      
      expect(accumulation.maxStress).toBe(300)
      expect(accumulation.minStress).toBe(150)
    })
  })

  describe('关键点识别', () => {
    it('无循环时应返回空数组', () => {
      const points = predictor.findCriticalPoints([])
      expect(points).toHaveLength(0)
    })

    it('应识别高应力点为关键风险点', () => {
      const cycles: RainflowCycle[] = [
        { range: 1400, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
        { range: 200, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      
      const points = predictor.findCriticalPoints(cycles)
      
      expect(points.length).toBeGreaterThan(0)
      expect(points[0].riskLevel).toBe('critical' || 'high')
    })

    it('应按风险等级排序关键点', () => {
      const cycles: RainflowCycle[] = [
        { range: 200, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
        { range: 1400, mean: 0, count: 1, startIndex: 0, endIndex: 1 },
      ]
      
      const points = predictor.findCriticalPoints(cycles)
      
      expect(points[0].stressLevel).toBe(700)
    })
  })

  describe('维护建议', () => {
    it('健康度低时应建议立即更换', () => {
      const action = predictor.recommendMaintenanceAction(0.8, 20)
      expect(action).toBe('立即更换模具')
    })

    it('健康度中等时应建议维修', () => {
      const action = predictor.recommendMaintenanceAction(0.4, 45)
      expect(action).toBe('计划近期维修')
    })

    it('健康度良好时应建议正常维护', () => {
      const action = predictor.recommendMaintenanceAction(0.1, 85)
      expect(action).toBe('正常维护')
    })
  })

  describe('辅助函数', () => {
    it('createEmptyStressAccumulation应返回正确的初始状态', () => {
      const empty = createEmptyStressAccumulation()
      expect(empty.totalCycles).toBe(0)
      expect(empty.damageAccumulated).toBe(0)
      expect(empty.maxStress).toBe(0)
      expect(empty.minStress).toBe(0)
      expect(empty.cycleHistory).toHaveLength(0)
    })

    it('generateSampleLoadData应生成指定数量的数据点', () => {
      const data = generateSampleLoadData(100)
      expect(data).toHaveLength(100)
      expect(data[0]).toHaveProperty('timestamp')
      expect(data[0]).toHaveProperty('load')
      expect(data[0]).toHaveProperty('sensorId')
    })

    it('生成的载荷数据应在指定范围内', () => {
      const data = generateSampleLoadData(100, 200, 50)
      for (const point of data) {
        expect(point.load).toBeGreaterThanOrEqual(0)
        expect(point.load).toBeLessThanOrEqual(300)
      }
    })
  })
})
