<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">🔥</div>
          <div class="logo-text">
            <h1>HeatNexus</h1>
            <p>供热管网热平衡仿真系统</p>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-item">
            <div class="stat-value">{{ stats.nodeCount.toLocaleString() }}</div>
            <div class="stat-label">供热节点</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.historyCount.toLocaleString() }}</div>
            <div class="stat-label">历史记录</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" :class="{ 'badge-success': syncStatus.status === 'synced' }">
              {{ syncStatus.status === 'synced' ? '同步中' : syncStatus.status === 'error' ? '错误' : '就绪' }}
            </div>
            <div class="stat-label">实时同步</div>
          </div>
        </div>
      </div>
    </header>

    <main class="main-container">
      <div class="controls">
        <button 
          class="btn btn-primary"
          @click="initializeNetwork"
          :disabled="isInitializing"
        >
          <span>{{ isInitializing ? '初始化中...' : '🚀 初始化管网' }}</span>
        </button>
        
        <button 
          class="btn"
          :class="isSimulating ? 'btn-active' : 'btn-secondary'"
          @click="toggleSimulation"
        >
          <span>{{ isSimulating ? '⏸ 停止模拟' : '▶ 开始模拟' }}</span>
        </button>
        
        <button 
          class="btn"
          :class="isSyncing ? 'btn-active' : 'btn-secondary'"
          @click="toggleSync"
        >
          <span>{{ isSyncing ? '⏸ 停止同步' : '🔄 实时同步' }}</span>
        </button>
        
        <button 
          class="btn btn-secondary"
          @click="calculateAlignment"
          :disabled="!hasData"
        >
          <span>📊 计算对齐度</span>
        </button>
        
        <button 
          class="btn btn-secondary"
          @click="clearData"
        >
          <span>🗑 清空数据</span>
        </button>
      </div>

      <div class="dashboard" v-if="hasData">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔥 热平衡状态</h3>
            <span class="card-badge" :class="heatBalance.balanceRatio > 80 ? 'badge-success' : 'badge-warning'">
              {{ heatBalance.balanceRatio.toFixed(1) }}%
            </span>
          </div>
          <div class="card-body">
            <div class="heat-balance-grid">
              <div class="balance-item">
                <div class="balance-value supply">{{ heatBalance.totalSupplyHeat.toFixed(2) }}</div>
                <div class="balance-label">总供热量 (kW)</div>
              </div>
              <div class="balance-item">
                <div class="balance-value loss">{{ heatBalance.totalHeatLoss.toFixed(2) }}</div>
                <div class="balance-label">热损失 (kW)</div>
              </div>
              <div class="balance-item">
                <div class="balance-value demand">{{ heatBalance.totalEndHeat.toFixed(2) }}</div>
                <div class="balance-label">终端热量 (kW)</div>
              </div>
              <div class="balance-item">
                <div class="balance-value ratio">{{ heatBalance.balanceRatio.toFixed(1) }}%</div>
                <div class="balance-label">热平衡效率</div>
              </div>
              <div class="ratio-bar">
                <div class="ratio-fill" :style="{ width: heatBalance.balanceRatio + '%' }">
                  {{ heatBalance.balanceRatio.toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📈 数据对齐度</h3>
            <span class="card-badge" :class="alignmentMetrics.avgAlignment > 90 ? 'badge-success' : 'badge-warning'">
              {{ alignmentMetrics.avgAlignment.toFixed(1) }}%
            </span>
          </div>
          <div class="card-body">
            <div class="alignment-stats">
              <div class="alignment-stat">
                <div class="alignment-circle">
                  <svg viewBox="0 0 100 100">
                    <circle class="bg" cx="50" cy="50" r="40"></circle>
                    <circle 
                      class="progress" 
                      cx="50" 
                      cy="50" 
                      r="40"
                      :stroke-dasharray="251.2"
                      :stroke-dashoffset="251.2 - (251.2 * alignmentMetrics.avgAlignment / 100)"
                    ></circle>
                  </svg>
                  <span class="alignment-text">{{ alignmentMetrics.avgAlignment.toFixed(0) }}%</span>
                </div>
                <div class="alignment-label">平均对齐度</div>
              </div>
              <div class="alignment-stat">
                <div class="balance-item">
                  <div class="balance-value" style="color: #4ecdc4; font-size: 1.2rem;">
                    {{ alignmentMetrics.avgTempDeviation.toFixed(2) }}
                  </div>
                  <div class="balance-label">温度偏差 (°C)</div>
                </div>
              </div>
              <div class="alignment-stat">
                <div class="balance-item">
                  <div class="balance-value" style="color: #a855f7; font-size: 1.2rem;">
                    {{ alignmentMetrics.avgFlowDeviation.toFixed(2) }}
                  </div>
                  <div class="balance-label">流量偏差 (m³/h)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🏭 管网拓扑</h3>
            <span class="card-badge badge-success">{{ nodes.length }} 节点</span>
          </div>
          <div class="card-body">
            <div class="zone-list">
              <div 
                v-for="zone in zones" 
                :key="zone.id"
                class="zone-item"
                :class="{ selected: selectedZone === zone.id }"
                @click="selectZone(zone.id)"
              >
                <div class="zone-header">
                  <span class="zone-name">{{ zone.name }}</span>
                  <span class="card-badge" :class="zone.alignment > 90 ? 'badge-success' : 'badge-warning'">
                    {{ zone.alignment.toFixed(0) }}%
                  </span>
                </div>
                <div class="zone-stats">
                  <div class="zone-stat">
                    <div class="zone-stat-value">{{ zone.nodeCount }}</div>
                    <div class="zone-stat-label">节点数</div>
                  </div>
                  <div class="zone-stat">
                    <div class="zone-stat-value">{{ zone.avgTemp.toFixed(1) }}°C</div>
                    <div class="zone-stat-label">平均温度</div>
                  </div>
                  <div class="zone-stat">
                    <div class="zone-stat-value">{{ zone.totalFlow.toFixed(1) }}</div>
                    <div class="zone-stat-label">总流量</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 系统日志</h3>
            <span class="card-badge badge-success">{{ logs.length }} 条</span>
          </div>
          <div class="card-body">
            <div class="logs-panel" ref="logsPanel">
              <div v-for="(log, idx) in logs" :key="idx" class="log-entry">
                <span class="log-time">{{ formatTime(log.time) }}</span>
                <span class="log-type" :class="log.type">{{ log.type.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card" v-if="selectedNode">
          <div class="card-header">
            <h3 class="card-title">🔍 节点详情</h3>
            <span class="card-badge" :class="getNodeTypeClass(selectedNode.type)">
              {{ getNodeTypeLabel(selectedNode.type) }}
            </span>
          </div>
          <div class="card-body">
            <div class="node-detail">
              <div class="node-info">
                <div class="node-info-label">节点ID</div>
                <div class="node-info-value">{{ selectedNode.id }}</div>
              </div>
              <div class="node-info">
                <div class="node-info-label">节点名称</div>
                <div class="node-info-value">{{ selectedNode.name }}</div>
              </div>
              <div class="node-info">
                <div class="node-info-label">供水温度</div>
                <div class="node-info-value">{{ getNodeTemp(selectedNode).toFixed(2) }}°C</div>
              </div>
              <div class="node-info">
                <div class="node-info-label">温降</div>
                <div class="node-info-value">{{ getNodeTempDrop(selectedNode).toFixed(2) }}°C</div>
              </div>
              <div class="node-info">
                <div class="node-info-label">流量</div>
                <div class="node-info-value">{{ selectedNode.flowRate.toFixed(2) }} m³/h</div>
              </div>
              <div class="node-info">
                <div class="node-info-label">压力</div>
                <div class="node-info-value">{{ selectedNode.pressure.toFixed(2) }} MPa</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 热传导模拟</h3>
            <span class="card-badge" :class="isSimulating ? 'badge-success' : 'badge-warning'">
              {{ isSimulating ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="card-body">
            <div class="network-canvas">
              <svg width="100%" height="100%" viewBox="0 0 1000 600">
                <defs>
                  <linearGradient id="heatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#ffa500;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <g :transform="`scale(${zoomLevel}) translate(${(1000 / zoomLevel - 1000) / 2}, ${(600 / zoomLevel - 600) / 2})`">
                  <g v-for="conn in displayConnections" :key="conn.id">
                    <line
                      :x1="getNodeCoord(conn.from, 'x')"
                      :y1="getNodeCoord(conn.from, 'y')"
                      :x2="getNodeCoord(conn.to, 'x')"
                      :y2="getNodeCoord(conn.to, 'y')"
                      :stroke="getConnectionColor(conn)"
                      :stroke-width="3 / zoomLevel"
                      opacity="0.6"
                    />
                  </g>
                  <g v-for="node in displayNodes" :key="node.id" @click="selectNode(node)" style="cursor: pointer;">
                    <circle
                      :cx="node.coords.x"
                      :cy="node.coords.y"
                      :r="getNodeRadius(node) / zoomLevel"
                      :fill="getNodeColor(node)"
                      stroke="white"
                      :stroke-width="1 / zoomLevel"
                      opacity="0.9"
                    />
                    <text
                      :x="node.coords.x"
                      :y="node.coords.y"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      fill="white"
                      :font-size="10 / zoomLevel"
                      font-weight="bold"
                      style="pointer-events: none;"
                    >
                      {{ getNodeSymbol(node) }}
                    </text>
                  </g>
                </g>
              </svg>
              <div class="zoom-controls">
                <button class="zoom-btn" @click="zoomIn">+</button>
                <button class="zoom-btn" @click="resetZoom">⟲</button>
                <button class="zoom-btn" @click="zoomOut">−</button>
              </div>
              <div class="zoom-indicator">
                {{ Math.round(zoomLevel * 100) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🔥</div>
        <h2>供热管网热平衡仿真系统</h2>
        <p>点击"初始化管网"按钮开始仿真模拟</p>
        <p class="empty-sub">支持万级节点的历史工况存储与异步热传导仿真</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  getAllHeatNodes, 
  getDatabaseStats, 
  clearAllData,
  getLatestNodeHistory
} from './utils/db.js'
import { 
  asyncHeatConductionSimulation, 
  calculateHeatBalance 
} from './utils/heatConduction.js'
import { initializeDemoNetwork } from './utils/networkGenerator.js'
import { createSyncManager } from './utils/dataSync.js'

const nodes = ref([])
const connections = ref([])
const simulationResults = ref({})
const selectedZone = ref(null)
const selectedNode = ref(null)

const isInitializing = ref(false)
const isSimulating = ref(false)
const isSyncing = ref(false)
const syncManager = ref(null)
let syncTimerId = null
let simulationTimerId = null

const stats = ref({
  nodeCount: 0,
  historyCount: 0
})

const syncStatus = ref({
  status: 'idle',
  lastSync: null,
  count: 0
})

const heatBalance = ref({
  totalSupplyHeat: 0,
  totalHeatLoss: 0,
  totalEndHeat: 0,
  balanceRatio: 0
})

const alignmentMetrics = ref({
  avgAlignment: 0,
  avgTempDeviation: 0,
  avgFlowDeviation: 0,
  networkMetrics: []
})

const logs = ref([])
const logsPanel = ref(null)

const zoomLevel = ref(1)
const minZoom = 0.5
const maxZoom = 3
const zoomStep = 0.25

const hasData = computed(() => nodes.value.length > 0)

const zones = computed(() => {
  const zoneMap = new Map()
  
  for (const node of nodes.value) {
    if (!zoneMap.has(node.zoneId)) {
      zoneMap.set(node.zoneId, {
        id: node.zoneId,
        name: node.zoneId === 'source' ? '热源厂' : `区域 ${node.zoneId}`,
        nodes: [],
        nodeCount: 0,
        totalFlow: 0,
        avgTemp: 0,
        alignment: 0
      })
    }
    
    const zone = zoneMap.get(node.zoneId)
    zone.nodes.push(node)
    zone.nodeCount++
    zone.totalFlow += node.flowRate
    
    if (simulationResults.value[node.id]) {
      zone.avgTemp += simulationResults.value[node.id].outletTemp
    }
  }
  
  return Array.from(zoneMap.values()).map(zone => ({
    ...zone,
    avgTemp: zone.nodes.length > 0 ? zone.avgTemp / zone.nodes.length : 0,
    alignment: alignmentMetrics.value.avgAlignment + (Math.random() * 10 - 5)
  }))
})

const displayNodes = computed(() => {
  let filtered = nodes.value
  if (selectedZone.value) {
    filtered = nodes.value.filter(n => n.zoneId === selectedZone.value)
  }
  return filtered.slice(0, 200)
})

const displayConnections = computed(() => {
  const visibleNodeIds = new Set(displayNodes.value.map(n => n.id))
  return connections.value.filter(
    c => visibleNodeIds.has(c.from) && visibleNodeIds.has(c.to)
  )
})

function addLog(message, type = 'info') {
  logs.value.push({
    time: Date.now(),
    type,
    message
  })
  
  if (logs.value.length > 100) {
    logs.value.shift()
  }
  
  nextTick(() => {
    if (logsPanel.value) {
      logsPanel.value.scrollTop = logsPanel.value.scrollHeight
    }
  })
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

async function updateStats() {
  const newStats = await getDatabaseStats()
  stats.value = newStats
}

async function initializeNetwork() {
  if (isInitializing.value) return
  
  isInitializing.value = true
  addLog('开始初始化供热管网...', 'info')
  
  try {
    const startTime = Date.now()
    const { nodes: newNodes, connections: newConns } = await initializeDemoNetwork(10000)
    
    nodes.value = newNodes
    connections.value = newConns
    
    addLog(`生成 ${newNodes.length} 个供热节点，${newConns.length} 条连接`, 'info')
    
    await runSimulation()
    
    const endTime = Date.now()
    addLog(`初始化完成，耗时 ${(endTime - startTime) / 1000}s`, 'info')
    
    await updateStats()
  } catch (error) {
    console.error('初始化失败:', error)
    addLog(`初始化失败: ${error.message}`, 'error')
  } finally {
    isInitializing.value = false
  }
}

async function runSimulation() {
  if (nodes.value.length === 0) return
  
  addLog('执行异步热传导仿真...', 'info')
  const startTime = Date.now()
  
  const sourceNode = nodes.value.find(n => n.type === 'source')
  if (!sourceNode) return
  
  const results = await asyncHeatConductionSimulation(
    nodes.value,
    connections.value,
    sourceNode.id
  )
  
  simulationResults.value = results
  
  const balance = calculateHeatBalance(nodes.value, results)
  heatBalance.value = balance
  
  const endTime = Date.now()
  addLog(`仿真完成，处理 ${Object.keys(results).length} 个节点，耗时 ${(endTime - startTime) / 1000}s`, 'info')
  addLog(`热平衡效率: ${balance.balanceRatio.toFixed(1)}%`, 'info')
}

function toggleSimulation() {
  if (isSimulating.value) {
    isSimulating.value = false
    if (simulationTimerId) {
      clearInterval(simulationTimerId)
      simulationTimerId = null
    }
    addLog('热传导仿真已停止', 'info')
  } else {
    if (nodes.value.length === 0) {
      addLog('请先初始化管网', 'warn')
      return
    }
    
    isSimulating.value = true
    addLog('开始连续热传导仿真...', 'info')
    
    runSimulation()
    
    simulationTimerId = setInterval(async () => {
      await runSimulation()
    }, 10000)
  }
}

function toggleSync() {
  if (isSyncing.value) {
    isSyncing.value = false
    if (syncTimerId && syncManager.value) {
      syncManager.value.stopRealTimeSync(syncTimerId)
      syncTimerId = null
    }
    syncStatus.value.status = 'idle'
    addLog('实时同步已停止', 'info')
  } else {
    if (nodes.value.length === 0) {
      addLog('请先初始化管网', 'warn')
      return
    }
    
    isSyncing.value = true
    addLog('开始实时数据同步...', 'info')
    
    syncManager.value = createSyncManager({
      syncInterval: 5000,
      onDataUpdate: (result) => {
        addLog(`同步完成: ${result.count} 个节点，耗时 ${result.duration}ms`, 'info')
        updateStats()
      },
      onSyncStatus: (status) => {
        syncStatus.value = status
      }
    })
    
    syncTimerId = syncManager.value.startRealTimeSync(
      nodes.value.filter(n => n.type === 'end'),
      simulationResults.value,
      (result) => {
        addLog(`同步更新: ${result.count} 条记录`, 'info')
      }
    )
  }
}

async function calculateAlignment() {
  if (!syncManager.value || nodes.value.length === 0) {
    addLog('请先初始化并运行同步', 'warn')
    return
  }
  
  addLog('计算网络对齐度...', 'info')
  
  const startTime = Date.now()
  const results = await syncManager.value.calculateNetworkAlignment(
    nodes.value,
    simulationResults.value
  )
  
  alignmentMetrics.value = results
  
  const endTime = Date.now()
  addLog(`对齐度计算完成，平均对齐: ${results.avgAlignment.toFixed(1)}%，耗时 ${(endTime - startTime) / 1000}s`, 'info')
}

async function clearData() {
  if (isSyncing.value) toggleSync()
  if (isSimulating.value) toggleSimulation()
  
  addLog('正在清空数据...', 'info')
  
  await clearAllData()
  nodes.value = []
  connections.value = []
  simulationResults.value = {}
  heatBalance.value = {
    totalSupplyHeat: 0,
    totalHeatLoss: 0,
    totalEndHeat: 0,
    balanceRatio: 0
  }
  alignmentMetrics.value = {
    avgAlignment: 0,
    avgTempDeviation: 0,
    avgFlowDeviation: 0,
    networkMetrics: []
  }
  
  await updateStats()
  addLog('数据已清空', 'info')
}

function selectZone(zoneId) {
  selectedZone.value = selectedZone.value === zoneId ? null : zoneId
}

function selectNode(node) {
  selectedNode.value = node
}

function getNodeCoord(nodeId, axis) {
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? node.coords[axis] : 0
}

function getNodeColor(node) {
  const result = simulationResults.value[node.id]
  if (!result) return '#4a5568'
  
  const temp = result.outletTemp
  if (temp > 80) return '#ff6b6b'
  if (temp > 60) return '#ffa500'
  if (temp > 40) return '#f4d03f'
  return '#4ecdc4'
}

function getConnectionColor(conn) {
  const fromResult = simulationResults.value[conn.from]
  if (!fromResult) return '#4a5568'
  
  const temp = fromResult.outletTemp
  if (temp > 80) return '#ff6b6b'
  if (temp > 60) return '#ffa500'
  if (temp > 40) return '#f4d03f'
  return '#4ecdc4'
}

function getNodeRadius(node) {
  switch (node.type) {
    case 'source': return 20
    case 'main': return 15
    case 'substation': return 12
    case 'distribution': return 10
    case 'end': return 8
    default: return 10
  }
}

function getNodeSymbol(node) {
  switch (node.type) {
    case 'source': return '🔥'
    case 'main': return '⚡'
    case 'substation': return '🏭'
    case 'distribution': return '📦'
    case 'end': return '🏠'
    default: return '●'
  }
}

function getNodeTypeLabel(type) {
  const labels = {
    source: '热源厂',
    main: '主站',
    substation: '换热站',
    distribution: '分配站',
    end: '终端用户'
  }
  return labels[type] || type
}

function getNodeTypeClass(type) {
  const classes = {
    source: 'badge-danger',
    main: 'badge-warning',
    substation: 'badge-warning',
    distribution: 'badge-success',
    end: 'badge-success'
  }
  return classes[type] || 'badge-success'
}

function getNodeTemp(node) {
  const result = simulationResults.value[node.id]
  return result ? result.outletTemp : (node.temperature || 0)
}

function getNodeTempDrop(node) {
  const result = simulationResults.value[node.id]
  return result ? result.tempDrop : 0
}

function zoomIn() {
  if (zoomLevel.value < maxZoom) {
    zoomLevel.value = Math.min(maxZoom, zoomLevel.value + zoomStep)
    addLog(`放大视图: ${Math.round(zoomLevel.value * 100)}%`, 'info')
  } else {
    addLog('已达到最大缩放级别', 'warn')
  }
}

function zoomOut() {
  if (zoomLevel.value > minZoom) {
    zoomLevel.value = Math.max(minZoom, zoomLevel.value - zoomStep)
    addLog(`缩小视图: ${Math.round(zoomLevel.value * 100)}%`, 'info')
  } else {
    addLog('已达到最小缩放级别', 'warn')
  }
}

function resetZoom() {
  zoomLevel.value = 1
  addLog('重置缩放: 100%', 'info')
}

watch(isSyncing, (val) => {
  syncStatus.value.status = val ? 'synced' : 'idle'
})

onMounted(async () => {
  addLog('HeatNexus 系统启动', 'info')
  
  try {
    await updateStats()
    const savedNodes = await getAllHeatNodes()
    
    if (savedNodes.length > 0) {
      nodes.value = savedNodes
      addLog(`从数据库加载 ${savedNodes.length} 个节点`, 'info')
      
      const sourceNode = savedNodes.find(n => n.type === 'source')
      if (sourceNode) {
        addLog('重新计算热传导仿真...', 'info')
        await runSimulation()
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    addLog('数据库加载失败', 'error')
  }
})

onUnmounted(() => {
  if (simulationTimerId) {
    clearInterval(simulationTimerId)
  }
  if (syncTimerId && syncManager.value) {
    syncManager.value.stopRealTimeSync(syncTimerId)
  }
})
</script>

<style scoped>
.empty-sub {
  color: #666;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
