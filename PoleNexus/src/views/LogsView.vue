<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import AppHeader from '@/components/AppHeader.vue'
import { useSyncService } from '@/services/syncService'
import { logStore } from '@/services/indexedDB'
import type { OperationLog } from '@/types'

const syncService = useSyncService()

const logs = ref<OperationLog[]>([])
const filterLevel = ref<'all' | 'info' | 'warning' | 'error'>('all')
const filterSynced = ref<'all' | 'synced' | 'unsynced'>('all')
const searchTerm = ref('')
const loading = ref(false)

const filteredLogs = computed(() => {
  let result = logs.value
  
  if (filterLevel.value !== 'all') {
    result = result.filter(l => l.level === filterLevel.value)
  }
  
  if (filterSynced.value === 'synced') {
    result = result.filter(l => l.synced)
  } else if (filterSynced.value === 'unsynced') {
    result = result.filter(l => !l.synced)
  }
  
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(l => 
      l.message.toLowerCase().includes(term) ||
      l.type.toLowerCase().includes(term) ||
      l.poleId.toLowerCase().includes(term)
    )
  }
  
  return result
})

const stats = computed(() => {
  const total = logs.value.length
  const unsynced = logs.value.filter(l => !l.synced).length
  const errors = logs.value.filter(l => l.level === 'error').length
  const warnings = logs.value.filter(l => l.level === 'warning').length
  return { total, unsynced, errors, warnings }
})

function getLevelClass(level: string): string {
  const classMap: Record<string, string> = {
    info: 'status-online',
    warning: 'status-warning',
    error: 'status-offline',
  }
  return classMap[level] || ''
}

function getLevelText(level: string): string {
  const textMap: Record<string, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
  }
  return textMap[level] || level
}

function getTypeText(type: string): string {
  const textMap: Record<string, string> = {
    dimming: '调光',
    status: '状态变更',
    heartbeat: '心跳',
    error: '错误',
    command: '指令',
    system: '系统',
  }
  return textMap[type] || type
}

async function loadLogs(): Promise<void> {
  loading.value = true
  try {
    logs.value = await logStore.getAll(500)
  } finally {
    loading.value = false
  }
}

async function syncLogs(): Promise<void> {
  const unsyncedLogs = await logStore.getUnsynced()
  if (unsyncedLogs.length === 0) {
    alert('暂无需要同步的日志')
    return
  }
  
  await logStore.markAsSynced(unsyncedLogs.map(l => l.id))
  await loadLogs()
}

async function clearOldLogs(): Promise<void> {
  if (!confirm('确定要清理7天前的日志吗？')) return
  
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const deleted = await logStore.deleteOld(sevenDaysAgo)
  await loadLogs()
  alert(`已清理 ${deleted} 条日志记录`)
}

let syncUnsubscribe: (() => void) | null = null

onMounted(async () => {
  await loadLogs()
  
  syncUnsubscribe = syncService.on('log_created', () => {
    loadLogs()
  })
})

onUnmounted(() => {
  syncUnsubscribe?.()
})
</script>

<template>
  <div class="layout">
    <AppHeader />
    
    <main class="content">
      <div class="grid grid-4">
        <div class="stat-card">
          <div class="value">{{ stats.total }}</div>
          <div class="label">总日志数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #faad14">{{ stats.unsynced }}</div>
          <div class="label">待同步</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #ff4d4f">{{ stats.errors }}</div>
          <div class="label">错误日志</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #faad14">{{ stats.warnings }}</div>
          <div class="label">警告日志</div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <div class="card-header">
          <h3 class="card-title">工况日志</h3>
          <div style="display: flex; gap: 12px; align-items: center">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="搜索日志..."
              style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; width: 200px"
            />
            <select
              v-model="filterLevel"
              style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px"
            >
              <option value="all">全部级别</option>
              <option value="info">信息</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
            <select
              v-model="filterSynced"
              style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px"
            >
              <option value="all">全部状态</option>
              <option value="synced">已同步</option>
              <option value="unsynced">待同步</option>
            </select>
            <button class="btn btn-primary btn-sm" @click="syncLogs">
              同步日志
            </button>
            <button class="btn btn-warning btn-sm" @click="clearOldLogs">
              清理历史
            </button>
          </div>
        </div>
        
        <div v-if="loading" style="text-align: center; padding: 40px; color: #999">
          加载中...
        </div>
        <template v-else>
          <div v-if="filteredLogs.length > 0" style="overflow-x: auto">
            <table class="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>灯杆ID</th>
                  <th>级别</th>
                  <th>类型</th>
                  <th>消息</th>
                  <th>同步状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in filteredLogs" :key="log.id">
                  <td style="white-space: nowrap">{{ dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss') }}</td>
                  <td style="font-family: monospace; font-size: 12px">{{ log.poleId }}</td>
                  <td>
                    <span :class="['status-badge', getLevelClass(log.level)]">
                      {{ getLevelText(log.level) }}
                    </span>
                  </td>
                  <td>{{ getTypeText(log.type) }}</td>
                  <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                    {{ log.message }}
                  </td>
                  <td>
                    <span
                      :class="['status-badge', log.synced ? 'status-online' : 'status-warning']"
                    >
                      {{ log.synced ? '已同步' : '待同步' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="text-align: center; padding: 40px; color: #999">
            暂无符合条件的日志记录
          </div>
        </template>
      </div>
    </main>
  </div>
</template>