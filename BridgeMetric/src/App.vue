<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-section">
        <div class="logo-icon">
          <svg viewBox="0 0 40 40" width="32" height="32">
            <path
              d="M2 25 L10 15 L30 15 L38 25"
              stroke="#00d4ff"
              stroke-width="2"
              fill="none"
            />
            <line x1="10" y1="15" x2="10" y2="35" stroke="#00d4ff" stroke-width="2" />
            <line x1="30" y1="15" x2="30" y2="35" stroke="#00d4ff" stroke-width="2" />
            <circle cx="20" cy="20" r="3" fill="#00ff88" />
          </svg>
        </div>
        <div class="logo-text">
          <h1 class="glow-text">BridgeMetric</h1>
          <p>特大桥梁结构健康监测系统</p>
        </div>
      </div>
      <div class="system-tabs">
        <button
          class="tab-btn"
          :class="{ active: currentSystem === 'operation_center' }"
          @click="switchSystem('operation_center')"
        >
          <span class="tab-icon">⚙️</span>
          运维中枢
        </button>
        <button
          class="tab-btn"
          :class="{ active: currentSystem === 'emergency_command' }"
          @click="switchSystem('emergency_command')"
        >
          <span class="tab-icon">🚨</span>
          应急指挥
        </button>
      </div>
      <div class="header-actions">
        <div class="connection-status">
          <span class="status-dot connected"></span>
          <span>数据连接正常</span>
        </div>
        <button class="action-btn" @click="toggleAnomaly">
          {{ anomalyEnabled ? '关闭' : '开启' }}异常模拟
        </button>
      </div>
    </header>

    <main class="main-content">
      <aside class="left-panel">
        <div class="panel-section">
          <HealthScorePanel
            :sensor-data="normalizedData"
            :health-score="healthScore"
          />
        </div>
        <div class="panel-section">
          <DailyReportPanel />
        </div>
      </aside>

      <section class="center-panel">
        <div class="viewer-container">
          <Bridge3DViewer
            ref="viewerRef"
            :pose="currentPose"
            :sensor-data="normalizedData"
            :selected-sensor-id="selectedSensorId"
          />
          <div class="viewer-overlay">
            <div class="viewer-controls">
              <button class="control-btn" @click="resetView">
                重置视角
              </button>
            </div>
          </div>
        </div>
        <div class="bridge-info-bar">
          <div class="info-item">
            <span class="info-label">桥梁名称</span>
            <span class="info-value">长江特大悬索桥</span>
          </div>
          <div class="info-item">
            <span class="info-label">桥梁类型</span>
            <span class="info-value">双塔式悬索桥</span>
          </div>
          <div class="info-item">
            <span class="info-label">主跨长度</span>
            <span class="info-value">1,650m</span>
          </div>
          <div class="info-item">
            <span class="info-label">传感器数量</span>
            <span class="info-value">{{ normalizedData.length }} 台</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新频率</span>
            <span class="info-value">1Hz</span>
          </div>
        </div>
      </section>

      <aside class="right-panel">
        <div class="panel-section" v-if="currentSystem === 'operation_center'">
          <SensorDataPanel
            :sensor-data="normalizedData"
            :selected-sensor-id="selectedSensorId"
            :system-type="currentSystem"
            @select="selectSensor"
          />
        </div>
        <div class="panel-section" v-else>
          <EmergencyAlertPanel :sensor-data="normalizedData" />
        </div>
        <div class="panel-section" v-if="selectedSensorId">
          <div class="sensor-detail panel">
            <div class="panel-header">
              <span class="panel-title">传感器详情 - {{ selectedSensorId }}</span>
              <button class="close-btn" @click="selectedSensorId = undefined">×</button>
            </div>
            <div class="detail-content">
              <div v-if="selectedSensorInfo" class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">传感器名称</span>
                  <span class="detail-value">{{ selectedSensorInfo.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">传感器类型</span>
                  <span class="detail-value">{{ getSensorTypeName(selectedSensorInfo.type) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">安装位置</span>
                  <span class="detail-value">{{ selectedSensorInfo.location.description }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">结构类型</span>
                  <span class="detail-value">{{ getStructureTypeName(selectedSensorInfo.location.structureType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">预警阈值</span>
                  <span class="detail-value warning">{{ selectedSensorInfo.thresholds.warning }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">警报阈值</span>
                  <span class="detail-value danger">{{ selectedSensorInfo.thresholds.danger }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">紧急阈值</span>
                  <span class="detail-value critical">{{ selectedSensorInfo.thresholds.critical }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <footer class="app-footer">
      <div class="footer-info">
        <span>© 2024 BridgeMetric 桥梁结构健康监测系统</span>
        <span>|</span>
        <span>数据更新: {{ lastUpdateTime }}</span>
        <span>|</span>
        <span>历史数据: {{ recordCount }} 条</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Bridge3DViewer from './components/Bridge3DViewer.vue'
import SensorDataPanel from './components/SensorDataPanel.vue'
import HealthScorePanel from './components/HealthScorePanel.vue'
import DailyReportPanel from './components/DailyReportPanel.vue'
import EmergencyAlertPanel from './components/EmergencyAlertPanel.vue'
import type { NormalizedData, BridgePose, SystemType, SensorInfo } from './types'
import { dataSimulationService } from './services/dataSimulationService'
import { semanticAlignmentService } from './services/semanticAlignmentService'
import { databaseService } from './services/databaseService'
import { sensorTypeLabels, structureTypeLabels } from './data/semanticMapping'

const viewerRef = ref<InstanceType<typeof Bridge3DViewer> | null>(null)
const currentSystem = ref<SystemType>('operation_center')
const rawData = ref(dataSimulationService.generateAllSensorData())
const currentPose = ref<BridgePose | null>(dataSimulationService.generateBridgePose())
const selectedSensorId = ref<string | undefined>()
const lastUpdateTime = ref('--:--:--')
const recordCount = ref(0)
const anomalyEnabled = ref(false)

let dataInterval: number | null = null

const normalizedData = computed<NormalizedData[]>(() => {
  return semanticAlignmentService.normalizeBatchForSystem(
    rawData.value,
    currentSystem.value
  )
})

const healthScore = computed(() => {
  return semanticAlignmentService.calculateHealthScore(normalizedData.value)
})

const selectedSensorInfo = computed<SensorInfo | undefined>(() => {
  if (!selectedSensorId.value) return undefined
  return semanticAlignmentService.getSensorInfo(selectedSensorId.value)
})

const updateData = async () => {
  const now = Date.now()
  rawData.value = dataSimulationService.generateAllSensorData(now)
  currentPose.value = dataSimulationService.generateBridgePose(now)

  try {
    const healthRecords = normalizedData.value.map(data => {
      const sensorInfo = semanticAlignmentService.getSensorInfo(data.sensorId)
      return {
        id: `${data.sensorId}-${data.timestamp}`,
        timestamp: data.timestamp,
        sensorId: data.sensorId,
        sensorType: sensorInfo?.type || 'strain_gauge',
        structureType: sensorInfo?.location.structureType || 'main_girder',
        value: data.value,
        unit: data.unit,
        healthStatus: data.healthStatus,
        threshold: {
          warning: sensorInfo?.thresholds.warning || 0,
          danger: sensorInfo?.thresholds.danger || 0,
          critical: sensorInfo?.thresholds.critical || 0
        }
      }
    })

    const rawDataClean = rawData.value.map(data => ({
      id: data.id,
      sensorId: data.sensorId,
      type: data.type,
      bridgeStructureType: data.bridgeStructureType,
      timestamp: data.timestamp,
      value: data.value,
      unit: data.unit,
      temperature: data.temperature ?? null,
      rawValue: data.rawValue ?? null,
      calibratedValue: data.calibratedValue ?? null,
      metadata: data.metadata || null
    }))

    await databaseService.addHealthRecords(healthRecords)
    await databaseService.addRawSensorDataBatch(rawDataClean)

    const stats = await databaseService.getDatabaseStats()
    recordCount.value = stats.healthRecordCount
  } catch (error) {
    console.error('Failed to save data:', error)
  }

  lastUpdateTime.value = new Date(now).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const switchSystem = (system: SystemType) => {
  currentSystem.value = system
}

const selectSensor = (sensorId: string) => {
  selectedSensorId.value = sensorId
}

const resetView = () => {
  viewerRef.value?.resetView()
}

const toggleAnomaly = () => {
  anomalyEnabled.value = !anomalyEnabled.value
  dataSimulationService.setAnomalyProbability(
    anomalyEnabled.value ? 0.15 : 0.05
  )
}

const getSensorTypeName = (type: string) => {
  return sensorTypeLabels[type as keyof typeof sensorTypeLabels]?.cn || type
}

const getStructureTypeName = (type: string) => {
  return structureTypeLabels[type as keyof typeof structureTypeLabels]?.cn || type
}

onMounted(async () => {
  try {
    await databaseService.init()
    const stats = await databaseService.getDatabaseStats()
    recordCount.value = stats.healthRecordCount
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  await updateData()
  dataInterval = window.setInterval(updateData, 1000)
})

onUnmounted(() => {
  if (dataInterval) {
    clearInterval(dataInterval)
  }
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}

.app-header {
  height: 64px;
  background: linear-gradient(180deg, rgba(15, 25, 45, 0.95) 0%, rgba(15, 25, 45, 0.8) 100%);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 32px;
  backdrop-filter: blur(10px);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--primary-color);
}

.logo-text p {
  font-size: 11px;
  color: #888;
  margin: 0;
  letter-spacing: 0.5px;
}

.system-tabs {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  background: var(--primary-color);
  color: #000;
  font-weight: 600;
}

.tab-icon {
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #aaa;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
}

.action-btn {
  padding: 6px 16px;
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: var(--primary-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 212, 255, 0.3);
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 340px;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.panel-section {
  flex: 1;
  min-height: 0;
}

.center-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.viewer-container {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
}

.viewer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.viewer-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.control-btn {
  padding: 8px 16px;
  background: rgba(15, 25, 45, 0.9);
  border: 1px solid var(--border-color);
  color: var(--primary-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(0, 212, 255, 0.2);
}

.bridge-info-bar {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: #666;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.sensor-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.close-btn:hover {
  color: #fff;
}

.detail-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  color: #666;
}

.detail-value {
  font-size: 13px;
  color: #e0e0e0;
}

.detail-value.warning {
  color: #ffaa00;
}

.detail-value.danger {
  color: #ff4444;
}

.detail-value.critical {
  color: #ff0000;
}

.app-footer {
  height: 40px;
  background: rgba(15, 25, 45, 0.95);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #666;
}
</style>
