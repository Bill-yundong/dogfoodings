<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-cyber-border bg-cyber-bg-light/50 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <component :is="icons.RefreshCw" class="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h2 class="font-semibold text-cyber-text">数据同步管理</h2>
            <p class="text-xs text-cyber-text-secondary">
              已同步 <span class="text-success-green font-mono">{{ formatNumber(syncStore.totalSyncedPoints) }}</span> 个点
              <span class="mx-2">|</span>
              已传输 <span class="text-electric-blue font-mono">{{ formatBytes(syncStore.totalDataTransferred) }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-bg-lighter">
          <span :class="syncStore.autoSync ? 'status-dot-online' : 'status-dot-offline'" class="status-dot"></span>
          <span class="text-sm text-cyber-text-secondary">自动同步</span>
          <button
            @click="syncStore.setAutoSync(!syncStore.autoSync)"
            class="ml-2 w-10 h-5 rounded-full transition-colors"
            :class="syncStore.autoSync ? 'bg-electric-blue' : 'bg-cyber-border'"
          >
            <div
              class="w-4 h-4 bg-white rounded-full shadow transition-transform"
              :class="syncStore.autoSync ? 'translate-x-5' : 'translate-x-0.5'"
            ></div>
          </button>
        </div>

        <button
          @click="showCreateModal = true"
          class="cyber-btn-primary flex items-center gap-2"
        >
          <component :is="icons.Plus" class="w-4 h-4" />
          新建同步任务
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div class="w-80 bg-cyber-bg-light border-r border-cyber-border p-4 space-y-4 overflow-y-auto flex-shrink-0">
        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.Network" class="w-4 h-4 text-electric-blue" />
            链路状态
          </h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-cyber-text-secondary flex items-center gap-2">
                  <component :is="icons.Plane" class="w-3.5 h-3.5" />
                  无人机连接
                </span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="syncStore.linkStatus.droneConnected
                    ? 'bg-success-green/20 text-success-green'
                    : 'bg-error-red/20 text-error-red'"
                >
                  {{ syncStore.linkStatus.droneConnected ? '已连接' : '未连接' }}
                </span>
              </div>
              <div class="cyber-progress-bar">
                <div
                  class="cyber-progress-fill"
                  :style="{ width: `${syncStore.linkStatus.signalStrength}%` }"
                  :class="{ 'cyber-progress-fill-error': syncStore.linkStatus.signalStrength < 30 }"
                ></div>
              </div>
              <p class="text-xs text-cyber-text-muted mt-1">信号强度: {{ syncStore.linkStatus.signalStrength }}%</p>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-cyber-text-secondary flex items-center gap-2">
                  <component :is="icons.Database" class="w-3.5 h-3.5" />
                  省网数据库
                </span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="syncStore.linkStatus.databaseConnected
                    ? 'bg-success-green/20 text-success-green'
                    : 'bg-error-red/20 text-error-red'"
                >
                  {{ syncStore.linkStatus.databaseConnected ? '已连接' : '未连接' }}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 rounded-lg bg-cyber-bg text-center">
                <p class="text-lg font-mono text-cyber-text">{{ syncStore.linkStatus.networkLatency }}</p>
                <p class="text-xs text-cyber-text-muted">延迟 (ms)</p>
              </div>
              <div class="p-2 rounded-lg bg-cyber-bg text-center">
                <p class="text-lg font-mono text-cyber-text">{{ syncStore.linkStatus.bandwidth }}</p>
                <p class="text-xs text-cyber-text-muted">带宽 (Mbps)</p>
              </div>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.Settings" class="w-4 h-4 text-electric-blue" />
            同步设置
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-cyber-text-secondary mb-1">同步间隔 (秒)</label>
              <input
                v-model.number="syncIntervalInput"
                @change="handleSyncIntervalChange"
                type="number"
                min="10"
                max="3600"
                class="cyber-input text-sm"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="syncIncremental"
                type="checkbox"
                id="incremental"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="incremental" class="text-sm text-cyber-text">增量同步</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="syncChecksum"
                type="checkbox"
                id="checksum"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="checksum" class="text-sm text-cyber-text">数据校验</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="syncCompression"
                type="checkbox"
                id="compression"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="compression" class="text-sm text-cyber-text">传输压缩</label>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.BarChart3" class="w-4 h-4 text-electric-blue" />
            同步统计
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">待同步</span>
              <span class="font-mono text-cyber-text">{{ syncStore.pendingSync.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">同步中</span>
              <span class="font-mono text-electric-blue">{{ syncStore.syncingTasks.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">已完成</span>
              <span class="font-mono text-success-green">{{ syncStore.completedSync.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">失败</span>
              <span class="font-mono text-error-red">{{ syncStore.failedSync.length }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4 grid-bg">
        <div class="max-w-4xl mx-auto space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="activeTab = tab.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              :class="activeTab === tab.value
                ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter'"
            >
              {{ tab.label }}
              <span v-if="tab.count > 0" class="ml-1 px-1.5 py-0.5 rounded-full bg-electric-blue/30 text-xs">
                {{ tab.count }}
              </span>
            </button>
          </div>

          <div v-if="filteredSyncTasks.length > 0" class="space-y-4">
            <div
              v-for="task in filteredSyncTasks"
              :key="task.id"
              class="cyber-card group hover:border-electric-blue/50 transition-all"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="font-medium text-cyber-text truncate group-hover:text-electric-blue transition-colors">
                      {{ task.name }}
                    </h3>
                    <span
                      class="cyber-badge flex-shrink-0"
                      :class="{
                        'cyber-badge-info animate-pulse-glow': task.status === 'syncing',
                        'cyber-badge-success': task.status === 'completed',
                        'cyber-badge-warning': task.status === 'paused',
                        'cyber-badge-error': task.status === 'failed',
                        'cyber-badge-info': task.status === 'pending'
                      }"
                    >
                      {{ statusLabels[task.status] || task.status }}
                    </span>
                    <span v-if="task.incremental" class="cyber-badge-info">增量</span>
                  </div>
                  <p class="text-sm text-cyber-text-secondary mb-3">
                    目标: {{ task.targetEndpoint }}
                  </p>

                  <div v-if="task.status === 'syncing' || task.progress > 0" class="mb-3">
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-cyber-text-secondary">同步进度</span>
                      <span class="font-mono text-cyber-text">{{ task.progress }}%</span>
                    </div>
                    <div class="cyber-progress-bar">
                      <div
                        class="cyber-progress-fill"
                        :style="{ width: `${task.progress}%` }"
                        :class="{ 'cyber-progress-fill-error': task.status === 'failed' }"
                      ></div>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 text-xs text-cyber-text-muted">
                    <span v-if="task.pointsSynced > 0" class="flex items-center gap-1">
                      <component :is="icons.MapPin" class="w-3 h-3" />
                      {{ formatNumber(task.pointsSynced) }} 点
                    </span>
                    <span v-if="task.bytesTransferred > 0" class="flex items-center gap-1">
                      <component :is="icons.Download" class="w-3 h-3" />
                      {{ formatBytes(task.bytesTransferred) }}
                    </span>
                    <span v-if="task.checksum" class="flex items-center gap-1">
                      <component :is="icons.ShieldCheck" class="w-3 h-3" />
                      已校验
                    </span>
                    <span class="flex items-center gap-1">
                      <component :is="icons.Clock" class="w-3 h-3" />
                      {{ formatDate(task.createdAt) }}
                    </span>
                  </div>

                  <div v-if="task.errorMessage" class="mt-3 p-2 rounded-lg bg-error-red/10 border border-error-red/30">
                    <p class="text-xs text-error-red flex items-center gap-1">
                      <component :is="icons.AlertCircle" class="w-3.5 h-3.5" />
                      {{ task.errorMessage }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 ml-4">
                  <button
                    v-if="task.status === 'pending'"
                    @click="handleStartSync(task.id)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-success-green hover:bg-success-green/10 transition-colors"
                    title="开始同步"
                  >
                    <component :is="icons.Play" class="w-4 h-4" />
                  </button>
                  <button
                    v-if="task.status === 'syncing'"
                    @click="handlePauseSync(task.id)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-warning-orange hover:bg-warning-orange/10 transition-colors"
                    title="暂停"
                  >
                    <component :is="icons.Pause" class="w-4 h-4" />
                  </button>
                  <button
                    v-if="task.status === 'paused'"
                    @click="handleResumeSync(task.id)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-success-green hover:bg-success-green/10 transition-colors"
                    title="继续"
                  >
                    <component :is="icons.Play" class="w-4 h-4" />
                  </button>
                  <button
                    v-if="['syncing', 'paused', 'pending'].includes(task.status)"
                    @click="handleCancelSync(task.id)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-error-red hover:bg-error-red/10 transition-colors"
                    title="取消"
                  >
                    <component :is="icons.Square" class="w-4 h-4" />
                  </button>
                  <button
                    v-if="task.status === 'failed'"
                    @click="handleRetrySync(task)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-warning-orange hover:bg-warning-orange/10 transition-colors"
                    title="重试"
                  >
                    <component :is="icons.RotateCcw" class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDeleteSync(task.id)"
                    class="p-1.5 rounded-md text-cyber-text-secondary hover:text-error-red hover:bg-error-red/10 transition-colors"
                    title="删除"
                  >
                    <component :is="icons.Trash2" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <component :is="icons.CloudOff" class="w-16 h-16 text-cyber-text-muted mb-4 opacity-50" />
            <h3 class="text-lg font-medium text-cyber-text mb-2">暂无同步任务</h3>
            <p class="text-cyber-text-secondary mb-6">点击"新建同步任务"按钮创建同步任务</p>
            <button @click="showCreateModal = true" class="cyber-btn-primary flex items-center gap-2">
              <component :is="icons.Plus" class="w-4 h-4" />
              创建第一个同步任务
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showCreateModal = false"
      >
        <div class="w-full max-w-lg cyber-card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-cyber-text">新建同步任务</h2>
            <button
              @click="showCreateModal = false"
              class="p-1 rounded-md text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
            >
              <component :is="icons.X" class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">选择点云数据</label>
              <select v-model="newSyncTask.pointCloudId" class="cyber-input">
                <option value="">请选择点云数据...</option>
                <option v-for="pc in pointCloudStore.pointClouds" :key="pc.id" :value="pc.id">
                  {{ pc.name }} ({{ formatNumber(pc.originalPoints) }} 点)
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">目标端点</label>
              <select v-model="newSyncTask.targetEndpoint" class="cyber-input">
                <option value="">请选择目标端点...</option>
                <option value="https://grid-db.province.com/api/pointcloud">省电网主数据库</option>
                <option value="https://backup-zone1.grid.com/api/sync">区域备份节点1</option>
                <option value="https://backup-zone2.grid.com/api/sync">区域备份节点2</option>
              </select>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">优先级</label>
              <div class="flex gap-3">
                <button
                  v-for="p in priorities"
                  :key="p.value"
                  @click="newSyncTask.priority = p.value"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  :class="newSyncTask.priority === p.value
                    ? p.activeClass
                    : 'bg-cyber-bg-lighter text-cyber-text-secondary hover:text-cyber-text'"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  v-model="newSyncTask.incremental"
                  type="checkbox"
                  id="sync-incremental"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="sync-incremental" class="text-sm text-cyber-text">增量同步</label>
              </div>
            </div>
          </div>

          <div class="cyber-divider"></div>

          <div class="flex justify-end gap-3">
            <button @click="showCreateModal = false" class="cyber-btn">
              取消
            </button>
            <button
              @click="handleCreateSyncTask"
              :disabled="!newSyncTask.pointCloudId || !newSyncTask.targetEndpoint"
              class="cyber-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建同步任务
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import {
  RefreshCw,
  Plus,
  Network,
  Plane,
  Database,
  Settings,
  BarChart3,
  MapPin,
  Download,
  ShieldCheck,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  CloudOff,
  X
} from 'lucide-vue-next'
import { useSyncStore, usePointCloudStore, useUiStore } from '@/stores'
import type { SyncTask } from '@/types'

const syncStore = useSyncStore()
const pointCloudStore = usePointCloudStore()
const uiStore = useUiStore()

const icons = {
  RefreshCw,
  Plus,
  Network,
  Plane,
  Database,
  Settings,
  BarChart3,
  MapPin,
  Download,
  ShieldCheck,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  CloudOff,
  X
}

const activeTab = ref('all')
const showCreateModal = ref(false)
const syncIntervalInput = ref(30)
const syncIncremental = ref(true)
const syncChecksum = ref(true)
const syncCompression = ref(true)

const newSyncTask = reactive({
  pointCloudId: '',
  targetEndpoint: '',
  priority: 'normal' as 'high' | 'normal' | 'low',
  incremental: true
})

const statusLabels: Record<string, string> = {
  pending: '等待中',
  syncing: '同步中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
}

const tabs = computed(() => [
  { value: 'all', label: '全部', count: syncStore.syncTasks.length },
  { value: 'syncing', label: '同步中', count: syncStore.syncingTasks.length },
  { value: 'pending', label: '等待中', count: syncStore.pendingSync.length },
  { value: 'completed', label: '已完成', count: syncStore.completedSync.length },
  { value: 'failed', label: '失败', count: syncStore.failedSync.length }
])

const priorities: Array<{ value: 'high' | 'normal' | 'low'; label: string; activeClass: string }> = [
  { value: 'high', label: '高优先级', activeClass: 'bg-error-red/20 text-error-red border border-error-red/30' },
  { value: 'normal', label: '普通', activeClass: 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30' },
  { value: 'low', label: '低优先级', activeClass: 'bg-cyber-text-muted/20 text-cyber-text border border-cyber-text-muted/30' }
]

const filteredSyncTasks = computed(() => {
  let tasks = syncStore.syncTasks
  
  if (activeTab.value !== 'all') {
    tasks = tasks.filter(t => t.status === activeTab.value)
  }
  
  return tasks
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handleSyncIntervalChange() {
  syncStore.setSyncInterval(syncIntervalInput.value * 1000)
}

function handleCreateSyncTask() {
  const pc = pointCloudStore.pointClouds.find(p => p.id === newSyncTask.pointCloudId)
  if (!pc) return

  const endpointNames: Record<string, string> = {
    'https://grid-db.province.com/api/pointcloud': '省电网主数据库',
    'https://backup-zone1.grid.com/api/sync': '区域备份节点1',
    'https://backup-zone2.grid.com/api/sync': '区域备份节点2'
  }

  const task: SyncTask = {
    id: `sync_${Date.now()}`,
    pointCloudId: newSyncTask.pointCloudId,
    name: `同步到${endpointNames[newSyncTask.targetEndpoint] || newSyncTask.targetEndpoint}`,
    targetEndpoint: newSyncTask.targetEndpoint,
    status: 'pending',
    progress: 0,
    priority: newSyncTask.priority,
    incremental: newSyncTask.incremental,
    pointsSynced: 0,
    bytesTransferred: 0,
    createdAt: Date.now()
  }

  syncStore.createSyncTask(task)
  showCreateModal.value = false
  
  uiStore.addNotification({
    type: 'success',
    title: '同步任务创建成功',
    message: `任务 ${task.name} 已加入队列`
  })

  newSyncTask.pointCloudId = ''
  newSyncTask.targetEndpoint = ''
  newSyncTask.priority = 'normal'
  newSyncTask.incremental = true
}

function handleStartSync(id: string) {
  syncStore.startSync(id)
  uiStore.addNotification({
    type: 'info',
    title: '开始同步',
    message: `同步任务 ${id} 开始执行`
  })
}

function handlePauseSync(id: string) {
  syncStore.pauseSync(id)
  uiStore.addNotification({
    type: 'warning',
    title: '已暂停',
    message: `同步任务 ${id} 已暂停`
  })
}

function handleResumeSync(id: string) {
  syncStore.resumeSync(id)
  uiStore.addNotification({
    type: 'info',
    title: '继续同步',
    message: `同步任务 ${id} 继续执行`
  })
}

function handleCancelSync(id: string) {
  syncStore.cancelSync(id)
  uiStore.addNotification({
    type: 'warning',
    title: '已取消',
    message: `同步任务 ${id} 已取消`
  })
}

function handleDeleteSync(id: string) {
  syncStore.removeSyncTask(id)
  uiStore.addNotification({
    type: 'info',
    title: '已删除',
    message: `同步任务 ${id} 已删除`
  })
}

function handleRetrySync(task: SyncTask) {
  const retryTask: SyncTask = {
    ...task,
    id: `sync_${Date.now()}`,
    status: 'pending',
    progress: 0,
    startTime: undefined,
    endTime: undefined,
    errorMessage: undefined,
    createdAt: Date.now()
  }
  syncStore.createSyncTask(retryTask)
  uiStore.addNotification({
    type: 'info',
    title: '任务重试',
    message: `已重新提交同步任务 ${task.name}`
  })
}

let linkMonitorInterval: number | null = null
let isInitialized = false

onMounted(() => {
  if (!isInitialized) {
    isInitialized = true
    syncStore.loadSyncTasks()
    pointCloudStore.loadPointClouds()
    syncStore.refreshLinkStatus()
  }
  
  if (!linkMonitorInterval) {
    linkMonitorInterval = window.setInterval(() => {
      syncStore.refreshLinkStatus()
    }, 5000)
  }
})

onUnmounted(() => {
  if (linkMonitorInterval) {
    clearInterval(linkMonitorInterval)
    linkMonitorInterval = null
  }
})
</script>
