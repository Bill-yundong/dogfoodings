export interface TasteCoordinate {
  sweet: number
  sour: number
  bitter: number
  salty: number
  umami: number
}

export interface MaillardProfile {
  optimalTemp: number
  optimalTime: number
  browningRate: number
  aromaIntensity: number
  flavorCompounds: string[]
}

export type IngredientCategory = 'protein' | 'vegetable' | 'fruit' | 'spice' | 'carb' | 'dairy'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  taste: TasteCoordinate
  maillard: MaillardProfile
  flavorCompounds: string[]
  imageUrl: string
  description: string
}

export type MatchType = 'complement' | 'enhance' | 'contrast'

export interface MatchResult {
  id: string
  ingredientA: string
  ingredientB: string
  score: number
  matchType: MatchType
  sharedCompounds: string[]
  synergyEffect: string
  description: string
}

export interface RecipeIngredient {
  id: string
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  tasteSignature: TasteCoordinate
  maillardParams: MaillardProfile
  matchScore: number
  createdAt: Date
  description: string
}

export interface MealPlan {
  id: string
  name: string
  recipeIds: string[]
  overallTasteBalance: TasteCoordinate
  createdAt: Date
}

export interface Preset {
  id: string
  category: string
  data: Record<string, unknown>
  isCustom: boolean
}

export interface MaillardSimulationResult {
  time: number[]
  browningLevel: number[]
  aromaIntensity: number[]
  flavorCompounds: { compound: string; concentration: number }[]
}

export interface BalanceAnalysis {
  overallScore: number
  dominantTastes: string[]
  weakTastes: string[]
  suggestions: string[]
  standardDeviation: number
}

export interface SynergyInfo {
  ingredients: string[]
  effect: string
  intensity: number
  mechanism: string
}

export interface DBStats {
  ingredients: number
  recipes: number
  matchHistory: number
  storageUsed: number
}

export const TASTE_DIMENSIONS = ['sweet', 'sour', 'bitter', 'salty', 'umami'] as const

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  protein: '蛋白质',
  vegetable: '蔬菜',
  fruit: '水果',
  spice: '香料',
  carb: '碳水',
  dairy: '乳制品'
}

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  complement: '互补',
  enhance: '增强',
  contrast: '对比'
}
