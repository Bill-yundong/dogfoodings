<template>
  <div class="h-full overflow-auto p-6 grid-bg">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总点数量"
          :value="pointCloudStore.totalPoints"
          format="number"
          :icon="icons.Database"
          icon-variant="blue"
          :trend="5.2"
          subtitle="累计处理"
        />
        <StatCard
          title="总文件大小"
          :value="pointCloudStore.totalSize * 1024 * 1024"
          format="bytes"
          :icon="icons.HardDrive"
          icon-variant="purple"
          :trend="-2.8"
          subtitle="原始数据"
        />
        <StatCard
          title="平均压缩率"
          :value="avgCompressionRatio"
          format="percent"
          :icon="icons.TrendingDown"
          icon-variant="green"
          :trend="3.1"
          subtitle="较上周提升"
        />
        <StatCard
          title="任务成功率"
          :value="taskStore.stats.successRate"
          format="percent"
          :icon="icons.CheckCircle"
          icon-variant="orange"
          :progress="taskStore.stats.successRate"
          progress-label="目标: 95%"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 cyber-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2">
              <component :is="icons.Activity" class="w-5 h-5 text-electric-blue" />
              处理任务趋势
            </h2>
            <div class="flex gap-2">
              <button
                v-for="range in timeRanges"
                :key="range.value"
                @click="selectedTimeRange = range.value"
                class="px-3 py-1 text-xs rounded-md transition-colors"
                :class="selectedTimeRange === range.value
                  ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                  : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter'"
              >
                {{ range.label }}
              </button>
            </div>
          </div>
          <div ref="trendChartRef" class="h-64"></div>
        </div>

        <div class="cyber-card">
          <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2 mb-4">
            <component :is="icons.Cpu" class="w-5 h-5 text-electric-blue" />
            系统资源监控
          </h2>
          <div class="space-y-4">
            <div v-for="metric in systemMetrics" :key="metric.key" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary flex items-center gap-2">
                  <component :is="metric.icon" class="w-4 h-4" :class="metric.color" />
                  {{ metric.label }}
                </span>
                <span class="font-mono text-cyber-text">{{ metric.value }}%</span>
              </div>
              <div class="cyber-progress-bar">
                <div
                  class="cyber-progress-fill"
                  :style="{ width: `${metric.value}%` }"
                  :class="{ 'cyber-progress-fill-warning': metric.value > 70, 'cyber-progress-fill-error': metric.value > 85 }"
                ></div>
              </div>
            </div>
          </div>

          <div class="cyber-divider"></div>

          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="status-dot-online"></span>
              <span class="text-cyber-text-secondary">Worker 池</span>
            </div>
            <span class="font-mono text-cyber-text">{{ workerPoolStatus.active }} / {{ workerPoolStatus.total }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="cyber-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2">
              <component :is="icons.ListTodo" class="w-5 h-5 text-electric-blue" />
              最近任务
            </h2>
            <router-link to="/processing" class="text-sm text-electric-blue hover:text-electric-blue-light">
              查看全部
            </router-link>
          </div>
          <div class="space-y-3 max-h-80 overflow-y-auto">
            <TaskItem
              v-for="task in recentTasks"
              :key="task.id"
              :task="task"
              @start="handleStartTask"
              @cancel="handleCancelTask"
              @delete="handleDeleteTask"
              @retry="handleRetryTask"
              @view="handleViewTask"
            />
            <div v-if="recentTasks.length === 0" class="text-center py-8 text-cyber-text-secondary">
              暂无任务
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2">
              <component :is="icons.HardDrive" class="w-5 h-5 text-electric-blue" />
              点云数据列表
            </h2>
            <router-link to="/visualizer" class="text-sm text-electric-blue hover:text-electric-blue-light">
              查看全部
            </router-link>
          </div>
          <div class="space-y-3 max-h-80 overflow-y-auto">
            <div
              v-for="pc in recentPointClouds"
              :key="pc.id"
              class="p-3 rounded-lg bg-cyber-bg-lighter border border-cyber-border hover:border-electric-blue/50 transition-all cursor-pointer group"
              @click="handleSelectPointCloud(pc.id)"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0">
                  <h3 class="font-medium text-cyber-text truncate group-hover:text-electric-blue transition-colors">
                    {{ pc.name }}
                  </h3>
                  <p class="text-sm text-cyber-text-secondary mt-0.5">{{ pc.description }}</p>
                  <div class="flex items-center gap-3 mt-2 text-xs text-cyber-text-muted">
                    <span class="flex items-center gap-1">
                      <component :is="icons.MapPin" class="w-3 h-3" />
                      {{ formatNumber(pc.originalPoints) }} 点
                    </span>
                    <span class="flex items-center gap-1">
                      <component :is="icons.File" class="w-3 h-3" />
                      {{ pc.fileSize.toFixed(1) }} MB
                    </span>
                    <span>{{ pc.format }}</span>
                  </div>
                </div>
                <span
                  class="cyber-badge"
                  :class="{
                    'cyber-badge-success': pc.status === 'processed',
                    'cyber-badge-info': pc.status === 'processing',
                    'cyber-badge-warning': pc.status === 'pending'
                  }"
                >
                  {{ statusLabels[pc.status] || pc.status }}
                </span>
              </div>
            </div>
            <div v-if="recentPointClouds.length === 0" class="text-center py-8 text-cyber-text-secondary">
              暂无点云数据
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="cyber-card">
          <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2 mb-4">
            <component :is="icons.Workflow" class="w-5 h-5 text-electric-blue" />
            数据处理流程
          </h2>
          <div class="relative py-4">
            <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-cyber-border -translate-y-1/2 z-0"></div>
            <div class="flex justify-between relative z-10">
              <div
                v-for="(step, index) in workflowSteps"
                :key="step.id"
                class="flex flex-col items-center"
              >
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  :class="step.completed
                    ? 'bg-success-green/20 border-2 border-success-green text-success-green'
                    : step.active
                    ? 'bg-electric-blue/20 border-2 border-electric-blue text-electric-blue animate-pulse-glow'
                    : 'bg-cyber-bg-lighter border-2 border-cyber-border text-cyber-text-muted'"
                >
                  <component :is="step.icon" class="w-5 h-5" />
                </div>
                <p class="text-sm font-medium mt-2" :class="step.completed || step.active ? 'text-cyber-text' : 'text-cyber-text-muted'">
                  {{ step.label }}
                </p>
                <p class="text-xs text-cyber-text-muted mt-0.5">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h2 class="text-lg font-semibold text-cyber-text flex items-center gap-2 mb-4">
            <component :is="icons.Network" class="w-5 h-5 text-electric-blue" />
            链路状态
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-cyber-bg-lighter border border-cyber-border">
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="syncStore.linkStatus.droneConnected ? 'bg-success-green/20' : 'bg-cyber-bg'"
                >
                  <component
                    :is="icons.Drone"
                    class="w-5 h-5"
                    :class="syncStore.linkStatus.droneConnected ? 'text-success-green' : 'text-cyber-text-muted'"
                  />
                </div>
                <div>
                  <p class="text-sm font-medium text-cyber-text">无人机连接</p>
                  <p class="text-xs" :class="syncStore.linkStatus.droneConnected ? 'text-success-green' : 'text-error-red'">
                    {{ syncStore.linkStatus.droneConnected ? '已连接' : '未连接' }}
                  </p>
                </div>
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

            <div class="p-4 rounded-lg bg-cyber-bg-lighter border border-cyber-border">
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="syncStore.linkStatus.databaseConnected ? 'bg-success-green/20' : 'bg-cyber-bg'"
                >
                  <component
                    :is="icons.Database"
                    class="w-5 h-5"
                    :class="syncStore.linkStatus.databaseConnected ? 'text-success-green' : 'text-cyber-text-muted'"
                  />
                </div>
                <div>
                  <p class="text-sm font-medium text-cyber-text">省网数据库</p>
                  <p class="text-xs" :class="syncStore.linkStatus.databaseConnected ? 'text-success-green' : 'text-error-red'">
                    {{ syncStore.linkStatus.databaseConnected ? '已连接' : '未连接' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-cyber-text-muted">延迟</span>
                <span class="font-mono text-cyber-text">{{ syncStore.linkStatus.networkLatency }}ms</span>
              </div>
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="text-cyber-text-muted">带宽</span>
                <span class="font-mono text-cyber-text">{{ syncStore.linkStatus.bandwidth }} Mbps</span>
              </div>
            </div>
          </div>

          <div class="mt-4 p-3 rounded-lg bg-electric-blue/5 border border-electric-blue/20">
            <p class="text-sm text-electric-blue flex items-center gap-2">
              <component :is="icons.Info" class="w-4 h-4" />
              网络状态良好，同步任务可正常进行
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Dashboard' })
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, shallowRef, nextTick, type Component } from 'vue'
import * as echarts from 'echarts'
import {
  Database,
  HardDrive,
  TrendingDown,
  CheckCircle,
  Activity,
  Cpu,
  MemoryStick,
  MonitorSpeaker,
  ListTodo,
  MapPin,
  File,
  Workflow,
  Network,
  Plane,
  Info,
  Upload,
  Filter,
  GitBranch,
  FileArchive,
  UploadCloud
} from 'lucide-vue-next'
import StatCard from '@/components/common/StatCard.vue'
import TaskItem from '@/components/common/TaskItem.vue'
import { usePointCloudStore, useTaskStore, useSyncStore, useUiStore } from '@/stores'
import { mockApi } from '@/api'
import type { ProcessingTask, PointCloud } from '@/types'

const pointCloudStore = usePointCloudStore()
const taskStore = useTaskStore()
const syncStore = useSyncStore()
const uiStore = useUiStore()

const icons = {
  Database,
  HardDrive,
  TrendingDown,
  CheckCircle,
  Activity,
  Cpu,
  MemoryStick,
  MonitorSpeaker,
  ListTodo,
  MapPin,
  File,
  Workflow,
  Network,
  Plane,
  Info,
  Upload,
  Filter,
  GitBranch,
  FileArchive,
  UploadCloud
}

const selectedTimeRange = ref('7d')
const trendChartRef = ref<HTMLElement | null>(null)
const trendChart = shallowRef<echarts.ECharts | null>(null)

const timeRanges = [
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '90天', value: '90d' }
]

