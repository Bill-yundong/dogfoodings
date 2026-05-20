<script setup lang="ts">
import { ref, computed } from 'vue'
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
  User,
  X,
  CheckCircle
} from 'lucide-vue-next'
import { useBatteryStore } from '@/stores/battery'

const route = useRoute()
const router = useRouter()
const batteryStore = useBatteryStore()

const showAlarmPanel = ref(false)

function toggleAlarmPanel() {
  showAlarmPanel.value = !showAlarmPanel.value
}

function handleAcknowledge(alarmId: string) {
  batteryStore.acknowledgeAlarm(alarmId)
}

function formatAlarmTime(timestamp: number) {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return `${Math.floor(diff / 3600000)}小时前`
}

function getAlarmTitle(alarm: any) {
  const typeMap: Record<string, string> = {
    'temperature': '温度告警',
    'voltage': '电压告警',
    'thermal_runaway': '热失控告警',
    'fire': '火警'
  }
  return typeMap[alarm.type] || '系统告警'
}

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
            <button 
              @click="toggleAlarmPanel"
              class="p-2 rounded-lg hover:bg-dark-500 transition-colors relative"
            >
              <Bell class="w-5 h-5 text-dark-200" />
              <span
                v-if="batteryStore.unacknowledgedAlarms.length > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center"
              >
                {{ batteryStore.unacknowledgedAlarms.length }}
              </span>
            </button>
            
            <div 
              v-if="showAlarmPanel"
              class="absolute right-0 top-full mt-2 w-80 glass-card rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div class="p-3 border-b border-dark-500 flex items-center justify-between">
                <h4 class="text-sm font-semibold text-white">告警通知</h4>
                <button 
                  @click="showAlarmPanel = false"
                  class="text-dark-400 hover:text-white transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
              <div class="max-h-80 overflow-y-auto">
                <div v-if="batteryStore.alarms.length === 0" class="p-6 text-center text-dark-400">
                  <Bell class="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p class="text-sm">暂无告警信息</p>
                </div>
                <div
                  v-for="alarm in batteryStore.alarms.slice(0, 20)"
                  :key="alarm.id"
                  class="p-3 border-b border-dark-500/50 hover:bg-dark-600/50 transition-colors"
                  :class="{ 'opacity-60': alarm.acknowledged }"
                >
                  <div class="flex items-start gap-2">
                    <div 
                      class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      :class="{
                        'bg-danger': alarm.level === 'critical',
                        'bg-warning': alarm.level === 'warning',
                        'bg-primary': alarm.level === 'info'
                      }"
                    ></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-dark-100">{{ getAlarmTitle(alarm) }}</span>
                        <span class="text-xs text-dark-500">{{ formatAlarmTime(alarm.timestamp) }}</span>
                      </div>
                      <p class="text-xs text-dark-400 mt-0.5">{{ alarm.message }}</p>
                      <div class="flex items-center justify-between mt-2">
                        <span 
                          class="text-xs px-2 py-0.5 rounded"
                          :class="{
                            'bg-danger/20 text-danger': alarm.level === 'critical',
                            'bg-warning/20 text-warning': alarm.level === 'warning',
                            'bg-primary/20 text-primary': alarm.level === 'info'
                          }"
                        >
                          {{ alarm.level }}
                        </span>
                        <button
                          v-if="!alarm.acknowledged"
                          @click="handleAcknowledge(alarm.id)"
                          class="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <CheckCircle class="w-3 h-3" />
                          确认
                        </button>
                        <span v-else class="text-xs text-dark-500">已确认</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
