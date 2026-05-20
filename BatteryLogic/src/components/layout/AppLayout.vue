<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Gauge,
  Flame,
  Link,
  History,
  Map,
  Settings,
  Zap,
  Bell,
  User
} from 'lucide-vue-next'
import { useBatteryStore } from '@/stores/battery'

const route = useRoute()
const router = useRouter()
const batteryStore = useBatteryStore()

const menuItems = [
  { path: '/dashboard', name: '监控总览', icon: Gauge },
  { path: '/thermal-model', name: '热模型预测', icon: Flame },
  { path: '/semantic-align', name: '语义对齐', icon: Link },
  { path: '/history', name: '历史数据', icon: History },
  { path: '/multi-station', name: '多电站管理', icon: Map },
  { path: '/settings', name: '系统设置', icon: Settings }
]

const statusColor = computed(() => {
  switch (batteryStore.overallStatus) {
    case 'normal': return 'bg-success'
    case 'warning': return 'bg-warning'
    case 'critical': return 'bg-danger animate-pulse'
    default: return 'bg-dark-400'
  }
})

const statusText = computed(() => {
  switch (batteryStore.overallStatus) {
    case 'normal': return '运行正常'
    case 'warning': return '预警状态'
    case 'critical': return '严重告警'
    default: return '未知状态'
  }
})

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="flex h-screen bg-dark-600 text-dark-50">
    <aside class="w-64 bg-dark-700 border-r border-dark-500 flex flex-col">
      <div class="p-4 border-b border-dark-500">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Zap class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">BatteryLogic</h1>
            <p class="text-xs text-dark-300">储能热安全系统</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <div
          v-for="item in menuItems"
          :key="item.path"
          @click="navigateTo(item.path)"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
          :class="route.path === item.path
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'text-dark-200 hover:bg-dark-500 hover:text-white'"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="text-sm font-medium">{{ item.name }}</span>
        </div>
      </nav>

      <div class="p-3 border-t border-dark-500">
        <div class="flex items-center gap-3 px-3 py-2">
          <div :class="[statusColor, 'w-3 h-3 rounded-full']"></div>
          <span class="text-sm text-dark-200">{{ statusText }}</span>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="h-14 bg-dark-700 border-b border-dark-500 flex items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-semibold text-white">{{ route.meta.title }}</h2>
        </div>
        <div class="flex items-center gap-4">
          <div class="relative">
            <button class="p-2 rounded-lg hover:bg-dark-500 transition-colors">
              <Bell class="w-5 h-5 text-dark-200" />
              <span
                v-if="batteryStore.unacknowledgedAlarms.length > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center"
              >
                {{ batteryStore.unacknowledgedAlarms.length }}
              </span>
            </button>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-500">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User class="w-4 h-4 text-primary" />
            </div>
            <span class="text-sm text-dark-100">管理员</span>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