const statusLabels: Record<string, string> = {
  processed: '已处理',
  processing: '处理中',
  pending: '待处理'
}

const avgCompressionRatio = computed(() => {
  const ratios = pointCloudStore.pointClouds
    .filter(pc => pc.downsampledPoints > 0)
    .map(pc => (1 - pc.downsampledPoints / pc.originalPoints) * 100)
  return ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0
})

const systemMetrics = computed(() => [
  { key: 'cpu', label: 'CPU 使用率', value: 35 + Math.floor(Math.random() * 15), icon: icons.Cpu, color: 'text-electric-blue' },
  { key: 'memory', label: '内存使用', value: 55 + Math.floor(Math.random() * 15), icon: icons.MemoryStick, color: 'text-electric-purple' },
  { key: 'gpu', label: 'GPU 显存', value: 45 + Math.floor(Math.random() * 20), icon: icons.MonitorSpeaker, color: 'text-success-green' },
  { key: 'storage', label: '存储空间', value: 40 + Math.floor(Math.random() * 10), icon: icons.HardDrive, color: 'text-warning-orange' }
])

const workerPoolStatus = computed(() => ({
  active: taskStore.runningTasks.length,
  total: 4
}))

const recentTasks = computed(() => taskStore.tasks.slice(0, 3))
const recentPointClouds = computed(() => pointCloudStore.pointClouds.slice(0, 3))

