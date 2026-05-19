<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTankStore } from '@/stores/tankStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useTerminalStore } from '@/stores/terminalStore'
import { runGaussianSimulation } from '@/utils/gaussian'
import { getWindDirectionLabel } from '@/utils/coordinates'
import DataCard from '@/components/common/DataCard.vue'
import StatusIndicator from '@/components/common/StatusIndicator.vue'
import TankMap from '@/components/map/TankMap.vue'

const tankStore = useTankStore()
const simulationStore = useSimulationStore()
const terminalStore = useTerminalStore()

const selectedLeakTank = ref<string>('tank-001')
const localTime = ref(new Date().toLocaleTimeString('zh-CN'))

let timeInterval: ReturnType<typeof setInterval> | null = null
let simulationInterval: ReturnType<typeof setInterval> | null = null

const leakTank = computed(() => {
  return tankStore.tanks.find(t => t.id === selectedLeakTank.value)
})

const windDirectionLabel = computed(() => {
  return getWindDirectionLabel(simulationStore.params.windDirection)
})

const statusBadgeClass = computed(() => {
  if (simulationStore.isRunning) return 'bg-risk-danger text-white animate-pulse'
  return 'bg-risk-safe text-white'
})

const statusText = computed(() => {
  if (simulationStore.isRunning) return '模拟运行中'
  if (simulationStore.isPaused) return '已暂停'
  return '待机中'
})

function triggerLeak() {
  if (!leakTank.value) return

  tankStore.triggerLeak(selectedLeakTank.value)

  simulationStore.startSimulation(
    leakTank.value.id,
    leakTank.value.name,
    leakTank.value.chemical
  )

  startSimulationLoop()
}

function stopLeak() {
  if (leakTank.value) {
    tankStore.stopLeak(selectedLeakTank.value)
  }
  simulationStore.stopSimulation()
  stopSimulationLoop()
  terminalStore.resetAllAlerts()
}

function togglePause() {
  if (simulationStore.isRunning) {
    simulationStore.pauseSimulation()
    stopSimulationLoop()
  } else if (simulationStore.isPaused) {
    simulationStore.resumeSimulation()
    startSimulationLoop()
  }
}

function startSimulationLoop() {
  stopSimulationLoop()

  simulationInterval = setInterval(() => {
    if (simulationStore.isRunning) {
      simulationStore.setTime(simulationStore.currentTime + 0.5 * simulationStore.simulationSpeed)

      const result = runGaussianSimulation(
        simulationStore.params,
        200,
        200,
        5,
        simulationStore.currentTime
      )

      simulationStore.setResult(result)
      updateTerminalAlerts(result)
    }
  }, 500)
}

function stopSimulationLoop() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
}

function updateTerminalAlerts(result: any) {
  for (const terminal of terminalStore.terminals) {
    let highestRisk = 'safe'
    let minDistance = Infinity

    for (const zone of result.riskZones) {
      if (zone.polygon.length < 3) continue

      let avgX = 0, avgY = 0
      for (const point of zone.polygon) {
        avgX += point.x
        avgY += point.y
      }
      avgX /= zone.polygon.length
      avgY /= zone.polygon.length

      const dx = terminal.position.x - avgX
      const dy = terminal.position.y - avgY
      const dist = Math.sqrt(dx * dx + dy * dy)

      const radius = Math.max(...zone.polygon.map(p => 
        Math.sqrt(Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2))
      ))

      if (dist < radius * 1.5 && dist < minDistance) {
        minDistance = dist
        highestRisk = zone.level
      }
    }

    if (highestRisk === 'extreme' || highestRisk === 'danger') {
      terminalStore.updateTerminalAlert(terminal.id, 'evacuate')
      if (terminal.evacuationStatus === 'idle') {
        terminalStore.updateTerminalEvacuationStatus(terminal.id, 'preparing')
      }
    } else if (highestRisk === 'warning') {
      terminalStore.updateTerminalAlert(terminal.id, 'alert')
      if (terminal.evacuationStatus === 'idle') {
        terminalStore.updateTerminalEvacuationStatus(terminal.id, 'preparing')
      }
    } else if (highestRisk === 'caution') {
      terminalStore.updateTerminalAlert(terminal.id, 'alert')
    } else {
      if (terminal.alertLevel !== 'normal' && terminal.evacuationStatus !== 'evacuating' && terminal.evacuationStatus !== 'completed') {
        terminalStore.updateTerminalAlert(terminal.id, 'normal')
        terminalStore.updateTerminalEvacuationStatus(terminal.id, 'idle')
      }
    }
  }
}

function setSpeed(speed: number) {
  simulationStore.setSimulationSpeed(speed)
}

