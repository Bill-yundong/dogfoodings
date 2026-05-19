<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useWebSocket } from '@/composables/useWebSocket'

const terminalStore = useTerminalStore()
const simulationStore = useSimulationStore()

const selectedTerminal = ref<string | null>('term-001')
const { connect, disconnect, isConnected, onMessage, broadcastDiffusionUpdate } = useWebSocket()

let syncInterval: ReturnType<typeof setInterval> | null = null

const currentTerminal = computed(() => {
  return terminalStore.terminals.find(t => t.id === selectedTerminal.value)
})

const alertLevelText = {
  normal: '正常',
  alert: '预警',
  evacuate: '紧急疏散',
  shelter: '就地隐蔽'
}

const alertLevelColor = {
  normal: 'text-risk-safe bg-risk-safe/20',
  alert: 'text-risk-caution bg-risk-caution/20',
  evacuate: 'text-risk-warning bg-risk-warning/20',
  shelter: 'text-risk-danger bg-risk-danger/20'
}

const evacuationStatusText = {
  idle: '待命',
  preparing: '准备中',
  evacuating: '疏散中',
  completed: '已完成',
  sheltering: '隐蔽中'
}

const terminalTypeIcon: Record<string, string> = {
  enterprise: '🏭',
  residential: '🏠',
  school: '🏫',
  hospital: '🏥'
}

function startSync() {
  connect()

  syncInterval = setInterval(() => {
    if (simulationStore.currentResult && isConnected.value) {
      broadcastDiffusionUpdate(simulationStore.currentResult)
    }
  }, 2000)

  onMessage('diffusion_update', (data) => {
    console.log('[Terminal] Received diffusion update:', data)
  })
}

