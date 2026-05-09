<template>
  <div class="emergency-command-panel">
    <div class="health-indicator">
      <span class="health-label">桥梁健康状态:</span>
      <span class="health-status" :class="bridgeHealth">{{ bridgeHealth }}</span>
    </div>
    
    <div class="alerts-container">
      <h3>最新警报</h3>
      <ul class="alert-list">
        <li 
          v-for="alert in alerts" 
          :key="alert.id"
          class="alert-item"
          :class="alert.level"
        >
          <span class="alert-icon">{{ getAlertIcon(alert.level) }}</span>
          <div class="alert-content">
            <div class="alert-title">{{ alert.levelText }}: {{ alert.gaugeName }}</div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
          </div>
        </li>
        
        <li v-if="alerts.length === 0" class="alert-item normal">
          <span class="alert-icon">✓</span>
          <div class="alert-content">
            <div class="alert-title">正常</div>
            <div class="alert-message">当前无异常警报</div>
          </div>
        </li>
      </ul>
    </div>
    
    <div class="emergency-actions" v-if="hasEmergency">
      <button class="emergency-btn" @click="handleEmergencyAction('notify')">
        通知应急指挥中心
      </button>
      <button class="emergency-btn warning" @click="handleEmergencyAction('check')">
        启动紧急检查
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  alerts: {
    type: Array,
    default: () => []
  },
  bridgeHealth: {
    type: String,
    default: '良好'
  }
})

const emit = defineEmits(['alert'])

const hasEmergency = computed(() => {
  return props.alerts.some(alert => alert.level === 'critical' || alert.level === 'warning')
})

const getAlertIcon = (level) => {
  const icons = {
    normal: '✓',
    warning: '⚠',
    critical: '🚨'
  }
  return icons[level] || '•'
}

const formatTime = (timestamp) => {
  if (!timestamp) return '--'
  
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const handleEmergencyAction = (actionType) => {
  const alert = {
    id: `MANUAL-${Date.now()}`,
    level: actionType === 'notify' ? 'critical' : 'warning',
    levelText: actionType === 'notify' ? '紧急' : '警告',
    message: actionType === 'notify' ? '手动触发应急通知' : '手动触发紧急检查',
    timestamp: new Date().toISOString(),
    gaugeName: '手动操作'
  }
  
  emit('alert', alert)
}
</script>

<style scoped>
.emergency-command-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alerts-container h3 {
  font-size: 12px;
  color: #9e9e9e;
  margin-bottom: 8px;
  font-weight: 500;
}

.emergency-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.emergency-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 4px;
  background-color: #2a4a7a;
  color: #4fc3f7;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.emergency-btn:hover {
  background-color: #4fc3f7;
  color: #0a1a2e;
}

.emergency-btn.warning {
  background-color: #5d4037;
  color: #ff9800;
}

.emergency-btn.warning:hover {
  background-color: #ff9800;
  color: #0a1a2e;
}

.alert-list {
  max-height: 120px;
  overflow-y: auto;
}
</style>
