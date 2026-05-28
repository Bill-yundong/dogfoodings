<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TasteRadarChart from '@/components/charts/TasteRadarChart.vue'
import { useIngredientStore } from '@/stores/ingredientStore'

const router = useRouter()
const ingredientStore = useIngredientStore()

const featuredIngredients = computed(() => {
  return ingredientStore.ingredients.slice(0, 4)
})

const sampleTasteData = ref({
  sweet: 45,
  sour: 35,
  bitter: 25,
  salty: 40,
  umami: 65
})

const features = [
  { icon: '📍', title: '味觉坐标', desc: '五维风味空间定位，科学分析食材味觉特性', path: '/taste-coordinate' },
  { icon: '🔥', title: '美拉德分析', desc: '温度时间曲线模拟，预测香气褐变效果', path: '/maillard' },
  { icon: '🍳', title: '食谱工坊', desc: '拖拽组合食材，实时计算风味匹配度', path: '/workshop' },
  { icon: '📋', title: '智能配餐', desc: 'AI 推荐创新组合，生成完整餐单方案', path: '/planner' },
  { icon: '💾', title: '数据中心', desc: 'IndexedDB 离线缓存，本地数据持久化管理', path: '/data-center' }
]

const stats = [
  { value: '18+', label: '预置食材', icon: '🥬' },
  { value: '5', label: '味觉维度', icon: '🎯' },
  { value: '∞', label: '组合可能', icon: '🧬' },
  { value: '离线', label: '本地存储', icon: '💾' }
]

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="home-view space-y-8">
    <section class="hero-section glass-card p-8 rounded-3xl relative overflow-hidden">
      <div class="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      
      <div class="relative z-10 flex items-center justify-between">
        <div class="flex-1">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <span class="text-amber-400">✨</span>
            <span class="text-amber-300 text-sm font-medium">分子美食科学实验室</span>
          </div>
          
          <h1 class="font-display text-5xl font-bold mb-4">
            <span class="text-gradient text-shadow-glow">探索味觉的</span>
            <br />
            <span class="text-charcoal-100">无限可能</span>
          </h1>
          
          <p class="text-charcoal-400 text-lg max-w-xl mb-8 leading-relaxed">
            基于味觉坐标模型与美拉德反应科学，通过异步分子匹配引擎推荐创新烹饪组合。
            利用 IndexedDB 缓存高质菜谱数据，支撑离线环境下的视觉呈现与交互响应。
          </p>
          
          <div class="flex items-center gap-4">
            <button 
              class="btn-primary flex items-center gap-2"
              @click="navigateTo('/workshop')"
            >
              <span>开始探索</span>
              <span>→</span>
            </button>
            <button 
              class="btn-secondary flex items-center gap-2"
              @click="navigateTo('/taste-coordinate')"
            >
              <span>了解更多</span>
            </button>
          </div>
        </div>
        
        <div class="w-80 h-80 relative">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse-slow" />
          <div class="relative z-10 w-full h-full">
            <TasteRadarChart :data="sampleTasteData" :width="320" :height="320" />
          </div>
        </div>
      </div>
    </section>

    <section class="stats-grid grid grid-cols-4 gap-4">
      <div 
        v-for="stat in stats" 
        :key="stat.label"
        class="glass-card glass-card-hover p-6 rounded-2xl text-center cursor-pointer"
      >
        <div class="text-3xl mb-3">{{ stat.icon }}</div>
        <div class="font-display text-3xl font-bold text-gradient mb-1">{{ stat.value }}</div>
        <div class="text-charcoal-500 text-sm">{{ stat.label }}</div>
      </div>
    </section>

    <section class="features-section">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="font-display text-2xl font-bold text-charcoal-100 mb-1">功能模块</h2>
          <p class="text-charcoal-500 text-sm">科学驱动的烹饪创新工具集</p>
        </div>
      </div>
      
      <div class="grid grid-cols-5 gap-4">
        <div 
          v-for="feature in features" 
          :key="feature.path"
          class="feature-card glass-card glass-card-hover p-6 rounded-2xl cursor-pointer group"
          @click="navigateTo(feature.path)"
        >
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
            {{ feature.icon }}
          </div>
          <h3 class="font-display text-lg font-semibold text-charcoal-100 mb-2 group-hover:text-amber-400 transition-colors">
            {{ feature.title }}
          </h3>
          <p class="text-charcoal-500 text-sm leading-relaxed">
            {{ feature.desc }}
          </p>
        </div>
      </div>
    </section>

    <section class="ingredients-preview">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="font-display text-2xl font-bold text-charcoal-100 mb-1">精选食材库</h2>
          <p class="text-charcoal-500 text-sm">内置丰富的食材风味数据</p>
        </div>
        <button 
          class="text-amber-400 text-sm hover:text-amber-300 transition-colors flex items-center gap-1"
          @click="navigateTo('/workshop')"
        >
          查看全部 <span>→</span>
        </button>
      </div>
      
      <div class="grid grid-cols-4 gap-4">
        <div 
          v-for="ingredient in featuredIngredients" 
          :key="ingredient.id"
          class="glass-card glass-card-hover p-4 rounded-2xl cursor-pointer"
          @click="navigateTo('/workshop')"
        >
          <div class="text-4xl mb-3">{{ ingredient.imageUrl }}</div>
          <h4 class="font-semibold text-charcoal-100">{{ ingredient.name }}</h4>
          <p class="text-charcoal-500 text-xs mt-1 line-clamp-2">
            {{ ingredient.description }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feature-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-card:hover {
  transform: translateY(-4px);
}
</style>
