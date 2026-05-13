<script setup lang="ts">
import { computed } from 'vue'
import type { Workstation } from '../../domain/entities/Workstation'

const props = defineProps<{
  bottleneckStation: Workstation | null | undefined
  suggestions: string[]
}>()

const severityColor = computed(() => {
  if (!props.bottleneckStation) return ''
  const severity = props.bottleneckStation.bottleneckSeverity
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-100 border-red-300'
    case 'high': return 'text-orange-600 bg-orange-100 border-orange-300'
    case 'medium': return 'text-amber-600 bg-amber-100 border-amber-300'
    case 'low': return 'text-emerald-600 bg-emerald-100 border-emerald-300'
    default: return ''
  }
})

const severityText = computed(() => {
  if (!props.bottleneckStation) return ''
  const severity = props.bottleneckStation.bottleneckSeverity
  switch (severity) {
    case 'critical': return '严重瓶颈 - 需要立即处理'
    case 'high': return '高风险瓶颈 - 建议尽快优化'
    case 'medium': return '中等瓶颈 - 关注变化'
    case 'low': return '轻微瓶颈 - 持续观察'
    default: return ''
  }
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg p-6 h-full">
    <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center">
      <span class="mr-2">💡</span>
      优化建议
    </h2>

    <div v-if="bottleneckStation" class="space-y-4">
      <div class="p-4 rounded-xl border-2" :class="severityColor">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <h3 class="font-bold text-lg">
              {{ bottleneckStation.name }}
            </h3>
            <p class="text-sm opacity-80">{{ bottleneckStation.id }}</p>
          </div>
        </div>
        <p class="text-sm font-medium">{{ severityText }}</p>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-slate-500">利用率:</span>
            <span class="font-bold ml-1">{{ (bottleneckStation.utilization * 100).toFixed(1) }}%</span>
          </div>
          <div>
            <span class="text-slate-500">队列长度:</span>
            <span class="font-bold ml-1">{{ bottleneckStation.queueLength }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h4 class="font-semibold text-slate-700">改进建议:</h4>
        <ul v-if="suggestions.length > 0" class="space-y-2">
          <li
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800"
          >
            <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {{ index + 1 }}
            </span>
            <span>{{ suggestion }}</span>
          </li>
        </ul>
        <p v-else class="text-slate-500 text-sm">加载中...</p>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-5xl mb-4">🎉</div>
      <h3 class="text-lg font-bold text-slate-700 mb-2">产线运行良好</h3>
      <p class="text-slate-500">当前未检测到明显瓶颈</p>
      <p class="text-sm text-slate-400 mt-2">所有工位利用率处于合理范围</p>
    </div>
  </div>
</template>
