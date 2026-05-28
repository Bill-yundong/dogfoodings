<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { useIngredientStore } from '@/stores/ingredientStore'

const { dbStats, initDatabase, updateStats, clearAllData } = useIndexedDB()
const ingredientStore = useIngredientStore()

const isClearing = ref(false)
const isRefreshing = ref(false)
const showConfirm = ref(false)

onMounted(async () => {
  await initDatabase()
  await updateStats()
})

const handleClearData = async () => {
  isClearing.value = true
  try {
    await clearAllData()
    await initDatabase()
    await ingredientStore.loadIngredients()
    await ingredientStore.loadRecipes()
  } catch (error) {
    console.error('Failed to clear data:', error)
  } finally {
    isClearing.value = false
    showConfirm.value = false
  }
}

const refreshStats = async () => {
  isRefreshing.value = true
  try {
    await updateStats()
    await ingredientStore.loadRecipes()
  } catch (error) {
    console.error('Failed to refresh stats:', error)
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 500)
  }
}

const statsItems = [
  { key: 'ingredients', label: '食材数据', icon: '🥬', color: 'text-green-400' },
  { key: 'recipes', label: '保存食谱', icon: '📖', color: 'text-amber-400' },
  { key: 'matchHistory', label: '匹配历史', icon: '🔗', color: 'text-purple-400' },
  { key: 'presets', label: '预设配置', icon: '⚙️', color: 'text-blue-400' }
]

const dbInfo = [
  { label: '数据库名称', value: 'FlavorNexusDB' },
  { label: '存储引擎', value: 'IndexedDB' },
  { label: '数据持久化', value: '本地浏览器存储' },
  { label: '离线可用', value: '✓ 支持' }
]
</script>

<template>
  <div class="data-center-view space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold text-gradient mb-1">数据中心</h1>
        <p class="text-charcoal-500">IndexedDB 离线缓存，本地数据持久化管理</p>
      </div>
      <button 
        class="btn-secondary flex items-center gap-2"
        :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }"
        :disabled="isRefreshing"
        @click="refreshStats"
      >
        <span :class="{ 'animate-spin': isRefreshing }">🔄</span>
        <span>{{ isRefreshing ? '刷新中...' : '刷新' }}</span>
      </button>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div 
        v-for="stat in statsItems" 
        :key="stat.key"
        class="glass-card p-6 text-center"
      >
        <div class="text-3xl mb-3">{{ stat.icon }}</div>
        <div :class="['font-mono text-3xl font-bold mb-1', stat.color]">
          {{ dbStats[stat.key] || 0 }}
        </div>
        <div class="text-charcoal-500 text-sm">{{ stat.label }}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div class="glass-card p-6">
        <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-6">数据库信息</h3>
        <div class="space-y-4">
          <div 
            v-for="info in dbInfo" 
            :key="info.label"
            class="flex items-center justify-between py-3 border-b border-charcoal-700/50 last:border-0"
          >
            <span class="text-charcoal-500">{{ info.label }}</span>
            <span class="text-charcoal-200 font-mono">{{ info.value }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-6">存储使用</h3>
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-charcoal-400 text-sm">食材库</span>
              <span class="text-charcoal-200 font-mono text-sm">
                {{ dbStats.ingredients || 0 }} / 50
              </span>
            </div>
            <div class="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, ((dbStats.ingredients || 0) / 50) * 100)}%` }"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-charcoal-400 text-sm">食谱保存</span>
              <span class="text-charcoal-200 font-mono text-sm">
                {{ dbStats.recipes || 0 }} / 100
              </span>
            </div>
            <div class="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, ((dbStats.recipes || 0) / 100) * 100)}%` }"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-charcoal-400 text-sm">匹配历史</span>
              <span class="text-charcoal-200 font-mono text-sm">
                {{ dbStats.matchHistory || 0 }} / 500
              </span>
            </div>
            <div class="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, ((dbStats.matchHistory || 0) / 500) * 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-4">已保存的食谱</h3>
      
      <div v-if="ingredientStore.recipes.length === 0" class="py-12 text-center">
        <div class="text-5xl mb-4">📭</div>
        <p class="text-charcoal-500">暂无保存的食谱</p>
        <p class="text-charcoal-600 text-sm mt-1">去食谱工坊创建你的第一个创意食谱吧</p>
      </div>

      <div v-else class="grid grid-cols-3 gap-4">
        <div 
          v-for="recipe in ingredientStore.recipes" 
          :key="recipe.id"
          class="p-4 bg-charcoal-800/50 rounded-xl border border-charcoal-700/50"
        >
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-semibold text-charcoal-100">{{ recipe.name }}</h4>
            <span 
              class="px-2 py-1 rounded-full text-xs font-mono"
              :class="recipe.matchScore >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'"
            >
              {{ recipe.matchScore }}
            </span>
          </div>
          <p v-if="recipe.description" class="text-charcoal-500 text-sm mb-3 line-clamp-2">
            {{ recipe.description }}
          </p>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="ing in recipe.ingredients.slice(0, 3)" 
              :key="ing.id"
              class="text-lg"
            >
              {{ ingredientStore.getIngredientById(ing.id)?.imageUrl || '❓' }}
            </span>
            <span 
              v-if="recipe.ingredients.length > 3"
              class="text-charcoal-500 text-xs self-center"
            >
              +{{ recipe.ingredients.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-6 border-red-500/20">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <div>
            <h3 class="font-semibold text-charcoal-100">危险操作</h3>
            <p class="text-charcoal-500 text-sm">清除所有本地数据，此操作不可撤销</p>
          </div>
        </div>
        
        <div v-if="!showConfirm">
          <button 
            class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            @click="showConfirm = true"
          >
            清除数据
          </button>
        </div>
        
        <div v-else class="flex items-center gap-2">
          <span class="text-charcoal-400 text-sm mr-2">确认清除？</span>
          <button 
            class="px-4 py-2 bg-charcoal-700 text-charcoal-300 rounded-lg hover:bg-charcoal-600 transition-colors"
            @click="showConfirm = false"
          >
            取消
          </button>
          <button 
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors flex items-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': isClearing }"
            :disabled="isClearing"
            @click="handleClearData"
          >
            <span v-if="isClearing" class="animate-spin">⏳</span>
            <span>{{ isClearing ? '清除中...' : '确认清除' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
