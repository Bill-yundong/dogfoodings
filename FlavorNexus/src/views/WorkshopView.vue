<script setup lang="ts">
import { ref, computed } from 'vue'
import IngredientCard from '@/components/cards/IngredientCard.vue'
import TasteRadarChart from '@/components/charts/TasteRadarChart.vue'
import { useIngredientStore } from '@/stores/ingredientStore'
import { useMolecularMatcher } from '@/composables/useMolecularMatcher'
import type { Ingredient, MatchResult } from '@/types'
import { MATCH_TYPE_LABELS } from '@/types'

const ingredientStore = useIngredientStore()
const { findMatches, detectSynergy } = useMolecularMatcher()

const selectedIngredients = ref<Ingredient[]>([])
const matchResults = ref<MatchResult[]>([])
const isGenerating = ref(false)
const recipeName = ref('')
const recipeDescription = ref('')

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

const synergies = computed(() => {
  if (selectedIngredients.value.length < 2) return []
  return detectSynergy(selectedIngredients.value)
})

const toggleIngredient = (ingredient: Ingredient) => {
  const exists = selectedIngredients.value.find(i => i.id === ingredient.id)
  if (exists) {
    selectedIngredients.value = selectedIngredients.value.filter(i => i.id !== ingredient.id)
  } else {
    selectedIngredients.value.push(ingredient)
  }
  matchResults.value = []
}

const removeIngredient = (id: string) => {
  selectedIngredients.value = selectedIngredients.value.filter(i => i.id !== id)
  matchResults.value = []
}

const isSelected = (id: string) => {
  return selectedIngredients.value.some(i => i.id === id)
}

const generateMatches = async () => {
  if (selectedIngredients.value.length === 0) return
  
  isGenerating.value = true
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const allMatches: MatchResult[] = []
  const processedPairs = new Set<string>()
  
  selectedIngredients.value.forEach(ingredient => {
    const matches = findMatches(ingredient, ingredientStore.ingredients, 3)
    matches.forEach(match => {
      const pairKey = [match.ingredientA, match.ingredientB].sort().join('-')
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey)
        allMatches.push(match)
      }
    })
  })
  
  matchResults.value = allMatches.sort((a, b) => b.score - a.score).slice(0, 6)
  isGenerating.value = false
}

const getIngredientName = (id: string) => {
  return ingredientStore.getIngredientById(id)?.name || '未知'
}

const getIngredientEmoji = (id: string) => {
  return ingredientStore.getIngredientById(id)?.imageUrl || '❓'
}

const matchTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    complement: 'text-green-400 bg-green-500/20',
    enhance: 'text-amber-400 bg-amber-500/20',
    contrast: 'text-purple-400 bg-purple-500/20'
  }
  return colors[type] || 'text-charcoal-400 bg-charcoal-500/20'
}

const saveRecipe = async () => {
  if (!recipeName.value || selectedIngredients.value.length === 0) return
  await ingredientStore.createRecipe(recipeName.value, recipeDescription.value)
  recipeName.value = ''
  recipeDescription.value = ''
  selectedIngredients.value = []
  matchResults.value = []
}

const clearAll = () => {
  selectedIngredients.value = []
  matchResults.value = []
  recipeName.value = ''
  recipeDescription.value = ''
}
</script>

