<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-cyber-border bg-cyber-bg-light/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="activeTab = tab.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              :class="activeTab === tab.value
                ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter'"
            >
              <span class="flex items-center gap-2">
                <component :is="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
                <span v-if="tab.count > 0" class="px-1.5 py-0.5 rounded-full bg-electric-blue/30 text-xs">
                  {{ tab.count }}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索任务..."
              class="cyber-input pl-9 w-64 text-sm"
            />
            <component :is="icons.Search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-text-muted" />
          </div>
          
          <button
            @click="showCreateModal = true"
            class="cyber-btn-primary flex items-center gap-2"
          >
            <component :is="icons.Plus" class="w-4 h-4" />
            新建任务
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4 grid-bg">
      <div class="max-w-5xl mx-auto space-y-4">
        <div
          v-if="filteredTasks.length > 0"
          class="space-y-4"
        >
          <TaskItem
            v-for="task in filteredTasks"
            :key="task.id"
            :task="task"
            @start="handleStartTask"
            @cancel="handleCancelTask"
            @delete="handleDeleteTask"
            @retry="handleRetryTask"
            @view="handleViewTask"
          />
        </div>
        
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <component :is="icons.Inbox" class="w-16 h-16 text-cyber-text-muted mb-4 opacity-50" />
          <h3 class="text-lg font-medium text-cyber-text mb-2">暂无任务</h3>
          <p class="text-cyber-text-secondary mb-6">点击"新建任务"按钮创建处理任务</p>
          <button @click="showCreateModal = true" class="cyber-btn-primary flex items-center gap-2">
            <component :is="icons.Plus" class="w-4 h-4" />
            创建第一个任务
          </button>
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
            <h2 class="text-xl font-semibold text-cyber-text">新建处理任务</h2>
            <button
              @click="showCreateModal = false"
              class="p-1 rounded-md text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
            >
              <component :is="icons.X" class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">任务类型</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="type in taskTypes"
                  :key="type.value"
                  @click="newTask.type = type.value"
                  class="p-3 rounded-lg border-2 transition-all text-left"
                  :class="newTask.type === type.value
                    ? 'border-electric-blue bg-electric-blue/10'
                    : 'border-cyber-border hover:border-cyber-text-muted bg-cyber-bg-lighter'"
                >
                  <component :is="type.icon" class="w-6 h-6 mb-2" :class="newTask.type === type.value ? 'text-electric-blue' : 'text-cyber-text-muted'" />
                  <p class="font-medium" :class="newTask.type === type.value ? 'text-electric-blue' : 'text-cyber-text'">{{ type.label }}</p>
                  <p class="text-xs text-cyber-text-muted">{{ type.desc }}</p>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">选择点云数据</label>
              <select v-model="newTask.pointCloudId" class="cyber-input">
                <option value="">请选择点云数据...</option>
                <option v-for="pc in pointCloudStore.pointClouds" :key="pc.id" :value="pc.id">
                  {{ pc.name }} ({{ formatNumber(pc.originalPoints) }} 点)
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">优先级</label>
              <div class="flex gap-3">
                <button
                  v-for="p in priorities"
                  :key="p.value"
                  @click="newTask.priority = p.value"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  :class="newTask.priority === p.value
                    ? p.activeClass
                    : 'bg-cyber-bg-lighter text-cyber-text-secondary hover:text-cyber-text'"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>

            <div v-if="newTask.type === 'downsampling'" class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm text-cyber-text-secondary">体素尺寸 (m)</label>
                <span class="font-mono text-sm text-cyber-text">{{ newTask.config.voxelSize.toFixed(3) }}</span>
              </div>
              <input
                v-model.number="newTask.config.voxelSize"
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                class="w-full accent-electric-blue"
              />
              <div class="flex items-center gap-2">
                <input
                  v-model="newTask.config.adaptive"
                  type="checkbox"
                  id="adaptive"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="adaptive" class="text-sm text-cyber-text">自适应体素尺寸</label>
              </div>
            </div>

            <div v-if="newTask.type === 'denoising'" class="space-y-3">
              <div>
                <label class="block text-sm text-cyber-text-secondary mb-2">K近邻数量</label>
                <input
                  v-model.number="newTask.config.kNeighbors"
                  type="number"
                  min="3"
                  max="50"
                  class="cyber-input"
                />
              </div>
              <div>
                <label class="block text-sm text-cyber-text-secondary mb-2">标准差阈值</label>
                <input
                  v-model.number="newTask.config.stdThreshold"
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  class="cyber-input"
                />
              </div>
            </div>
          </div>

          <div class="cyber-divider"></div>

          <div class="flex justify-end gap-3">
            <button @click="showCreateModal = false" class="cyber-btn">
              取消
            </button>
            <button
              @click="handleCreateTask"
              :disabled="!newTask.pointCloudId"
              class="cyber-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建任务
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
  Search,
  Plus,
  X,
  Inbox,
  Cpu,
  Filter,
  GitBranch,
  FileArchive,
  Clock,
  Play,
  AlertCircle
} from 'lucide-vue-next'
import TaskItem from '@/components/common/TaskItem.vue'
import { useTaskStore, usePointCloudStore, useUiStore } from '@/stores'
import type { ProcessingTask } from '@/types'

