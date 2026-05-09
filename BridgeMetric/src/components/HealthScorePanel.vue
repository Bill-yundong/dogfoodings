<template>
  <div class="health-panel panel">
    <div class="panel-header">
      <span class="panel-title">桥梁健康指数</span>
    </div>
    <div class="health-content">
      <div class="score-display">
        <svg class="score-circle" viewBox="0 0 120 120">
          <defs>
            <linearGradient :id="`gradient-${scoreColorKey}`" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" :style="{ stopColor: scoreColor }" />
              <stop offset="100%" :style="{ stopColor: scoreColorDark }" />
            </linearGradient>
          </defs>
          <circle
            class="score-bg"
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
          />
          <circle
            class="score-progress"
            cx="60"
            cy="60"
            r="52"
            fill="none"
            :stroke="`url(#gradient-${scoreColorKey})`"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div class="score-value-container">
          <span class="score-value" :style="{ color: scoreColor }">{{ displayScore }}</span>
          <span class="score-label">健康指数</span>
        </div>
      </div>
      <div class="health-stats">
        <div class="stat-item">
          <span class="stat-label">总传感器</span>
          <span class="stat-value">{{ totalSensors }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">正常运行</span>
          <span class="stat-value normal">{{ normalCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">异常预警</span>
          <span class="stat-value warning">{{ warningCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">严重警报</span>
          <span class="stat-value danger">{{ dangerCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NormalizedData } from '../types'

const props = defineProps<{
  sensorData: NormalizedData[]
  healthScore: number
}>()

const displayScore = ref(0)
const circumference = 2 * Math.PI * 52

const dashOffset = computed(() => {
  return circumference * (1 - displayScore.value / 100)
})

const totalSensors = computed(() => props.sensorData.length)

const normalCount = computed(() =>
  props.sensorData.filter(d => d.healthStatus === 'normal').length
)

const warningCount = computed(() =>
  props.sensorData.filter(d => d.healthStatus === 'warning').length
)

const dangerCount = computed(() =>
  props.sensorData.filter(d =>
    d.healthStatus === 'danger' || d.healthStatus === 'critical'
  ).length
)

const scoreColorKey = computed(() => {
  if (props.healthScore >= 80) return 'normal'
  if (props.healthScore >= 60) return 'warning'
  if (props.healthScore >= 40) return 'danger'
  return 'critical'
})

const scoreColor = computed(() => {
  const colors: Record<string, string> = {
    normal: '#00ff88',
    warning: '#ffaa00',
    danger: '#ff4444',
    critical: '#ff0000'
  }
  return colors[scoreColorKey.value]
})

const scoreColorDark = computed(() => {
  const colors: Record<string, string> = {
    normal: '#00cc6a',
    warning: '#cc8800',
    danger: '#cc3333',
    critical: '#cc0000'
  }
  return colors[scoreColorKey.value]
})

watch(
  () => props.healthScore,
  (newScore) => {
    const startScore = displayScore.value
    const diff = newScore - startScore
    const duration = 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      displayScore.value = Math.round(startScore + diff * progress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  },
  { immediate: true }
)
</script>

<style scoped>
.health-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.health-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.score-display {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 20px;
}

.score-circle {
  width: 100%;
  height: 100%;
}

.score-progress {
  transition: stroke-dashoffset 0.5s ease;
}

.score-value-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  display: block;
  font-size: 36px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.score-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.health-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  background: rgba(0, 212, 255, 0.05);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.stat-value.normal {
  color: #00ff88;
}

.stat-value.warning {
  color: #ffaa00;
}

.stat-value.danger {
  color: #ff4444;
}
</style>
