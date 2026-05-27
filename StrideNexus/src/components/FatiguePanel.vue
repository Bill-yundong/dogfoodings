<script setup lang="ts">
import { computed } from 'vue'
import type { FatigueState } from '@/types'

const props = defineProps<{
  fatigueState: FatigueState | null
}>()

const getLevelColor = (level: string) => {
  switch (level) {
    case 'low': return '#00B42A'
    case 'moderate': return '#FF7D00'
    case 'high': return '#FF7D00'
    case 'critical': return '#F53F3F'
    default: return '#86909C'
  }
}

const getLevelText = (level: string) => {
  switch (level) {
    case 'low': return '轻度'
    case 'moderate': return '中度'
    case 'high': return '高度'
    case 'critical': return '严重'
    default: return '未知'
  }
}

const fatigueScore = computed(() => props.fatigueState?.score || 0)
const fatigueLevel = computed(() => props.fatigueState?.level || 'low')
const factors = computed(() => props.fatigueState?.factors || {
  cadenceVariation: 0,
  pressureDistribution: 0,
  postureStability: 0,
  groundContactTime: 0,
  pronationExtreme: 0
})
const recommendations = computed(() => props.fatigueState?.recommendations || [])

const factorLabels: Record<string, string> = {
  cadenceVariation: '步频波动',
  pressureDistribution: '压力分布',
  postureStability: '姿态稳定',
  groundContactTime: '触地时间',
  pronationExtreme: '内旋异常'
}
</script>

<template>
  <div class="fatigue-panel">
    <div class="fatigue-overview">
      <div class="fatigue-score">
        <div class="score-ring">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="40" />
            <circle 
              class="ring-progress" 
              cx="50" 
              cy="50" 
              r="40"
              :stroke="getLevelColor(fatigueLevel)"
              :stroke-dasharray="`${fatigueScore * 2.51} 251`"
            />
          </svg>
          <div class="score-content">
            <span class="score-value font-display">{{ fatigueScore }}</span>
            <span class="score-label">疲劳指数</span>
          </div>
        </div>
        <div class="level-badge" :style="{ backgroundColor: getLevelColor(fatigueLevel) + '20', color: getLevelColor(fatigueLevel) }">
          {{ getLevelText(fatigueLevel) }}
        </div>
      </div>
    </div>

    <div class="factors-list">
      <div class="factor-item" v-for="(value, key) in factors" :key="key">
        <span class="factor-label">{{ factorLabels[key] || key }}</span>
        <div class="factor-bar">
          <div 
            class="factor-fill" 
            :style="{ 
              width: `${value * 100}%`,
              backgroundColor: value > 0.6 ? '#F53F3F' : value > 0.3 ? '#FF7D00' : '#00B42A'
            }"
          ></div>
        </div>
      </div>
    </div>

    <div class="recommendations" v-if="recommendations.length > 0">
      <div class="recommendations-header">
        <el-icon><Tips /></el-icon>
        <span>康复建议</span>
      </div>
      <ul class="recommendations-list">
        <li v-for="(rec, index) in recommendations.slice(0, 4)" :key="index">
          {{ rec }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fatigue-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.fatigue-overview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.fatigue-score {
  position: relative;
  width: 100px;
  height: 100px;
}

.score-ring {
  position: relative;
  width: 100%;
  height: 100%;
}

.score-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--bg-tertiary);
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.score-label {
  display: block;
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.level-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.factors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.factor-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.factor-label {
  width: 70px;
  font-size: 12px;
  color: var(--text-secondary);
}

.factor-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.recommendations {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.recommendations-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.recommendations-list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  
  li {
    margin-bottom: 4px;
    line-height: 1.4;
  }
}
</style>
