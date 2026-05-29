import { describe, it, expect } from 'vitest'
import { useTasteEngine } from '@/composables/useTasteEngine'
import { presetIngredients } from '@/data/presetIngredients'
import type { Ingredient, TasteCoordinate } from '@/types'

describe('味觉坐标引擎 - 集成测试', () => {
  const engine = useTasteEngine()

  describe('场景1: 五维风味空间定位 (PRD 2.2 功能模块1)', () => {
    it('应正确定位单一食材的五维味觉坐标', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      expect(beef.taste.sweet).toBe(15)
      expect(beef.taste.sour).toBe(5)
      expect(beef.taste.bitter).toBe(10)
      expect(beef.taste.salty).toBe(25)
      expect(beef.taste.umami).toBe(85)
    })

    it('应正确定位18种预置食材的味觉坐标范围', () => {
      presetIngredients.forEach(ing => {
        const values = Object.values(ing.taste)
        values.forEach(v => {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
        })
      })
    })

    it('应正确区分不同分类食材的风味特征', () => {
      const proteins = presetIngredients.filter(i => i.category === 'protein')
      const spices = presetIngredients.filter(i => i.category === 'spice')
      
      const avgProteinUmami = proteins.reduce((s, i) => s + i.taste.umami, 0) / proteins.length
      const avgSpiceSalty = spices.reduce((s, i) => s + i.taste.salty, 0) / spices.length
      
      expect(avgProteinUmami).toBeGreaterThan(50)
      expect(avgSpiceSalty).toBeGreaterThan(20)
    })
  })

  describe('场景2: 组合风味坐标计算 (PRD 3.1 风味探索主流程)', () => {
    it('空食材列表应返回零坐标', () => {
      const result = engine.calculateCombinedTaste([])
      expect(result).toEqual({ sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 })
    })

    it('单一食材组合应返回该食材的味觉坐标', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const result = engine.calculateCombinedTaste([beef])
      expect(result.sweet).toBe(beef.taste.sweet)
      expect(result.umami).toBe(beef.taste.umami)
    })

    it('多食材组合应返回加权平均坐标', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const tomato = presetIngredients.find(i => i.name === '番茄')!
      const result = engine.calculateCombinedTaste([beef, tomato])
      
      const expectedSweet = Math.round((beef.taste.sweet + tomato.taste.sweet) / 2)
      const expectedUmami = Math.round((beef.taste.umami + tomato.taste.umami) / 2)
      
      expect(result.sweet).toBe(expectedSweet)
      expect(result.umami).toBe(expectedUmami)
    })

    it('牛肉+酱油组合应显著提升鲜味维度', () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const result = engine.calculateCombinedTaste([beef, soySauce])
      
      expect(result.umami).toBeGreaterThan(beef.taste.umami)
    })
  })

  describe('场景3: 欧氏距离计算 (PRD 5.1 风味距离)', () => {
    it('相同坐标的距离应为0', () => {
      const taste: TasteCoordinate = { sweet: 50, sour: 50, bitter: 50, salty: 50, umami: 50 }
      const distance = engine.calculateTasteDistance(taste, taste)
      expect(distance).toBe(0)
    })

    it('完全对立坐标的距离应接近最大值', () => {
      const a: TasteCoordinate = { sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 }
      const b: TasteCoordinate = { sweet: 100, sour: 100, bitter: 100, salty: 100, umami: 100 }
      const distance = engine.calculateTasteDistance(a, b)
      const maxDistance = Math.sqrt(5 * 100 * 100)
      expect(distance).toBeCloseTo(maxDistance, 1)
    })

    it('蜂蜜与柠檬的味觉距离应较大', () => {
      const honey = presetIngredients.find(i => i.name === '蜂蜜')!
      const lemon = presetIngredients.find(i => i.name === '柠檬')!
      const distance = engine.calculateTasteDistance(honey.taste, lemon.taste)
      expect(distance).toBeGreaterThan(50)
    })
  })

  describe('场景4: 风味平衡分析 (PRD 2.2 风味互补匹配/口味平衡分析)', () => {
    it('完美平衡的坐标应获得高分', () => {
      const balanced: TasteCoordinate = { sweet: 50, sour: 50, bitter: 50, salty: 50, umami: 50 }
      const analysis = engine.analyzeBalance(balanced)
      expect(analysis.overallScore).toBeGreaterThanOrEqual(80)
    })

    it('极度偏斜的坐标应获得低分', () => {
      const skewed: TasteCoordinate = { sweet: 100, sour: 0, bitter: 0, salty: 0, umami: 0 }
      const analysis = engine.analyzeBalance(skewed)
      expect(analysis.overallScore).toBeLessThan(50)
    })

    it('应正确识别主导味觉维度', () => {
      const honey = presetIngredients.find(i => i.name === '蜂蜜')!
      const analysis = engine.analyzeBalance(honey.taste)
      expect(analysis.dominantTastes).toContain('甜')
    })

    it('应正确识别薄弱味觉维度并给出建议', () => {
      const skewed: TasteCoordinate = { sweet: 95, sour: 5, bitter: 5, salty: 5, umami: 5 }
      const analysis = engine.analyzeBalance(skewed)
      expect(analysis.overallScore).toBeLessThan(60)
      expect(analysis.dominantTastes).toContain('甜')
    })

    it('平衡良好时应返回正面建议', () => {
      const balanced: TasteCoordinate = { sweet: 48, sour: 52, bitter: 50, salty: 49, umami: 51 }
      const analysis = engine.analyzeBalance(balanced)
      expect(analysis.suggestions).toContain('风味平衡良好！')
    })
  })

  describe('场景5: 相似度计算', () => {
    it('相同食材的相似度应为100', () => {
      const taste: TasteCoordinate = { sweet: 30, sour: 20, bitter: 15, salty: 25, umami: 60 }
      const similarity = engine.calculateSimilarity(taste, taste)
      expect(similarity).toBe(100)
    })

    it('酱油与牛肉的高鲜味应产生较高相似度', () => {
      const soySauce = presetIngredients.find(i => i.name === '酱油')!
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const similarity = engine.calculateSimilarity(soySauce.taste, beef.taste)
      expect(similarity).toBeGreaterThan(30)
    })
  })

  describe('场景6: 辅助工具函数', () => {
    it('getTasteEmoji 应返回正确的表情符号', () => {
      expect(engine.getTasteEmoji('sweet')).toBe('🍬')
      expect(engine.getTasteEmoji('sour')).toBe('🍋')
      expect(engine.getTasteEmoji('bitter')).toBe('☕')
      expect(engine.getTasteEmoji('salty')).toBe('🧂')
      expect(engine.getTasteEmoji('umami')).toBe('🍄')
    })

    it('getTasteLabel 应返回正确的中文标签', () => {
      expect(engine.getTasteLabel('sweet')).toBe('甜')
      expect(engine.getTasteLabel('sour')).toBe('酸')
      expect(engine.getTasteLabel('umami')).toBe('鲜')
    })

    it('tasteColor 应返回有效的颜色值', () => {
      const color = engine.tasteColor('sweet')
      expect(color).toBeTruthy()
      expect(color.startsWith('#')).toBe(true)
    })
  })
})
