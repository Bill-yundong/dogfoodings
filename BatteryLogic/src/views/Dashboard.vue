<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBatteryStore } from '@/stores/battery'
import BatteryPack3D from '@/components/BatteryPack3D.vue'
import {
  Play,
  Pause,
  RotateCcw,
  Thermometer,
  Zap,
  Battery,
  AlertTriangle,
  X,
  Check,
  Flame,
  AlertCircle
} from 'lucide-vue-next'
import type { CellData, Alarm } from '@/types'
import { formatTime, getTemperatureColor, getRiskLevelColor, getRiskLevelText } from '@/utils/arrhenius'
import { useIndexedDB } from '@/composables/useIndexedDB'

const batteryStore = useBatteryStore()
const { saveSnapshot, isReady } = useIndexedDB()

const selectedCell = ref<CellData | null>(null)
const showCellDetail = ref(false)
let snapshotInterval: number | null = null

function handleCellClick(cell: CellData) {
  selectedCell.value = cell
  showCellDetail.value = true
}

function toggleSimulation() {
  if (batteryStore.isSimulating) {
    batteryStore.stopSimulation()
    if (snapshotInterval) {
      clearInterval(snapshotInterval)
      snapshotInterval = null
    }
  } else {
    batteryStore.startSimulation(500)
    snapshotInterval = window.setInterval(() => {
      if (isReady.value) {
        const allCells = batteryStore.allCells
        const status = batteryStore.overallStatus as any
        saveSnapshot(batteryStore.pack.id, allCells, status)
      }
    }, 5000)
  }
}

function triggerRunaway() {
  if (selectedCell.value) {
    batteryStore.triggerThermalRunaway(selectedCell.value.id)
  }
}

function acknowledgeAlarm(alarm: Alarm) {
  batteryStore.acknowledgeAlarm(alarm.id)
}

function getAlarmTypeLabel(type: Alarm['type']): string {
  switch (type) {
    case 'temperature': return '温度告警'
    case 'voltage': return '电压告警'
    case 'thermal_runaway': return '热失控告警'
    case 'fire': return '火警'
    default: return '未知告警'
  }
}