const workflowSteps = computed<Array<{ id: string; label: string; desc: string; icon: Component; completed: boolean; active: boolean }>>(() => [
  { id: 'upload', label: '数据采集', desc: '无人机LiDAR扫描', icon: icons.Upload, completed: true, active: false },
  { id: 'downsample', label: '体素下采样', desc: '空间网格降维', icon: icons.Cpu, completed: true, active: false },
  { id: 'denoise', label: '去噪清洗', desc: '统计滤波处理', icon: icons.Filter, completed: taskStore.tasks.filter(t => t.type === 'denoising' && t.status === 'completed').length > 0, active: taskStore.tasks.some(t => t.type === 'denoising' && t.status === 'running') },
  { id: 'topology', label: '拓扑重建', desc: 'Octree空间索引', icon: icons.GitBranch, completed: taskStore.tasks.filter(t => t.type === 'topology' && t.status === 'completed').length > 0, active: taskStore.tasks.some(t => t.type === 'topology' && t.status === 'running') },
  { id: 'compress', label: '数据压缩', desc: 'Draco编码', icon: icons.FileArchive, completed: taskStore.tasks.filter(t => t.type === 'compression' && t.status === 'completed').length > 0, active: taskStore.tasks.some(t => t.type === 'compression' && t.status === 'running') },
  { id: 'sync', label: '数据同步', desc: '省网数据库', icon: icons.UploadCloud, completed: syncStore.completedSync.length > 0, active: syncStore.syncingTasks.length > 0 }
])

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function initChart() {
  if (!trendChartRef.value) return
  
  trendChart.value = echarts.init(trendChartRef.value)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 26, 40, 0.95)',
      borderColor: '#2a3447',
      textStyle: { color: '#e8edf5' }
    },
    legend: {
      data: ['任务数', '处理点数(M)'],
      textStyle: { color: '#8892b0' },
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['12-01', '12-02', '12-03', '12-04', '12-05', '12-06', '12-07'],
      axisLine: { lineStyle: { color: '#2a3447' } },
      axisLabel: { color: '#8892b0' }
    },
    yAxis: [
      {
        type: 'value',
        name: '任务数',
        axisLine: { lineStyle: { color: '#2a3447' } },
        axisLabel: { color: '#8892b0' },
        splitLine: { lineStyle: { color: '#2a3447', type: 'dashed' } }
      },
      {
        type: 'value',
        name: '点数(M)',
        axisLine: { lineStyle: { color: '#2a3447' } },
        axisLabel: { color: '#8892b0' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '任务数',
        type: 'line',
        smooth: true,
        data: [23, 31, 28, 35, 29, 20, 15],
        itemStyle: { color: '#00d4ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
            { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
          ])
        }
      },
      {
        name: '处理点数(M)',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: [125, 158, 142, 175, 148, 98, 82],
        itemStyle: { color: '#a855f7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.05)' }
          ])
        }
      }
    ]
  }
  
  trendChart.value.setOption(option)
}

