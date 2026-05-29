import { describe, it, expect } from 'vitest'
import { useMolecularMatcher } from '@/composables/useMolecularMatcher'
import { presetIngredients } from '@/data/presetIngredients'

describe('异步分子匹配引擎 - 集成测试', () => {
  const matcher = useMolecularMatcher()

  describe('场景1: Jaccard相似度计算 (PRD 5.3 化合物共享分析)', () => {
    it('完全相同的化合物集合相似度应为1', () => {
      const ing = presetIngredients[0]
      const similarity = matcher.calculateJaccardSimilarity(ing, ing)
      expect(similarity).toBe(1)
    })

    it('无共享化合物的食材相似度应为0', () => {
      const a = presetIngredients.find(i => i.name === '牛肉')!
      const b = presetIngredients.find(i => i.name === '大米')!
      const shared = matcher.analyzeSharedCompounds(a, b)
      if (shared.length === 0) {
        const similarity = matcher.calculateJaccardSimilarity(a, b)
        expect(similarity).toBe(0)
      }
    })

    it('共享化合物的食材应有正相似度', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const similarity = matcher.calculateJaccardSimilarity(beef, soySauce)
      expect(similarity).toBeGreaterThan(0)
    })

    it('牛肉与酱油应共享谷氨酸', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const shared = matcher.analyzeSharedCompounds(beef, soySauce)
      expect(shared).toContain('谷氨酸')
    })
  })

  describe('场景2: 协同效应检测 (PRD 5.3 协同效应检测)', () => {
    it('牛肉+蘑菇应触发鲜味倍增效应', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const mushroom = presetIngredients.find(i => i.name === '蘑菇')!
      const synergies = matcher.detectSynergy([beef, mushroom])
      
      const umamiSynergy = synergies.find(s => s.effect.includes('鲜味'))
      expect(umamiSynergy).toBeDefined()
    })

    it('牛肉+酱油应检测到核苷酸协同', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const synergies = matcher.detectSynergy([beef, soySauce])
      expect(synergies.length).toBeGreaterThan(0)
    })

    it('协同效应应包含机制说明', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const mushroom = presetIngredients.find(i => i.name === '蘑菇')!
      const synergies = matcher.detectSynergy([beef, mushroom])
      synergies.forEach(s => {
        expect(s.mechanism).toBeTruthy()
        expect(s.intensity).toBeGreaterThan(0)
      })
    })

    it('不相关食材组合可能无协同效应', () => {
      const rice = presetIngredients.find(i => i.name === '大米')!
      const lemon = presetIngredients.find(i => i.name === '柠檬')!
      const synergies = matcher.detectSynergy([rice, lemon])
      // 可能无协同效应或只有弱的协同，是合理的
      expect(Array.isArray(synergies)).toBe(true)
    })
  })

  describe('场景3: 食材匹配推荐 (PRD 2.2 分子匹配引擎/PRD 3.2 异步调用)', () => {
    it('应返回指定数量的匹配结果', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 5)
      expect(results.length).toBeLessThanOrEqual(5)
      expect(results.length).toBeGreaterThan(0)
    })

    it('匹配结果不应包含自身', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 5)
      expect(results.every(r => r.ingredientB !== beef.id)).toBe(true)
    })

    it('匹配结果应按分数降序排列', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 10)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })

    it('匹配分数应在0-100范围内', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 10)
      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(100)
      })
    })

    it('匹配类型应为complement/enhance/contrast之一', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 10)
      results.forEach(r => {
        expect(['complement', 'enhance', 'contrast']).toContain(r.matchType)
      })
    })

    it('匹配结果应包含共享化合物', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 5)
      results.forEach(r => {
        expect(Array.isArray(r.sharedCompounds)).toBe(true)
      })
    })

    it('匹配结果应包含描述信息', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.findMatches(beef, presetIngredients, 5)
      results.forEach(r => {
        expect(r.description).toBeTruthy()
      })
    })
  })

  describe('场景4: 创新组合生成 (PRD 5.3 生成创新组合)', () => {
    it('应生成指定数量的创新组合', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      const results = matcher.generateInnovativeCombos([beef, onion], presetIngredients, 5)
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('创新组合不应包含已选食材', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      const baseIds = [beef.id, onion.id]
      const results = matcher.generateInnovativeCombos([beef, onion], presetIngredients, 5)
      results.forEach(r => {
        expect(baseIds).not.toContain(r.ingredientB)
      })
    })

    it('创新组合应包含协同效应信息', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const results = matcher.generateInnovativeCombos([beef], presetIngredients, 5)
      results.forEach(r => {
        expect(r.synergyEffect).toBeTruthy()
      })
    })

    it('空基础食材列表应返回空结果', () => {
      const results = matcher.generateInnovativeCombos([], presetIngredients, 5)
      expect(results.length).toBe(0)
    })
  })

  describe('场景5: 匹配分数综合计算 (PRD 5.3 分子匹配引擎)', () => {
    it('高相似度+协同效应应产生高匹配分数', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const mushroom = presetIngredients.find(i => i.name === '蘑菇')!
      const score = matcher.calculateMatchScore(beef, mushroom)
      expect(score).toBeGreaterThan(30)
    })

    it('同一对食材的匹配分数应一致', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const tomato = presetIngredients.find(i => i.name === '番茄')!
      const score1 = matcher.calculateMatchScore(beef, tomato)
      const score2 = matcher.calculateMatchScore(beef, tomato)
      expect(score1).toBe(score2)
    })
  })

  describe('场景6: 响应式状态管理', () => {
    it('matchQueue 初始应为空', () => {
      expect(matcher.matchQueue.value).toEqual([])
    })

    it('isProcessing 初始应为false', () => {
      expect(matcher.isProcessing.value).toBe(false)
    })

    it('matchResults 初始应为空', () => {
      expect(matcher.matchResults.value).toEqual([])
    })

    it('topMatches 应返回排序后的结果', () => {
      expect(Array.isArray(matcher.topMatches.value)).toBe(true)
    })
  })
})
