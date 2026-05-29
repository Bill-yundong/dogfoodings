import { describe, it, expect, beforeEach } from 'vitest'
import * as db from '@/utils/db'
import { presetIngredients } from '@/data/presetIngredients'
import type { Ingredient, Recipe, MatchResult } from '@/types'

describe('IndexedDB 数据层 - 集成测试', () => {
  beforeEach(async () => {
    const database = await db.initDB()
    const tx = database.transaction(['ingredients', 'recipes', 'mealPlans', 'presets', 'matchHistory'], 'readwrite')
    await Promise.all([
      tx.objectStore('ingredients').clear(),
      tx.objectStore('recipes').clear(),
      tx.objectStore('mealPlans').clear(),
      tx.objectStore('presets').clear(),
      tx.objectStore('matchHistory').clear()
    ])
    await tx.done
    ;(db as any).dbInstance = null
  })

  describe('场景1: 数据库初始化与Schema创建 (PRD 4.3 IndexedDB Schema)', () => {
    it('应成功初始化数据库', async () => {
      const database = await db.initDB()
      expect(database).toBeTruthy()
      expect(database.name).toBe('FlavorNexusDB')
    })

    it('应包含所有5个ObjectStore', async () => {
      const database = await db.initDB()
      const storeNames = Array.from(database.objectStoreNames)
      expect(storeNames).toContain('ingredients')
      expect(storeNames).toContain('recipes')
      expect(storeNames).toContain('mealPlans')
      expect(storeNames).toContain('presets')
      expect(storeNames).toContain('matchHistory')
    })

    it('ingredients store应有category和name索引', async () => {
      const database = await db.initDB()
      const tx = database.transaction('ingredients')
      const store = tx.objectStore('ingredients')
      const indexNames = Array.from(store.indexNames)
      expect(indexNames).toContain('category')
      expect(indexNames).toContain('name')
      await tx.done
    })
  })

  describe('场景2: 食材数据CRUD操作 (PRD 2.2 离线数据中心)', () => {
    it('应成功添加单个食材', async () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const id = await db.addIngredient(beef)
      expect(id).toBeTruthy()
    })

    it('应成功获取所有食材', async () => {
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      const all = await db.getAllIngredients()
      expect(all.length).toBe(18)
    })

    it('应按ID获取单个食材', async () => {
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      await db.addIngredient(beef)
      const found = await db.getIngredientById('ing-001')
      expect(found).toBeTruthy()
      expect(found!.name).toBe('牛肉')
    })

    it('不存在的ID应返回undefined', async () => {
      const found = await db.getIngredientById('non-existent')
      expect(found).toBeUndefined()
    })

    it('应按分类查询食材', async () => {
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      const proteins = await db.getIngredientsByCategory('protein')
      expect(proteins.length).toBe(4)
      expect(proteins.every(p => p.category === 'protein')).toBe(true)
    })

    it('18种预置食材应全部正确导入', async () => {
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      const all = await db.getAllIngredients()
      const names = all.map(i => i.name)
      expect(names).toContain('牛肉')
      expect(names).toContain('蜂蜜')
      expect(names).toContain('柠檬')
      expect(names).toContain('奶酪')
    })
  })

  describe('场景3: 食谱数据CRUD操作 (PRD 2.3 食谱模型)', () => {
    const sampleRecipe: Recipe = {
      id: 'recipe-test-001',
      name: '经典牛肉番茄煲',
      ingredients: [
        { id: 'ing-001', amount: 300, unit: 'g' },
        { id: 'ing-006', amount: 200, unit: 'g' }
      ],
      tasteSignature: { sweet: 25, sour: 30, bitter: 10, salty: 17, umami: 63 },
      maillardParams: {
        optimalTemp: 160,
        optimalTime: 15,
        browningRate: 0.58,
        aromaIntensity: 73,
        flavorCompounds: ['谷氨酸', '吡嗪']
      },
      matchScore: 78,
      createdAt: new Date(),
      description: '经典家常菜'
    }

    it('应成功保存食谱', async () => {
      const id = await db.addRecipe(sampleRecipe)
      expect(id).toBeTruthy()
    })

    it('应成功获取所有食谱', async () => {
      await db.addRecipe(sampleRecipe)
      const recipes = await db.getAllRecipes()
      expect(recipes.length).toBe(1)
      expect(recipes[0].name).toBe('经典牛肉番茄煲')
    })

    it('食谱应包含完整的味觉签名', async () => {
      await db.addRecipe(sampleRecipe)
      const recipes = await db.getAllRecipes()
      expect(recipes[0].tasteSignature).toEqual(sampleRecipe.tasteSignature)
    })

    it('食谱应包含美拉德参数', async () => {
      await db.addRecipe(sampleRecipe)
      const recipes = await db.getAllRecipes()
      expect(recipes[0].maillardParams).toBeTruthy()
      expect(recipes[0].maillardParams.optimalTemp).toBe(160)
    })
  })

  describe('场景4: 匹配历史记录操作 (PRD 5.3 分子匹配引擎)', () => {
    const sampleMatch: MatchResult = {
      id: 'match-test-001',
      ingredientA: 'ing-001',
      ingredientB: 'ing-005',
      score: 85,
      matchType: 'enhance',
      sharedCompounds: ['谷氨酸'],
      synergyEffect: '鲜味倍增效应',
      description: '牛肉与蘑菇的鲜味协同'
    }

    it('应成功保存匹配结果', async () => {
      const id = await db.addMatchResult(sampleMatch)
      expect(id).toBeTruthy()
    })

    it('应成功获取匹配历史', async () => {
      await db.addMatchResult(sampleMatch)
      const history = await db.getMatchHistory()
      expect(history.length).toBe(1)
      expect(history[0].score).toBe(85)
    })
  })

  describe('场景5: 数据库统计与清除 (PRD 2.2 离线数据中心 - 修复后)', () => {
    it('应正确统计各Store的数据量', async () => {
      for (const ing of presetIngredients.slice(0, 5)) {
        await db.addIngredient(ing)
      }
      const stats = await db.getDBStats()
      expect(stats.ingredients).toBe(5)
      expect(stats.recipes).toBe(0)
    })

    it('清除所有数据后各Store应为空', async () => {
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      await db.clearAllData()
      const stats = await db.getDBStats()
      expect(stats.ingredients).toBe(0)
      expect(stats.recipes).toBe(0)
      expect(stats.matchHistory).toBe(0)
      expect(stats.presets).toBe(0)
    })

    it('清除数据后应能重新导入食材', async () => {
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      await db.clearAllData()
      for (const ing of presetIngredients) {
        await db.addIngredient(ing)
      }
      const all = await db.getAllIngredients()
      expect(all.length).toBe(18)
    })

    it('clearAllData 应正确清除5个ObjectStore', async () => {
      const recipe: Recipe = {
        id: 'recipe-clear-test',
        name: '测试食谱',
        ingredients: [],
        tasteSignature: { sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 },
        maillardParams: { optimalTemp: 160, optimalTime: 15, browningRate: 0.5, aromaIntensity: 50, flavorCompounds: [] },
        matchScore: 50,
        createdAt: new Date(),
        description: '测试'
      }
      await db.addIngredient(presetIngredients[0])
      await db.addRecipe(recipe)
      await db.addMatchResult({
        id: 'match-clear-test',
        ingredientA: 'a',
        ingredientB: 'b',
        score: 50,
        matchType: 'complement',
        sharedCompounds: [],
        synergyEffect: 'none',
        description: 'test'
      })

      await db.clearAllData()
      const stats = await db.getDBStats()
      expect(stats.ingredients).toBe(0)
      expect(stats.recipes).toBe(0)
      expect(stats.matchHistory).toBe(0)
    })
  })

  describe('场景6: Preset数据操作', () => {
    it('应成功添加预设配置', async () => {
      const id = await db.addPreset({
        id: 'preset-001',
        category: 'classic',
        data: { name: '经典搭配' },
        isCustom: false
      })
      expect(id).toBeTruthy()
    })

    it('应按分类获取预设配置', async () => {
      await db.addPreset({
        id: 'preset-002',
        category: 'creative',
        data: { name: '创意搭配' },
        isCustom: true
      })
      const presets = await db.getPresetsByCategory('creative')
      expect(presets.length).toBe(1)
      expect(presets[0].isCustom).toBe(true)
    })
  })
})
