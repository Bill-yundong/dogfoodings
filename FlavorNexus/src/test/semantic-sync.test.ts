import { describe, it, expect } from 'vitest'
import { useTasteEngine } from '@/composables/useTasteEngine'
import { useMaillardEngine } from '@/composables/useMaillardEngine'
import { useMolecularMatcher } from '@/composables/useMolecularMatcher'
import { presetIngredients } from '@/data/presetIngredients'

describe('语义同步映射 - 集成测试', () => {
  const tasteEngine = useTasteEngine()
  const maillardEngine = useMaillardEngine()
  const matcher = useMolecularMatcher()

  describe('场景1: 食材选择→味觉坐标→美拉德参数的语义同步 (PRD: 语义同步映射)', () => {
    it('选择食材后味觉坐标和美拉德参数应同步计算', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const mushroom = presetIngredients.find(i => i.name === '蘑菇')!
      const selected = [beef, mushroom]

      const combinedTaste = tasteEngine.calculateCombinedTaste(selected)
      const combinedMaillard = maillardEngine.calculateCombinedMaillard(selected)

      expect(combinedTaste.umami).toBeGreaterThan(50)
      expect(combinedMaillard.optimalTemp).toBeGreaterThan(100)
      expect(combinedMaillard.flavorCompounds.length).toBeGreaterThan(0)
    })

    it('味觉坐标的变化应同步反映到平衡分析', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const honey = presetIngredients.find(i => i.name === '蜂蜜')!
      
      const beefOnly = tasteEngine.calculateCombinedTaste([beef])
      const beefHoney = tasteEngine.calculateCombinedTaste([beef, honey])
      
      const balance1 = tasteEngine.analyzeBalance(beefOnly)
      const balance2 = tasteEngine.analyzeBalance(beefHoney)
      
      expect(balance1.dominantTastes).not.toEqual(balance2.dominantTastes)
    })

    it('美拉德参数应与食材组合的风味化合物一致', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      
      const combined = maillardEngine.calculateCombinedMaillard([beef, soySauce])
      
      const allCompounds = new Set([
        ...beef.maillard.flavorCompounds,
        ...soySauce.maillard.flavorCompounds
      ])
      expect(combined.flavorCompounds.sort()).toEqual(Array.from(allCompounds).sort())
    })
  })

  describe('场景2: 食谱研发→配餐模块的语义同步 (PRD 3.1-3.2)', () => {
    it('食材组合的味觉签名应可传递给食谱模型', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const tomato = presetIngredients.find(i => i.name === '番茄')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      const selected = [beef, tomato, onion]

      const tasteSignature = tasteEngine.calculateCombinedTaste(selected)
      const maillardParams = maillardEngine.calculateCombinedMaillard(selected)
      const balance = tasteEngine.analyzeBalance(tasteSignature)

      const recipe = {
        id: 'recipe-sync-test',
        name: '牛肉番茄煲',
        tasteSignature,
        maillardParams,
        matchScore: balance.overallScore
      }

      expect(recipe.tasteSignature.umami).toBeGreaterThan(30)
      expect(recipe.matchScore).toBeGreaterThan(0)
      expect(recipe.maillardParams.optimalTemp).toBeGreaterThan(100)
    })

    it('配餐方案的风味平衡应基于食谱味觉签名计算', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const rice = presetIngredients.find(i => i.name === '大米')!
      
      const mainTaste = tasteEngine.calculateCombinedTaste([beef])
      const stapleTaste = tasteEngine.calculateCombinedTaste([rice])
      
      const overallTaste = tasteEngine.calculateCombinedTaste([beef, rice])
      const balance = tasteEngine.analyzeBalance(overallTaste)
      
      expect(balance.overallScore).toBeGreaterThan(0)
    })
  })

  describe('场景3: 分子匹配→味觉坐标→美拉德分析的跨模块联动 (PRD 3.1 完整流程)', () => {
    it('完整风味探索流程: 选择→匹配→分析→优化', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      
      const matches = matcher.findMatches(beef, presetIngredients, 5)
      expect(matches.length).toBeGreaterThan(0)
      
      const topMatch = matches[0]
      const matchedIngredient = presetIngredients.find(i => i.id === topMatch.ingredientB)!
      
      const combinedTaste = tasteEngine.calculateCombinedTaste([beef, matchedIngredient])
      expect(combinedTaste.umami).toBeGreaterThan(0)
      
      const balance = tasteEngine.analyzeBalance(combinedTaste)
      expect(balance.overallScore).toBeGreaterThan(0)
      
      const maillardParams = maillardEngine.calculateCombinedMaillard([beef, matchedIngredient])
      expect(maillardParams.optimalTemp).toBeGreaterThan(100)
      
      const optimizedParams = maillardEngine.optimizeCookingParams([beef, matchedIngredient])
      expect(optimizedParams.temperature).toBeGreaterThan(0)
    })

    it('协同效应应同步反映在匹配分数和味觉分析中', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const mushroom = presetIngredients.find(i => i.name === '蘑菇')!
      
      const synergies = matcher.detectSynergy([beef, mushroom])
      const matchScore = matcher.calculateMatchScore(beef, mushroom)
      
      if (synergies.length > 0) {
        expect(matchScore).toBeGreaterThan(40)
      }
      
      const combinedTaste = tasteEngine.calculateCombinedTaste([beef, mushroom])
      expect(combinedTaste.umami).toBeGreaterThan(
        (beef.taste.umami + mushroom.taste.umami) / 2 - 5
      )
    })
  })

  describe('场景4: 创新组合推荐的语义一致性 (PRD 5.3 创新组合)', () => {
    it('创新组合应基于风味化合物的科学逻辑', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      
      const combos = matcher.generateInnovativeCombos([beef, onion], presetIngredients, 3)
      combos.forEach(combo => {
        expect(combo.score).toBeGreaterThan(0)
        expect(combo.matchType).toBeTruthy()
        expect(combo.description).toBeTruthy()
      })
    })

    it('创新组合的协同效应应可被检测和量化', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      
      const combos = matcher.generateInnovativeCombos([beef, soySauce], presetIngredients, 5)
      combos.forEach(combo => {
        expect(combo.synergyEffect).toBeTruthy()
      })
    })
  })

  describe('场景5: 预置食材数据的完整性和一致性 (PRD 2.2 内置预设数据)', () => {
    it('所有预置食材应有完整的味觉坐标', () => {
      presetIngredients.forEach(ing => {
        expect(ing.taste).toHaveProperty('sweet')
        expect(ing.taste).toHaveProperty('sour')
        expect(ing.taste).toHaveProperty('bitter')
        expect(ing.taste).toHaveProperty('salty')
        expect(ing.taste).toHaveProperty('umami')
      })
    })

    it('所有预置食材应有完整的美拉德参数', () => {
      presetIngredients.forEach(ing => {
        expect(ing.maillard).toHaveProperty('optimalTemp')
        expect(ing.maillard).toHaveProperty('optimalTime')
        expect(ing.maillard).toHaveProperty('browningRate')
        expect(ing.maillard).toHaveProperty('aromaIntensity')
        expect(ing.maillard).toHaveProperty('flavorCompounds')
      })
    })

    it('所有预置食材应有风味化合物数据', () => {
      presetIngredients.forEach(ing => {
        expect(ing.flavorCompounds.length).toBeGreaterThan(0)
      })
    })

    it('食材ID应全局唯一', () => {
      const ids = presetIngredients.map(i => i.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('食材应覆盖所有6个分类', () => {
      const categories = new Set(presetIngredients.map(i => i.category))
      expect(categories.has('protein')).toBe(true)
      expect(categories.has('vegetable')).toBe(true)
      expect(categories.has('fruit')).toBe(true)
      expect(categories.has('spice')).toBe(true)
      expect(categories.has('carb')).toBe(true)
      expect(categories.has('dairy')).toBe(true)
    })

    it('预置食材数据应能完整走通味觉→美拉德→匹配全链路', () => {
      presetIngredients.forEach(ing => {
        const taste = tasteEngine.calculateCombinedTaste([ing])
        expect(taste).toBeTruthy()
        
        const balance = tasteEngine.analyzeBalance(ing.taste)
        expect(balance.overallScore).toBeGreaterThan(0)
        
        const maillard = maillardEngine.calculateCombinedMaillard([ing])
        expect(maillard.optimalTemp).toBeGreaterThan(0)
        
        const matches = matcher.findMatches(ing, presetIngredients, 3)
        expect(matches.length).toBeGreaterThan(0)
      })
    })
  })

  describe('场景6: 离线数据支撑的语义同步 (PRD: 离线缓存同步)', () => {
    it('所有计算引擎应不依赖网络，可完全离线运行', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      
      const taste = tasteEngine.calculateCombinedTaste([beef])
      expect(taste).toBeTruthy()
      
      const simulation = maillardEngine.simulateReaction(180, 15)
      expect(simulation.time.length).toBeGreaterThan(0)
      
      const matches = matcher.findMatches(beef, presetIngredients, 5)
      expect(matches.length).toBeGreaterThan(0)
    })
  })
})
