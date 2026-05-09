<template>
  <div class="report-panel panel">
    <div class="panel-header">
      <span class="panel-title">结构健康日报</span>
      <button class="refresh-btn" @click="loadReports">刷新</button>
    </div>
    <div class="report-content">
      <div v-if="reports.length === 0" class="empty-state">
        <span>暂无日报数据</span>
        <button class="generate-btn" @click="generateTodayReport">生成今日报告</button>
      </div>
      <div v-else class="report-list">
        <div v-for="report in reports" :key="report.date" class="report-item">
          <div class="report-header">
            <span class="report-date">{{ formatDate(report.date) }}</span>
            <span
              class="health-indicator"
              :class="getHealthClass(report.averageHealthScore)"
            >
              {{ report.averageHealthScore }}分
            </span>
          </div>
          <div class="report-stats">
            <div class="stat">
              <span class="stat-num">{{ report.sensorCount }}</span>
              <span class="stat-desc">传感器</span>
            </div>
            <div class="stat">
              <span class="stat-num warning">{{ report.anomalyCount }}</span>
              <span class="stat-desc">异常</span>
            </div>
            <div class="stat">
              <span class="stat-num danger">{{ report.criticalAlerts }}</span>
              <span class="stat-desc">严重警报</span>
            </div>
          </div>
          <div v-if="report.topConcerns.length > 0" class="concerns">
            <div class="concerns-title">主要关注点</div>
            <div
              v-for="concern in report.topConcerns"
              :key="concern.sensorId"
              class="concern-item"
            >
              <span class="concern-id">{{ concern.sensorId }}</span>
              <span class="concern-status" :class="concern.status">
                {{ concern.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { DailyHealthReport } from '../types'
import { databaseService } from '../services/databaseService'

const reports = ref<DailyHealthReport[]>([])

const loadReports = async () => {
  try {
    reports.value = await databaseService.getDailyReports(7)
  } catch (error) {
    console.error('Failed to load reports:', error)
  }
}

const generateTodayReport = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    await databaseService.generateDailyReport(today)
    await loadReports()
  } catch (error) {
    console.error('Failed to generate report:', error)
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })
}

const getHealthClass = (score: number) => {
  if (score >= 80) return 'normal'
  if (score >= 60) return 'warning'
  return 'danger'
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.report-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.refresh-btn {
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: var(--primary-color);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(0, 212, 255, 0.3);
}

.report-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.generate-btn {
  margin-top: 16px;
  background: var(--primary-color);
  border: none;
  color: #000;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.report-date {
  font-weight: 600;
  font-size: 13px;
}

.health-indicator {
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.health-indicator.normal {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.health-indicator.warning {
  background: rgba(255, 170, 0, 0.2);
  color: #ffaa00;
}

.health-indicator.danger {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.report-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 18px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.stat-num.warning {
  color: #ffaa00;
}

.stat-num.danger {
  color: #ff4444;
}

.stat-desc {
  font-size: 10px;
  color: #666;
}

.concerns {
  border-top: 1px solid rgba(0, 212, 255, 0.1);
  padding-top: 8px;
}

.concerns-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
}

.concern-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.concern-id {
  color: #aaa;
}

.concern-status {
  text-transform: uppercase;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
}

.concern-status.normal {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.concern-status.warning {
  background: rgba(255, 170, 0, 0.2);
  color: #ffaa00;
}

.concern-status.danger {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.concern-status.critical {
  background: rgba(255, 0, 0, 0.3);
  color: #ff0000;
}
</style>
