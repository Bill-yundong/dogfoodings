<template>
  <div class="collaboration-view">
    <div class="view-header">
      <h2>🔗 数据协同中心</h2>
      <p>研发中心与生产调度系统间的混合不均匀度数据协同</p>
    </div>

    <div class="sync-status-grid">
      <div 
        v-for="system in systems" 
        :key="system.key" 
        class="system-card"
        :class="{ syncing: system.isSyncing }"
      >
        <div class="system-icon">{{ system.icon }}</div>
        <div class="system-info">
          <div class="system-name">{{ system.name }}</div>
          <div class="system-status" :class="system.status.class">
            {{ system.status.text }}
          </div>
        </div>
        <div class="system-metrics">
          <div class="metric">
            <span class="metric-label">待同步</span>
            <span class="metric-value">{{ system.pending }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">最后同步</span>
            <span class="metric-value">{{ system.lastSync }}</span>
          </div>
        </div>
        <button 
          class="btn btn-secondary btn-sm" 
          @click="syncSystem(system.key)"
          :disabled="isSyncing || system.isSyncing"
        >
          {{ system.isSyncing ? '同步中...' : '立即同步' }}
        </button>
      </div>
    </div>

    <div class="collaboration-layout">
      <div class="queue-section">
        <div class="section-header">
          <h3>📋 同步队列</h3>
          <div class="queue-actions">
            <button 
              class="btn btn-secondary btn-sm" 
              @click="syncAll"
              :disabled="totalPending === 0 || isSyncing"
            >
              🔄 全部同步
            </button>
            <button 
              class="btn btn-secondary btn-sm" 
              @click="clearQueue"
              :disabled="totalPending === 0"
            >
              🗑️ 清空队列
            </button>
          </div>
        </div>

        <div class="queue-filters">
          <button 
            v-for="filter in filters" 
            :key="filter.key"
            class="filter-btn"
            :class="{ active: activeFilter === filter.key }"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }} ({{ getFilterCount(filter.key) }})
          </button>
        </div>

        <div class="queue-list">
          <div 
            v-for="item in filteredQueue" 
            :key="item.id" 
            class="queue-item"
            :class="item.status"
          >
            <div class="item-priority" :class="item.priority">
              {{ item.priority === 'high' ? '!' : item.priority === 'normal' ? '○' : '·' }}
            </div>
            <div class="item-content">
              <div class="item-title">
                快照 #{{ item.data?.snapshotId || 'N/A' }}
                <span class="item-system">{{ getSystemName(item.targetSystem) }}</span>
              </div>
              <div class="item-meta">
                <span>混合度: {{ (item.data?.mixingQuality * 100).toFixed(1) }}%</span>
                <span>·</span>
                <span>{{ formatTime(item.createdAt) }}</span>
              </div>
            </div>
            <div class="item-status-badge" :class="item.status">
              {{ getStatusText(item.status) }}
            </div>
            <div class="item-actions">
              <button 
                v-if="item.status === 'error'" 
                class="action-btn" 
                @click="retryItem(item)"
                title="重试"
              >
                🔄
              </button>
              <button 
                class="action-btn" 
                @click="removeItem(item)"
                title="移除"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div v-if="filteredQueue.length === 0" class="empty-queue">
            <div class="empty-icon">📭</div>
            <div>同步队列为空</div>
            <div class="empty-hint">在仿真页面保存快照将自动加入同步队列</div>
          </div>
        </div>
      </div>

      <div class="activity-section">
        <div class="section-header">
          <h3>📊 同步活动日志</h3>
          <button 
            class="btn btn-secondary btn-sm" 
            @click="loadActivity"
          >
            🔄 刷新
          </button>
        </div>

        <div class="activity-list">
          <div 
            v-for="(activity, index) in activityLog" 
            :key="index" 
            class="activity-item"
          >
            <div class="activity-icon" :class="activity.type">
              {{ activity.type === 'synced' ? '✓' : activity.type === 'error' ? '✕' : '⏳' }}
            </div>
            <div class="activity-content">
              <div class="activity-message">{{ activity.message }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
          </div>
          
          <div v-if="activityLog.length === 0" class="empty-queue">
            <div class="empty-icon">📜</div>
            <div>暂无同步记录</div>
          </div>
        </div>

        <div class="conflicts-section" v-if="conflicts.length > 0">
          <h4>⚠️ 同步冲突 ({{ conflicts.length }})</h4>
          <div 
            v-for="conflict in conflicts" 
            :key="conflict.id" 
            class="conflict-item"
          >
            <div class="conflict-info">
              <div class="conflict-title">
                {{ getSystemName(conflict.targetSystem) }} 同步失败
              </div>
              <div class="conflict-meta">
                尝试次数: {{ conflict.attempts }} · {{ formatTime(conflict.createdAt) }}
              </div>
            </div>
            <div class="conflict-actions">
              <button class="btn btn-secondary btn-sm" @click="resolveConflict(conflict, 'retry')">
                🔄 重试
              </button>
              <button class="btn btn-secondary btn-sm" @click="resolveConflict(conflict, 'discard')">
                🗑️ 丢弃
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bulk-actions card">
      <h3>⚙️ 批量操作</h3>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="syncHistoricalData">
          📤 同步历史数据 (最近50条)
        </button>
        <button class="btn btn-secondary" @click="exportSyncLog">
          📥 导出同步日志
        </button>
        <button class="btn btn-secondary" @click="testConnections">
          📡 测试连接
        </button>
      </div>
      <div class="connection-status" v-if="connectionTest">
        <div 
          v-for="result in connectionTest" 
          :key="result.system"
          class="connection-result"
          :class="result.success ? 'success' : 'error'"
        >
          <span>{{ result.success ? '✓' : '✕' }}</span>
          <span>{{ getSystemName(result.system) }}: {{ result.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { syncManager, SYSTEMS, getSystemName, formatSyncTime } from '../utils/dataSync'

const isSyncing = ref(false)
const activeFilter = ref('all')
const activityLog = ref([])
const connectionTest = ref(null)
let statusUpdateInterval = null

const systems = ref([
  { key: SYSTEMS.RND, name: '研发中心', icon: '🔬', pending: 0, lastSync: '-', isSyncing: false, status: { text: '在线', class: 'text-success' } },
  { key: SYSTEMS.PRODUCTION, name: '生产调度系统', icon: '🏭', pending: 0, lastSync: '-', isSyncing: false, status: { text: '在线', class: 'text-success' } },
  { key: SYSTEMS.QUALITY, name: '质量控制系统', icon: '✅', pending: 0, lastSync: '-', isSyncing: false, status: { text: '在线', class: 'text-success' } }
])

const filters = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待同步' },
  { key: 'synced', label: '已同步' },
  { key: 'error', label: '失败' }
]

const allQueueItems = computed(() => {
  const items = []
  for (const system of Object.values(SYSTEMS)) {
    items.push(...syncManager.queues[system])
  }
  return items.sort((a, b) => b.createdAt - a.createdAt)
})

const conflicts = computed(() => syncManager.getConflicts())

const filteredQueue = computed(() => {
  const items = allQueueItems.value
  if (activeFilter.value === 'all') return items
  return items.filter(item => item.status === activeFilter.value)
})

const totalPending = computed(() => {
  return systems.value.reduce((sum, sys) => sum + sys.pending, 0)
})

function getFilterCount(filterKey) {
  if (filterKey === 'all') return allQueueItems.value.length
  if (filterKey === 'error') return conflicts.value.length
  return allQueueItems.value.filter(item => item.status === filterKey).length
}

function getStatusText(status) {
  const texts = {
    pending: '等待中',
    synced: '已同步',
    error: '失败',
    conflict: '冲突'
  }
  return texts[status] || status
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  return formatSyncTime(timestamp)
}

function updateSystemStatus() {
  const status = syncManager.getQueueStatus()
  
  for (const system of systems.value) {
    const sysStatus = status[system.key]
    if (sysStatus) {
      system.pending = sysStatus.pending
      system.lastSync = sysStatus.lastSync ? formatTime(sysStatus.lastSync) : '未同步'
    }
  }
}

async function syncSystem(systemKey) {
  const system = systems.value.find(s => s.key === systemKey)
  if (!system) return
  
  const status = syncManager.getQueueStatus()
  const sysStatus = status[systemKey]
  
  if (sysStatus && sysStatus.pending === 0) {
    alert(`${getSystemName(systemKey)} 没有待同步的数据`)
    return
  }
  
  system.isSyncing = true
  isSyncing.value = true
  
  try {
    const results = await syncManager.processQueue(systemKey)
    const successCount = results.filter(r => !r.error).length
    addActivity(`已同步 ${successCount} 条数据到 ${getSystemName(systemKey)}`)
    if (successCount > 0) {
      alert(`同步成功！已同步 ${successCount} 条数据到 ${getSystemName(systemKey)}`)
    }
  } catch (e) {
    addActivity(`同步 ${getSystemName(systemKey)} 失败: ${e.message}`, 'error')
    alert(`同步失败: ${e.message}`)
  } finally {
    system.isSyncing = false
    isSyncing.value = false
    updateSystemStatus()
  }
}

async function syncAll() {
  isSyncing.value = true
  
  try {
    const results = await syncManager.syncAllSystems()
    const successCount = results.filter(r => !r.error).length
    addActivity(`批量同步完成: 成功 ${successCount}/${results.length} 条`)
  } catch (e) {
    addActivity(`批量同步失败: ${e.message}`, 'error')
  } finally {
    isSyncing.value = false
    updateSystemStatus()
  }
}

function clearQueue() {
  if (!confirm('确定要清空所有同步队列吗？')) return
  syncManager.clearAllQueues()
  updateSystemStatus()
  addActivity('已清空同步队列')
}

function removeItem(item) {
  const queue = syncManager.queues[item.targetSystem]
  const index = queue.findIndex(i => i.id === item.id)
  if (index > -1) {
    queue.splice(index, 1)
    updateSystemStatus()
  }
}

function retryItem(item) {
  syncManager.resolveConflict(item.id, 'retry')
  updateSystemStatus()
  addActivity(`已重试同步: ${item.id}`)
}

function resolveConflict(conflict, action) {
  syncManager.resolveConflict(conflict.id, action)
  updateSystemStatus()
  addActivity(`冲突已${action === 'retry' ? '重试' : '丢弃'}: ${conflict.id}`)
}

async function syncHistoricalData() {
  isSyncing.value = true
  try {
    const results = await syncManager.syncHistoricalData()
    addActivity(`历史数据同步完成: 已提交 ${results.length} 条同步任务`)
  } catch (e) {
    addActivity(`历史数据同步失败: ${e.message}`, 'error')
  } finally {
    isSyncing.value = false
    updateSystemStatus()
  }
}

async function exportSyncLog() {
  const log = await syncManager.exportSyncLog()
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sync-log-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  addActivity('同步日志已导出')
}

async function testConnections() {
  connectionTest.value = []
  const testData = { test: true }
  
  for (const system of Object.values(SYSTEMS)) {
    try {
      const result = await syncManager[`syncTo${system.charAt(0).toUpperCase() + system.slice(1)}`](testData)
      connectionTest.value.push({
        system,
        success: result.success,
        message: result.message
      })
    } catch (e) {
      connectionTest.value.push({
        system,
        success: false,
        message: e.message
      })
    }
  }
  
  addActivity('连接测试完成')
}

function addActivity(message, type = 'synced') {
  activityLog.value.unshift({
    type,
    message,
    timestamp: Date.now()
  })
  
  if (activityLog.value.length > 50) {
    activityLog.value = activityLog.value.slice(0, 50)
  }
}

function loadActivity() {
  updateSystemStatus()
  addActivity('已刷新同步状态', 'synced')
  alert('同步状态已刷新！')
}

syncManager.addSyncCallback((event) => {
  if (event.type === 'synced') {
    addActivity(event.result.message, 'synced')
  } else if (event.type === 'error') {
    addActivity(event.result.message, 'error')
  }
  updateSystemStatus()
})

onMounted(() => {
  updateSystemStatus()
  statusUpdateInterval = setInterval(updateSystemStatus, 5000)
})

onUnmounted(() => {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval)
  }
})
</script>