onMounted(() => {
  timeInterval = setInterval(() => {
    localTime.value = new Date().toLocaleTimeString('zh-CN')
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  stopSimulationLoop()
})
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">安监监控大屏</h2>
        <span
          class="px-3 py-1 rounded-full text-xs font-medium"
          :class="statusBadgeClass"
        >
          {{ statusText }}
        </span>
      </div>
      <div class="text-sm text-text-secondary font-mono">{{ localTime }}</div>
    </div>

    <div class="flex-1 flex gap-4 overflow-hidden">
      <div class="flex-1 glass-panel overflow-hidden">
        <TankMap
          :tanks="tankStore.tanks"
          :diffusion-result="simulationStore.currentResult"
          :terminals="terminalStore.terminals"
          :shelters="terminalStore.shelters"
          :resources="terminalStore.resources"
          :wind-direction="simulationStore.params.windDirection"
        />
      </div>

      <div class="w-80 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">模拟控制</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1">选择泄漏储罐</label>
              <select
                v-model="selectedLeakTank"
                class="input-field text-sm"
                :disabled="simulationStore.isRunning || simulationStore.isPaused"
              >
                <option v-for="tank in tankStore.tanks" :key="tank.id" :value="tank.id">
                  {{ tank.name }} - {{ tank.chemical }}
                </option>
              </select>
            </div>

            <div class="flex gap-2">
              <button
                v-if="!simulationStore.isRunning && !simulationStore.isPaused"
                @click="triggerLeak"
                class="btn-danger flex-1 text-sm"
              >
                🔴 触发泄漏
              </button>
              <button
                v-else
                @click="stopLeak"
                class="btn-secondary flex-1 text-sm"
              >
                ⏹️ 停止模拟
              </button>
              <button
                v-if="simulationStore.isRunning || simulationStore.isPaused"
                @click="togglePause"
                class="btn-warning text-sm"
              >
                {{ simulationStore.isRunning ? '⏸️' : '▶️' }}
              </button>
            </div>

            <div v-if="simulationStore.isRunning || simulationStore.isPaused">
              <label class="text-xs text-text-secondary block mb-1">模拟速度</label>
              <div class="flex gap-1">
                <button
                  v-for="speed in [0.5, 1, 2, 5]"
                  :key="speed"
                  @click="setSpeed(speed)"
                  class="flex-1 py-1 text-xs rounded transition-colors"
                  :class="simulationStore.simulationSpeed === speed ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'"
                >
                  {{ speed }}x
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <DataCard
            title="模拟时间"
            :value="simulationStore.formattedTime"
            color="text-accent-cyan"
          />
          <DataCard
            title="最大浓度"
            :value="simulationStore.maxConcentration.toFixed(2)"
            unit="mg/m³"
            :trend="simulationStore.isRunning ? 'up' : 'stable'"
            color="text-risk-danger"
          />
          <DataCard
            title="影响面积"
            :value="(simulationStore.affectedArea / 10000).toFixed(2)"
            unit="万m²"
            color="text-risk-warning"
          />
          <DataCard
            title="预警终端"
            :value="terminalStore.alertingTerminals.length"
            unit="个"
            color="text-risk-caution"
          />
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">气象参数</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-text-muted">风速</span>
              <span class="font-mono">{{ simulationStore.params.windSpeed }} m/s</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">风向</span>
              <span class="font-mono">{{ simulationStore.params.windDirection }}° ({{ windDirectionLabel }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">温度</span>
              <span class="font-mono">{{ simulationStore.params.temperature }}°C</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">湿度</span>
              <span class="font-mono">{{ simulationStore.params.humidity }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">大气稳定度</span>
              <span class="font-mono">{{ simulationStore.params.atmosphericStability }}</span>
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">储罐状态</h3>
          <div class="space-y-2">
            <div
              v-for="tank in tankStore.tanks"
              :key="tank.id"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2">
                <StatusIndicator
                  :status="tank.status === 'normal' ? 'normal' : tank.status === 'leaking' ? 'danger' : 'critical'"
                  :show-label="false"
                  size="sm"
                />
                <span>{{ tank.name }}</span>
              </div>
              <span class="text-text-muted font-mono text-xs">{{ tank.chemical }}</span>
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">终端预警</h3>
          <div class="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            <div
              v-for="terminal in terminalStore.terminals"
              :key="terminal.id"
              class="flex items-center justify-between text-sm py-1"
            >
              <span>{{ terminal.name }}</span>
              <span
                class="px-2 py-0.5 rounded text-xs"
                :class="{
                  'bg-risk-safe/20 text-risk-safe': terminal.alertLevel === 'normal',
                  'bg-risk-caution/20 text-risk-caution': terminal.alertLevel === 'alert',
                  'bg-risk-warning/20 text-risk-warning': terminal.alertLevel === 'evacuate',
                  'bg-risk-danger/20 text-risk-danger': terminal.alertLevel === 'shelter'
                }"
              >
                {{ { normal: '正常', alert: '预警', evacuate: '疏散', shelter: '隐蔽' }[terminal.alertLevel] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
