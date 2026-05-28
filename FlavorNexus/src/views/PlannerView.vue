<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIngredientStore } from '@/stores/ingredientStore'
import { useMolecularMatcher } from '@/composables/useMolecularMatcher'
import type { Ingredient } from '@/types'

const ingredientStore = useIngredientStore()
const { generateInnovativeCombos } = useMolecularMatcher()

const mealType = ref<'breakfast' | 'lunch' | 'dinner'>('dinner')
const isGenerating = ref(false)
const generatedPlan = ref<{
  name: string
  description: string
  mainIngredients: Ingredient[]
  suggestedIngredients: { ingredient: Ingredient; reason: string }[]
  tasteBalance: number
} | null>(null)

const mealTypes = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' }
]

const proteinIngredients = computed(() => 
  ingredientStore.ingredients.filter(i => i.category === 'protein')
)

const vegetableIngredients = computed(() => 
  ingredientStore.ingredients.filter(i => i.category === 'vegetable')
)

const selectedProteins = ref<Ingredient[]>([])
const selectedVegetables = ref<Ingredient[]>([])

const toggleProtein = (ing: Ingredient) => {
  const exists = selectedProteins.value.find(i => i.id === ing.id)
  if (exists) {
    selectedProteins.value = selectedProteins.value.filter(i => i.id !== ing.id)
  } else {
    selectedProteins.value.push(ing)
  }
}

const toggleVegetable = (ing: Ingredient) => {
  const exists = selectedVegetables.value.find(i => i.id === ing.id)
  if (exists) {
    selectedVegetables.value = selectedVegetables.value.filter(i => i.id !== ing.id)
  } else {
    selectedVegetables.value.push(ing)
  }
}

const isProteinSelected = (id: string) => selectedProteins.value.some(i => i.id === id)
const isVegetableSelected = (id: string) => selectedVegetables.value.some(i => i.id === id)

const generatePlan = async () => {
  if (selectedProteins.value.length === 0) return
  
  isGenerating.value = true
  generatedPlan.value = null
  
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const baseIngredients = [...selectedProteins.value, ...selectedVegetables.value]
  const suggestions = generateInnovativeCombos(baseIngredients, ingredientStore.ingredients, 5)
  
  const suggestedIngredients = suggestions.map(s => {
    const ingredient = ingredientStore.getIngredientById(s.ingredientB)
    return {
      ingredient: ingredient!,
      reason: s.description
    }
  }).filter(s => s.ingredient)

  const mealNames = {
    breakfast: ['活力早餐', '能量清晨', '营养晨光'],
    lunch: ['丰盛午餐', '元气午宴', '活力补给'],
    dinner: ['精致晚餐', '温馨家宴', '风味夜宴']
  }

  const balanceScores = baseIngredients.map(i => i.taste.umami + i.taste.sweet - i.taste.bitter)
  const avgBalance = balanceScores.length > 0 
    ? Math.round(Math.min(100, Math.max(0, 50 + balanceScores.reduce((a, b) => a + b, 0) / balanceScores.length / 3)))
    : 70

  generatedPlan.value = {
    name: mealNames[mealType.value][Math.floor(Math.random() * 3)],
    description: `基于${selectedProteins.value.map(i => i.name).join('、')}的创意组合，探索味觉的无限可能`,
    mainIngredients: baseIngredients,
    suggestedIngredients,
    tasteBalance: avgBalance
  }
  
  isGenerating.value = false
}

const clearAll = () => {
  selectedProteins.value = []
  selectedVegetables.value = []
  generatedPlan.value = null
}
</script>

