<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDroneStore } from '@/stores/droneStore'
import { storeToRefs } from 'pinia'
import type { Waypoint } from '@/types'
import { generateId } from '@/utils/math'

const droneStore = useDroneStore()
const { droneList, missionList, isSimulating, simulationSpeed, activeDrones } = storeToRefs(droneStore)

const localSpeed = ref(1)
const selectedDroneId = ref<string>('')
const newDroneId = ref('')
const missionName = ref('')
const waypoints = ref<Waypoint[]>([])
const optimizationProgress = ref(0)
const isOptimizing = ref(false)
const activeTab = ref('drones')
const dbStats = ref<any>(null)
const syncStats = ref<any>(null)
const weatherStats = ref<any>(null)
const syncStatus = ref<any>(null)
const isSyncing = ref(false)
const syncResult = ref<any>(null)
const currentWindData = ref<any>(null)

const selectedDrone = computed(() => droneList.value.find(d => d.id === selectedDroneId.value))

function addNewDrone() {
  if (newDroneId.value.trim()) {
    droneStore.addDrone({ id: newDroneId.value.trim() })
    newDroneId.value = ''
  }
}

function removeDrone(droneId: string) {
  droneStore.removeDrone(droneId)
  if (selectedDroneId.value === droneId) {
    selectedDroneId.value = ''
  }
}

function addWaypoint() {
  const lastWaypoint = waypoints.value[waypoints.value.length - 1]
  const baseX = lastWaypoint ? lastWaypoint.position.x : 0
  const baseZ = lastWaypoint ? lastWaypoint.position.z : 0
  
  waypoints.value.push({
    id: generateId(),
    position: {
      x: baseX + (Math.random() - 0.5) * 100,
      y: 50 + Math.random() * 50,
      z: baseZ + (Math.random() - 0.5) * 100
    },
    gps: { latitude: 39.9, longitude: 116.4, altitude: 50 },
    speed: 8,
    waitTime: 0,
    actions: []
  })
}

function removeWaypoint(index: number) {
  waypoints.value.splice(index, 1)
}

async function createAndOptimizeMission() {
  if (!selectedDroneId.value || waypoints.value.length === 0) return

  const mission = droneStore.addMission({
    name: missionName.value || `任务 ${Date.now()}`,
    droneId: selectedDroneId.value,
    waypoints: waypoints.value,
    priority: 'medium',
    startTime: Date.now()
  })

  isOptimizing.value = true
  optimizationProgress.value = 0

  await droneStore.optimizeMissionPath(mission.id, (progress) => {
    optimizationProgress.value = progress
  })

  isOptimizing.value = false
  missionName.value = ''
  waypoints.value = []
}

const startMissionError = ref<string | null>(null)

async function startMission(missionId: string) {
  startMissionError.value = null
  const success = await droneStore.startMission(missionId)
  
  if (!success) {
    const mission = droneStore.missions.get(missionId)
    const drone = mission ? droneStore.drones.get(mission.droneId) : null
    
    if (!mission) {
      startMissionError.value = '任务不存在'
    } else if (!drone) {
      startMissionError.value = '无人机不存在'
    } else if (drone.status !== 'idle') {
      startMissionError.value = `无人机状态为 ${drone.status}，需要 idle 状态才能开始`
    } else {
      startMissionError.value = '无法开始任务，请检查无人机和路径优化状态'
    }
    
    setTimeout(() => {
      startMissionError.value = null
    }, 5000)
  }
}

function toggleSimulation() {
  if (isSimulating.value) {
    droneStore.stopSimulation()
  } else {
    droneStore.startSimulation()
  }
}

function setSpeed(speed: number) {
  localSpeed.value = speed
  droneStore.setSimulationSpeed(speed)
}

async function refreshStats() {
  try {
    dbStats.value = await droneStore.blackBoxDB.getStats()
    syncStats.value = await droneStore.blackBoxDB.getSyncState()
    syncStatus.value = droneStore.semanticSync.getSyncStatus()
    weatherStats.value = droneStore.weatherDynamics.getGridStats()
    
    const samplePosition = selectedDrone.value?.position || { x: 0, y: 50, z: 0 }
    currentWindData.value = droneStore.weatherDynamics.getWindAt(samplePosition)
  } catch (e) {
    console.error('Failed to refresh stats:', e)
  }
}

