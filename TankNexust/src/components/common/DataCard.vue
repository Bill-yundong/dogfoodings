<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  trend: 'stable',
  color: 'text-accent-cyan'
})

const trendIcon = {
  up: '↑',
  down: '↓',
  stable: '→'
}

const trendColor = {
  up: 'text-risk-danger',
  down: 'text-risk-safe',
  stable: 'text-text-secondary'
}
</script>

<template>
  <div class="glass-card p-4">
    <div class="text-text-secondary text-sm mb-2">{{ title }}</div>
    <div class="flex items-end justify-between">
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-mono font-bold" :class="color">{{ value }}</span>
        <span v-if="unit" class="text-text-muted text-sm">{{ unit }}</span>
      </div>
      <span v-if="trend" class="text-lg" :class="trendColor[trend]">{{ trendIcon[trend] }}</span>
    </div>
  </div>
</template>
