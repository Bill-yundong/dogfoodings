<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TasteRadarChart from '@/components/charts/TasteRadarChart.vue'
import IngredientCard from '@/components/cards/IngredientCard.vue'
import { useIngredientStore } from '@/stores/ingredientStore'
import { useTasteEngine } from '@/composables/useTasteEngine'
import type { Ingredient } from '@/types'

const ingredientStore = useIngredientStore()
const { analyzeBalance, getTasteEmoji, getTasteLabel, tasteColor } = useTasteEngine()

const selectedIngredients = ref<Ingredient[]>([])
const searchQuery = ref('')

const filteredIngredients = computed(() => {
  if (!searchQuery.value) return ingredientStore.ingredients
  return ingredientStore.ingredients.filter(i => 
    i.name.includes(searchQuery.value) ||
    i.description.includes(searchQuery.value)
  )
})

const combinedTaste = computed(() => {
  if (selectedIngredients.value.length === 0) {
    return { sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 }
  }
  
  const total = selectedIngredients.value.length
  return {
    sweet: Math.round(selectedIngredients.value.reduce((s, i) => s + i.taste.sweet, 0) / total),
    sour: Math.round(selectedIngredients.value.reduce((s, i) => s + i.taste.sour, 0) / total),
    bitter: Math.round(selectedIngredients.value.reduce((s, i) => s + i.taste.bitter, 0) / total),
    salty: Math.round(selectedIngredients.value.reduce((s, i) => s + i.taste.salty, 0) / total),
    umami: Math.round(selectedIngredients.value.reduce((s, i) => s + i.taste.umami, 0) / total)
  }
})

const balanceAnalysis = computed(() => {
  return analyzeBalance(combinedTaste.value)
})

const toggleIngredient = (ingredient: Ingredient) => {
  const exists = selectedIngredients.value.find(i => i.id === ingredient.id)
  if (exists) {
    selectedIngredients.value = selectedIngredients.value.filter(i => i.id !== ingredient.id)
  } else {
    selectedIngredients.value.push(ingredient)
  }
}

const removeIngredient = (id: string) => {
  selectedIngredients.value = selectedIngredients.value.filter(i => i.id !== id)
}

const isSelected = (id: string) => {
  return selectedIngredients.value.some(i => i.id === id)
}

const tasteDimensions = [
  { key: 'sweet', label: '甜', emoji: '🍬' },
  { key: 'sour', label: '酸', emoji: '🍋' },
  { key: 'bitter', label: '苦', emoji: '☕' },
  { key: 'salty', label: '咸', emoji: '🧂' },
  { key: 'umami', label: '鲜', emoji: '🍄' }
]
</script>

<template>
  <div class="taste-coordinate-view space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-1">味觉坐标</h1>
        <p class="text-charcoal-500">五维风味空间定位，科学分析食材味觉特性</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-6">
        <div class="glass-card p-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索食材..."
              class="w-full px-4 py-3 pl-12 bg-charcoal-800/50 border border-charcoal-700 rounded-xl text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500">🔍</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
          <IngredientCard
            v-for="ingredient in filteredIngredients"
            :key="ingredient.id"
            :ingredient="ingredient"
            :is-selected="isSelected(ingredient.id)"
            :show-details="true"
            @select="toggleIngredient"
            @remove="removeIngredient"
          />
        </div>
      </div>

      <div class="space-y-6">
        <div class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">组合风味雷达</h3>
          <div class="aspect-square">
            <TasteRadarChart :data="combinedTaste" :width="280" :height="280" />
          </div>
        </div>

        <div class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">
            风味平衡分析
          </h3>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-charcoal-400 text-sm">整体平衡度</span>
              <span 
                class="font-mono text-2xl font-bold"
                :class="balanceAnalysis.overallScore >= 80 ? 'text-green-400' : balanceAnalysis.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'"
              >
                {{ balanceAnalysis.overallScore }}
              </span>
            </div>
            
            <div class="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500"
                :class="balanceAnalysis.overallScore >= 80 ? 'bg-green-500' : balanceAnalysis.overallScore >= 60 ? 'bg-amber-500' : 'bg-red-500'"
                :style="{ width: `${balanceAnalysis.overallScore}%` }"
              />
            </div>

            <div v-if="balanceAnalysis.dominantTastes.length > 0" class="pt-4 border-t border-charcoal-700/50">
              <span class="text-charcoal-500 text-xs">主导风味</span>
              <div class="flex flex-wrap gap-2 mt-2">
                <span 
                  v-for="taste in balanceAnalysis.dominantTastes" 
                  :key="taste"
                  class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs"
                >
                  {{ taste }}
                </span>
              </div>
            </div>

            <div v-if="balanceAnalysis.weakTastes.length > 0" class="pt-4 border-t border-charcoal-700/50">
              <span class="text-charcoal-500 text-xs">缺失风味</span>
              <div class="flex flex-wrap gap-2 mt-2">
                <span 
                  v-for="taste in balanceAnalysis.weakTastes" 
                  :key="taste"
                  class="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs"
                >
                  {{ taste }}
                </span>
              </div>
            </div>

            <div v-if="balanceAnalysis.suggestions.length > 0" class="pt-4 border-t border-charcoal-700/50">
              <span class="text-charcoal-500 text-xs">建议</span>
              <ul class="mt-2 space-y-1">
                <li 
                  v-for="(suggestion, i) in balanceAnalysis.suggestions" 
                  :key="i"
                  class="text-charcoal-400 text-xs flex items-start gap-2"
                >
                  <span class="text-amber-400">•</span>
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="selectedIngredients.length > 0" class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display text-lg font-semibold text-charcoal-100">已选食材</h3>
            <span class="text-charcoal-500 text-sm">{{ selectedIngredients.length }} 项</span>
          </div>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div 
              v-for="ingredient in selectedIngredients" 
              :key="ingredient.id"
              class="flex items-center justify-between p-3 bg-charcoal-800/50 rounded-lg group hover:bg-charcoal-800 transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ ingredient.imageUrl }}</span>
                <span class="text-charcoal-200 text-sm">{{ ingredient.name }}</span>
              </div>
              <button 
                class="opacity-0 group-hover:opacity-100 text-charcoal-500 hover:text-red-400 transition-all"
                @click="removeIngredient(ingredient.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