<template>
  <div class="workshop-view space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-1">食谱工坊</h1>
        <p class="text-charcoal-500">拖拽组合食材，实时计算风味匹配度</p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="glass-card p-4">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">食材库</h3>
          <div class="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
            <IngredientCard
              v-for="ingredient in ingredientStore.ingredients"
              :key="ingredient.id"
              :ingredient="ingredient"
              :is-selected="isSelected(ingredient.id)"
              :show-details="false"
              @select="toggleIngredient"
              @remove="removeIngredient"
            />
          </div>
        </div>
      </div>

      <div class="col-span-2 space-y-4">
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display text-lg font-semibold text-charcoal-100">组合工作台</h3>
            <button 
              v-if="selectedIngredients.length > 0"
              class="text-sm text-red-400 hover:text-red-300 transition-colors"
              @click="clearAll"
            >
              清空
            </button>
          </div>
          
          <div v-if="selectedIngredients.length === 0" class="h-32 flex items-center justify-center border-2 border-dashed border-charcoal-700 rounded-xl">
            <p class="text-charcoal-500 text-sm">点击左侧食材添加到组合</p>
          </div>
          
          <div v-else class="flex flex-wrap gap-3 mb-6">
            <div 
              v-for="ingredient in selectedIngredients" 
              :key="ingredient.id"
              class="flex items-center gap-2 px-4 py-2 bg-charcoal-800/80 rounded-xl border border-amber-500/30 group"
            >
              <span class="text-xl">{{ ingredient.imageUrl }}</span>
              <span class="text-charcoal-200 text-sm">{{ ingredient.name }}</span>
              <button 
                class="ml-2 text-charcoal-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                @click="removeIngredient(ingredient.id)"
              >
                ×
              </button>
            </div>
          </div>

          <div v-if="selectedIngredients.length > 0" class="flex gap-4">
            <div class="w-40 h-40">
              <TasteRadarChart :data="combinedTaste" :width="160" :height="160" :show-labels="false" />
            </div>
            <div class="flex-1 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-charcoal-500">组合食材</span>
                <span class="text-charcoal-200 font-mono">{{ selectedIngredients.length }} 种</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-charcoal-500">鲜味指数</span>
                <span class="text-purple-400 font-mono">{{ combinedTaste.umami }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-charcoal-500">甜度指数</span>
                <span class="text-amber-400 font-mono">{{ combinedTaste.sweet }}</span>
              </div>
              
              <div v-if="synergies.length > 0" class="pt-3 mt-3 border-t border-charcoal-700/50">
                <p class="text-charcoal-500 text-xs mb-2">✨ 协同效应</p>
                <div v-for="(synergy, i) in synergies" :key="i" class="text-xs text-green-400">
                  {{ synergy.effect }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedIngredients.length > 0" class="mt-6 pt-4 border-t border-charcoal-700/50">
            <button 
              class="btn-primary w-full flex items-center justify-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': isGenerating }"
              :disabled="isGenerating"
              @click="generateMatches"
            >
              <span v-if="isGenerating" class="animate-spin">⚛️</span>
              <span v-else>🧬</span>
              <span>{{ isGenerating ? '分子匹配中...' : '生成创新组合' }}</span>
            </button>
          </div>
        </div>

        <div v-if="matchResults.length > 0" class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">推荐组合</h3>
          <div class="space-y-3">
            <div 
              v-for="match in matchResults" 
              :key="match.id"
              class="match-card p-4 bg-charcoal-800/50 rounded-xl border border-charcoal-700/50 hover:border-amber-500/30 transition-all cursor-pointer"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ getIngredientEmoji(match.ingredientA) }}</span>
                  <span class="text-amber-400">+</span>
                  <span class="text-2xl">{{ getIngredientEmoji(match.ingredientB) }}</span>
                  <span class="text-charcoal-300 text-sm ml-2">
                    {{ getIngredientName(match.ingredientA) }} × {{ getIngredientName(match.ingredientB) }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span 
                    class="px-2 py-1 rounded-full text-xs"
                    :class="matchTypeColor(match.matchType)"
                  >
                    {{ MATCH_TYPE_LABELS[match.matchType] }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-charcoal-500 text-xs">匹配度</span>
                    <span 
                      class="font-mono font-bold text-lg"
                      :class="match.score >= 80 ? 'text-green-400' : match.score >= 60 ? 'text-amber-400' : 'text-charcoal-400'"
                    >
                      {{ match.score }}
                    </span>
                  </div>
                </div>
              </div>
              <p class="text-charcoal-400 text-xs">{{ match.description }}</p>
              <div v-if="match.sharedCompounds.length > 0" class="mt-2 flex flex-wrap gap-1">
                <span 
                  v-for="(compound, i) in match.sharedCompounds.slice(0, 3)" 
                  :key="i"
                  class="px-2 py-0.5 rounded bg-charcoal-700/50 text-charcoal-400 text-xs"
                >
                  {{ compound }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedIngredients.length > 0" class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">保存食谱</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-charcoal-400 text-sm mb-2">食谱名称</label>
              <input
                v-model="recipeName"
                type="text"
                placeholder="给你的创意食谱起个名字..."
                class="w-full px-4 py-3 bg-charcoal-800/50 border border-charcoal-700 rounded-xl text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div>
              <label class="block text-charcoal-400 text-sm mb-2">描述</label>
              <textarea
                v-model="recipeDescription"
                placeholder="记录你的创意灵感..."
                rows="3"
                class="w-full px-4 py-3 bg-charcoal-800/50 border border-charcoal-700 rounded-xl text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
              />
            </div>
            <button 
              class="btn-secondary w-full"
              :class="{ 'opacity-50 cursor-not-allowed': !recipeName }"
              :disabled="!recipeName"
              @click="saveRecipe"
            >
              💾 保存食谱
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-card:hover {
  transform: translateX(4px);
}
</style>