<template>
  <div class="planner-view space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-1">智能配餐</h1>
        <p class="text-charcoal-500">AI 推荐创新组合，生成完整餐单方案</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="space-y-6">
        <div class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">选择餐次</h3>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="type in mealTypes"
              :key="type.key"
              class="p-4 rounded-xl transition-all text-center"
              :class="mealType === type.key 
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' 
                : 'bg-charcoal-800/50 border border-transparent text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-200'"
              @click="mealType = type.key as any"
            >
              <div class="text-2xl mb-1">{{ type.icon }}</div>
              <div class="text-sm">{{ type.label }}</div>
            </button>
          </div>
        </div>

        <div class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">
            选择主食材
            <span class="text-charcoal-500 text-sm font-normal ml-2">
              ({{ selectedProteins.length }} 已选)
            </span>
          </h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="ing in proteinIngredients"
              :key="ing.id"
              class="p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3"
              :class="isProteinSelected(ing.id) 
                ? 'bg-amber-500/20 border border-amber-500/40' 
                : 'bg-charcoal-800/30 border border-transparent hover:bg-charcoal-800/60'"
              @click="toggleProtein(ing)"
            >
              <span class="text-2xl">{{ ing.imageUrl }}</span>
              <div class="flex-1">
                <div class="text-charcoal-200 text-sm font-medium">{{ ing.name }}</div>
                <div class="text-charcoal-500 text-xs">鲜味 {{ ing.taste.umami }}</div>
              </div>
              <div 
                v-if="isProteinSelected(ing.id)"
                class="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs text-white"
              >
                ✓
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-6">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">
            添加配菜
            <span class="text-charcoal-500 text-sm font-normal ml-2">
              ({{ selectedVegetables.length }} 已选)
            </span>
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="ing in vegetableIngredients"
              :key="ing.id"
              class="p-3 rounded-xl cursor-pointer transition-all text-center"
              :class="isVegetableSelected(ing.id) 
                ? 'bg-green-500/20 border border-green-500/40' 
                : 'bg-charcoal-800/30 border border-transparent hover:bg-charcoal-800/60'"
              @click="toggleVegetable(ing)"
            >
              <div class="text-2xl mb-1">{{ ing.imageUrl }}</div>
              <div class="text-charcoal-300 text-xs">{{ ing.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-span-2 space-y-6">
        <div class="glass-card p-8">
          <div class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <span>🧬</span>
              <span class="text-amber-300 text-sm">分子匹配引擎</span>
            </div>
            <h3 class="font-display text-2xl font-bold text-charcoal-100 mb-2">生成你的创意餐单</h3>
            <p class="text-charcoal-500">
              选择主食材后，AI 将分析风味化合物，推荐最佳搭配
            </p>
          </div>

          <div v-if="selectedProteins.length > 0" class="flex flex-wrap justify-center gap-3 mb-8">
            <div 
              v-for="ing in [...selectedProteins, ...selectedVegetables]" 
              :key="ing.id"
              class="flex items-center gap-2 px-4 py-2 bg-charcoal-800/80 rounded-full border border-charcoal-700"
            >
              <span class="text-xl">{{ ing.imageUrl }}</span>
              <span class="text-charcoal-200 text-sm">{{ ing.name }}</span>
            </div>
          </div>

          <div v-else class="h-20 flex items-center justify-center border-2 border-dashed border-charcoal-700 rounded-xl mb-8">
            <p class="text-charcoal-500 text-sm">👈 请从左侧选择至少一种主食材</p>
          </div>

          <div class="flex justify-center gap-4">
            <button
              class="btn-primary px-8 flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': isGenerating || selectedProteins.length === 0 }"
              :disabled="isGenerating || selectedProteins.length === 0"
              @click="generatePlan"
            >
              <span v-if="isGenerating" class="animate-spin">⚛️</span>
              <span v-else>✨</span>
              <span>{{ isGenerating ? '正在分析风味分子...' : '生成配餐方案' }}</span>
            </button>
            <button
              v-if="selectedProteins.length > 0"
              class="btn-secondary"
              @click="clearAll"
            >
              重置
            </button>
          </div>
        </div>

        <div v-if="generatedPlan" class="glass-card p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="font-display text-xl font-bold text-gradient">{{ generatedPlan.name }}</h3>
              <p class="text-charcoal-400 text-sm mt-1">{{ generatedPlan.description }}</p>
            </div>
            <div class="text-right">
              <div class="text-charcoal-500 text-xs">风味平衡</div>
              <div 
                class="font-mono text-2xl font-bold"
                :class="generatedPlan.tasteBalance >= 75 ? 'text-green-400' : 'text-amber-400'"
              >
                {{ generatedPlan.tasteBalance }}
              </div>
            </div>
          </div>

          <div class="mb-6">
            <h4 class="text-charcoal-400 text-sm mb-3">主食材</h4>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="ing in generatedPlan.mainIngredients" 
                :key="ing.id"
                class="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-lg border border-amber-500/30"
              >
                <span class="text-xl">{{ ing.imageUrl }}</span>
                <span class="text-charcoal-200 text-sm">{{ ing.name }}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-charcoal-400 text-sm mb-3">💡 推荐添加</h4>
            <div class="space-y-3">
              <div 
                v-for="(item, i) in generatedPlan.suggestedIngredients" 
                :key="i"
                class="p-4 bg-charcoal-800/50 rounded-xl border border-charcoal-700/50 hover:border-green-500/30 transition-all"
              >
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-2xl">{{ item.ingredient.imageUrl }}</span>
                  <span class="text-charcoal-100 font-medium">{{ item.ingredient.name }}</span>
                  <span class="ml-auto text-green-400 text-xs px-2 py-1 rounded-full bg-green-500/10">
                    推荐
                  </span>
                </div>
                <p class="text-charcoal-500 text-sm">{{ item.reason }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
