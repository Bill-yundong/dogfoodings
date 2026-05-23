<template>
  <div
    class="cyber-card group hover:border-electric-blue/50 transition-all duration-300"
    :class="{ 'opacity-60': task.status === 'cancelled' }"
  >
    <div class="flex items-start gap-4">
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        :class="typeIconBgClass"
      >
        <component :is="typeIcon" class="w-6 h-6" :class="typeIconClass" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="font-medium text-cyber-text truncate group-hover:text-electric-blue transition-colors">
              {{ task.name }}
            </h3>
            <p class="text-sm text-cyber-text-secondary mt-0.5">
              <span class="font-mono">{{ formatNumber(task.inputPoints || 0) }}</span> 个点
              <span v-if="task.outputPoints" class="mx-1">→</span>
              <span v-if="task.outputPoints" class="font-mono text-success-green">{{ formatNumber(task.outputPoints) }}</span>
            </p>
          </div>
          <span :class="statusBadgeClass">{{ statusLabel }}</span>
        </div>

        <div v-if="task.status === 'running' || task.progress > 0" class="mt-3">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-cyber-text-secondary">处理进度</span>
            <span class="text-cyber-text font-mono">{{ task.progress }}%</span>
          </div>
          <div class="cyber-progress-bar">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="progressFillClass"
              :style="{ width: `${task.progress}%` }"
            ></div>
          </div>
        </div>

        <div v-if="task.errorMessage" class="mt-2 p-2 rounded-lg bg-error-red/10 border border-error-red/30">
          <p class="text-xs text-error-red flex items-center gap-1">
            <component :is="icons.AlertCircle" class="w-3.5 h-3.5" />
            {{ task.errorMessage }}
          </p>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-4 text-xs text-cyber-text-muted">
            <span class="flex items-center gap-1">
              <component :is="icons.Clock" class="w-3.5 h-3.5" />
              {{ formatTime(task.createdAt) }}
            </span>
            <span v-if="task.startTime && task.endTime" class="flex items-center gap-1">
              <component :is="icons.Timer" class="w-3.5 h-3.5" />
              {{ formatDuration(task.endTime - task.startTime) }}
            </span>
            <span class="flex items-center gap-1">
              <component :is="priorityIcon" class="w-3.5 h-3.5" :class="priorityClass" />
              {{ priorityLabel }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="task.status === 'pending'"
              @click="$emit('start', task.id)"
              class="p-1.5 rounded-md text-cyber-text-secondary hover:text-electric-blue hover:bg-electric-blue/10 transition-colors"
              title="开始处理"
            >
              <component :is="icons.Play" class="w-4 h-4" />
            </button>
            <button
              v-if="task.status === 'running'"
              @click="$emit('cancel', task.id)"
              class="p-1.5 rounded-md text-cyber-text-secondary hover:text-error-red hover:bg-error-red/10 transition-colors"
              title="取消任务"
            >
              <component :is="icons.Square" class="w-4 h-4" />
            </button>
            <button
              v-if="task.status === 'completed'"
              @click="$emit('view', task)"
              class="p-1.5 rounded-md text-cyber-text-secondary hover:text-success-green hover:bg-success-green/10 transition-colors"
              title="查看结果"
            >
              <component :is="icons.Eye" class="w-4 h-4" />
            </button>
            <button
              v-if="task.status === 'failed'"
              @click="$emit('retry', task)"
              class="p-1.5 rounded-md text-cyber-text-secondary hover:text-warning-orange hover:bg-warning-orange/10 transition-colors"
              title="重试"
            >
              <component :is="icons.RotateCcw" class="w-4 h-4" />
            </button>
            <button
              @click="$emit('delete', task.id)"
              class="p-1.5 rounded-md text-cyber-text-secondary hover:text-error-red hover:bg-error-red/10 transition-colors"
              title="删除"
            >
              <component :is="icons.Trash2" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Cpu,
  Filter,
  GitBranch,
  FileArchive,
  Clock,
  Timer,
  AlertCircle,
  Play,
  Square,
  Eye,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-vue-next'
import type { ProcessingTask } from '@/types'

const props = defineProps<{
  task: ProcessingTask
}>()

defineEmits<{
  start: [id: string]
  cancel: [id: string]
  delete: [id: string]
  retry: [task: ProcessingTask]
  view: [task: ProcessingTask]
}>()

const icons = {
  Cpu,
  Filter,
  GitBranch,
  FileArchive,
  Clock,
  Timer,
  AlertCircle,
  Play,
  Square,
  Eye,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus
}

const typeIcon = computed((): Component => {
  const iconMap: Record<string, Component> = {
    downsampling: icons.Cpu,
    denoising: icons.Filter,
    topology: icons.GitBranch,
    compression: icons.FileArchive
  }
  return iconMap[props.task.type] || icons.Cpu
})

const typeIconBgClass = computed(() => {
  const bgMap: Record<string, string> = {
    downsampling: 'bg-electric-blue/10',
    denoising: 'bg-success-green/10',
    topology: 'bg-electric-purple/10',
    compression: 'bg-warning-orange/10'
  }
  return bgMap[props.task.type] || 'bg-electric-blue/10'
})

const typeIconClass = computed(() => {
  const classMap: Record<string, string> = {
    downsampling: 'text-electric-blue',
    denoising: 'text-success-green',
    topology: 'text-electric-purple',
    compression: 'text-warning-orange'
  }
  return classMap[props.task.type] || 'text-electric-blue'
})

const statusLabel = computed(() => {
  const labelMap: Record<string, string> = {
    pending: '等待中',
    running: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return labelMap[props.task.status] || '未知'
})

const statusBadgeClass = computed(() => {
  const classMap: Record<string, string> = {
    pending: 'cyber-badge-info',
    running: 'cyber-badge-info animate-pulse-glow',
    completed: 'cyber-badge-success',
    failed: 'cyber-badge-error',
    cancelled: 'cyber-badge-warning'
  }
  return classMap[props.task.status] || 'cyber-badge-info'
})

const progressFillClass = computed(() => {
  if (props.task.status === 'failed') return 'cyber-progress-fill-error'
  if (props.task.status === 'cancelled') return 'cyber-progress-fill-warning'
  return 'cyber-progress-fill'
})

const priorityIcon = computed((): Component => {
  if (props.task.priority === 'high') return icons.ArrowUp
  if (props.task.priority === 'low') return icons.ArrowDown
  return icons.Minus
})

const priorityClass = computed(() => {
  if (props.task.priority === 'high') return 'text-error-red'
  if (props.task.priority === 'low') return 'text-cyber-text-muted'
  return 'text-cyber-text-secondary'
})

const priorityLabel = computed(() => {
  const labelMap: Record<string, string> = {
    high: '高优先级',
    normal: '普通',
    low: '低优先级'
  }
  return labelMap[props.task.priority] || '普通'
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}分${Math.floor((ms % 60000) / 1000)}秒`
  return `${Math.floor(ms / 3600000)}时${Math.floor((ms % 3600000) / 60000)}分`
}
</script>
