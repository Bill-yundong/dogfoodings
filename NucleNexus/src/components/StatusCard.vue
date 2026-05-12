<template>
  <div class="card">
    <h2>🚨 系统状态</h2>
    
    <div class="status-display">
      <div :class="['status-indicator', `status-${status}`]">
        <span class="status-icon">{{ statusIcon }}</span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>
    
    <div class="risk-meter">
      <div class="risk-label">风险指数</div>
      <div class="risk-bar-container">
        <div 
          class="risk-bar" 
          :style="{ width: `${riskScore}%`, background: riskColor }"
        ></div>
      </div>
      <div class="risk-value">{{ riskScore.toFixed(1) }}%</div>
    </div>
    
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">状态消息</span>
        <span class="info-value">{{ message }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">最后更新</span>
        <span class="info-value">{{ lastUpdate }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'normal'
  },
  message: {
    type: String,
    default: '系统运行正常'
  },
  lastUpdate: {
    type: String,
    default: '-'
  },
  riskScore: {
    type: Number,
    default: 0
  }
})

const statusIcon = computed(() => {
  const icons = {
    normal: '✓',
    warning: '⚠',
    danger: '🚨'
  }
  return icons[props.status] || '?'
})

const statusText = computed(() => {
  const texts = {
    normal: '正常运行',
    warning: '预警状态',
    danger: '危险状态'
  }
  return texts[props.status] || '未知'
})

const riskColor = computed(() => {
  if (props.riskScore < 30) return 'linear-gradient(90deg, #00ff88, #00cc6a)'
  if (props.riskScore < 70) return 'linear-gradient(90deg, #ffc107, #ff9800)'
  return 'linear-gradient(90deg, #ff4444, #cc0000)'
})
</script>

<style scoped>
.status-display {
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.1rem;
}

.status-icon {
  font-size: 1.5rem;
}

.risk-meter {
  margin-bottom: 20px;
}

.risk-label {
  color: #8892b0;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.risk-bar-container {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.risk-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease, background 0.5s ease;
}

.risk-value {
  color: #ffffff;
  font-weight: 700;
  font-size: 1.2rem;
  text-align: right;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.info-label {
  color: #8892b0;
  font-size: 0.9rem;
}

.info-value {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
}
</style>