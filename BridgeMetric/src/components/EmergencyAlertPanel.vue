<template>
  <div class="alert-panel panel">
    <div class="panel-header">
      <span class="panel-title">应急告警中心</span>
      <span class="alert-count" :class="{ active: urgentAlerts.length > 0 }">
        {{ urgentAlerts.length }}
      </span>
    </div>
    <div class="alert-content">
      <div v-if="urgentAlerts.length === 0" class="no-alerts">
        <div class="check-icon">✓</div>
        <span>当前无紧急告警</span>
      </div>
      <div v-else class="alert-list">
        <div
          v-for="alert in urgentAlerts"
          :key="alert.sensorId"
          class="alert-item"
          :class="alert.healthStatus"
        >
          <div class="alert-header">
            <span class="alert-indicator"></span>
            <span class="alert-sensor">{{ alert.sensorId }}</span>
            <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
          </div>
          <div class="alert-body">
            <div class="alert-type">{{ alert.semanticType }}</div>
            <div class="alert-value">
              当前值:
              <span class="value-highlight">{{ alert.value.toFixed(2) }}</span>
              {{ alert.unit }}
            </div>
            <div class="alert-recommendations">
              <div class="rec-title">建议措施:</div>
              <ul>
                <li v-for="(rec, idx) in alert.recommendations" :key="idx">{{ rec }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NormalizedData } from '../types'

const props = defineProps<{
  sensorData: NormalizedData[]
}>()

const urgentAlerts = computed(() => {
  return props.sensorData.filter(
    d => d.healthStatus === 'danger' || d.healthStatus === 'critical'
  )
})

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.alert-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.alert-count {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.alert-count.active {
  animation: alertPulse 1s infinite;
}

@keyframes alertPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.alert-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.no-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
}

.check-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 12px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  border-radius: 8px;
  padding: 12px;
  border-left: 4px solid;
}

.alert-item.danger {
  background: rgba(255, 68, 68, 0.1);
  border-color: #ff4444;
}

.alert-item.critical {
  background: rgba(255, 0, 0, 0.15);
  border-color: #ff0000;
  animation: criticalFlash 2s infinite;
}

@keyframes criticalFlash {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 0, 0, 0); }
  50% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.3); }
}

.alert-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.alert-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background: #ff4444;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.alert-sensor {
  font-weight: bold;
  flex: 1;
}

.alert-time {
  font-size: 11px;
  color: #888;
}

.alert-body {
  padding-left: 16px;
}

.alert-type {
  font-size: 12px;
  color: #ffaa00;
  margin-bottom: 4px;
}

.alert-value {
  font-size: 13px;
  margin-bottom: 8px;
}

.value-highlight {
  color: #ff4444;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.alert-recommendations {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 8px;
}

.rec-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.alert-recommendations ul {
  margin: 0;
  padding-left: 16px;
}

.alert-recommendations li {
  font-size: 11px;
  color: #ccc;
  line-height: 1.5;
}
</style>
