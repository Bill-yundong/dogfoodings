import { openDB, IDBPDatabase } from 'idb'
import type { Ingredient, Recipe, MatchResult, Preset, MealPlan } from '@/types'

const DB_NAME = 'FlavorNexusDB'
const DB_VERSION = 1

interface DBSchema {
  ingredients: {
    key: string
    value: Ingredient
    indexes: { category: string; name: string }
  }
  recipes: {
    key: string
    value: Recipe
    indexes: { createdAt: Date; matchScore: number }
  }
  mealPlans: {
    key: string
    value: MealPlan
    indexes: { createdAt: Date }
  }
  presets: {
    key: string
    value: Preset
    indexes: { category: string }
  }
  matchHistory: {
    key: string
    value: MatchResult
    indexes: { score: number }
  }
}

let dbInstance: IDBPDatabase<DBSchema> | null = null

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('ingredients')) {
        const ingredientStore = db.createObjectStore('ingredients', { keyPath: 'id' })
        ingredientStore.createIndex('category', 'category', { unique: false })
        ingredientStore.createIndex('name', 'name', { unique: true })
      }

      if (!db.objectStoreNames.contains('recipes')) {
        const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' })
        recipeStore.createIndex('createdAt', 'createdAt', { unique: false })
        recipeStore.createIndex('matchScore', 'matchScore', { unique: false })
      }

      if (!db.objectStoreNames.contains('mealPlans')) {
        const mealPlanStore = db.createObjectStore('mealPlans', { keyPath: 'id' })
        mealPlanStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('presets')) {
        const presetStore = db.createObjectStore('presets', { keyPath: 'id' })
        presetStore.createIndex('category', 'category', { unique: false })
      }

      if (!db.objectStoreNames.contains('matchHistory')) {
        const matchStore = db.createObjectStore('matchHistory', { keyPath: 'id' })
        matchStore.createIndex('score', 'score', { unique: false })
      }
    }
  })

  return dbInstance
}

export async function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbInstance) {
    return initDB()
  }
  return dbInstance
}

export async function addIngredient(ingredient: Ingredient): Promise<string> {
  const db = await getDB()
  return db.add('ingredients', ingredient)
}

export async function getAllIngredients(): Promise<Ingredient[]> {
  const db = await getDB()
  return db.getAll('ingredients')
}

export async function getIngredientById(id: string): Promise<Ingredient | undefined> {
  const db = await getDB()
  return db.get('ingredients', id)
}

export async function getIngredientsByCategory(category: string): Promise<Ingredient[]> {
  const db = await getDB()
  return db.getAllFromIndex('ingredients', 'category', category)
}

export async function addRecipe(recipe: Recipe): Promise<string> {
  const db = await getDB()
  return db.add('recipes', recipe)
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB()
  return db.getAll('recipes')
}

export async function addMatchResult(result: MatchResult): Promise<string> {
  const db = await getDB()
  return db.add('matchHistory', result)
}

export async function getMatchHistory(): Promise<MatchResult[]> {
  const db = await getDB()
  return db.getAll('matchHistory')
}

export async function addPreset(preset: Preset): Promise<string> {
  const db = await getDB()
  return db.add('presets', preset)
}

export async function getPresetsByCategory(category: string): Promise<Preset[]> {
  const db = await getDB()
  return db.getAllFromIndex('presets', 'category', category)
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['ingredients', 'recipes', 'mealPlans', 'presets', 'matchHistory'], 'readwrite')
  await Promise.all([
    tx.objectStore('ingredients').clear(),
    tx.objectStore('recipes').clear(),
    tx.objectStore('mealPlans').clear(),
    tx.objectStore('presets').clear(),
    tx.objectStore('matchHistory').clear()
  ])
  await tx.done
}

export async function getDBStats(): Promise<{ [key: string]: number }> {
  const db = await getDB()
  const stores = ['ingredients', 'recipes', 'mealPlans', 'presets', 'matchHistory']
  const stats: { [key: string]: number } = {}
  
  for (const store of stores) {
    const count = await db.count(store as keyof DBSchema)
    stats[store] = count
  }
  
  return stats
}