<style scoped>
.collaboration-view {
  width: 100%;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: var(--text-primary);
}

.view-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.sync-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.system-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.system-card.syncing {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
}

.system-icon {
  font-size: 36px;
}

.system-info {
  flex: 1;
}

.system-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.system-status {
  font-size: 12px;
}

.system-metrics {
  display: flex;
  gap: 20px;
  margin-right: 16px;
}

.metric {
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
  font-family: monospace;
}

.collaboration-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  align-items: start;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.queue-actions {
  display: flex;
  gap: 8px;
}

.queue-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.filter-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--bg-dark);
  font-weight: 600;
}

.queue-list, .activity-list {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.queue-item:hover {
  background: rgba(0, 212, 255, 0.05);
}

.item-priority {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.item-priority.high {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.item-priority.normal {
  background: rgba(0, 212, 255, 0.2);
  color: var(--primary);
}

.item-priority.low {
  background: rgba(0, 255, 136, 0.2);
  color: var(--success);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.item-system {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(0, 212, 255, 0.15);
  color: var(--primary);
  border-radius: 10px;
  font-size: 10px;
}

.item-meta {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.item-status-badge.pending {
  background: rgba(255, 217, 61, 0.2);
  color: var(--warning);
}

.item-status-badge.synced {
  background: rgba(0, 255, 136, 0.2);
  color: var(--success);
}

.item-status-badge.error {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.empty-queue {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.activity-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.activity-icon.synced {
  background: rgba(0, 255, 136, 0.2);
  color: var(--success);
}

.activity-icon.error {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.activity-icon.pending {
  background: rgba(255, 217, 61, 0.2);
  color: var(--warning);
}

.activity-content {
  flex: 1;
}

.activity-message {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.activity-time {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.conflicts-section {
  margin-top: 24px;
}

.conflicts-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--warning);
}

.conflict-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: rgba(255, 217, 61, 0.05);
  border: 1px solid rgba(255, 217, 61, 0.2);
  border-radius: 8px;
  margin-bottom: 10px;
}

.conflict-title {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.conflict-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.conflict-actions {
  display: flex;
  gap: 8px;
}

.bulk-actions h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.connection-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.connection-result.success {
  background: rgba(0, 255, 136, 0.1);
  color: var(--success);
}

.connection-result.error {
  background: rgba(255, 71, 87, 0.1);
  color: var(--danger);
}

@media (max-width: 1200px) {
  .sync-status-grid {
    grid-template-columns: 1fr;
  }
  
  .collaboration-layout {
    grid-template-columns: 1fr;
  }
}
</style>
