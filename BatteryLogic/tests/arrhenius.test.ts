import { describe, it, expect } from 'vitest'
import {
  GAS_CONSTANT,
  DEFAULT_ARRHENIUS_PARAMS,
  calculateReactionRate,
  calculateHeatGeneration,
  calculateTemperatureRise,
  calculateHeatDissipation,
  simulateThermalRunaway,
  calculateThermalPropagation,
  formatTime,
  getTemperatureColor,
  getRiskLevelColor,
  getRiskLevelText
} from '@/utils/arrhenius'
import type { CellData } from '@/types'

describe('阿伦尼乌斯热模型核心算法', () => {
  const testCell: CellData = {
    id: 'test_cell_001',
    moduleId: 1,
    row: 0,
    col: 0,
    voltage: 3.7,
    temperature: 25,
    soc: 80,
    internalResistance: 2.5,
    status: 'normal',
    timestamp: Date.now()
  }

  describe('化学反应速率计算', () => {
    it('应该正确计算常温下的反应速率', () => {
      const rate = calculateReactionRate(
        25,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      expect(rate).toBeGreaterThan(0)
      expect(rate).toBeLessThan(1)
    })

    it('高温下反应速率应该显著增加', () => {
      const rateLow = calculateReactionRate(
        25,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      const rateHigh = calculateReactionRate(
        100,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      expect(rateHigh).toBeGreaterThan(rateLow * 10)
    })

    it('活化能越高，反应速率越低', () => {
      const params1 = { ...DEFAULT_ARRHENIUS_PARAMS, activationEnergy: 80000 }
      const params2 = { ...DEFAULT_ARRHENIUS_PARAMS, activationEnergy: 120000 }
      
      const rate1 = calculateReactionRate(
        50,
        params1.activationEnergy,
        params1.preExponentialFactor,
        params1.gasConstant
      )
      const rate2 = calculateReactionRate(
        50,
        params2.activationEnergy,
        params2.preExponentialFactor,
        params2.gasConstant
      )
      expect(rate1).toBeGreaterThan(rate2)
    })

    it('应该使用默认的气体常数', () => {
      const rate1 = calculateReactionRate(
        25,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor
      )
      const rate2 = calculateReactionRate(
        25,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        GAS_CONSTANT
      )
      expect(rate1).toBeCloseTo(rate2)
    })
  })

  describe('热生成计算', () => {
    it('应该返回非负的热生成值', () => {
      const reactionRate = calculateReactionRate(
        50,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      const heat = calculateHeatGeneration(reactionRate, DEFAULT_ARRHENIUS_PARAMS.reactionHeat, DEFAULT_ARRHENIUS_PARAMS.volume)
      expect(heat).toBeGreaterThanOrEqual(0)
    })

    it('高温电芯应该产生更多热量', () => {
      const rateNormal = calculateReactionRate(
        25,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      const heatNormal = calculateHeatGeneration(rateNormal, DEFAULT_ARRHENIUS_PARAMS.reactionHeat, DEFAULT_ARRHENIUS_PARAMS.volume)

      const rateHot = calculateReactionRate(
        100,
        DEFAULT_ARRHENIUS_PARAMS.activationEnergy,
        DEFAULT_ARRHENIUS_PARAMS.preExponentialFactor,
        DEFAULT_ARRHENIUS_PARAMS.gasConstant
      )
      const heatHot = calculateHeatGeneration(rateHot, DEFAULT_ARRHENIUS_PARAMS.reactionHeat, DEFAULT_ARRHENIUS_PARAMS.volume)
      
      expect(heatHot).toBeGreaterThan(heatNormal)
    })
  })

  describe('温度升高计算', () => {
    it('应该正确计算温度升高值', () => {
      const tempRise = calculateTemperatureRise(1000, 0.5, 1000, 1)
      expect(tempRise).toBe(2)
    })

    it('时间步长越大，温度升高越多', () => {
      const riseShort = calculateTemperatureRise(1000, 0.5, 1000, 1)
      const riseLong = calculateTemperatureRise(1000, 0.5, 1000, 5)
      expect(riseLong).toBeGreaterThan(riseShort)
    })
  })

  describe('热耗散计算', () => {
    it('温度高于环境时应该有正的热耗散', () => {
      const dissipation = calculateHeatDissipation(50, 25, 1.5)
      expect(dissipation).toBeGreaterThan(0)
    })

    it('温度等于环境时热耗散为零', () => {
      const dissipation = calculateHeatDissipation(25, 25, 1.5)
      expect(dissipation).toBe(0)
    })

    it('应该使用默认的表面积', () => {
      const dissipation1 = calculateHeatDissipation(50, 25, 1.5)
      const dissipation2 = calculateHeatDissipation(50, 25, 1.5, 0.06)
      expect(dissipation1).toBeCloseTo(dissipation2)
    })
  })

  describe('热蔓延计算', () => {
    it('相邻电芯之间应该存在热传导', () => {
      const sourceCell = { ...testCell, temperature: 100 }
      const targetCell = { ...testCell, temperature: 25 }
      const tempRise = calculateThermalPropagation(sourceCell, targetCell, DEFAULT_ARRHENIUS_PARAMS)
      expect(tempRise).toBeGreaterThan(0)
    })

    it('距离越远，热传导越小', () => {
      const sourceCell = { ...testCell, temperature: 100 }
      const targetCell = { ...testCell, temperature: 25 }
      
      const riseNear = calculateThermalPropagation(sourceCell, targetCell, DEFAULT_ARRHENIUS_PARAMS, 0.01)
      const riseFar = calculateThermalPropagation(sourceCell, targetCell, DEFAULT_ARRHENIUS_PARAMS, 0.1)
      expect(riseNear).toBeGreaterThan(riseFar)
    })

    it('应该使用默认的距离值', () => {
      const sourceCell = { ...testCell, temperature: 100 }
      const targetCell = { ...testCell, temperature: 25 }
      
      const rise1 = calculateThermalPropagation(sourceCell, targetCell, DEFAULT_ARRHENIUS_PARAMS)
      const rise2 = calculateThermalPropagation(sourceCell, targetCell, DEFAULT_ARRHENIUS_PARAMS, 0.02)
      expect(rise1).toBeCloseTo(rise2)
    })
  })

  describe('热失控模拟', () => {
    it('应该为正常温度电芯返回低风险', () => {
      const result = simulateThermalRunaway(testCell, DEFAULT_ARRHENIUS_PARAMS)
      expect(result.riskLevel).toBe('low')
      expect(result.timeToRunaway).toBe(-1)
      expect(result.temperatureCurve.length).toBeGreaterThan(0)
    })

    it('应该为高温电芯返回高风险', () => {
      const hotCell = { ...testCell, temperature: 300 }
      const result = simulateThermalRunaway(hotCell, DEFAULT_ARRHENIUS_PARAMS)
      expect(['high', 'extreme']).toContain(result.riskLevel)
    })

    it('超高温电芯应该返回极端风险', () => {
      const hotCell = { ...testCell, temperature: 400 }
      const result = simulateThermalRunaway(hotCell, DEFAULT_ARRHENIUS_PARAMS)
      expect(result.riskLevel).toBe('extreme')
    })

    it('温度高于临界值时应该立即触发热失控', () => {
      const hotCell = { ...testCell, temperature: 185 }
      const result = simulateThermalRunaway(hotCell, DEFAULT_ARRHENIUS_PARAMS, 3600, 1, 25, 180)
      expect(result.timeToRunaway).toBe(0)
    })

    it('应该包含时间点数据', () => {
      const result = simulateThermalRunaway(testCell, DEFAULT_ARRHENIUS_PARAMS)
      expect(result.timePoints.length).toBe(result.temperatureCurve.length)
      expect(result.timePoints[0]).toBe(0)
    })
  })

  describe('时间格式化', () => {
    it('秒数小于60秒时显示秒', () => {
      expect(formatTime(30)).toBe('30s')
      expect(formatTime(0)).toBe('0s')
    })

    it('分钟应该正确格式化', () => {
      expect(formatTime(125)).toBe('2m 5s')
      expect(formatTime(60)).toBe('1m 0s')
    })

    it('小时应该正确格式化', () => {
      expect(formatTime(3725)).toBe('1h 2m 5s')
      expect(formatTime(7200)).toBe('2h 0m 0s')
    })
  })

  describe('温度颜色映射', () => {
    it('低温应该显示绿色', () => {
      expect(getTemperatureColor(25)).toBe('#00B42A')
    })

    it('中温应该显示蓝色', () => {
      expect(getTemperatureColor(35)).toBe('#165DFF')
    })

    it('较高温应该显示橙色', () => {
      expect(getTemperatureColor(50)).toBe('#FF7D00')
    })

    it('高温应该显示红色', () => {
      expect(getTemperatureColor(70)).toBe('#F53F3F')
    })

    it('超高温应该显示紫色', () => {
      expect(getTemperatureColor(90)).toBe('#722ED1')
    })
  })

  describe('风险等级颜色和文本', () => {
    it('低风险应该显示绿色和正确文本', () => {
      expect(getRiskLevelColor('low')).toBe('#00B42A')
      expect(getRiskLevelText('low')).toBe('低风险')
    })

    it('中风险应该显示橙色和正确文本', () => {
      expect(getRiskLevelColor('medium')).toBe('#FF7D00')
      expect(getRiskLevelText('medium')).toBe('中风险')
    })

    it('高风险应该显示红色和正确文本', () => {
      expect(getRiskLevelColor('high')).toBe('#F53F3F')
      expect(getRiskLevelText('high')).toBe('高风险')
    })

    it('极高风险应该显示紫色和正确文本', () => {
      expect(getRiskLevelColor('extreme')).toBe('#722ED1')
      expect(getRiskLevelText('extreme')).toBe('极高风险')
    })
  })
})
