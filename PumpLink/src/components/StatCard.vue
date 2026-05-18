<template>
  <div class="stat-card tech-card">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-text-secondary text-sm mb-1">{{ title }}</p>
        <p class="text-3xl font-bold font-mono text-text-primary" :style="{ color: valueColor }">{{ formattedValue }}</p>
        <p v-if="trend !== undefined" class="text-xs mt-1 flex items-center gap-1" :class="trend > 0 ? 'text-status-normal' : 'text-status-critical'">
          <el-icon :size="12">
            <component :is="trend > 0 ? 'Top' : 'Bottom'" />
          </el-icon>
          {{ Math.abs(trend) }}% {{ trendLabel }}
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg flex items-center justify-center" :style="{ background: bgColor }">
        <el-icon :size="24" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: number | string
  icon: string
  trend?: number
  trendLabel?: string
  color?: 'normal' | 'warning' | 'severe' | 'critical' | 'accent'
  suffix?: string
}>()

const colorMap = {
  normal: { bg: 'rgba(0, 200, 83, 0.15)', icon: '#00C853', text: '#00C853' },
  warning: { bg: 'rgba(255, 214, 0, 0.15)', icon: '#FFD600', text: '#FFD600' },
  severe: { bg: 'rgba(255, 145, 0, 0.15)', icon: '#FF9100', text: '#FF9100' },
  critical: { bg: 'rgba(255, 23, 68, 0.15)', icon: '#FF1744', text: '#FF1744' },
  accent: { bg: 'rgba(100, 255, 218, 0.15)', icon: '#64FFDA', text: '#64FFDA' }
}

const colors = computed(() => colorMap[props.color || 'accent'])
const bgColor = computed(() => colors.value.bg)
const iconColor = computed(() => colors.value.icon)
const valueColor = computed(() => colors.value.text)

const formattedValue = computed(() => {
  if (props.suffix) {
    return `${props.value}${props.suffix}`
  }
  return props.value
})
</script>