function stopSync() {
  disconnect()
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

function selectTerminal(id: string) {
  selectedTerminal.value = id
}

function sendStatusReport(terminalId: string, status: string) {
  console.log(`[Terminal ${terminalId}] Status report: ${status}`)
}

function confirmEvacuation(terminalId: string) {
  terminalStore.updateTerminalEvacuationStatus(terminalId, 'evacuating')
  sendStatusReport(terminalId, 'Evacuation started')
}

function completeEvacuation(terminalId: string) {
  terminalStore.updateTerminalEvacuationStatus(terminalId, 'completed')
  sendStatusReport(terminalId, 'Evacuation completed')
}

function requestShelter(terminalId: string) {
  terminalStore.updateTerminalAlert(terminalId, 'shelter')
  terminalStore.updateTerminalEvacuationStatus(terminalId, 'sheltering')
  sendStatusReport(terminalId, 'Shelter in place')
}

onMounted(() => {
  startSync()
})

onUnmounted(() => {
  stopSync()
})
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">应急终端模拟</h2>
        <span
          class="px-3 py-1 rounded-full text-xs font-medium"
          :class="isConnected ? 'bg-risk-safe text-white' : 'bg-text-muted text-white'"
        >
          {{ isConnected ? '● 已连接' : '○ 未连接' }}
        </span>
      </div>
    </div>

    <div class="flex-1 flex gap-4 overflow-hidden">
      <div class="w-64 glass-panel p-3 overflow-y-auto scrollbar-thin">
        <h3 class="text-sm font-medium text-text-secondary mb-3">终端列表</h3>
        <div class="space-y-2">
          <button
            v-for="terminal in terminalStore.terminals"
            :key="terminal.id"
            @click="selectTerminal(terminal.id)"
            class="w-full p-3 rounded-lg text-left transition-all"
            :class="selectedTerminal === terminal.id ? 'bg-accent-cyan/20 border border-accent-cyan' : 'bg-bg-tertiary/50 hover:bg-bg-tertiary border border-transparent'"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">{{ terminalTypeIcon[terminal.type] || '📱' }}</span>
              <span class="font-medium text-sm">{{ terminal.name }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span
                class="text-xs px-2 py-0.5 rounded"
                :class="alertLevelColor[terminal.alertLevel]"
              >
                {{ alertLevelText[terminal.alertLevel] }}
              </span>
              <span class="text-xs text-text-muted">{{ evacuationStatusText[terminal.evacuationStatus] }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center">
        <div v-if="currentTerminal" class="relative">
          <div class="w-72 h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
            <div class="w-full h-full bg-bg-primary rounded-[2.5rem] overflow-hidden flex flex-col">
              <div class="h-8 bg-black flex items-center justify-center">
                <div class="w-24 h-5 bg-black rounded-full flex items-center justify-center">
                  <div class="w-3 h-3 bg-gray-800 rounded-full"></div>
                </div>
              </div>

              <div class="flex-1 flex flex-col overflow-hidden">
                <div class="bg-bg-secondary p-3 border-b border-white/10">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{{ terminalTypeIcon[currentTerminal.type] }}</span>
                      <div>
                        <div class="font-medium text-sm">{{ currentTerminal.name }}</div>
                        <div class="text-xs text-text-muted">ID: {{ currentTerminal.id }}</div>
                      </div>
                    </div>
                    <span
                      class="w-3 h-3 rounded-full"
                      :class="{
                        'bg-risk-safe animate-pulse': currentTerminal.alertLevel === 'normal',
                        'bg-risk-caution animate-pulse': currentTerminal.alertLevel === 'alert',
                        'bg-risk-warning animate-pulse': currentTerminal.alertLevel === 'evacuate',
                        'bg-risk-danger animate-pulse': currentTerminal.alertLevel === 'shelter'
                      }"
                    ></span>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-4">
                  <div
                    v-if="currentTerminal.alertLevel !== 'normal'"
                    class="bg-risk-danger/20 border border-risk-danger/50 rounded-lg p-3"
                  >
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xl">🚨</span>
                      <span class="font-bold text-risk-danger">{{ alertLevelText[currentTerminal.alertLevel] }}</span>
                    </div>
                    <p class="text-xs text-text-secondary">
                      检测到有毒云团扩散，请立即采取行动！
                    </p>
                    <div class="mt-2 text-xs">
                      <div class="flex justify-between">
                        <span class="text-text-muted">预警时间</span>
                        <span class="font-mono">
                          {{ currentTerminal.receivedTime ? new Date(currentTerminal.receivedTime).toLocaleTimeString('zh-CN') : '--:--:--' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="glass-card p-3">
                    <div class="text-xs text-text-secondary mb-2">位置信息</div>
                    <div class="font-mono text-sm">
                      坐标: ({{ currentTerminal.position.x }}, {{ currentTerminal.position.y }})
                    </div>
                    <div class="text-sm mt-1">
                      人口: <span class="font-mono text-accent-cyan">{{ currentTerminal.population }}</span> 人
                    </div>
                  </div>

                  <div class="glass-card p-3">
                    <div class="text-xs text-text-secondary mb-2">疏散状态</div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm">状态</span>
                      <span
                        class="text-sm px-2 py-0.5 rounded"
                        :class="{
                          'bg-text-muted/20 text-text-muted': currentTerminal.evacuationStatus === 'idle',
                          'bg-risk-caution/20 text-risk-caution': currentTerminal.evacuationStatus === 'preparing',
                          'bg-risk-warning/20 text-risk-warning': currentTerminal.evacuationStatus === 'evacuating',
                          'bg-risk-safe/20 text-risk-safe': currentTerminal.evacuationStatus === 'completed',
                          'bg-risk-danger/20 text-risk-danger': currentTerminal.evacuationStatus === 'sheltering'
                        }"
                      >
                        {{ evacuationStatusText[currentTerminal.evacuationStatus] }}
                      </span>
                    </div>
                    <div v-if="currentTerminal.completedTime" class="text-xs text-text-muted">
                      完成时间: {{ new Date(currentTerminal.completedTime).toLocaleTimeString('zh-CN') }}
                    </div>
                  </div>

                  <div v-if="currentTerminal.evacuationRoute" class="glass-card p-3">
                    <div class="text-xs text-text-secondary mb-2">疏散路线</div>
                    <div class="text-xs text-text-secondary">
                      <div
                        v-for="(point, idx) in currentTerminal.evacuationRoute"
                        :key="idx"
                        class="flex items-center gap-2 py-1"
                      >
                        <span class="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center text-xs">
                          {{ idx + 1 }}
                        </span>
                        <span>{{ point.name || `途经点 ${idx + 1}` }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="simulationStore.currentResult" class="glass-card p-3">
                    <div class="text-xs text-text-secondary mb-2">实时浓度</div>
                    <div class="text-2xl font-mono font-bold text-accent-cyan">
                      {{ simulationStore.maxConcentration.toFixed(2) }}
                      <span class="text-xs text-text-muted">mg/m³</span>
                    </div>
                    <div class="text-xs text-text-secondary mt-1">
                      影响面积: {{ (simulationStore.affectedArea / 10000).toFixed(2) }} 万m²
                    </div>
                  </div>
                </div>

                <div class="p-4 border-t border-white/10 space-y-2">
                  <button
                    v-if="currentTerminal.alertLevel === 'evacuate' && currentTerminal.evacuationStatus === 'preparing'"
                    @click="confirmEvacuation(currentTerminal.id)"
                    class="w-full btn-warning text-sm"
                  >
                    开始疏散
                  </button>
                  <button
                    v-if="currentTerminal.evacuationStatus === 'evacuating'"
                    @click="completeEvacuation(currentTerminal.id)"
                    class="w-full btn-primary text-sm"
                  >
                    确认疏散完成
                  </button>
                  <button
                    v-if="currentTerminal.alertLevel === 'evacuate'"
                    @click="requestShelter(currentTerminal.id)"
                    class="w-full btn-secondary text-sm"
                  >
                    申请就地隐蔽
                  </button>
                  <button
                    @click="sendStatusReport(currentTerminal.id, 'Ping')"
                    class="w-full btn-secondary text-sm"
                  >
                    发送状态报告
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full"></div>
        </div>

        <div v-else class="text-text-muted">请选择一个终端</div>
      </div>

      <div class="w-80 glass-panel p-4 overflow-y-auto scrollbar-thin">
        <h3 class="text-sm font-medium text-text-secondary mb-3">消息日志</h3>
        <div class="space-y-2">
          <div class="bg-bg-tertiary/50 p-3 rounded-lg text-xs">
            <div class="flex justify-between mb-1">
              <span class="text-accent-cyan">系统</span>
              <span class="text-text-muted font-mono">{{ new Date().toLocaleTimeString('zh-CN') }}</span>
            </div>
            <div class="text-text-secondary">应急终端模拟系统已启动</div>
          </div>
          <div class="bg-bg-tertiary/50 p-3 rounded-lg text-xs">
            <div class="flex justify-between mb-1">
              <span class="text-accent-cyan">系统</span>
              <span class="text-text-muted font-mono">{{ new Date().toLocaleTimeString('zh-CN') }}</span>
            </div>
            <div class="text-text-secondary">WebSocket 连接已建立</div>
          </div>
          <div
            v-for="terminal in terminalStore.terminals.filter(t => t.alertLevel !== 'normal')"
            :key="terminal.id"
            class="bg-risk-warning/10 border border-risk-warning/30 p-3 rounded-lg text-xs"
          >
            <div class="flex justify-between mb-1">
              <span class="text-risk-warning">{{ terminal.name }}</span>
              <span class="text-text-muted font-mono">
                {{ terminal.receivedTime ? new Date(terminal.receivedTime).toLocaleTimeString('zh-CN') : '--:--:--' }}
              </span>
            </div>
            <div class="text-text-secondary">
              {{ alertLevelText[terminal.alertLevel] }} - {{ evacuationStatusText[terminal.evacuationStatus] }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
