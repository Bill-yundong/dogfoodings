<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useTankStore } from '@/stores/tankStore'
import dayjs from 'dayjs'

const terminalStore = useTerminalStore()
const simulationStore = useSimulationStore()
const tankStore = useTankStore()

const activeTab = ref<'evacuation' | 'resources' | 'history'>('evacuation')
const selectedTask = ref<string | null>(null)

let progressInterval: ReturnType<typeof setInterval> | null = null

const activeTasks = computed(() => {
  return terminalStore.evacuationTasks.filter(t => t.status === 'in-progress' || t.status === 'pending')
})

const completedTasks = computed(() => {
  return terminalStore.evacuationTasks.filter(t => t.status === 'completed')
})

const totalPopulation = computed(() => {
  return terminalStore.terminals.reduce((sum, t) => sum + t.population, 0)
})

const evacuatedPopulation = computed(() => {
  return terminalStore.terminals
    .filter(t => t.evacuationStatus === 'completed')
    .reduce((sum, t) => sum + t.population, 0)
})

const evacuationProgress = computed(() => {
  if (totalPopulation.value === 0) return 0
  return Math.round((evacuatedPopulation.value / totalPopulation.value) * 100)
})

function createEvacuationTask(terminalId: string, shelterId: string) {
  const task = terminalStore.createEvacuationTask(terminalId, shelterId)
  if (task) {
    startTaskSimulation(task.id)
  }
}

function startTaskSimulation(taskId: string) {
  const task = terminalStore.evacuationTasks.find(t => t.id === taskId)
  if (!task || task.status !== 'pending') return

  task.status = 'in-progress'

  if (progressInterval) clearInterval(progressInterval)

  progressInterval = setInterval(() => {
    terminalStore.updateTaskProgress(taskId, task.progress + 2)

    if (task.progress >= 100) {
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
    }
  }, 500)
}

function assignResource(taskId: string, resourceId: string) {
  terminalStore.assignResourceToTask(taskId, resourceId)
}

function releaseResource(resourceId: string) {
  terminalStore.releaseResource(resourceId)
}

function selectTask(taskId: string | null) {
  selectedTask.value = taskId
}

const massEvacuationTriggered = ref(false)

function triggerMassEvacuation() {
  let taskCount = 0

  for (const terminal of terminalStore.terminals) {
    if (terminal.evacuationStatus === 'idle') {
      if (terminal.alertLevel === 'normal') {
        terminalStore.updateTerminalAlert(terminal.id, 'evacuate')
      }
      terminalStore.updateTerminalEvacuationStatus(terminal.id, 'preparing')
      createEvacuationTask(terminal.id, 'shelter-001')
      taskCount++
    }
  }

  massEvacuationTriggered.value = true
  setTimeout(() => {
    massEvacuationTriggered.value = false
  }, 2000)

  console.log(`[Command] 大规模疏散已启动，创建了 ${taskCount} 个疏散任务`)
}

