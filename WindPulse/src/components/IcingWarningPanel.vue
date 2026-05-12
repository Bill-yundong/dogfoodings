<template>
  <div class="warning-panel">
    <div class="panel-header">
      <h2>结冰预警监控</h2>
      <div class="status-indicator" :class="currentRisk">
        {{ riskText }}
      </div>
    </div>

    <div class="warning-content">
      <div class="sensor-display">
        <div class="sensor-item">
          <span class="label">温度</span>
          <span class="value">{{ currentSensor.temperature.toFixed(1) }}°C</span>
        </div>
        <div class="sensor-item">
          <span class="label">湿度</span>
          <span class="value">{{ currentSensor.humidity.toFixed(1) }}%</span>
        </div>
        <div class="sensor-item">
          <span class="label">风速</span>
          <span class="value">{{ currentSensor.windSpeed.toFixed(1) }} m/s</span>
        </div>
        <div class="sensor-item">
          <span class="label">海拔</span>
          <span class="value">{{ currentSensor.altitude.toFixed(0) }} m</span>
        </div>
      </div>

      <div class="prediction-display">
        <div class="prediction-item large">
          <span class="label">预测覆冰质量</span>
          <span class="value highlight">{{ currentPrediction.icingMass.toFixed(2) }} kg/m²</span>
        </div>
        <div class="prediction-item">
          <span class="label">预测置信度</span>
          <span class="value">{{ (currentPrediction.confidence * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SensorData, IcingPrediction } from '../types'

const props = defineProps<{
  currentSensor: SensorData
  currentPrediction: IcingPrediction
}>()

const currentRisk = computed(() => props.currentPrediction.riskLevel)

const riskText = computed(() => {
  const texts: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '严重风险'
  }
  return texts[props.currentPrediction.riskLevel] || '未知'
})
</script>

<style scoped>
.warning-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.panel-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.status-indicator {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-indicator.low {
  background: #10b981;
  color: white;
}

.status-indicator.medium {
  background: #f59e0b;
  color: white;
}

.status-indicator.high {
  background: #ef4444;
  color: white;
}

.status-indicator.critical {
  background: #7c3aed;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.sensor-display {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sensor-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sensor-item .label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.sensor-item .value {
  font-size: 1.25rem;
  font-weight: 600;
}

.prediction-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prediction-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prediction-item.large {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3));
}

.prediction-item .label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.prediction-item .value {
  font-size: 1.1rem;
  font-weight: 600;
}

.prediction-item .value.highlight {
  font-size: 1.5rem;
  color: #60a5fa;
}
</style>