<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuItems = [
  { path: '/', name: 'home', label: '风味实验室', icon: '🧪' },
  { path: '/taste-coordinate', name: 'taste-coordinate', label: '味觉坐标', icon: '📍' },
  { path: '/maillard', name: 'maillard', label: '美拉德分析', icon: '🔥' },
  { path: '/workshop', name: 'workshop', label: '食谱工坊', icon: '🍳' },
  { path: '/planner', name: 'planner', label: '智能配餐', icon: '📋' },
  { path: '/data-center', name: 'data-center', label: '数据中心', icon: '💾' }
]

const activePath = computed(() => route.path)

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar h-full flex flex-col py-6 px-4">
    <div class="mb-8 px-2">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
          🍳
        </div>
        <div>
          <h1 class="font-display text-xl font-bold text-gradient text-shadow-glow">
            FlavorNexus
          </h1>
          <p class="text-xs text-charcoal-500 font-mono">风味实验室</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-1">
      <button
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group"
        :class="[
          activePath === item.path
            ? 'bg-gradient-to-r from-amber-600/30 to-amber-700/10 border border-amber-500/30 text-amber-300'
            : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent'
        ]"
        @click="navigateTo(item.path)"
      >
        <span class="text-xl" :class="{ 'animate-pulse': activePath === item.path }">
          {{ item.icon }}
        </span>
        <span class="font-medium text-sm">{{ item.label }}</span>
        <div
          v-if="activePath === item.path"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
        />
      </button>
    </nav>

    <div class="mt-auto pt-6 border-t border-charcoal-800">
      <div class="glass-card p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-olive-500 to-olive-700 flex items-center justify-center text-sm">
            👨‍🍳
          </div>
          <div>
            <p class="text-sm font-medium text-charcoal-200">美食探索者</p>
            <p class="text-xs text-charcoal-500">Level 1 · 入门厨师</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-charcoal-400">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            离线可用
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(26, 26, 26, 0.98) 100%);
  border-right: 1px solid rgba(75, 85, 99, 0.3);
}

.menu-item {
  position: relative;
}

.menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: linear-gradient(to bottom, #F59E0B, #D97706);
  border-radius: 0 2px 2px 0;
  transition: height 0.3s ease;
}

.menu-item.router-link-active::before,
.menu-item:hover::before {
  height: 20px;
}
</style>