function handleSelectPointCloud(id: string) {
  pointCloudStore.selectPointCloud(id)
  uiStore.addNotification({
    type: 'info',
    title: '已选择点云',
    message: '正在跳转到可视化页面...'
  })
  setTimeout(() => {
    window.location.href = '/visualizer'
  }, 500)
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
  uiStore.addNotification({
    type: 'info',
    title: '任务重试',
    message: `正在重新提交任务 ${task.name}`
  })
}

function handleViewTask(task: ProcessingTask) {
  uiStore.addNotification({
    type: 'info',
    title: '查看结果',
    message: `正在加载任务 ${task.name} 的处理结果`
  })
}

let metricsInterval: number | null = null
let isInitialized = false

function startMetricsTimer() {
  if (metricsInterval === null) {
    metricsInterval = window.setInterval(() => {
      if (trendChart.value) {
        trendChart.value.setOption({
          series: [
            { data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20) + 15) },
            { data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 80) }
          ]
        })
      }
    }, 5000)
  }
}

function stopMetricsTimer() {
  if (metricsInterval) {
    clearInterval(metricsInterval)
    metricsInterval = null
  }
}

onMounted(() => {
  pointCloudStore.loadPointClouds()
  taskStore.loadTasks()
  syncStore.loadSyncTasks()
  syncStore.refreshLinkStatus()
  
  setTimeout(() => {
    initChart()
    isInitialized = true
  }, 100)
  
  startMetricsTimer()
})

onActivated(() => {
  if (isInitialized && trendChart.value) {
    nextTick(() => {
      trendChart.value?.resize()
    })
  }
  startMetricsTimer()
})

onDeactivated(() => {
  stopMetricsTimer()
})

onUnmounted(() => {
  stopMetricsTimer()
  if (trendChart.value) {
    trendChart.value.dispose()
    trendChart.value = null
  }
  isInitialized = false
})
</script>
