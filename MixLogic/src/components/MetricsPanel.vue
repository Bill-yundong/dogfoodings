<template>
  <div class="metrics-panel">
    <h3 class="panel-title">📊 实时混合指标</h3>
    
    <div class="metrics-grid">
      <div class="metric-card primary">
        <div class="metric-icon">🎯</div>
        <div class="metric-content">
          <div class="metric-label">混合均匀度</div>
          <div class="metric-value">{{ (mixingQuality * 100).toFixed(1) }}%</div>
          <div class="metric-progress">
            <div class="progress-bar" :style="{ width: (mixingQuality * 100) + '%' }"></div>
          </div>
        </div>
      </div>
      
      <div class="metric-card danger" v-if="deadZoneRatio > 0">
        <div class="metric-icon">⚠️</div>
        <div class="metric-content">
          <div class="metric-label">死区占比</div>
          <div class="metric-value">{{ (deadZoneRatio * 100).toFixed(2) }}%</div>
          <div class="metric-progress danger">
            <div class="progress-bar" :style="{ width: (deadZoneRatio * 100) + '%' }"></div>
          </div>
        </div>
      </div>
      
      <div class="metric-card info">
        <div class="metric-icon">🔄</div>
        <div class="metric-content">
          <div class="metric-label">雷诺数</div>
          <div class="metric-value">{{ reynoldsNumber.toExponential(2) }}</div>
          <div class="metric-sub">
            <span :class="flowRegime.class">{{ flowRegime.text }}</span>
          </div>
        </div>
      </div>
      
      <div class="metric-card warning">
        <div class="metric-icon">⚙️</div>
        <div class="metric-content">
          <div class="metric-label">搅拌转速</div>
          <div class="metric-value">{{ impellerSpeed }} RPM</div>
          <div class="metric-sub">
            叶端线速: {{ tipSpeed.toFixed(1) }} m/s
          </div>
        </div>
      </div>
      
      <div class="metric-card success">
        <div class="metric-icon">📈</div>
        <div class="metric-content">
          <div class="metric-label">模拟进度</div>
          <div class="metric-value">{{ currentStep }} / {{ totalSteps }}</div>
          <div class="metric-progress success">
            <div class="progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-content">
          <div class="metric-label">运行时间</div>
          <div class="metric-value">{{ elapsedTime }}</div>
          <div class="metric-sub">
            预计剩余: {{ estimatedRemaining }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="status-badge" :class="mixingStatus.class">
      {{ mixingStatus.text }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mixingQuality: {
    type: Number,
    default: 0
  },
  deadZoneRatio: {
    type: Number,
    default: 0
  },
  reynoldsNumber: {
    type: Number,
    default: 0
  },
  impellerSpeed: {
    type: Number,
    default: 120
  },
  currentStep: {
    type: Number,
    default: 0
  },
  totalSteps: {
    type: Number,
    default: 1000
  },
  startTime: {
    type: Number,
    default: null
  }
})

const impellerDiameter = 0.6

const tipSpeed = computed(() => {
  const omega = (props.impellerSpeed * 2 * Math.PI) / 60
  return omega * (impellerDiameter / 2)
})

const progress = computed(() => {
  if (props.totalSteps === 0) return 0
  return Math.round((props.currentStep / props.totalSteps) * 100)
})

const flowRegime = computed(() => {
  const Re = props.reynoldsNumber
  if (Re < 1000) return { text: '层流', class: 'text-warning' }
  if (Re < 10000) return { text: '过渡流', class: 'text-primary' }
  return { text: '湍流', class: 'text-success' }
})

const mixingStatus = computed(() => {
  if (props.mixingQuality >= 0.95) return { text: '✓ 混合均匀', class: 'badge-success' }
  if (props.mixingQuality >= 0.7) return { text: '⟳ 混合良好', class: 'badge-info' }
  if (props.mixingQuality >= 0.4) return { text: '⟳ 混合中', class: 'badge-warning' }
  return { text: '✗ 混合差', class: 'badge-danger' }
})

const elapsedTime = computed(() => {
  if (!props.startTime) return '00:00:00'
  const elapsed = Date.now() - props.startTime
  return formatDuration(elapsed)
})

const estimatedRemaining = computed(() => {
  if (props.currentStep === 0 || !props.startTime) return '--:--:--'
  const elapsed = Date.now() - props.startTime
  const rate = props.currentStep / elapsed
  const remainingSteps = props.totalSteps - props.currentStep
  const remaining = remainingSteps / rate
  return formatDuration(remaining)
})

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
</script>

<style scoped>
.metrics-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.panel-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-glass);
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.metric-card:hover {
  border-color: var(--border);
  transform: translateY(-2px);
}

.metric-card.primary {
  border-left: 3px solid var(--primary);
}

.metric-card.danger {
  border-left: 3px solid var(--danger);
}

.metric-card.info {
  border-left: 3px solid #00d4ff;
}

.metric-card.warning {
  border-left: 3px solid var(--warning);
}

.metric-card.success {
  border-left: 3px solid var(--success);
}

.metric-icon {
  font-size: 28px;
  display: flex;
  align-items: flex-start;
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
}

.metric-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.metric-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.metric-progress.danger .progress-bar {
  background: linear-gradient(90deg, var(--danger), #ff6b6b);
}

.metric-progress.success .progress-bar {
  background: linear-gradient(90deg, var(--success), #00ff88);
}

.status-badge {
  margin-top: 16px;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