async function syncWithBackend() {
  if (isSyncing.value) return
  
  isSyncing.value = true
  syncResult.value = null
  
  try {
    const result = await droneStore.blackBoxDB.syncWithBackend(async (logs) => {
      console.log(`Syncing ${logs.length} logs...`)
      await new Promise(resolve => setTimeout(resolve, 500))
      return true
    })
    syncResult.value = result
    console.log('Sync result:', result)
  } catch (error) {
    console.error('Sync error:', error)
    syncResult.value = { success: false, error: String(error) }
  } finally {
    isSyncing.value = false
    refreshStats()
    
    setTimeout(() => {
      syncResult.value = null
    }, 5000)
  }
}

function generateDemoData() {
  const droneIds = ['drone-001', 'drone-002', 'drone-003', 'drone-004', 'drone-005']
  
  droneIds.forEach((id, index) => {
    droneStore.addDrone({
      id,
      position: {
        x: (index - 2) * 40,
        y: 50,
        z: -50
      }
    })
  })

  selectedDroneId.value = droneIds[0]

  for (let i = 0; i < 5; i++) {
    addWaypoint()
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString()
}

onMounted(() => {
  refreshStats()
  setInterval(refreshStats, 5000)
})
</script>

<template>
  <div class="control-panel">
    <div class="panel-header">
      <h2>DroneGrid 控制台</h2>
      <div class="simulation-controls">
        <button 
          class="btn" 
          :class="{ active: isSimulating }"
          @click="toggleSimulation"
        >
          {{ isSimulating ? '⏸ 暂停' : '▶ 开始' }}
        </button>
        <div class="speed-controls">
          <span>速度:</span>
          <button 
            v-for="speed in [0.5, 1, 2, 5]" 
            :key="speed"
            :class="{ active: localSpeed === speed }"
            @click="setSpeed(speed)"
          >
            {{ speed }}x
          </button>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button 
        v-for="tab in ['drones', 'missions', 'weather', 'database', 'sync']" 
        :key="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ { drones: '无人机', missions: '任务', weather: '气象', database: '数据库', sync: '同步' }[tab] }}
      </button>
    </div>

    <div class="tab-content">
      <div v-if="activeTab === 'drones'" class="tab-pane">
        <div class="section">
          <h3>添加无人机</h3>
          <div class="input-group">
            <input 
            v-model="newDroneId"
            placeholder="无人机ID"
            @keyup.enter="addNewDrone"
            />
            <button class="btn primary" @click="addNewDrone">添加</button>
          </div>
          <button class="btn secondary" @click="generateDemoData">生成演示数据</button>
        </div>

        <div class="section">
          <h3>无人机列表 ({{ droneList.length }})</h3>
          <div class="drone-list">
            <div 
              v-for="drone in droneList" 
              :key="drone.id"
              :class="{ selected: selectedDroneId === drone.id }"
              class="drone-item"
              @click="selectedDroneId = drone.id"
            >
              <div class="drone-header">
                <span class="drone-id">{{ drone.id }}</span>
                <span class="status-badge" :class="drone.status">{{ drone.status }}</span>
              </div>
              <div class="drone-stats">
                <span>电量: {{ drone.battery.toFixed(1) }}%</span>
                <span>高度: {{ drone.altitude.toFixed(0) }}m</span>
              </div>
              <button 
                class="btn danger small"
                @click.stop="removeDrone(drone.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedDrone" class="section">
          <h3>选中无人机详情</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">位置</span>
              <span class="value">
                ({{ selectedDrone.position.x.toFixed(1) }}, {{ selectedDrone.position.y.toFixed(1) }}, {{ selectedDrone.position.z.toFixed(1) }})
              </span>
            </div>
            <div class="detail-item">
              <span class="label">速度</span>
              <span class="value">
                {{ Math.sqrt(selectedDrone.velocity.x ** 2 + selectedDrone.velocity.y ** 2 + selectedDrone.velocity.z ** 2).toFixed(1) }} m/s
              </span>
            </div>
            <div class="detail-item">
              <span class="label">朝向</span>
              <span class="value">{{ selectedDrone.heading.toFixed(0) }}°</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'missions'" class="tab-pane">
        <div class="section">
          <h3>创建任务</h3>
          <div class="input-group">
            <input v-model="missionName" placeholder="任务名称" />
          </div>
          <div class="waypoints-section">
            <div class="section-header">
              <span>航点 ({{ waypoints.length }})</span>
              <button class="btn small" @click="addWaypoint">+ 添加航点</button>
            </div>
            <div class="waypoint-list">
              <div 
                v-for="(wp, index) in waypoints" 
                :key="wp.id"
                class="waypoint-item"
              >
                <span>{{ index + 1 }}. ({{ wp.position.x.toFixed(0) }}, {{ wp.position.y.toFixed(0) }}, {{ wp.position.z.toFixed(0) }})</span>
                <button class="btn danger small" @click="removeWaypoint(index)">×</button>
              </div>
            </div>
          </div>
          <button 
            class="btn primary"
            :disabled="!selectedDroneId || waypoints.length === 0 || isOptimizing"
            @click="createAndOptimizeMission"
          >
            {{ isOptimizing ? `优化中 ${optimizationProgress.toFixed(0)}%` : '创建并优化路径' }}
          </button>
        </div>

        <div class="section">
          <h3>任务列表</h3>
          <div v-if="startMissionError" class="sync-result error">
            ✗ {{ startMissionError }}
          </div>
          <div class="mission-list">
            <div 
              v-for="mission in missionList" 
              :key="mission.id"
              class="mission-item"
            >
              <div class="mission-header">
                <span class="mission-name">{{ mission.name }}</span>
                <span class="status-badge" :class="mission.status">{{ mission.status }}</span>
              </div>
              <div class="mission-stats">
                <span>航点: {{ mission.waypoints.length }}</span>
                <span v-if="mission.estimatedDuration">
                  预计: {{ formatTime(mission.estimatedDuration) }}
                </span>
              </div>
              <button 
                v-if="mission.status === 'pending'"
                class="btn primary small"
                @click="startMission(mission.id)"
              >
                开始
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'weather'" class="tab-pane">
        <div class="section">
          <h3>气象动力学模型</h3>
          <div v-if="weatherStats" class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">网格单元</span>
              <span class="stat-value">{{ weatherStats.totalCells }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">平均风速</span>
              <span class="stat-value">{{ weatherStats.avgWindSpeed?.toFixed(1) }} m/s</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">最大风速</span>
              <span class="stat-value">{{ weatherStats.maxWindSpeed?.toFixed(1) }} m/s</span>
            </div>
          </div>
          <div class="info-box">
            <p>💡 三维气象网格实时模拟风场、温度、气压和湍流</p>
          </div>
        </div>

        <div class="section">
          <h3>实时气象数据 {{ selectedDrone ? `(${selectedDrone.id})` : '(原点)' }}</h3>
          <div v-if="currentWindData" class="weather-details">
            <div class="weather-item">
              <div class="weather-icon">🌬️</div>
              <div class="weather-info">
                <span class="label">风速</span>
                <span class="value highlight">{{ currentWindData.speed.toFixed(1) }} m/s</span>
              </div>
              <div class="wind-direction">
                <div class="compass" :style="{ transform: `rotate(${currentWindData.direction}deg)` }">
                  <span>↑</span>
                </div>
                <span class="direction-text">{{ currentWindData.direction.toFixed(0) }}°</span>
              </div>
            </div>
            <div class="weather-item">
              <div class="weather-icon">🌀</div>
              <div class="weather-info">
                <span class="label">湍流强度</span>
                <span class="value" :class="{
                  'success': currentWindData.turbulence < 0.3,
                  'warning': currentWindData.turbulence >= 0.3 && currentWindData.turbulence < 0.5,
                  'danger': currentWindData.turbulence >= 0.5
                }">{{ (currentWindData.turbulence * 100).toFixed(0) }}%</span>
              </div>
            </div>
            <div class="weather-item">
              <div class="weather-icon">🌡️</div>
              <div class="weather-info">
                <span class="label">温度</span>
                <span class="value">{{ currentWindData.temperature.toFixed(1) }} °C</span>
              </div>
            </div>
            <div class="weather-item">
              <div class="weather-icon">📊</div>
              <div class="weather-info">
                <span class="label">气压</span>
                <span class="value">{{ currentWindData.pressure.toFixed(0) }} Pa</span>
              </div>
            </div>
            <div class="weather-item">
              <div class="weather-icon">💧</div>
              <div class="weather-info">
                <span class="label">湿度</span>
                <span class="value">{{ currentWindData.humidity.toFixed(0) }} %</span>
              </div>
            </div>
          </div>
          <div class="wind-visualization">
            <div class="wind-bar">
              <div class="wind-bar-fill" :style="{ width: `${Math.min(100, currentWindData?.speed * 5)}%` }"></div>
            </div>
            <div class="wind-labels">
              <span>0</span>
              <span>10</span>
              <span>20 m/s</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>风阻动能损耗估算</h3>
          <div v-if="currentWindData" class="energy-loss">
            <div class="detail-item">
              <span class="label">基础功耗</span>
              <span class="value">150 W</span>
            </div>
            <div class="detail-item">
              <span class="label">风阻功耗</span>
              <span class="value warning">{{ (currentWindData.speed * 15).toFixed(0) }} W</span>
            </div>
            <div class="detail-item">
              <span class="label">湍流惩罚</span>
              <span class="value danger">{{ (currentWindData.turbulence * 50).toFixed(0) }} W</span>
            </div>
            <div class="detail-item total">
              <span class="label">总估算功耗</span>
              <span class="value highlight">{{ (150 + currentWindData.speed * 15 + currentWindData.turbulence * 50).toFixed(0) }} W</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'database'" class="tab-pane">
        <div class="section">
          <h3>黑匣子数据库</h3>
          <div v-if="dbStats" class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">总日志</span>
              <span class="stat-value">{{ dbStats.totalLogs }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">已同步</span>
              <span class="stat-value success">{{ dbStats.syncedLogs }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">待同步</span>
              <span class="stat-value warning">{{ dbStats.unsyncedLogs }}</span>
            </div>
          </div>
          <div class="time-range">
            <div class="detail-item">
              <span class="label">最早日志</span>
              <span class="value">{{ formatDate(dbStats?.oldestLogTime) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">最新日志</span>
              <span class="value">{{ formatDate(dbStats?.newestLogTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'sync'" class="tab-pane">
        <div class="section">
          <h3>语义同步</h3>
          <div v-if="syncStatus" class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">待处理消息</span>
              <span class="stat-value warning">{{ syncStatus.pendingMessages }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">已同步消息</span>
              <span class="stat-value success">{{ syncStatus.totalSynced }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">订阅者</span>
              <span class="stat-value">{{ syncStatus.subscribers }}</span>
            </div>
          </div>
          <div class="detail-item">
            <span class="label">最后同步</span>
            <span class="value">{{ formatDate(syncStatus?.lastSyncTime) }}</span>
          </div>
          
          <div v-if="syncResult" class="sync-result" :class="{ success: syncResult.success, error: !syncResult.success }">
            <template v-if="syncResult.success">
              ✓ 同步成功：已同步 {{ syncResult.synced }} / {{ syncResult.total }} 条日志
            </template>
            <template v-else-if="syncResult.error">
              ✗ 同步失败：{{ syncResult.error }}
            </template>
            <template v-else>
              ⚠ 同步完成：0 条待同步日志
            </template>
          </div>
          
          <button 
            class="btn primary" 
            :disabled="isSyncing"
            @click="syncWithBackend"
          >
            {{ isSyncing ? '同步中...' : '立即同步' }}
          </button>
        </div>

        <div class="section">
          <h3>巡检终端 ↔ 空域监管</h3>
          <div class="sync-diagram">
            <div class="sync-node">
              <span class="node-label">巡检终端</span>
              <span class="node-status online">在线</span>
            </div>
            <div class="sync-arrow">⟷</div>
            <div class="sync-node">
              <span class="node-label">空域监管系统</span>
              <span class="node-status online">在线</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  width: 380px;
  height: 100%;
  background: rgba(10, 10, 30, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h2 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  color: #00d4ff;
}

.simulation-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.speed-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.speed-controls span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tabs button {
  flex: 1;
  padding: 12px 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.tabs button:hover {
  color: rgba(255, 255, 255, 0.8);
}

.tabs button.active {
  color: #00d4ff;
  border-bottom: 2px solid #00d4ff;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 15px;
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

input:focus {
  outline: none;
  border-color: #00d4ff;
}

.btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: #00d4ff;
  border-color: #00d4ff;
  color: #000;
}

.btn.primary:hover:not(:disabled) {
  background: #00b8e6;
}

.btn.secondary {
  background: transparent;
}

.btn.danger {
  background: #ff4444;
  border-color: #ff4444;
}

.btn.small {
  padding: 4px 8px;
  font-size: 11px;
}

.btn.active {
  background: #00d4ff;
  border-color: #00d4ff;
  color: #000;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  text-transform: uppercase;
}

.status-badge.idle { background: rgba(255, 255, 255, 0.2); }
.status-badge.flying { background: #4caf50; }
.status-badge.landing { background: #ff9800; }
.status-badge.charging { background: #2196f3; }
.status-badge.error { background: #f44336; }
.status-badge.pending { background: rgba(255, 255, 255, 0.3); }
.status-badge.in_progress { background: #ff9800; }
.status-badge.completed { background: #4caf50; }
.status-badge.failed { background: #f44336; }

.drone-list, .mission-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drone-item, .mission-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.drone-item:hover, .mission-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.drone-item.selected {
  border: 1px solid #00d4ff;
}

.drone-header, .mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.drone-id, .mission-name {
  font-weight: 500;
  font-size: 13px;
}

.drone-stats, .mission-stats {
  display: flex;
  gap: 15px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.waypoints-section {
  margin-bottom: 15px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.waypoint-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.waypoint-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  font-size: 11px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px 0;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
}

.stat-value.success {
  color: #4caf50;
}

.stat-value.warning {
  color: #ff9800;
}

.detail-grid {
  display: grid;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-item .label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.detail-item .value {
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.info-box {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.time-range {
  margin-top: 10px;
}

.sync-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px 0;
}

.sync-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.node-label {
  font-size: 12px;
}

.node-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #4caf50;
}

.sync-arrow {
  font-size: 24px;
  color: #00d4ff;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.sync-result {
  padding: 10px 12px;
  border-radius: 6px;
  margin: 10px 0;
  font-size: 12px;
}

.sync-result.success {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
  color: #4caf50;
}

.sync-result.error {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  color: #f44336;
}

.weather-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.weather-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.weather-icon {
  font-size: 24px;
}

.weather-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.weather-info .label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.weather-info .value {
  font-size: 14px;
  font-weight: 600;
  font-family: 'Monaco', 'Consolas', monospace;
}

.weather-info .value.highlight {
  color: #00d4ff;
}

.weather-info .value.success {
  color: #4caf50;
}

.weather-info .value.warning {
  color: #ff9800;
}

.weather-info .value.danger {
  color: #f44336;
}

.wind-direction {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.compass {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 212, 255, 0.2);
  border: 2px solid #00d4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.compass span {
  font-size: 12px;
  color: #00d4ff;
  font-weight: bold;
}

.direction-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.wind-visualization {
  margin-top: 10px;
}

.wind-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.wind-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #ff9800, #f44336);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.wind-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.energy-loss .detail-item.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  margin-top: 4px;
}

.energy-loss .detail-item.total .label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}
</style>
