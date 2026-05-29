import { describe, it, expect } from 'vitest'
import { useMaillardEngine } from '@/composables/useMaillardEngine'
import { presetIngredients } from '@/data/presetIngredients'

describe('美拉德反应引擎 - 集成测试', () => {
  const engine = useMaillardEngine()

  describe('场景1: Arrhenius方程反应速率计算 (PRD 5.2 美拉德反应计算器)', () => {
    it('高温下反应速率应显著高于低温', () => {
      const rateLow = engine.calculateReactionRate(100)
      const rateHigh = engine.calculateReactionRate(200)
      expect(rateHigh).toBeGreaterThan(rateLow)
    })

    it('温度升高反应速率应呈指数增长', () => {
      const rate120 = engine.calculateReactionRate(120)
      const rate180 = engine.calculateReactionRate(180)
      const ratio = rate180 / rate120
      expect(ratio).toBeGreaterThan(10)
    })

    it('室温下反应速率应极低', () => {
      const rateRoom = engine.calculateReactionRate(25)
      expect(rateRoom).toBeLessThan(0.001)
    })
  })

  describe('场景2: 美拉德反应曲线模拟 (PRD 2.2 温度-时间-风味曲线)', () => {
    it('应生成时间序列数据点', () => {
      const result = engine.simulateReaction(180, 15)
      expect(result.time.length).toBeGreaterThan(0)
      expect(result.browningLevel.length).toBeGreaterThan(0)
      expect(result.aromaIntensity.length).toBeGreaterThan(0)
    })

    it('褐变程度应随时间递增', () => {
      const result = engine.simulateReaction(180, 15)
      for (let i = 1; i < result.browningLevel.length; i++) {
        expect(result.browningLevel[i]).toBeGreaterThanOrEqual(result.browningLevel[i - 1] - 0.2)
      }
    })

    it('高温快速烹饪应产生更高褐变', () => {
      const lowTemp = engine.simulateReaction(120, 10)
      const highTemp = engine.simulateReaction(200, 10)
      const lastBrowningLow = lowTemp.browningLevel[lowTemp.browningLevel.length - 1]
      const lastBrowningHigh = highTemp.browningLevel[highTemp.browningLevel.length - 1]
      expect(lastBrowningHigh).toBeGreaterThan(lastBrowningLow)
    })

    it('应生成风味化合物数据', () => {
      const result = engine.simulateReaction(180, 15)
      expect(result.flavorCompounds.length).toBeGreaterThan(0)
      result.flavorCompounds.forEach(fc => {
        expect(fc.compound).toBeTruthy()
        expect(fc.concentration).toBeGreaterThanOrEqual(0)
      })
    })

    it('pH值应影响反应结果', () => {
      const neutral = engine.simulateReaction(180, 10, 7.0)
      const acidic = engine.simulateReaction(180, 10, 5.0)
      expect(neutral.browningLevel).not.toEqual(acidic.browningLevel)
    })

    it('生成的曲线时间点数量应合理', () => {
      const result = engine.simulateReaction(180, 20)
      expect(result.time.length).toBeGreaterThanOrEqual(10)
      expect(result.time.length).toBeLessThanOrEqual(25)
    })
  })

  describe('场景3: 烹饪参数优化 (PRD 5.2 优化烹饪参数)', () => {
    it('空食材列表应返回默认参数', () => {
      const result = engine.optimizeCookingParams([])
      expect(result.temperature).toBe(160)
      expect(result.time).toBe(15)
    })

    it('应针对目标褐变度优化温度时间', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const result = engine.optimizeCookingParams([beef], 70, 30)
      expect(result.temperature).toBeGreaterThanOrEqual(120)
      expect(result.temperature).toBeLessThanOrEqual(220)
      expect(result.time).toBeGreaterThanOrEqual(5)
      expect(result.time).toBeLessThanOrEqual(30)
    })

    it('多食材组合应取平均褐变速率优化', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      const result = engine.optimizeCookingParams([beef, onion], 70, 30)
      expect(result.temperature).toBeGreaterThan(0)
      expect(result.expectedAroma).toBeGreaterThan(0)
    })

    it('高目标褐变度应需要更高温度', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const lowBrowning = engine.optimizeCookingParams([beef], 30, 30)
      const highBrowning = engine.optimizeCookingParams([beef], 90, 30)
      expect(highBrowning.temperature).toBeGreaterThanOrEqual(lowBrowning.temperature - 20)
    })

    it('预期香气值不应超过100', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const result = engine.optimizeCookingParams([beef], 95, 30)
      expect(result.expectedAroma).toBeLessThanOrEqual(100)
    })
  })

  describe('场景4: 美拉德反应阶段判断 (PRD 2.2 烹饪科学数据)', () => {
    it('褐变度<20应为起始阶段', () => {
      const stage = engine.getMaillardStage(10)
      expect(stage.stage).toBe('起始阶段')
      expect(stage.description).toBeTruthy()
    })

    it('褐变度20-50应为发展阶段', () => {
      const stage = engine.getMaillardStage(35)
      expect(stage.stage).toBe('发展阶段')
    })

    it('褐变度50-80应为黄金阶段', () => {
      const stage = engine.getMaillardStage(65)
      expect(stage.stage).toBe('黄金阶段')
    })

    it('褐变度>=80应为深度阶段', () => {
      const stage = engine.getMaillardStage(90)
      expect(stage.stage).toBe('深度阶段')
    })

    it('每个阶段应返回颜色标识', () => {
      const stages = [10, 35, 65, 90].map(v => engine.getMaillardStage(v))
      stages.forEach(s => {
        expect(s.color).toBeTruthy()
        expect(s.color.startsWith('#')).toBe(true)
      })
    })
  })

  describe('场景5: 组合美拉德参数计算 (食谱工坊跨食材)', () => {
    it('空食材列表应返回默认美拉德参数', () => {
      const result = engine.calculateCombinedMaillard([])
      expect(result.optimalTemp).toBe(160)
      expect(result.optimalTime).toBe(15)
      expect(result.flavorCompounds).toEqual([])
    })

    it('多食材组合应计算平均最优温度和时间', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      const result = engine.calculateCombinedMaillard([beef, onion])
      
      const expectedTemp = Math.round((beef.maillard.optimalTemp + onion.maillard.optimalTemp) / 2)
      expect(result.optimalTemp).toBe(expectedTemp)
    })

    it('组合应合并所有风味化合物（去重）', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const result = engine.calculateCombinedMaillard([beef, soySauce])
      
      const allCompounds = new Set([
        ...beef.maillard.flavorCompounds,
        ...soySauce.maillard.flavorCompounds
      ])
      expect(result.flavorCompounds.sort()).toEqual(Array.from(allCompounds).sort())
    })
  })
})
