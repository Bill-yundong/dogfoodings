import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useIngredientStore } from '@/stores/ingredientStore'
import { useAppStore } from '@/stores/appStore'
import { presetIngredients } from '@/data/presetIngredients'

describe('Pinia Store 跨模块联动 - 集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('场景1: 食材状态管理 (PRD 2.2 食材库)', () => {
    it('初始状态应为空', () => {
      const store = useIngredientStore()
      expect(store.ingredients).toEqual([])
      expect(store.selectedIngredients).toEqual([])
      expect(store.matchResults).toEqual([])
      expect(store.recipes).toEqual([])
    })

    it('isLoading 初始应为true', () => {
      const store = useIngredientStore()
      expect(store.isLoading).toBe(true)
    })

    it('selectIngredient 应添加食材到已选列表', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      expect(store.selectedIngredients.length).toBe(1)
      expect(store.selectedIngredients[0].id).toBe('ing-001')
    })

    it('重复选择同一食材不应重复添加', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      store.selectIngredient(beef)
      expect(store.selectedIngredients.length).toBe(1)
    })

    it('deselectIngredient 应移除食材', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      store.deselectIngredient('ing-001')
      expect(store.selectedIngredients.length).toBe(0)
    })

    it('toggleIngredient 应切换食材选中状态', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.toggleIngredient(beef)
      expect(store.selectedIngredients.length).toBe(1)
      store.toggleIngredient(beef)
      expect(store.selectedIngredients.length).toBe(0)
    })

    it('clearSelection 应清空所有选择和匹配结果', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      store.matchResults = [{ id: 'test', ingredientA: 'a', ingredientB: 'b', score: 80, matchType: 'enhance', sharedCompounds: [], synergyEffect: 'test', description: 'test' }]
      store.clearSelection()
      expect(store.selectedIngredients).toEqual([])
      expect(store.matchResults).toEqual([])
    })
  })

  describe('场景2: 组合味觉坐标实时计算 (PRD 3.1 风味探索主流程)', () => {
    it('未选择食材时组合味觉应为零', () => {
      const store = useIngredientStore()
      expect(store.combinedTaste).toEqual({
        sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0
      })
    })

    it('选择食材后应实时更新组合味觉坐标', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      expect(store.combinedTaste.umami).toBe(beef.taste.umami)
    })

    it('多食材组合应计算加权平均味觉', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const tomato = presetIngredients.find(i => i.name === '番茄')!
      store.selectIngredient(beef)
      store.selectIngredient(tomato)
      
      const expectedUmami = Math.round((beef.taste.umami + tomato.taste.umami) / 2)
      expect(store.combinedTaste.umami).toBe(expectedUmami)
    })
  })

  describe('场景3: 风味平衡分析联动 (PRD 2.2 口味平衡分析)', () => {
    it('应实时计算风味平衡分数', () => {
      const store = useIngredientStore()
      const honey = presetIngredients.find(i => i.name === '蜂蜜')!
      store.selectIngredient(honey)
      expect(store.tasteBalance.overallScore).toBeGreaterThanOrEqual(0)
      expect(store.tasteBalance.overallScore).toBeLessThanOrEqual(100)
    })

    it('单食材选择时平衡分析应反映其特征', () => {
      const store = useIngredientStore()
      const honey = presetIngredients.find(i => i.name === '蜂蜜')!
      store.selectIngredient(honey)
      expect(store.tasteBalance.dominantTastes).toContain('甜')
    })

    it('平衡组合应获得较高分数', () => {
      const store = useIngredientStore()
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      const tomato = presetIngredients.find(i => i.name === '番茄')!
      const onion = presetIngredients.find(i => i.name === '洋葱')!
      store.selectIngredient(beef)
      store.selectIngredient(tomato)
      store.selectIngredient(onion)
      expect(store.tasteBalance.overallScore).toBeGreaterThan(0)
    })
  })

  describe('场景4: 分子匹配引擎联动 (PRD 3.2 异步调用分子匹配引擎)', () => {
    it('generateMatches 应生成匹配推荐', async () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      await store.generateMatches(beef, 5)
      expect(store.matchResults.length).toBeGreaterThan(0)
      expect(store.matchResults.length).toBeLessThanOrEqual(5)
    })

    it('匹配完成后isProcessingMatch应为false', async () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      await store.generateMatches(beef, 5)
      expect(store.isProcessingMatch).toBe(false)
    })

    it('创新组合生成应基于已选食材', async () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const beef = presetIngredients.find(i => i.name === '牛肉')!
      store.selectIngredient(beef)
      const results = await store.generateInnovativeSuggestions(5)
      expect(Array.isArray(results)).toBe(true)
    })

    it('空选择时生成创新组合应返回空', async () => {
      const store = useIngredientStore()
      const results = await store.generateInnovativeSuggestions(5)
      expect(results).toEqual([])
    })
  })

  describe('场景5: 食谱创建与持久化联动 (PRD 2.2 食谱研发工坊)', () => {
    it('getIngredientById 应返回正确的食材', () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const found = store.getIngredientById('ing-001')
      expect(found).toBeTruthy()
      expect(found!.name).toBe('牛肉')
    })

    it('getIngredientById 不存在的ID应返回undefined', () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const found = store.getIngredientById('non-existent')
      expect(found).toBeUndefined()
    })

    it('getIngredientsByCategory 应按分类过滤', () => {
      const store = useIngredientStore()
      store.ingredients = [...presetIngredients]
      const proteins = store.getIngredientsByCategory('protein')
      expect(proteins.length).toBe(4)
    })
  })

  describe('场景6: appStore 基础功能 (PRD 4.2 页面设计)', () => {
    it('默认侧边栏应打开', () => {
      const appStore = useAppStore()
      expect(appStore.sidebarOpen).toBe(true)
    })

    it('toggleSidebar 应切换侧边栏状态', () => {
      const appStore = useAppStore()
      appStore.toggleSidebar()
      expect(appStore.sidebarOpen).toBe(false)
      appStore.toggleSidebar()
      expect(appStore.sidebarOpen).toBe(true)
    })

    it('通知系统应正常工作', () => {
      const appStore = useAppStore()
      appStore.addNotification('测试通知', 'success')
      expect(appStore.notifications.length).toBe(1)
      expect(appStore.hasNotifications).toBe(true)
    })
  })
})
