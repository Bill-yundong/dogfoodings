<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MaillardCurveChart from '@/components/charts/MaillardCurveChart.vue'
import IngredientCard from '@/components/cards/IngredientCard.vue'
import { useIngredientStore } from '@/stores/ingredientStore'
import { useMaillardEngine } from '@/composables/useMaillardEngine'
import type { Ingredient, MaillardSimulationResult } from '@/types'

const ingredientStore = useIngredientStore()
const { simulateReaction, getMaillardStage, optimizeCookingParams } = useMaillardEngine()

const selectedIngredient = ref<Ingredient | null>(null)
const temperature = ref(160)
const time = ref(15)
const pH = ref(7.0)

const simulationResult = computed((): MaillardSimulationResult => {
  return simulateReaction(temperature.value, time.value, pH.value)
})

const currentBrowning = computed(() => {
  const levels = simulationResult.value.browningLevel
  return levels[levels.length - 1] || 0
})

const maillardStage = computed(() => {
  return getMaillardStage(currentBrowning.value)
})

const optimizedParams = computed(() => {
  if (!selectedIngredient.value) return null
  return optimizeCookingParams([selectedIngredient.value], 70, 30)
})

const selectIngredient = (ingredient: Ingredient) => {
  selectedIngredient.value = ingredient
  temperature.value = ingredient.maillard.optimalTemp
  time.value = ingredient.maillard.optimalTime
}

const applyOptimized = () => {
  if (optimizedParams.value) {
    temperature.value = optimizedParams.value.temperature
    time.value = optimizedParams.value.time
  }
}

const flavorCompounds = computed(() => {
  if (!selectedIngredient.value) return []
  return selectedIngredient.value.maillard.flavorCompounds
})
</script>

<template>
  <div class="maillard-view space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-1">美拉德分析</h1>
        <p class="text-charcoal-500">温度时间曲线模拟，预测香气褐变效果</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="space-y-4">
        <div class="glass-card p-4">
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">选择食材</h3>
          <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <div 
              v-for="ingredient in ingredientStore.ingredients" 
              :key="ingredient.id"
              class="ingredient-item p-3 rounded-xl cursor-pointer transition-all"
              :class="selectedIngredient?.id === ingredient.id ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-charcoal-800/30 hover:bg-charcoal-800/50 border border-transparent'"
              @click="selectIngredient(ingredient)"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ ingredient.imageUrl }}</span>
                <div>
                  <div class="text-charcoal-100 font-medium">{{ ingredient.name }}</div>
                  <div class="text-xs text-charcoal-500">
                    {{ ingredient.maillard.optimalTemp }}°C · {{ ingredient.maillard.optimalTime }}min
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-span-2 space-y-6">
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-display text-lg font-semibold text-charcoal-100">反应曲线模拟</h3>
            <div 
              class="px-4 py-2 rounded-full text-sm font-medium"
              :style="{ backgroundColor: maillardStage.color + '20', color: maillardStage.color }"
            >
              {{ maillardStage.stage }}
            </div>
          </div>
          
          <div class="h-64 mb-4">
            <MaillardCurveChart :data="simulationResult" :width="600" :height="250" />
          </div>

          <p class="text-charcoal-400 text-sm">{{ maillardStage.description }}</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <div class="glass-card p-6">
            <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-6">参数调节</h3>
            
            <div class="space-y-6">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-charcoal-400 text-sm">温度</label>
                  <span class="font-mono text-amber-400 font-bold">{{ temperature }}°C</span>
                </div>
                <input
                  v-model.number="temperature"
                  type="range"
                  min="100"
                  max="250"
                  class="w-full h-2 bg-charcoal-700 rounded-full appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-charcoal-600 mt-1">
                  <span>100°C</span>
                  <span>250°C</span>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-charcoal-400 text-sm">时间</label>
                  <span class="font-mono text-amber-400 font-bold">{{ time }}min</span>
                </div>
                <input
                  v-model.number="time"
                  type="range"
                  min="1"
                  max="60"
                  class="w-full h-2 bg-charcoal-700 rounded-full appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-charcoal-600 mt-1">
                  <span>1min</span>
                  <span>60min</span>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-charcoal-400 text-sm">pH 值</label>
                  <span class="font-mono text-purple-400 font-bold">{{ pH.toFixed(1) }}</span>
                </div>
                <input
                  v-model.number="pH"
                  type="range"
                  min="4"
                  max="9"
                  step="0.1"
                  class="w-full h-2 bg-charcoal-700 rounded-full appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-charcoal-600 mt-1">
                  <span>酸性 4.0</span>
                  <span>碱性 9.0</span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="glass-card p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-display text-lg font-semibold text-charcoal-100">智能优化</h3>
                <button 
                  v-if="optimizedParams"
                  class="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                  @click="applyOptimized"
                >
                  应用参数
                </button>
              </div>
              
              <div v-if="optimizedParams" class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-charcoal-500 text-sm">推荐温度</span>
                  <span class="font-mono text-amber-400 font-bold">{{ optimizedParams.temperature }}°C</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-charcoal-500 text-sm">推荐时间</span>
                  <span class="font-mono text-amber-400 font-bold">{{ optimizedParams.time }}min</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-charcoal-500 text-sm">预期香气</span>
                  <span class="font-mono text-purple-400 font-bold">{{ optimizedParams.expectedAroma }}%</span>
                </div>
              </div>
              <p v-else class="text-charcoal-500 text-sm">选择食材后显示优化建议</p>
            </div>

            <div class="glass-card p-6">
              <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">风味化合物</h3>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(compound, i) in flavorCompounds" 
                  :key="i"
                  class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-charcoal-200 text-xs border border-amber-500/20"
                >
                  {{ compound }}
                </span>
                <span v-if="flavorCompounds.length === 0" class="text-charcoal-500 text-sm">
                  选择食材查看风味化合物
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}
</style>
