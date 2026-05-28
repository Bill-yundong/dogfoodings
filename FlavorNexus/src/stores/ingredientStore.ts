import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ingredient, MatchResult, Recipe, TasteCoordinate } from '@/types'
import { useTasteEngine } from '@/composables/useTasteEngine'
import { useMolecularMatcher } from '@/composables/useMolecularMatcher'
import { useIndexedDB } from '@/composables/useIndexedDB'

export const useIngredientStore = defineStore('ingredients', () => {
  const ingredients = ref<Ingredient[]>([])
  const selectedIngredients = ref<Ingredient[]>([])
  const matchResults = ref<MatchResult[]>([])
  const recipes = ref<Recipe[]>([])
  const isLoading = ref(true)
  const isProcessingMatch = ref(false)

  const { getAllIngredients, saveRecipe, getAllRecipes } = useIndexedDB()
  const { calculateCombinedTaste, analyzeBalance } = useTasteEngine()
  const { findMatches, generateInnovativeCombos } = useMolecularMatcher()

  const loadIngredients = async () => {
    isLoading.value = true
    try {
      ingredients.value = await getAllIngredients()
    } finally {
      isLoading.value = false
    }
  }

  const loadRecipes = async () => {
    recipes.value = await getAllRecipes()
  }

  const selectIngredient = (ingredient: Ingredient) => {
    if (!selectedIngredients.value.find(i => i.id === ingredient.id)) {
      selectedIngredients.value.push(ingredient)
    }
  }

  const deselectIngredient = (ingredientId: string) => {
    selectedIngredients.value = selectedIngredients.value.filter(i => i.id !== ingredientId)
  }

  const toggleIngredient = (ingredient: Ingredient) => {
    const exists = selectedIngredients.value.find(i => i.id === ingredient.id)
    if (exists) {
      deselectIngredient(ingredient.id)
    } else {
      selectIngredient(ingredient)
    }
  }

  const clearSelection = () => {
    selectedIngredients.value = []
    matchResults.value = []
  }

  const combinedTaste = computed((): TasteCoordinate => {
    return calculateCombinedTaste(selectedIngredients.value)
  })

  const tasteBalance = computed(() => {
    return analyzeBalance(combinedTaste.value)
  })

  const generateMatches = async (baseIngredient: Ingredient, count: number = 5) => {
    isProcessingMatch.value = true
    try {
      matchResults.value = findMatches(baseIngredient, ingredients.value, count)
    } finally {
      isProcessingMatch.value = false
    }
  }

  const generateInnovativeSuggestions = async (count: number = 5) => {
    if (selectedIngredients.value.length === 0) return []
    isProcessingMatch.value = true
    try {
      return generateInnovativeCombos(selectedIngredients.value, ingredients.value, count)
    } finally {
      isProcessingMatch.value = false
    }
  }

  const createRecipe = async (name: string, description: string): Promise<Recipe> => {
    const recipe: Recipe = {
      id: `recipe-${Date.now()}`,
      name,
      description,
      ingredients: selectedIngredients.value.map(i => ({
        id: i.id,
        amount: 100,
        unit: 'g'
      })),
      tasteSignature: combinedTaste.value,
      maillardParams: {
        optimalTemp: 160,
        optimalTime: 15,
        browningRate: 0.5,
        aromaIntensity: 50,
        flavorCompounds: []
      },
      matchScore: tasteBalance.value.overallScore,
      createdAt: new Date()
    }

    await saveRecipe(recipe)
    recipes.value.push(recipe)
    return recipe
  }

  const getIngredientById = (id: string): Ingredient | undefined => {
    return ingredients.value.find(i => i.id === id)
  }

  const getIngredientsByCategory = (category: string): Ingredient[] => {
    return ingredients.value.filter(i => i.category === category)
  }

  return {
    ingredients,
    selectedIngredients,
    matchResults,
    recipes,
    isLoading,
    isProcessingMatch,
    combinedTaste,
    tasteBalance,
    loadIngredients,
    loadRecipes,
    selectIngredient,
    deselectIngredient,
    toggleIngredient,
    clearSelection,
    generateMatches,
    generateInnovativeSuggestions,
    createRecipe,
    getIngredientById,
    getIngredientsByCategory
  }
})
