<template>
  <div class="risk-indicator flex items-center gap-3">
    <div class="relative w-24 h-24">
      <svg class="w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(100, 255, 218, 0.1)" stroke-width="8" />
        <circle cx="50" cy="50" r="45" fill="none" :stroke="ringColor" stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="offset"
                transform="rotate(-90 50 50)"
                class="transition-all duration-1000 ease-out" />
        <circle cx="50" cy="50" r="45" fill="none" :stroke="ringColor" stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="offset"
                transform="rotate(-90 50 50)"
                filter="url(#glow)"
                class="transition-all duration-1000 ease-out opacity-50" />
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold font-mono" :style="{ color: textColor }">{{ displayValue }}</span>
        <span class="text-xs text-text-secondary">{{ levelText }}</span>
      </div>
    </div>
    <div class="flex-1">
      <p class="text-sm text-text-secondary mb-2">风险等级</p>
      <div class="h-2 bg-tech-bg rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-1000"
             :style="{ width: `${value}%`, background: bgGradient }"></div>
      </div>
      <div class="flex justify-between mt-1 text-xs">
        <span class="text-status-normal">低</span>
        <span class="text-status-warning">中</span>
        <span class="text-status-severe">高</span>
        <span class="text-status-critical">严重</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  level: 'low' | 'medium' | 'high' | 'critical'
}>()

const radius = 45
const circumference = 2 * Math.PI * radius

const displayValue = computed(() => Math.round(props.value))

const offset = computed(() => {
  const progress = props.value / 100
  return circumference * (1 - progress)
})

const ringColor = computed(() => {
  if (props.value < 25) return '#00C853'
  if (props.value < 50) return '#FFD600'
  if (props.value < 75) return '#FF9100'
  return '#FF1744'
})

const textColor = computed(() => ringColor.value)

const bgGradient = computed(() => {
  return `linear-gradient(90deg, #00C853 0%, #FFD600 33%, #FF9100 66%, #FF1744 100%)`
})

const levelText = computed(() => {
  const map = { low: '低风险', medium: '中风险', high: '高风险', critical: '严重' }
  return map[props.level]
})
</script>
