<template>
  <div class="cyber-card-hover group">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-cyber-text-secondary mb-1">{{ title }}</p>
        <p class="text-2xl font-bold font-mono text-cyber-text group-hover:text-electric-blue transition-colors">
          {{ formattedValue }}
        </p>
        <p v-if="subtitle" class="text-xs text-cyber-text-muted mt-1">{{ subtitle }}</p>
      </div>
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        :class="iconBgClass"
      >
        <component :is="iconComponent" class="w-6 h-6" :class="iconClass" />
      </div>
    </div>
    
    <div v-if="trend !== undefined" class="mt-3 flex items-center gap-1">
      <component
        :is="trend >= 0 ? icons.TrendingUp : icons.TrendingDown"
        class="w-4 h-4"
        :class="trend >= 0 ? 'text-success-green' : 'text-error-red'"
      />
      <span
        class="text-xs font-medium"
        :class="trend >= 0 ? 'text-success-green' : 'text-error-red'"
      >
        {{ trend >= 0 ? '+' : '' }}{{ trend }}%
      </span>
      <span class="text-xs text-cyber-text-muted">较昨日</span>
    </div>

    <div v-if="progress !== undefined" class="mt-3">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-cyber-text-secondary">{{ progressLabel }}</span>
        <span class="text-cyber-text font-mono">{{ progress }}%</span>
      </div>
      <div class="cyber-progress-bar">
        <div
          class="cyber-progress-fill"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'

const icons = {
  TrendingUp,
  TrendingDown
}

const props = defineProps<{
  title: string
  value: number | string
  subtitle?: string
  icon: Component
  iconVariant?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  trend?: number
  progress?: number
  progressLabel?: string
  format?: 'number' | 'bytes' | 'percent' | 'time'
}>()

const iconComponent = computed(() => props.icon)

const iconBgClass = computed(() => {
  const variants: Record<string, string> = {
    blue: 'bg-electric-blue/10',
    green: 'bg-success-green/10',
    orange: 'bg-warning-orange/10',
    red: 'bg-error-red/10',
    purple: 'bg-electric-purple/10'
  }
  return variants[props.iconVariant || 'blue']
})

const iconClass = computed(() => {
  const variants: Record<string, string> = {
    blue: 'text-electric-blue',
    green: 'text-success-green',
    orange: 'text-warning-orange',
    red: 'text-error-red',
    purple: 'text-electric-purple'
  }
  return variants[props.iconVariant || 'blue']
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  
  switch (props.format) {
    case 'bytes':
      return formatBytes(props.value)
    case 'percent':
      return `${props.value.toFixed(1)}%`
    case 'time':
      return formatTime(props.value)
    case 'number':
    default:
      return formatNumber(props.value)
  }
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}
</script>