const taskStore = useTaskStore()
const pointCloudStore = usePointCloudStore()
const uiStore = useUiStore()

const icons = {
  Search,
  Plus,
  X,
  Inbox,
  Cpu,
  Filter,
  GitBranch,
  FileArchive,
  Clock,
  Play,
  AlertCircle
}

const activeTab = ref('all')
const searchQuery = ref('')
const showCreateModal = ref(false)

const newTask = reactive({
  type: 'downsampling' as const,
  pointCloudId: '',
  priority: 'normal' as const,
  config: {
    voxelSize: 0.05,
    adaptive: true,
    kNeighbors: 5,
    stdThreshold: 2.0,
    maxDepth: 8,
    minPoints: 10,
    compressionLevel: 6,
    draco: true
  }
})

const tabs = computed(() => [
  { value: 'all', label: '全部任务', icon: icons.Clock, count: taskStore.tasks.length },
  { value: 'running', label: '运行中', icon: icons.Play, count: taskStore.runningTasks.length },
  { value: 'pending', label: '等待中', icon: icons.Clock, count: taskStore.pendingTasks.length },
  { value: 'completed', label: '已完成', icon: icons.CheckCircle, count: taskStore.completedTasks.length },
  { value: 'failed', label: '失败', icon: icons.AlertCircle, count: taskStore.failedTasks.length }
])

const taskTypes = [
  { value: 'downsampling', label: '体素下采样', desc: '空间网格均匀降维', icon: icons.Cpu },
  { value: 'denoising', label: '统计滤波去噪', desc: 'K近邻离群点检测', icon: icons.Filter },
  { value: 'topology', label: '拓扑重建', desc: 'Octree空间索引构建', icon: icons.GitBranch },
  { value: 'compression', label: '数据压缩', desc: 'Draco几何编码压缩', icon: icons.FileArchive }
]

const priorities = [
  { value: 'high', label: '高优先级', activeClass: 'bg-error-red/20 text-error-red border border-error-red/30' },
  { value: 'normal', label: '普通', activeClass: 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30' },
  { value: 'low', label: '低优先级', activeClass: 'bg-cyber-text-muted/20 text-cyber-text border border-cyber-text-muted/30' }
]

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks
  
  if (activeTab.value !== 'all') {
    tasks = tasks.filter(t => t.status === activeTab.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query)
    )
  }
  
  return tasks
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function handleCreateTask() {
  const pc = pointCloudStore.pointClouds.find(p => p.id === newTask.pointCloudId)
  if (!pc) return

  const typeLabels: Record<string, string> = {
    downsampling: '体素下采样',
    denoising: '统计滤波去噪',
    topology: '拓扑重建',
    compression: '数据压缩'
  }

  const task: ProcessingTask = {
    id: `task_${Date.now()}`,
    type: newTask.type,
    name: `${typeLabels[newTask.type]} - ${pc.name}`,
    pointCloudId: newTask.pointCloudId,
    status: 'pending',
    progress: 0,
    priority: newTask.priority,
    config: { ...newTask.config },
    inputPoints: pc.originalPoints,
    createdAt: Date.now(),
    inputData: pc.data
  }

  taskStore.createTask(task)
  showCreateModal.value = false
  
  uiStore.addNotification({
    type: 'success',
    title: '任务创建成功',
    message: `任务 ${task.name} 已加入队列`
  })

  newTask.pointCloudId = ''
  newTask.type = 'downsampling'
  newTask.priority = 'normal'
}

function handleStartTask(id: string) {
  taskStore.startTask(id)
  uiStore.addNotification({
    type: 'info',
    title: '任务已启动',
    message: `任务 ${id} 开始执行`
  })
}

function handleCancelTask(id: string) {
  taskStore.cancelTask(id)
  uiStore.addNotification({
    type: 'warning',
    title: '任务已取消',
    message: `任务 ${id} 已被取消`
  })
}

function handleDeleteTask(id: string) {
  taskStore.removeTask(id)
  uiStore.addNotification({
    type: 'info',
    title: '任务已删除',
    message: `任务 ${id} 已被删除`
  })
}

function handleRetryTask(task: ProcessingTask) {
  const retryTask: ProcessingTask = {
    ...task,
    id: `task_${Date.now()}`,
    status: 'pending',
    progress: 0,
    startTime: undefined,
    endTime: undefined,
    errorMessage: undefined,
    createdAt: Date.now()
  }
  taskStore.createTask(retryTask)
  uiStore.addNotification({
    type: 'info',
    title: '任务重试',
    message: `已重新提交任务 ${task.name}`
  })
}

function handleViewTask(task: ProcessingTask) {
  pointCloudStore.selectPointCloud(task.pointCloudId)
  uiStore.addNotification({
    type: 'info',
    title: '查看结果',
    message: '正在跳转到可视化页面...'
  })
  setTimeout(() => {
    window.location.href = '/visualizer'
  }, 500)
}

let isInitialized = false

onMounted(() => {
  if (!isInitialized) {
    isInitialized = true
    taskStore.loadTasks()
    pointCloudStore.loadPointClouds()
  }
})
</script>