function resetAll() {
  terminalStore.resetAllAlerts()
  simulationStore.resetSimulation()
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

const resourceTypeLabel: Record<string, string> = {
  'fire-truck': '🚒 消防车',
  'ambulance': '🚑 救护车',
  'hazardous-material': '☣️ 危化品处置',
  'police': '🚓 警务',
  'rescue-team': '⛑️ 救援队'
}

const resourceStatusColor: Record<string, string> = {
  'standby': 'bg-risk-safe text-risk-safe',
  'deployed': 'bg-risk-danger text-risk-danger',
  'returning': 'bg-risk-caution text-risk-caution',
  'maintenance': 'bg-text-muted text-text-muted'
}

const resourceStatusText: Record<string, string> = {
  'standby': '待命',
  'deployed': '已部署',
  'returning': '返回中',
  'maintenance': '维护中'
}

onMounted(() => {
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">联动指挥中心</h2>
        <span
          v-if="simulationStore.isRunning"
          class="px-3 py-1 rounded-full text-xs font-medium bg-risk-danger text-white animate-pulse"
        >
          ● 应急响应中
        </span>
      </div>
      <div class="flex gap-2">
        <button 
          @click="triggerMassEvacuation" 
          class="btn-warning text-sm transition-all"
          :class="{ 'scale-95': massEvacuationTriggered }"
        >
          🚨 {{ massEvacuationTriggered ? '疏散已启动！' : '启动大规模疏散' }}
        </button>
        <button @click="resetAll" class="btn-secondary text-sm">
          🔄 重置状态
        </button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div class="glass-card p-4">
        <div class="text-text-secondary text-sm mb-1">总疏散人口</div>
        <div class="text-3xl font-mono font-bold text-accent-cyan">
          {{ totalPopulation.toLocaleString() }}
          <span class="text-sm text-text-muted">人</span>
        </div>
      </div>
      <div class="glass-card p-4">
        <div class="text-text-secondary text-sm mb-1">已疏散完成</div>
        <div class="text-3xl font-mono font-bold text-risk-safe">
          {{ evacuatedPopulation.toLocaleString() }}
          <span class="text-sm text-text-muted">人</span>
        </div>
      </div>
      <div class="glass-card p-4">
        <div class="text-text-secondary text-sm mb-1">疏散进度</div>
        <div class="text-3xl font-mono font-bold text-accent-cyan">
          {{ evacuationProgress }}
          <span class="text-sm text-text-muted">%</span>
        </div>
        <div class="w-full h-2 bg-bg-tertiary rounded-full mt-2 overflow-hidden">
          <div
            class="h-full bg-accent-cyan transition-all duration-500"
            :style="{ width: `${evacuationProgress}%` }"
          ></div>
        </div>
      </div>
      <div class="glass-card p-4">
        <div class="text-text-secondary text-sm mb-1">受影响终端</div>
        <div class="text-3xl font-mono font-bold text-risk-warning">
          {{ terminalStore.alertingTerminals.length }}
          <span class="text-sm text-text-muted">/ {{ terminalStore.terminals.length }}</span>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mb-2">
      <button
        v-for="tab in [{ key: 'evacuation', label: '疏散任务' }, { key: 'resources', label: '资源调度' }, { key: 'history', label: '历史记录' }]"
        :key="tab.key"
        @click="activeTab = tab.key as any"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.key ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="activeTab === 'evacuation'" class="h-full flex gap-4 overflow-hidden">
        <div class="flex-1 glass-panel p-4 overflow-y-auto scrollbar-thin">
          <h3 class="text-sm font-medium text-text-secondary mb-3">进行中的任务</h3>
          <div v-if="activeTasks.length === 0" class="text-center text-text-muted py-8">
            暂无进行中的疏散任务
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="task in activeTasks"
              :key="task.id"
              @click="selectTask(task.id)"
              class="bg-bg-tertiary/50 p-4 rounded-lg cursor-pointer transition-all border"
              :class="selectedTask === task.id ? 'border-accent-cyan' : 'border-transparent hover:border-white/10'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ task.terminalName }}</div>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="task.status === 'pending' ? 'bg-risk-caution/20 text-risk-caution' : 'bg-accent-cyan/20 text-accent-cyan'"
                >
                  {{ task.status === 'pending' ? '待开始' : '进行中' }}
                </span>
              </div>
              <div class="text-xs text-text-muted mb-2">
                开始时间: {{ dayjs(task.startTime).format('HH:mm:ss') }}
              </div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs text-text-secondary">疏散人数: {{ task.populationCount }} 人</span>
                <span class="text-xs text-text-secondary">|</span>
                <span class="text-xs text-text-secondary">已分配资源: {{ task.assignedResources.length }}</span>
              </div>
              <div class="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                <div
                  class="h-full bg-accent-cyan transition-all duration-300"
                  :style="{ width: `${task.progress}%` }"
                ></div>
              </div>
              <div class="text-right text-xs text-text-muted mt-1">{{ task.progress }}%</div>
            </div>
          </div>

          <h3 class="text-sm font-medium text-text-secondary mb-3 mt-6">已完成的任务</h3>
          <div v-if="completedTasks.length === 0" class="text-center text-text-muted py-4">
            暂无已完成的任务
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in completedTasks"
              :key="task.id"
              class="bg-bg-tertiary/30 p-3 rounded-lg opacity-70"
            >
              <div class="flex items-center justify-between">
                <div class="font-medium text-sm">{{ task.terminalName }}</div>
                <span class="text-xs px-2 py-0.5 rounded bg-risk-safe/20 text-risk-safe">
                  已完成
                </span>
              </div>
              <div class="text-xs text-text-muted mt-1">
                用时: {{ task.actualCompletionTime ? Math.round((task.actualCompletionTime - task.startTime) / 1000) : 0 }} 秒
              </div>
            </div>
          </div>
        </div>

        <div class="w-80 glass-panel p-4 overflow-y-auto scrollbar-thin">
          <h3 class="text-sm font-medium text-text-secondary mb-3">待疏散终端</h3>
          <div class="space-y-2">
            <div
              v-for="terminal in terminalStore.terminals.filter(t => t.alertLevel !== 'normal' && t.evacuationStatus !== 'completed')"
              :key="terminal.id"
              class="bg-bg-tertiary/50 p-3 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">{{ terminal.name }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="{
                    'bg-risk-caution/20 text-risk-caution': terminal.evacuationStatus === 'preparing',
                    'bg-risk-warning/20 text-risk-warning': terminal.evacuationStatus === 'evacuating',
                    'bg-risk-danger/20 text-risk-danger': terminal.evacuationStatus === 'sheltering'
                  }"
                >
                  {{ { idle: '待处置', preparing: '准备中', evacuating: '疏散中', sheltering: '隐蔽中', completed: '已完成' }[terminal.evacuationStatus] || '待处置' }}
                </span>
              </div>
              <div class="text-xs text-text-muted mb-2">
                人口: {{ terminal.population }} 人
              </div>
              <div class="flex gap-1">
                <select class="input-field text-xs flex-1 py-1">
                  <option v-for="shelter in terminalStore.shelters" :key="shelter.id" :value="shelter.id">
                    {{ shelter.name }} ({{ shelter.currentOccupancy }}/{{ shelter.capacity }})
                  </option>
                </select>
                <button
                  @click="createEvacuationTask(terminal.id, 'shelter-001')"
                  class="btn-primary text-xs px-2 py-1"
                  :disabled="terminal.evacuationStatus !== 'idle' && terminal.evacuationStatus !== 'preparing'"
                >
                  派单
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'resources'" class="h-full flex gap-4 overflow-hidden">
        <div class="flex-1 glass-panel p-4 overflow-y-auto scrollbar-thin">
          <h3 class="text-sm font-medium text-text-secondary mb-3">救援资源</h3>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="resource in terminalStore.resources"
              :key="resource.id"
              class="bg-bg-tertiary/50 p-4 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium text-sm">{{ resource.name }}</div>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="resourceStatusColor[resource.status]"
                >
                  {{ resourceStatusText[resource.status] }}
                </span>
              </div>
              <div class="text-xs text-text-secondary mb-2">
                {{ resourceTypeLabel[resource.type] }} · {{ resource.personnel }} 人
              </div>
              <div class="flex flex-wrap gap-1 mb-3">
                <span
                  v-for="equip in resource.equipment.slice(0, 3)"
                  :key="equip"
                  class="text-xs px-1.5 py-0.5 bg-bg-primary rounded"
                >
                  {{ equip }}
                </span>
              </div>
              <div class="flex gap-1">
                <button
                  v-if="resource.status === 'standby'"
                  class="btn-primary text-xs flex-1 py-1"
                  :disabled="!selectedTask"
                >
                  分配任务
                </button>
                <button
                  v-if="resource.status === 'deployed'"
                  @click="releaseResource(resource.id)"
                  class="btn-secondary text-xs flex-1 py-1"
                >
                  召回
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="w-80 glass-panel p-4 overflow-y-auto scrollbar-thin">
          <h3 class="text-sm font-medium text-text-secondary mb-3">避难所状态</h3>
          <div class="space-y-3">
            <div
              v-for="shelter in terminalStore.shelters"
              :key="shelter.id"
              class="bg-bg-tertiary/50 p-4 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ shelter.name }}</div>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="shelter.status === 'available' ? 'bg-risk-safe/20 text-risk-safe' : 'bg-risk-caution/20 text-risk-caution'"
                >
                  {{ shelter.status === 'available' ? '可用' : '已满' }}
                </span>
              </div>
              <div class="text-xs text-text-secondary mb-2">
                {{ shelter.type === 'permanent' ? '永久避难所' : '临时安置点' }}
              </div>
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-text-muted">当前入住</span>
                <span class="font-mono text-accent-cyan">{{ shelter.currentOccupancy }} / {{ shelter.capacity }}</span>
              </div>
              <div class="w-full h-2 bg-bg-primary rounded-full overflow-hidden mb-2">
                <div
                  class="h-full transition-all duration-300"
                  :class="shelter.currentOccupancy / shelter.capacity > 0.8 ? 'bg-risk-warning' : 'bg-risk-safe'"
                  :style="{ width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%` }"
                ></div>
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="facility in shelter.facilities"
                  :key="facility"
                  class="text-xs px-1.5 py-0.5 bg-accent-cyan/10 text-accent-cyan rounded"
                >
                  {{ facility }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="h-full glass-panel p-4 overflow-y-auto scrollbar-thin">
        <h3 class="text-sm font-medium text-text-secondary mb-3">模拟历史记录</h3>
        <div v-if="simulationStore.simulationRecords.length === 0" class="text-center text-text-muted py-16">
          暂无历史模拟记录
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="record in simulationStore.simulationRecords"
            :key="record.id"
            class="bg-bg-tertiary/50 p-4 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="font-medium">{{ record.tankName }} - {{ record.chemical }} 泄漏</div>
              <span
                class="text-xs px-2 py-0.5 rounded"
                :class="{
                  'bg-risk-danger/20 text-risk-danger': record.status === 'running',
                  'bg-risk-caution/20 text-risk-caution': record.status === 'paused',
                  'bg-risk-safe/20 text-risk-safe': record.status === 'completed',
                  'bg-text-muted/20 text-text-muted': record.status === 'stopped'
                }"
              >
                {{ { running: '运行中', paused: '已暂停', completed: '已完成', stopped: '已停止' }[record.status] }}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div class="text-text-muted">开始时间</div>
                <div class="font-mono">{{ dayjs(record.startTime).format('YYYY-MM-DD HH:mm:ss') }}</div>
              </div>
              <div>
                <div class="text-text-muted">源强</div>
                <div class="font-mono">{{ record.params.sourceStrength }} kg/s</div>
              </div>
              <div>
                <div class="text-text-muted">风速</div>
                <div class="font-mono">{{ record.params.windSpeed }} m/s</div>
              </div>
            </div>
            <div class="text-xs text-text-secondary mt-2">
              计算结果: {{ record.results.length }} 帧
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
