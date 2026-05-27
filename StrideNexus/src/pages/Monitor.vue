<script setup lang="ts">
import { computed } from 'vue'
import { useMonitorStore } from '@/stores/monitor'
import PressureHeatmap from '@/components/PressureHeatmap.vue'
import CadenceChart from '@/components/CadenceChart.vue'
import PostureViewer from '@/components/PostureViewer.vue'
import FatiguePanel from '@/components/FatiguePanel.vue'

const monitorStore = useMonitorStore()

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const elapsedTimeFormatted = computed(() => formatTime(monitorStore.elapsedTime))

const handleStart = () => {
  monitorStore.startSession()
}

const handlePause = () => {
  monitorStore.pauseSession()
}

const handleEnd = () => {
  monitorStore.endSession()
}
</script>

<template>
  <div class="monitor-page">
    <div class="monitor-header">
      <div class="session-controls">
        <template v-if="!monitorStore.isRunning">
          <el-button type="primary" size="large" @click="handleStart">
            <el-icon><VideoPlay /></el-icon>
            开始监测
          </el-button>
        </template>
        <template v-else>
          <el-button size="large" @click="handlePause">
            <el-icon><VideoPause /></el-icon>
            暂停
          </el-button>
          <el-button type="danger" size="large" @click="handleEnd">
            <el-icon><CircleClose /></el-icon>
            结束
          </el-button>
        </template>
      </div>
      
      <div class="session-stats">
        <div class="stat-item">
          <span class="stat-label">运动时长</span>
          <span class="stat-value font-display">{{ elapsedTimeFormatted }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">距离</span>
          <span class="stat-value font-display">{{ monitorStore.distance }} <small>km</small></span>
        </div>
        <div class="stat-item">
          <span class="stat-label">步数</span>
          <span class="stat-value font-display">{{ monitorStore.steps.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均步频</span>
          <span class="stat-value font-display">{{ monitorStore.avgCadence }} <small>SPM</small></span>
        </div>
      </div>
    </div>

    <div class="risk-banner" :class="`risk-${monitorStore.currentRiskLevel}`">
      <div class="risk-info">
        <span class="risk-icon">
          <el-icon v-if="monitorStore.currentRiskLevel === 'safe'"><CircleCheck /></el-icon>
          <el-icon v-else-if="monitorStore.currentRiskLevel === 'caution'"><Warning /></el-icon>
          <el-icon v-else><CircleClose /></el-icon>
        </span>
        <div>
          <span class="risk-status">{{ monitorStore.currentRiskText }}</span>
          <span class="risk-score">风险评分: {{ monitorStore.fatigueState?.score || 0 }}/100</span>
        </div>
      </div>
      <div class="risk-recommendation" v-if="monitorStore.fatigueState?.recommendations[0]">
        {{ monitorStore.fatigueState.recommendations[0] }}
      </div>
    </div>

    <div class="monitor-grid">
      <div class="grid-col-main">
        <div class="card heatmap-card">
          <div class="card-header">
            <h3><el-icon><DataLine /></el-icon> 足底压力分布</h3>
            <span class="card-badge">实时</span>
          </div>
          <PressureHeatmap :pressure-data="monitorStore.currentPressureData" />
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3><el-icon><TrendCharts /></el-icon> 步频周期分析</h3>
          </div>
          <CadenceChart :cadence-history="monitorStore.cadenceHistory" />
        </div>
      </div>

      <div class="grid-col-side">
        <div class="card posture-card">
          <div class="card-header">
            <h3><el-icon><Position /></el-icon> 姿态监测</h3>
            <span v-if="monitorStore.posturePrediction" class="prediction-badge">
              <el-icon><MagicStick /></el-icon> AI预测中
            </span>
          </div>
          <PostureViewer 
            :posture-data="monitorStore.currentPostureData"
            :prediction="monitorStore.posturePrediction"
          />
        </div>

        <div class="card fatigue-card">
          <div class="card-header">
            <h3><el-icon><Clock /></el-icon> 疲劳状态分析</h3>
          </div>
          <FatiguePanel :fatigue-state="monitorStore.fatigueState" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.monitor-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.session-controls {
  display: flex;
  gap: 12px;
}

.session-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  
  small {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.risk-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  gap: 20px;
  transition: all var(--transition-normal);
}

.risk-safe {
  background: linear-gradient(135deg, rgba(0, 180, 42, 0.15), rgba(0, 180, 42, 0.05));
  border: 1px solid rgba(0, 180, 42, 0.3);
}

.risk-caution, .risk-warning {
  background: linear-gradient(135deg, rgba(255, 125, 0, 0.15), rgba(255, 125, 0, 0.05));
  border: 1px solid rgba(255, 125, 0, 0.3);
}

.risk-danger {
  background: linear-gradient(135deg, rgba(245, 63, 63, 0.2), rgba(245, 63, 63, 0.05));
  border: 1px solid rgba(245, 63, 63, 0.4);
  animation: pulse-danger 2s infinite;
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 63, 63, 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(245, 63, 63, 0); }
}

.risk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.risk-icon {
  font-size: 24px;
}

.risk-status {
  display: block;
  font-size: 16px;
  font-weight: 600;
}

.risk-score {
  font-size: 12px;
  opacity: 0.8;
}

.risk-recommendation {
  font-size: 14px;
  font-style: italic;
}

.monitor-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
}

.grid-col-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grid-col-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.card-badge {
  padding: 4px 10px;
  background: rgba(22, 93, 255, 0.15);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.prediction-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 125, 0, 0.15);
  color: var(--accent-color);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.heatmap-card {
  flex: 1;
}

.chart-card {
  height: 280px;
}

.posture-card {
  height: 320px;
}

.fatigue-card {
  flex: 1;
}
</style>