function getAlarmLevelColor(level: Alarm['level']): string {
  switch (level) {
    case 'info': return 'bg-primary'
    case 'warning': return 'bg-warning'
    case 'critical': return 'bg-danger'
  }
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(() => {
  batteryStore.startSimulation(500)
  snapshotInterval = window.setInterval(() => {
    if (isReady.value) {
      const allCells = batteryStore.allCells
      const status = batteryStore.overallStatus as any
      saveSnapshot(batteryStore.pack.id, allCells, status)
    }
  }, 5000)
})

onUnmounted(() => {
  batteryStore.stopSimulation()
  if (snapshotInterval) {
    clearInterval(snapshotInterval)
  }
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="toggleSimulation"
          class="btn-primary flex items-center gap-2"
        >
          <component :is="batteryStore.isSimulating ? Pause : Play" class="w-4 h-4" />
          {{ batteryStore.isSimulating ? '暂停模拟' : '开始模拟' }}
        </button>
        <button
          @click="batteryStore.resetSimulation()"
          class="btn-ghost flex items-center gap-2"
        >
          <RotateCcw class="w-4 h-4" />
          重置
        </button>
      </div>
    </div>

    <div class="grid grid-cols-6 gap-4">
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Thermometer class="w-4 h-4" />
          <span class="text-sm">平均温度</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono" :style="{ color: getTemperatureColor(batteryStore.stats.avgTemp) }">
            {{ batteryStore.stats.avgTemp }}
          </span>
          <span class="text-sm text-dark-300">°C</span>
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Flame class="w-4 h-4" />
          <span class="text-sm">最高温度</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono" :style="{ color: getTemperatureColor(batteryStore.stats.maxTemp) }">
            {{ batteryStore.stats.maxTemp }}
          </span>
          <span class="text-sm text-dark-300">°C</span>
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Zap class="w-4 h-4" />
          <span class="text-sm">总电压</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono text-primary">
            {{ batteryStore.stats.totalVoltage }}
          </span>
          <span class="text-sm text-dark-300">V</span>
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Battery class="w-4 h-4" />
          <span class="text-sm">平均SOC</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono text-success">
            {{ batteryStore.stats.avgSoc }}
          </span>
          <span class="text-sm text-dark-300">%</span>
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <AlertTriangle class="w-4 h-4" />
          <span class="text-sm">预警电芯</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono text-warning">
            {{ batteryStore.stats.warningCount }}
          </span>
          <span class="text-sm text-dark-300">个</span>
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <AlertCircle class="w-4 h-4" />
          <span class="text-sm">热失控</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-2xl font-bold font-mono text-danger">
            {{ batteryStore.stats.runawayCount }}
          </span>
          <span class="text-sm text-dark-300">个</span>
        </div>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-3 gap-4 min-h-0">
      <div class="col-span-2 glass-card p-4 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-white font-semibold">电池包 3D 视图</h3>
          <span class="text-xs text-dark-300">点击电芯查看详情</span>
        </div>
        <div class="flex-1 min-h-0">
          <BatteryPack3D
            :pack="batteryStore.pack"
            @cell-click="handleCellClick"
          />
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="glass-card p-4 flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-white font-semibold">告警中心</h3>
            <span class="text-xs text-dark-300">
              {{ batteryStore.unacknowledgedAlarms.length }} 条未处理
            </span>
          </div>
          <div class="flex-1 overflow-y-auto space-y-2">
            <div
              v-for="alarm in batteryStore.alarms.slice(0, 10)"
              :key="alarm.id"
              class="flex items-start gap-3 p-3 rounded-lg bg-dark-600/50 border border-dark-400/30"
              :class="{ 'opacity-60': alarm.acknowledged }"
            >
              <div :class="[getAlarmLevelColor(alarm.level), 'w-2 h-2 rounded-full mt-1.5 flex-shrink-0']"></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-dark-100 truncate">
                    {{ getAlarmTypeLabel(alarm.type) }}
                  </span>
                  <span class="text-xs text-dark-400 flex-shrink-0 ml-2">
                    {{ formatTimestamp(alarm.timestamp) }}
                  </span>
                </div>
                <p class="text-xs text-dark-300 mt-0.5 line-clamp-2">
                  {{ alarm.message }}
                </p>
              </div>
              <button
                v-if="!alarm.acknowledged"
                @click="acknowledgeAlarm(alarm)"
                class="p-1 rounded hover:bg-dark-500 text-dark-300 hover:text-white transition-colors flex-shrink-0"
              >
                <Check class="w-4 h-4" />
              </button>
            </div>
            <div v-if="batteryStore.alarms.length === 0" class="text-center py-8 text-dark-400">
              <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">暂无告警信息</p>
            </div>
          </div>
        </div>

        <div class="glass-card p-4">
          <h3 class="text-white font-semibold mb-3">消防联动信号</h3>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div
              v-for="signal in batteryStore.fireSignals.slice(0, 5)"
              :key="signal.id"
              class="flex items-center justify-between p-2 rounded bg-dark-600/50 text-xs"
            >
              <span class="text-dark-200">{{ signal.target }}</span>
              <span :class="[
                signal.level === 'critical' ? 'text-danger' :
                signal.level === 'warning' ? 'text-warning' : 'text-primary'
              ]">
                {{ signal.action }}
              </span>
            </div>
            <div v-if="batteryStore.fireSignals.length === 0" class="text-center py-4 text-dark-400 text-xs">
              暂无联动信号
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showCellDetail && selectedCell"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showCellDetail = false"
      >
        <div class="glass-card w-96 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">电芯详情</h3>
            <button
              @click="showCellDetail = false"
              class="p-1 rounded hover:bg-dark-500 text-dark-300"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-xs text-dark-400">电芯ID</span>
                <p class="font-mono text-white">{{ selectedCell.id }}</p>
              </div>
              <div>
                <span class="text-xs text-dark-400">所属模组</span>
                <p class="text-white">模组 {{ selectedCell.moduleId + 1 }}</p>
              </div>
              <div>
                <span class="text-xs text-dark-400">温度</span>
                <p class="font-mono" :style="{ color: getTemperatureColor(selectedCell.temperature) }">
                  {{ selectedCell.temperature }}°C
                </p>
              </div>
              <div>
                <span class="text-xs text-dark-400">电压</span>
                <p class="font-mono text-primary">{{ selectedCell.voltage }}V</p>
              </div>
              <div>
                <span class="text-xs text-dark-400">SOC</span>
                <p class="font-mono text-success">{{ selectedCell.soc }}%</p>
              </div>
              <div>
                <span class="text-xs text-dark-400">内阻</span>
                <p class="font-mono text-dark-200">{{ selectedCell.internalResistance }}mΩ</p>
              </div>
            </div>

            <div>
              <span class="text-xs text-dark-400">状态</span>
              <div class="flex items-center gap-2 mt-1">
                <div :class="[
                  selectedCell.status === 'normal' ? 'status-indicator status-normal' :
                  selectedCell.status === 'warning' ? 'status-indicator status-warning' :
                  'status-indicator status-danger'
                ]"></div>
                <span class="text-white">
                  {{ selectedCell.status === 'normal' ? '正常' :
                     selectedCell.status === 'warning' ? '预警' : '热失控' }}
                </span>
              </div>
            </div>

            <div
              v-if="batteryStore.getPredictionForCell(selectedCell.id)"
              class="p-3 rounded-lg bg-dark-600/50 border border-primary/30"
            >
              <div class="text-xs text-dark-400 mb-2">热失控预测</div>
              <div class="flex items-center justify-between">
                <span class="text-sm">风险等级:</span>
                <span
                  class="text-sm font-medium"
                  :style="{ color: getRiskLevelColor(batteryStore.getPredictionForCell(selectedCell.id)!.riskLevel) }"
                >
                  {{ getRiskLevelText(batteryStore.getPredictionForCell(selectedCell.id)!.riskLevel) }}
                </span>
              </div>
              <div v-if="batteryStore.getPredictionForCell(selectedCell.id)!.timeToRunaway > 0" class="text-xs text-dark-300 mt-1">
                预计热失控时间: {{ formatTime(batteryStore.getPredictionForCell(selectedCell.id)!.timeToRunaway) }}
              </div>
            </div>

            <button
              v-if="selectedCell.status === 'normal'"
              @click="triggerRunaway"
              class="w-full btn-primary flex items-center justify-center gap-2 mt-4"
            >
              <Flame class="w-4 h-4" />
              触发热失控模拟
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
