<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-cyber-border bg-cyber-bg-light/50 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <component :is="icons.DatabaseBackup" class="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h2 class="font-semibold text-cyber-text">拓扑快照管理</h2>
            <p class="text-xs text-cyber-text-secondary">
              已缓存 <span class="text-success-green font-mono">{{ formatNumber(snapshotStore.totalPoints) }}</span> 个点
              <span class="mx-2">|</span>
              占用空间 <span class="text-electric-blue font-mono">{{ formatBytes(snapshotStore.totalSize) }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="handleCleanExpired"
          class="cyber-btn flex items-center gap-2"
        >
          <component :is="icons.Trash2" class="w-4 h-4" />
          清理过期
        </button>
        <button
          @click="showCreateModal = true"
          class="cyber-btn-primary flex items-center gap-2"
        >
          <component :is="icons.Plus" class="w-4 h-4" />
          创建快照
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div class="w-80 bg-cyber-bg-light border-r border-cyber-border p-4 space-y-4 overflow-y-auto flex-shrink-0">
        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.HardDrive" class="w-4 h-4 text-electric-blue" />
            存储状态
          </h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-cyber-text-secondary">空间使用</span>
                <span class="text-xs text-cyber-text font-mono">
                  {{ formatBytes(snapshotStore.totalSize) }} / {{ formatBytes(storageStats.quota) }}
                </span>
              </div>
              <div class="cyber-progress-bar">
                <div
                  class="cyber-progress-fill"
                  :style="{ width: `${storageUsagePercent}%` }"
                  :class="{ 'cyber-progress-fill-error': storageUsagePercent > 80 }"
                ></div>
              </div>
              <p class="text-xs text-cyber-text-muted mt-1">
                {{ storageUsagePercent.toFixed(1) }}% 已使用
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 rounded-lg bg-cyber-bg text-center">
                <p class="text-lg font-mono text-cyber-text">{{ snapshotStore.snapshots.length }}</p>
                <p class="text-xs text-cyber-text-muted">快照数量</p>
              </div>
              <div class="p-2 rounded-lg bg-cyber-bg text-center">
                <p class="text-lg font-mono text-success-green">{{ autoSnapshotCount }}</p>
                <p class="text-xs text-cyber-text-muted">自动快照</p>
              </div>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.Settings" class="w-4 h-4 text-electric-blue" />
            缓存策略
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-cyber-text-secondary mb-1">保留天数</label>
              <input
                v-model.number="cacheRetentionDays"
                type="number"
                min="1"
                max="365"
                class="cyber-input text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-cyber-text-secondary mb-1">最大快照数</label>
              <input
                v-model.number="maxSnapshots"
                type="number"
                min="1"
                max="1000"
                class="cyber-input text-sm"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="autoSnapshotEnabled"
                type="checkbox"
                id="auto-snapshot"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="auto-snapshot" class="text-sm text-cyber-text">处理后自动创建</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="compressEnabled"
                type="checkbox"
                id="compress-snapshot"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="compress-snapshot" class="text-sm text-cyber-text">启用数据压缩</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="encryptionEnabled"
                type="checkbox"
                id="encrypt-snapshot"
                class="w-4 h-4 accent-electric-blue"
              />
              <label for="encrypt-snapshot" class="text-sm text-cyber-text">数据加密存储</label>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
            <component :is="icons.BarChart3" class="w-4 h-4 text-electric-blue" />
            快照统计
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">局部精细</span>
              <span class="font-mono text-cyber-text">{{ fineGrainedCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">整体预览</span>
              <span class="font-mono text-cyber-text">{{ overviewCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">增量快照</span>
              <span class="font-mono text-cyber-text">{{ incrementalCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyber-text-secondary">已过期</span>
              <span class="font-mono text-error-red">{{ expiredCount }}</span>
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

          <div v-if="filteredSnapshots.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="snapshot in filteredSnapshots"
              :key="snapshot.id"
              class="cyber-card group hover:border-electric-blue/50 transition-all"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    :class="snapshot.type === 'fine-grained'
                      ? 'bg-success-green/20'
                      : snapshot.type === 'overview'
                      ? 'bg-electric-blue/20'
                      : 'bg-warning-orange/20'"
                  >
                    <component
                      :is="getSnapshotIcon(snapshot.type)"
                      class="w-5 h-5"
                      :class="snapshot.type === 'fine-grained'
                        ? 'text-success-green'
                        : snapshot.type === 'overview'
                        ? 'text-electric-blue'
                        : 'text-warning-orange'"
                    />
                  </div>
                  <div>
                    <h3 class="font-medium text-cyber-text truncate group-hover:text-electric-blue transition-colors">
                      {{ snapshot.name }}
                    </h3>
                    <p class="text-xs text-cyber-text-muted">
                      {{ typeLabels[snapshot.type] || snapshot.type }}
                    </p>
                  </div>
                </div>
                <span
                  class="cyber-badge flex-shrink-0"
                  :class="{
                    'cyber-badge-success': !isExpired(snapshot),
                    'cyber-badge-error': isExpired(snapshot),
                    'cyber-badge-info': snapshot.autoCreated
                  }"
                >
                  {{ isExpired(snapshot) ? '已过期' : snapshot.autoCreated ? '自动' : '有效' }}
                </span>
              </div>

              <p class="text-sm text-cyber-text-secondary mb-3 line-clamp-2">
                {{ snapshot.description || '暂无描述' }}
              </p>

              <div class="space-y-2 mb-4">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">点云数据</span>
                  <span class="text-cyber-text font-mono">{{ getPointCloudName(snapshot.pointCloudId) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">点数</span>
                  <span class="text-cyber-text font-mono">{{ formatNumber(snapshot.pointCount) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">数据大小</span>
                  <span class="text-cyber-text font-mono">{{ formatBytes(snapshot.size) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">压缩率</span>
                  <span class="text-success-green font-mono">{{ snapshot.compressionRatio.toFixed(1) }}%</span>
                </div>
                <div v-if="snapshot.expiresAt" class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">过期时间</span>
                  <span
                    class="font-mono"
                    :class="isExpired(snapshot) ? 'text-error-red' : 'text-cyber-text'"
                  >
                    {{ formatDate(snapshot.expiresAt) }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-cyber-text-secondary">创建时间</span>
                  <span class="text-cyber-text font-mono">{{ formatDate(snapshot.createdAt) }}</span>
                </div>
              </div>

              <div v-if="snapshot.boundingBox" class="mb-4 p-2 rounded-lg bg-cyber-bg">
                <p class="text-xs text-cyber-text-secondary mb-1">空间范围</p>
                <div class="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <span class="text-cyber-text-muted">X:</span>
                    <span class="text-cyber-text ml-1">{{ snapshot.boundingBox.min.x.toFixed(2) }}~{{ snapshot.boundingBox.max.x.toFixed(2) }}</span>
                  </div>
                  <div>
                    <span class="text-cyber-text-muted">Y:</span>
                    <span class="text-cyber-text ml-1">{{ snapshot.boundingBox.min.y.toFixed(2) }}~{{ snapshot.boundingBox.max.y.toFixed(2) }}</span>
                  </div>
                  <div>
                    <span class="text-cyber-text-muted">Z:</span>
                    <span class="text-cyber-text ml-1">{{ snapshot.boundingBox.min.z.toFixed(2) }}~{{ snapshot.boundingBox.max.z.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="handleViewSnapshot(snapshot)"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-cyber-bg-lighter text-cyber-text-secondary hover:text-electric-blue hover:bg-electric-blue/10 transition-colors flex items-center justify-center gap-2"
                >
                  <component :is="icons.Eye" class="w-4 h-4" />
                  查看
                </button>
                <button
                  @click="handleExportSnapshot(snapshot.id)"
                  class="py-2 px-3 rounded-lg text-sm font-medium bg-cyber-bg-lighter text-cyber-text-secondary hover:text-success-green hover:bg-success-green/10 transition-colors"
                  title="导出"
                >
                  <component :is="icons.Download" class="w-4 h-4" />
                </button>
                <button
                  @click="handleRestoreSnapshot(snapshot.id)"
                  class="py-2 px-3 rounded-lg text-sm font-medium bg-cyber-bg-lighter text-cyber-text-secondary hover:text-warning-orange hover:bg-warning-orange/10 transition-colors"
                  title="恢复"
                >
                  <component :is="icons.RotateCcw" class="w-4 h-4" />
                </button>
                <button
                  @click="handleDeleteSnapshot(snapshot.id)"
                  class="py-2 px-3 rounded-lg text-sm font-medium bg-cyber-bg-lighter text-cyber-text-secondary hover:text-error-red hover:bg-error-red/10 transition-colors"
                  title="删除"
                >
                  <component :is="icons.Trash2" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <component :is="icons.ArchiveX" class="w-16 h-16 text-cyber-text-muted mb-4 opacity-50" />
            <h3 class="text-lg font-medium text-cyber-text mb-2">暂无快照</h3>
            <p class="text-cyber-text-secondary mb-6">点击"创建快照"按钮创建拓扑快照</p>
            <button @click="showCreateModal = true" class="cyber-btn-primary flex items-center gap-2">
              <component :is="icons.Plus" class="w-4 h-4" />
              创建第一个快照
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
            <h2 class="text-xl font-semibold text-cyber-text">创建拓扑快照</h2>
            <button
              @click="showCreateModal = false"
              class="p-1 rounded-md text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
            >
              <component :is="icons.X" class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">快照名称</label>
              <input
                v-model="newSnapshot.name"
                type="text"
                placeholder="输入快照名称..."
                class="cyber-input"
              />
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">选择点云数据</label>
              <select v-model="newSnapshot.pointCloudId" class="cyber-input">
                <option value="">请选择点云数据...</option>
                <option v-for="pc in pointCloudStore.pointClouds" :key="pc.id" :value="pc.id">
                  {{ pc.name }} ({{ formatNumber(pc.originalPoints) }} 点)
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">快照类型</label>
              <div class="flex gap-3">
                <button
                  v-for="t in snapshotTypes"
                  :key="t.value"
                  @click="newSnapshot.type = t.value"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  :class="newSnapshot.type === t.value
                    ? t.activeClass
                    : 'bg-cyber-bg-lighter text-cyber-text-secondary hover:text-cyber-text'"
                >
                  {{ t.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">保留天数 (0表示永久)</label>
              <input
                v-model.number="newSnapshot.retentionDays"
                type="number"
                min="0"
                max="365"
                class="cyber-input"
              />
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">描述</label>
              <textarea
                v-model="newSnapshot.description"
                placeholder="输入快照描述..."
                rows="3"
                class="cyber-input resize-none"
              ></textarea>
            </div>
          </div>

          <div class="cyber-divider"></div>

          <div class="flex justify-end gap-3">
            <button @click="showCreateModal = false" class="cyber-btn">
              取消
            </button>
            <button
              @click="handleCreateSnapshot"
              :disabled="!newSnapshot.name || !newSnapshot.pointCloudId"
              class="cyber-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建快照
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  DatabaseBackup,
  Plus,
  HardDrive,
  Settings,
  BarChart3,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  ArchiveX,
  X,
  Layers,
  Map,
  GitBranch
} from 'lucide-vue-next'
import { useSnapshotStore, usePointCloudStore, useUiStore } from '@/stores'
import type { TopologySnapshot, StorageStats } from '@/types'

const snapshotStore = useSnapshotStore()
const pointCloudStore = usePointCloudStore()
const uiStore = useUiStore()

const icons = {
  DatabaseBackup,
  Plus,
  HardDrive,
  Settings,
  BarChart3,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  ArchiveX,
  X,
  Layers,
  Map,
  GitBranch
}

const activeTab = ref('all')
const showCreateModal = ref(false)
const cacheRetentionDays = ref(30)
const maxSnapshots = ref(100)
const autoSnapshotEnabled = ref(true)
const compressEnabled = ref(true)
const encryptionEnabled = ref(false)

const storageStats = reactive<StorageStats>({
  totalUsed: 0,
  quota: 10 * 1024 * 1024 * 1024,
  objectCount: 0
})

const newSnapshot = reactive({
  name: '',
  pointCloudId: '',
  type: 'fine-grained' as const,
  retentionDays: 30,
  description: ''
})

const typeLabels: Record<string, string> = {
  'fine-grained': '局部精细',
  'overview': '整体预览',
  'incremental': '增量快照'
}

const snapshotTypes = [
  { value: 'fine-grained', label: '局部精细', activeClass: 'bg-success-green/20 text-success-green border border-success-green/30' },
  { value: 'overview', label: '整体预览', activeClass: 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30' },
  { value: 'incremental', label: '增量快照', activeClass: 'bg-warning-orange/20 text-warning-orange border border-warning-orange/30' }
]

const tabs = computed(() => [
  { value: 'all', label: '全部', count: snapshotStore.snapshots.length },
  { value: 'fine-grained', label: '局部精细', count: fineGrainedCount.value },
  { value: 'overview', label: '整体预览', count: overviewCount.value },
  { value: 'incremental', label: '增量快照', count: incrementalCount.value },
  { value: 'expired', label: '已过期', count: expiredCount.value }
])

const filteredSnapshots = computed(() => {
  let snapshots = snapshotStore.snapshots
  
  if (activeTab.value === 'expired') {
    return snapshots.filter(s => isExpired(s))
  } else if (activeTab.value !== 'all') {
    return snapshots.filter(s => s.type === activeTab.value)
  }
  
  return snapshots
})

const storageUsagePercent = computed(() => {
  return (snapshotStore.totalSize / storageStats.quota) * 100
})

const autoSnapshotCount = computed(() => {
  return snapshotStore.snapshots.filter(s => s.autoCreated).length
})

const fineGrainedCount = computed(() => {
  return snapshotStore.snapshots.filter(s => s.type === 'fine-grained').length
})

const overviewCount = computed(() => {
  return snapshotStore.snapshots.filter(s => s.type === 'overview').length
})

const incrementalCount = computed(() => {
  return snapshotStore.snapshots.filter(s => s.type === 'incremental').length
})

const expiredCount = computed(() => {
  return snapshotStore.snapshots.filter(s => isExpired(s)).length
})

function getSnapshotIcon(type: string) {
  switch (type) {
    case 'fine-grained': return icons.Layers
    case 'overview': return icons.Map
    case 'incremental': return icons.GitBranch
    default: return icons.Layers
  }
}

function isExpired(snapshot: TopologySnapshot): boolean {
  if (!snapshot.expiresAt) return false
  return Date.now() > snapshot.expiresAt
}

function getPointCloudName(id: string): string {
  const pc = pointCloudStore.pointClouds.find(p => p.id === id)
  return pc ? pc.name : '未知数据'
}

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

function handleCreateSnapshot() {
  const pc = pointCloudStore.pointClouds.find(p => p.id === newSnapshot.pointCloudId)
  if (!pc) return

  const snapshot: TopologySnapshot = {
    id: `snap_${Date.now()}`,
    name: newSnapshot.name,
    description: newSnapshot.description,
    pointCloudId: newSnapshot.pointCloudId,
    type: newSnapshot.type,
    pointCount: pc.processedPoints || pc.originalPoints,
    size: pc.processedSize || pc.originalSize,
    compressionRatio: pc.compressionRatio || 0,
    autoCreated: false,
    createdAt: Date.now(),
    expiresAt: newSnapshot.retentionDays > 0 ? Date.now() + newSnapshot.retentionDays * 24 * 60 * 60 * 1000 : undefined,
    boundingBox: pc.boundingBox,
    lodLevels: pc.lodLevels
  }

  snapshotStore.createSnapshot(snapshot)
  showCreateModal.value = false
  
  uiStore.addNotification({
    type: 'success',
    title: '快照创建成功',
    message: `快照 ${snapshot.name} 已保存到本地缓存`
  })

  newSnapshot.name = ''
  newSnapshot.pointCloudId = ''
  newSnapshot.type = 'fine-grained'
  newSnapshot.retentionDays = 30
  newSnapshot.description = ''
}

function handleViewSnapshot(snapshot: TopologySnapshot) {
  uiStore.addNotification({
    type: 'info',
    title: '加载快照',
    message: `正在加载快照 ${snapshot.name} 到可视化器...`
  })
}

function handleExportSnapshot(id: string) {
  snapshotStore.exportSnapshot(id)
  uiStore.addNotification({
    type: 'success',
    title: '导出成功',
    message: '快照已导出为文件'
  })
}

function handleRestoreSnapshot(id: string) {
  const snapshot = snapshotStore.snapshots.find(s => s.id === id)
  if (!snapshot) return
  
  uiStore.addNotification({
    type: 'warning',
    title: '恢复快照',
    message: `确认恢复快照 ${snapshot.name}？此操作将覆盖当前点云数据。`
  })
}

function handleDeleteSnapshot(id: string) {
  snapshotStore.removeSnapshot(id)
  uiStore.addNotification({
    type: 'info',
    title: '已删除',
    message: '快照已从本地缓存中删除'
  })
}

function handleCleanExpired() {
  const expiredSnapshots = snapshotStore.snapshots.filter(s => isExpired(s))
  expiredSnapshots.forEach(s => snapshotStore.removeSnapshot(s.id))
  
  uiStore.addNotification({
    type: 'success',
    title: '清理完成',
    message: `已清理 ${expiredSnapshots.length} 个过期快照`
  })
}

onMounted(() => {
  snapshotStore.loadSnapshots()
  pointCloudStore.loadPointClouds()
  
  storageStats.totalUsed = snapshotStore.totalSize
  storageStats.objectCount = snapshotStore.snapshots.length
})
</script>
