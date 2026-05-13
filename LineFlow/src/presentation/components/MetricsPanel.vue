<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  oee: number
  availability: number
  performance: number
  quality: number
  throughput: number
  wipCount: number
  completedCount: number
  snapshotCount: number
  runningStations: number
  totalStations: number
}>()

const oeeColor = computed(() => {
  if (props.oee >= 85) return 'text-emerald-600'
  if (props.oee >= 70) return 'text-amber-600'
  return 'text-red-600'
})

const oeeBg = computed(() => {
  if (props.oee >= 85) return 'from-emerald-50 to-emerald-100'
  if (props.oee >= 70) return 'from-amber-50 to-amber-100'
  return 'from-red-50 to-red-100'
})

const throughputHour = computed(() => {
  return props.throughput.toFixed(1)
})

const throughputDay = computed(() => {
  return (props.throughput * 8).toFixed(0)
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg p-6">
    <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center">
      <span class="mr-2">📊</span>
      关键指标概览
    </h2>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div
        class="bg-gradient-to-br rounded-xl p-4 border"
        :class="[oeeBg, 'border-slate-200']"
      >
        <div class="text-3xl font-bold" :class="oeeColor">
          {{ oee }}%
        </div>
        <div class="text-sm text-slate-600 mt-1">OEE 综合效率</div>
        <div class="mt-3 w-full bg-slate-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-500"
            :class="oeeColor.replace('text-', 'bg-')"
            :style="{ width: `${Math.min(oee, 100)}%` }"
          ></div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div class="text-3xl font-bold text-blue-600">
          {{ throughputHour }}
        </div>
        <div class="text-sm text-slate-600 mt-1">产出量 (件/小时)</div>
        <div class="mt-3 text-xs text-blue-700">
          日产能: {{ throughputDay }} 件/8小时
        </div>
      </div>

      <div class="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
        <div class="text-3xl font-bold text-violet-600">
          {{ wipCount }}
        </div>
        <div class="text-sm text-slate-600 mt-1">在制品 (WIP)</div>
        <div class="mt-3 text-xs text-violet-700">
          产线中流动的产品数
        </div>
      </div>

      <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
        <div class="text-3xl font-bold text-orange-600">
          {{ snapshotCount }}
        </div>
        <div class="text-sm text-slate-600 mt-1">离线快照数</div>
        <div class="mt-3 text-xs text-orange-700">
          IndexedDB 本地存储
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 md:grid-cols-6 gap-4 pt-4 border-t border-slate-200">
      <div class="text-center">
        <div class="text-lg font-semibold text-emerald-600">
          {{ (availability * 100).toFixed(1) }}%
        </div>
        <div class="text-xs text-slate-500">可用率</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-blue-600">
          {{ (performance * 100).toFixed(1) }}%
        </div>
        <div class="text-xs text-slate-500">性能率</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-violet-600">
          {{ (quality * 100).toFixed(1) }}%
        </div>
        <div class="text-xs text-slate-500">质量率</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-amber-600">
          {{ runningStations }}/{{ totalStations }}
        </div>
        <div class="text-xs text-slate-500">运行工位</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-cyan-600">
          {{ completedCount }}
        </div>
        <div class="text-xs text-slate-500">已完成产品</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-slate-600">
          {{ runningStations / totalStations * 100 }}%
        </div>
        <div class="text-xs text-slate-500">工位在线率</div>
      </div>
    </div>
  </div>
</template>
