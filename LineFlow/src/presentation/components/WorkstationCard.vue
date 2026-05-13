<script setup lang="ts">
import { computed } from 'vue'
import type { Workstation } from '../../domain/entities/Workstation'
import { WorkstationStatus } from '../../domain/value-objects/WorkstationStatus'

const props = defineProps<{
  workstation: Workstation
  isBottleneck?: boolean
  bottleneckSeverity?: string
}>()

const emit = defineEmits<{
  triggerBreakdown: [stationIndex: number]
}>()

const statusColor = computed(() => {
  const status = props.workstation.status
  if (status.equals(WorkstationStatus.RUNNING)) return 'bg-emerald-500'
  if (status.equals(WorkstationStatus.IDLE)) return 'bg-slate-400'
  if (status.equals(WorkstationStatus.BLOCKED)) return 'bg-amber-500'
  if (status.equals(WorkstationStatus.STARVED)) return 'bg-orange-500'
  if (status.equals(WorkstationStatus.MAINTENANCE)) return 'bg-blue-500'
  if (status.equals(WorkstationStatus.ERROR)) return 'bg-red-500'
  return 'bg-slate-400'
})

const statusBg = computed(() => {
  const status = props.workstation.status
  if (status.equals(WorkstationStatus.RUNNING)) return 'bg-emerald-50'
  if (status.equals(WorkstationStatus.IDLE)) return 'bg-slate-50'
  if (status.equals(WorkstationStatus.ERROR)) return 'bg-red-50'
  return 'bg-white'
})

const borderColor = computed(() => {
  if (props.isBottleneck) {
    switch (props.bottleneckSeverity) {
      case 'critical': return 'border-red-500'
      case 'high': return 'border-orange-500'
      case 'medium': return 'border-amber-500'
      case 'low': return 'border-emerald-500'
      default: return 'border-transparent'
    }
  }
  return 'border-slate-200'
})

const utilizationColor = computed(() => {
  const util = props.workstation.utilization
  if (util >= 0.9) return 'bg-red-500'
  if (util >= 0.75) return 'bg-amber-500'
  return 'bg-emerald-500'
})
</script>

<template>
  <div
    class="rounded-xl border-2 shadow-md overflow-hidden transition-all duration-300 min-w-56"
    :class="[borderColor, statusBg]"
  >
    <div class="px-4 py-3 border-b border-slate-100">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-slate-800">{{ workstation.name }}</h3>
          <p class="text-xs text-slate-500">{{ workstation.id }}</p>
        </div>
        <span
          class="px-3 py-1 rounded-full text-white text-xs font-medium shadow-sm"
          :class="statusColor"
        >
          {{ workstation.status.icon }} {{ workstation.status.label }}
        </span>
      </div>

      <div v-if="isBottleneck" class="mt-2">
        <span class="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
          <span class="mr-1">⚠️</span>
          瓶颈工位 - {{ bottleneckSeverity === 'critical' ? '严重' : bottleneckSeverity === 'high' ? '高' : bottleneckSeverity === 'medium' ? '中' : '低' }}
        </span>
      </div>
    </div>

    <div class="p-4 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="text-center p-2 bg-slate-50 rounded-lg">
          <div class="text-lg font-bold text-slate-700">{{ workstation.cycleTime }}s</div>
          <div class="text-xs text-slate-500">节拍时间</div>
        </div>
        <div class="text-center p-2 bg-slate-50 rounded-lg">
          <div class="text-lg font-bold text-slate-700">{{ workstation.actualCycleTime.toFixed(1) }}s</div>
          <div class="text-xs text-slate-500">实际用时</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="text-center p-2 bg-slate-50 rounded-lg">
          <div class="text-lg font-bold text-slate-700">{{ workstation.queueLength }}/{{ workstation.capacity }}</div>
          <div class="text-xs text-slate-500">队列长度</div>
        </div>
        <div class="text-center p-2 bg-slate-50 rounded-lg">
          <div class="text-lg font-bold text-slate-700">{{ (workstation.utilization * 100).toFixed(1) }}%</div>
          <div class="text-xs text-slate-500">利用率</div>
        </div>
      </div>

      <div>
        <div class="w-full bg-slate-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-500"
            :class="utilizationColor"
            :style="{ width: `${Math.min(workstation.utilization * 100, 100)}%` }"
          ></div>
        </div>
      </div>

      <button
        v-if="!workstation.isFault && !workstation.isIdle"
        @click="emit('triggerBreakdown', workstation.index)"
        class="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
      >
        🚨 模拟故障
      </button>
    </div>
  </div>
</template>
