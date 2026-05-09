<template>
  <div class="sensor-panel panel">
    <div class="panel-header">
      <span class="panel-title">传感器实时数据</span>
      <span class="time-display">{{ currentTime }}</span>
    </div>
    <div class="sensor-list">
      <div
        v-for="data in sortedSensorData"
        :key="data.sensorId"
        class="sensor-item"
        :class="{ active: selectedSensorId === data.sensorId }"
        @click="$emit('select', data.sensorId)"
      >
        <div class="sensor-header">
          <span class="status-indicator" :class="`status-${data.healthStatus}`"></span>
          <span class="sensor-id">{{ data.sensorId }}</span>
          <span class="status-badge" :class="data.healthStatus">
            {{ getStatusEmphasis(data.healthStatus).level }}
          </span>
        </div>
        <div class="sensor-info">
          <div class="semantic-type">{{ data.semanticType }}</div>
          <div class="value-row">
            <span class="data-value" :style="{ color: getStatusEmphasis(data.healthStatus).color }">
              {{ formatValue(data.value) }}
            </span>
            <span class="data-unit">{{ data.unit }}</span>
          </div>
          <div class="threshold-bar">
            <div
              class="threshold-fill"
              :style="{
                width: `${Math.min(getValuePercentage(data), 100)}%`,
                backgroundColor: getStatusEmphasis(data.healthStatus).color
              }"
            ></div>
            <div class="threshold-mark warning"></div>
            <div class="threshold-mark danger"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { NormalizedData, HealthStatus, SystemType } from '../types'
import { semanticAlignmentService } from '../services/semanticAlignmentService'

const props = defineProps<{
  sensorData: NormalizedData[]
  selectedSensorId?: string
  systemType?: SystemType
}>()

defineEmits<{
  (e: 'select', sensorId: string): void
}>()

const currentTime = ref('')
let timeInterval: number | null = null

const statusOrder: Record<HealthStatus, number> = {
  critical: 0,
  danger: 1,
  warning: 2,
  normal: 3
}

const sortedSensorData = computed(() => {
  return [...props.sensorData].sort((a, b) => {
    return statusOrder[a.healthStatus] - statusOrder[b.healthStatus]
  })
})

const getStatusEmphasis = (status: HealthStatus) => {
  return semanticAlignmentService.getStatusEmphasis(
    status,
    props.systemType || 'operation_center'
  )
}

const formatValue = (value: number) => {
  if (Math.abs(value) >= 100) {
    return value.toFixed(0)
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1)
  }
  return value.toFixed(2)
}

const getValuePercentage = (data: NormalizedData) => {
  const sensorInfo = semanticAlignmentService.getSensorInfo(data.sensorId)
  if (!sensorInfo) return 0
  const absValue = Math.abs(data.value)
  return (absValue / sensorInfo.thresholds.critical) * 100
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.sensor-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.time-display {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary-color);
}

.sensor-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sensor-item {
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sensor-item:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
}

.sensor-item.active {
  border-color: var(--primary-color);
  background: rgba(0, 212, 255, 0.15);
}

.sensor-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.sensor-id {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: 600;
}

.status-badge.normal {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.status-badge.warning {
  background: rgba(255, 170, 0, 0.2);
  color: #ffaa00;
}

.status-badge.danger {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.status-badge.critical {
  background: rgba(255, 0, 0, 0.3);
  color: #ff0000;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sensor-info {
  padding-left: 16px;
}

.semantic-type {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.value-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.threshold-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
  overflow: visible;
}

.threshold-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.threshold-mark {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 8px;
}

.threshold-mark.warning {
  left: 42.85%;
  background: #ffaa00;
}

.threshold-mark.danger {
  left: 71.42%;
  background: #ff4444;
}
</style>
