<script setup lang="ts">
import { computed } from 'vue'
import type { RiskLevel } from '@/types'

const props = defineProps<{
  level: RiskLevel
  score: number
}>()

const levelConfig = computed(() => {
  const configs: Record<RiskLevel, { color: string; bg: string; text: string; icon: string }> = {
    safe: { color: '#00B42A', bg: 'rgba(0, 180, 42, 0.1)', text: '安全', icon: '✓' },
    caution: { color: '#FF7D00', bg: 'rgba(255, 125, 0, 0.1)', text: '注意', icon: '!' },
    warning: { color: '#FF7D00', bg: 'rgba(255, 125, 0, 0.15)', text: '警告', icon: '⚠' },
    danger: { color: '#F53F3F', bg: 'rgba(245, 63, 63, 0.2)', text: '危险', icon: '✕' }
  }
  return configs[props.level]
})
</script>

<template>
  <div class="risk-indicator" :style="{ backgroundColor: levelConfig.bg, borderColor: levelConfig.color + '40' }">
    <span class="risk-icon" :style="{ color: levelConfig.color }">{{ levelConfig.icon }}</span>
    <div class="risk-info">
      <span class="risk-level" :style="{ color: levelConfig.color }">{{ levelConfig.text }}</span>
      <span class="risk-score">{{ score }}/100</span>
    </div>
    <div class="risk-bar">
      <div class="risk-fill" :style="{ width: `${score}%`, backgroundColor: levelConfig.color }"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.risk-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid;
}

.risk-icon {
  font-size: 20px;
  font-weight: bold;
  width: 24px;
  text-align: center;
}

.risk-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 60px;
}

.risk-level {
  font-size: 14px;
  font-weight: 600;
}

.risk-score {
  font-size: 11px;
  color: var(--text-tertiary);
}

.risk-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.risk-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
</style>
