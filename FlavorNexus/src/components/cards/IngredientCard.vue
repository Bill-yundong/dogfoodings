<script setup lang="ts">
import { computed } from 'vue'
import type { Ingredient } from '@/types'
import { CATEGORY_LABELS } from '@/types'

interface Props {
  ingredient: Ingredient
  isSelected?: boolean
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  showDetails: false
})

const emit = defineEmits<{
  (e: 'select', ingredient: Ingredient): void
  (e: 'remove', id: string): void
}>()

const categoryColor = computed(() => {
  const colors: Record<string, string> = {
    protein: 'from-red-500/20 to-red-600/10',
    vegetable: 'from-green-500/20 to-green-600/10',
    fruit: 'from-yellow-500/20 to-orange-500/10',
    spice: 'from-purple-500/20 to-pink-500/10',
    carb: 'from-amber-500/20 to-yellow-500/10',
    dairy: 'from-blue-500/20 to-cyan-500/10'
  }
  return colors[props.ingredient.category] || 'from-gray-500/20 to-gray-600/10'
})

const categoryBorder = computed(() => {
  const borders: Record<string, string> = {
    protein: 'border-red-500/30',
    vegetable: 'border-green-500/30',
    fruit: 'border-yellow-500/30',
    spice: 'border-purple-500/30',
    carb: 'border-amber-500/30',
    dairy: 'border-blue-500/30'
  }
  return borders[props.ingredient.category] || 'border-gray-500/30'
})
</script>

<template>
  <div
    class="ingredient-card glass-card glass-card-hover p-4 cursor-pointer relative overflow-hidden"
    :class="[
      isSelected ? 'border-amber-500/50 ring-2 ring-amber-500/30' : categoryBorder
    ]"
    @click="emit('select', ingredient)"
  >
    <div class="absolute inset-0 bg-gradient-to-br" :class="categoryColor" />
    
    <div class="relative z-10">
      <div class="flex items-start justify-between mb-3">
        <span class="text-3xl">{{ ingredient.imageUrl }}</span>
        <span 
          class="text-xs px-2 py-1 rounded-full bg-charcoal-700/80 text-charcoal-300 font-mono"
        >
          {{ CATEGORY_LABELS[ingredient.category] }}
        </span>
      </div>
      
      <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-1">
        {{ ingredient.name }}
      </h3>
      
      <p class="text-sm text-charcoal-400 line-clamp-2 mb-3">
        {{ ingredient.description }}
      </p>

      <div v-if="showDetails" class="space-y-2 mt-3 pt-3 border-t border-charcoal-700/50">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-amber-400">🍬</span>
          <div class="flex-1 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              :style="{ width: `${ingredient.taste.sweet}%` }"
            />
          </div>
          <span class="text-charcoal-400 w-8 text-right font-mono">{{ ingredient.taste.sweet }}</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-red-400">🍋</span>
          <div class="flex-1 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
              :style="{ width: `${ingredient.taste.sour}%` }"
            />
          </div>
          <span class="text-charcoal-400 w-8 text-right font-mono">{{ ingredient.taste.sour }}</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-purple-400">🍄</span>
          <div class="flex-1 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
              :style="{ width: `${ingredient.taste.umami}%` }"
            />
          </div>
          <span class="text-charcoal-400 w-8 text-right font-mono">{{ ingredient.taste.umami }}</span>
        </div>
        
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-charcoal-500">美拉德:</span>
          <div class="flex items-center gap-1">
            <span class="text-xs text-amber-400">{{ ingredient.maillard.optimalTemp }}°C</span>
            <span class="text-charcoal-600">|</span>
            <span class="text-xs text-charcoal-400">{{ ingredient.maillard.optimalTime }}min</span>
          </div>
        </div>
      </div>

      <button
        v-if="isSelected"
        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-400 transition-colors"
        @click.stop="emit('remove', ingredient.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.ingredient-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ingredient-card:hover {
  transform: translateY(-4px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
