<script setup lang="ts">
import { computed } from 'vue'
import type { SimulationAlert } from '../../infra/engine/SimulationEngine'

const props = defineProps<{
  alerts: SimulationAlert[]
}>()

const emit = defineEmits<{
  acknowledge: [alertId: string]
}>()

function getLevelStyle(level: string) {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-400',
        text: 'text-red-800',
        badge: 'bg-red-500',
        icon: '🚨'
      }
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-400',
        text: 'text-amber-800',
        badge: 'bg-amber-500',
        icon: '⚠️'
      }
    case 'info':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-400',
        text: 'text-blue-800',
        badge: 'bg-blue-500',
        icon: 'ℹ️'
      }
    default:
      return {
        bg: 'bg-slate-50',
        border: 'border-slate-400',
        text: 'text-slate-800',
        badge: 'bg-slate-500',
        icon: '📋'
      }
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const criticalCount = computed(() => {
  return props.alerts.filter(a => a.level === 'critical' && !a.acknowledged).length
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg p-6 h-full">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-slate-800 flex items-center">
        <span class="mr-2">🔔</span>
        告警中心
      </h2>
      <div v-if="criticalCount > 0" class="flex items-center">
        <span class="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
          {{ criticalCount }} 紧急
        </span>
      </div>
    </div>

    <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
      <div
        v-for="alert in alerts.slice(0, 30)"
        :key="alert.id"
        class="border-l-4 rounded-lg p-4 transition-all duration-300"
        :class="[
          getLevelStyle(alert.level).bg,
          getLevelStyle(alert.level).border,
          alert.acknowledged ? 'opacity-50' : ''
        ]"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">{{ getLevelStyle(alert.level).icon }}</span>
              <span
                class="px-2 py-0.5 rounded text-xs text-white font-medium"
                :class="getLevelStyle(alert.level).badge"
              >
                {{ alert.type === 'breakdown' ? '故障' : alert.type === 'warning' ? '警告' : '信息' }}
              </span>
              <span class="text-xs text-slate-500">
                {{ formatTime(alert.timestamp) }}
              </span>
              <span v-if="alert.stationId" class="text-xs text-slate-500">
                · {{ alert.stationId }}
              </span>
            </div>
            <p class="text-sm font-medium" :class="getLevelStyle(alert.level).text">
              {{ alert.message }}
            </p>
          </div>
          <button
            v-if="!alert.acknowledged"
            @click="emit('acknowledge', alert.id)"
            class="ml-3 px-3 py-1 bg-white bg-opacity-80 rounded text-xs font-medium hover:bg-opacity-100 transition-colors border border-slate-200 text-slate-600"
          >
            确认
          </button>
        </div>
      </div>

      <div v-if="alerts.length === 0" class="text-center py-12 text-slate-500">
        <div class="text-4xl mb-3">✅</div>
        <p>暂无告警信息</p>
        <p class="text-sm mt-1">系统运行正常</p>
      </div>
    </div>
  </div>
</template>
