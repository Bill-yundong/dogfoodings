import { ref, onMounted } from 'vue'
import type { Ingredient, Recipe, MatchResult } from '@/types'
import { presetIngredients } from '@/data/presetIngredients'
import * as db from '@/utils/db'

export function useIndexedDB() {
  const isInitialized = ref(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const dbStats = ref<{ [key: string]: number }>({})

  const initDatabase = async () => {
    try {
      isLoading.value = true
      await db.initDB()
      
      const ingredients = await db.getAllIngredients()
      if (ingredients.length === 0) {
        for (const ingredient of presetIngredients) {
          try {
            await db.addIngredient(ingredient)
          } catch (e) {
            console.log(`Ingredient ${ingredient.name} already exists`)
          }
        }
      }
      
      await updateStats()
      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize database'
    } finally {
      isLoading.value = false
    }
  }

  const updateStats = async () => {
    dbStats.value = await db.getDBStats()
  }

  const getAllIngredients = async (): Promise<Ingredient[]> => {
    return db.getAllIngredients()
  }

  const getIngredientById = async (id: string): Promise<Ingredient | undefined> => {
    return db.getIngredientById(id)
  }

  const getIngredientsByCategory = async (category: string): Promise<Ingredient[]> => {
    return db.getIngredientsByCategory(category)
  }

  const saveRecipe = async (recipe: Recipe): Promise<string> => {
    const id = await db.addRecipe(recipe)
    await updateStats()
    return id
  }

  const getAllRecipes = async (): Promise<Recipe[]> => {
    return db.getAllRecipes()
  }

  const saveMatchResult = async (result: MatchResult): Promise<string> => {
    const id = await db.addMatchResult(result)
    await updateStats()
    return id
  }

  const getMatchHistory = async (): Promise<MatchResult[]> => {
    return db.getMatchHistory()
  }

  const clearAllData = async (): Promise<void> => {
    await db.clearAllData()
    await updateStats()
  }

  onMounted(() => {
    initDatabase()
  })

  return {
    isInitialized,
    isLoading,
    error,
    dbStats,
    initDatabase,
    updateStats,
    getAllIngredients,
    getIngredientById,
    getIngredientsByCategory,
    saveRecipe,
    getAllRecipes,
    saveMatchResult,
    getMatchHistory,
    clearAllData
  }
}
