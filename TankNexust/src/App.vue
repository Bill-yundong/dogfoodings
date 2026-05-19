<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentRoute = computed(() => route.path)

const navItems = [
  { path: '/monitor', label: '监控大屏', icon: '📊' },
  { path: '/config', label: '参数配置', icon: '⚙️' },
  { path: '/terminal', label: '应急终端', icon: '📱' },
  { path: '/command', label: '联动指挥', icon: '🎯' }
]
</script>

<template>
  <div class="w-full h-full flex flex-col bg-bg-primary">
    <header class="h-16 bg-bg-secondary border-b border-accent-cyan/20 flex items-center justify-between px-6">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl">⚠️</span>
          <h1 class="text-xl font-bold text-accent-cyan glow-text">TankNexust</h1>
        </div>
        <span class="text-text-secondary text-sm">危化品储罐区泄漏演化模拟系统</span>
      </div>

      <nav class="flex items-center gap-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          :class="[
            currentRoute === item.path
              ? 'bg-accent-cyan text-bg-primary'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          ]"
        >
          <span class="mr-2">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-sm">
          <span class="status-dot-active"></span>
          <span class="text-text-secondary">系统运行中</span>
        </div>
        <div class="text-right">
          <div class="text-xs text-text-muted">{{ new Date().toLocaleDateString('zh-CN') }}</div>
          <div class="text-sm font-mono text-accent-cyan">{{ new Date().toLocaleTimeString('zh-CN') }}</div>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
