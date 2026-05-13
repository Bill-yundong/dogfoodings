<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useProductionLineStore } from '../../stores/productionLine'
import WorkstationCard from '../components/WorkstationCard.vue'
import MetricsPanel from '../components/MetricsPanel.vue'
import AlertPanel from '../components/AlertPanel.vue'
import OptimizationPanel from '../components/OptimizationPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'

const store = useProductionLineStore()
const snapshotInterval = ref<number | null>(null)

onMounted(async () => {
  await store.initialize()
  
  snapshotInterval.value = window.setInterval(() => {
    store.updateSnapshotCount()
  }, 5000)
})

onUnmounted(() => {
  if (snapshotInterval.value) {
    clearInterval(snapshotInterval.value)
  }
  store.dispose()
})

function handleTriggerBreakdown(stationIndex: number) {
  store.triggerStationBreakdown(stationIndex)
}

function handleAcknowledgeAlert(alertId: string) {
  store.acknowledgeAlert(alertId)
}

function handleStartSimulation() {
  store.startSimulation()
}

function handlePauseSimulation() {
  store.pauseSimulation()
}

function handleResumeSimulation() {
  store.resumeSimulation()
}

function handleStopSimulation() {
  store.stopSimulation()
}

function handleSpeedChange(speed: number) {
  store.setSimulationSpeed(speed)
}

const optimizationSuggestions = ref<string[]>([])

watch(
  () => store.bottleneckStation?.id,
  (newId) => {
    if (newId) {
      optimizationSuggestions.value = store.getOptimizationSuggestions(newId)
    } else {
      optimizationSuggestions.value = []
    }
  }
)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
    <header class="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white shadow-2xl">
      <div class="container mx-auto px-6 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="text-4xl">🏭</div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight">LineFlow</h1>
              <p class="text-sm text-slate-300">离散制造业总装线动态平衡与仿真系统</p>
            </div>
          </div>

          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg">
              <span
                class="w-3 h-3 rounded-full"
                :class="store.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'"
              ></span>
              <span class="text-sm font-medium">
                {{ store.isRunning ? '仿真运行中' : '系统就绪' }}
              </span>
            </div>

            <div class="text-right">
              <div class="text-2xl font-bold text-emerald-400">{{ store.overallOEE }}%</div>
              <div class="text-xs text-slate-400">OEE 综合效率</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-6 py-8">
      <div v-if="store.productionLine" class="space-y-8">
        <ControlPanel
          :is-running="store.isRunning"
          :is-paused="store.isPaused"
          :simulation-speed="store.simulationSpeed"
          @start="handleStartSimulation"
          @pause="handlePauseSimulation"
          @resume="handleResumeSimulation"
          @stop="handleStopSimulation"
          @speed-change="handleSpeedChange"
        />

        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <span class="mr-2">🔗</span>
            {{ store.productionLine.name }}
            <span class="ml-4 text-sm font-normal text-slate-500">
              目标节拍: {{ store.productionLine.targetTaktTime }}s
            </span>
          </h2>
          
          <div class="flex items-center justify-start gap-4 overflow-x-auto pb-4">
            <template v-for="(station, index) in store.productionLine.workstations" :key="station.id">
              <WorkstationCard
                :workstation="station"
                :is-bottleneck="store.productionLine.bottleneckStation?.id === station.id"
                :bottleneck-severity="store.getBottleneckSeverity(station.id)"
                @trigger-breakdown="handleTriggerBreakdown"
              />
              <div
                v-if="index < store.productionLine.workstations.length - 1"
                class="flex-shrink-0 flex flex-col items-center justify-center text-slate-400"
              >
                <span class="text-2xl">→</span>
              </div>
            </template>
          </div>
        </div>

        <MetricsPanel
          :oee="store.overallOEE"
          :availability="store.productionLine.getAvailability()"
          :performance="store.productionLine.getPerformance()"
          :quality="store.productionLine.getQuality()"
          :throughput="store.throughput"
          :wip-count="store.wipCount"
          :completed-count="store.completedCount"
          :snapshot-count="store.snapshotCount"
          :running-stations="store.runningStationsCount"
          :total-stations="store.totalStationsCount"
        />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2">
            <AlertPanel
              :alerts="store.alerts"
              @acknowledge="handleAcknowledgeAlert"
            />
          </div>

          <OptimizationPanel
            :bottleneck-station="store.bottleneckStation"
            :suggestions="optimizationSuggestions"
          />
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <span class="mr-2">📦</span>
            在制品追踪 (WIP)
          </h2>
          
          <div class="flex flex-wrap gap-3">
            <div
              v-for="product in store.productionLine.products.filter(p => !p.isCompleted()).slice(0, 50)"
              :key="product.id"
              class="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg text-sm"
            >
              <span class="font-medium text-blue-800">{{ product.id.split('-').slice(1, 3).join('-') }}</span>
              <span class="ml-2 text-blue-600 text-xs">
                工位 {{ product.currentStationIndex + 1 }}/{{ store.productionLine.workstations.length }}
              </span>
            </div>
            
            <div
              v-if="store.productionLine.products.filter(p => !p.isCompleted()).length === 0"
              class="w-full text-center py-8 text-slate-500"
            >
              <div class="text-4xl mb-2">📭</div>
              <p>暂无在制品，等待产品流入...</p>
            </div>
            
            <div
              v-if="store.productionLine.products.filter(p => !p.isCompleted()).length > 50"
              class="w-full text-center text-sm text-slate-500 mt-2"
            >
              ... 还有 {{ store.productionLine.products.filter(p => !p.isCompleted()).length - 50 }} 件产品在产线中
            </div>
          </div>
          
          <div class="mt-6 pt-6 border-t border-slate-200 grid grid-cols-4 gap-4 text-center">
            <div class="p-4 bg-emerald-50 rounded-xl">
              <div class="text-2xl font-bold text-emerald-600">{{ store.completedCount }}</div>
              <div class="text-sm text-slate-600">已完成产品</div>
            </div>
            <div class="p-4 bg-blue-50 rounded-xl">
              <div class="text-2xl font-bold text-blue-600">{{ store.wipCount }}</div>
              <div class="text-sm text-slate-600">在制品数</div>
            </div>
            <div class="p-4 bg-amber-50 rounded-xl">
              <div class="text-2xl font-bold text-amber-600">{{ store.throughput.toFixed(1) }}</div>
              <div class="text-sm text-slate-600">产出率 (件/小时)</div>
            </div>
            <div class="p-4 bg-violet-50 rounded-xl">
              <div class="text-2xl font-bold text-violet-600">{{ store.productionLine.products.length }}</div>
              <div class="text-sm text-slate-600">总处理产品数</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-6xl mb-6 animate-bounce">⚙️</div>
          <h2 class="text-2xl font-bold text-slate-700 mb-3">正在初始化系统...</h2>
          <p class="text-slate-500">加载生产数据和仿真引擎中</p>
        </div>
      </div>
    </main>

    <footer class="bg-slate-800 text-white py-8 mt-12">
      <div class="container mx-auto px-6">
        <div class="grid grid-cols-3 gap-8 mb-6">
          <div>
            <h3 class="text-lg font-bold mb-3 flex items-center">
              <span class="mr-2">🏭</span>
              LineFlow
            </h3>
            <p class="text-sm text-slate-400">
              基于排队论的离散制造业总装线动态平衡与仿真系统，支持瓶颈识别、异常模拟和离线数据存储。
            </p>
          </div>
          <div>
            <h4 class="font-semibold mb-3">核心技术</h4>
            <ul class="text-sm text-slate-400 space-y-1">
              <li>• Vue 3 Composition API</li>
              <li>• 排队论 M/M/1 模型</li>
              <li>• 离散事件仿真引擎</li>
              <li>• IndexedDB 本地存储</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-3">核心功能</h4>
            <ul class="text-sm text-slate-400 space-y-1">
              <li>• 瓶颈工位自动识别</li>
              <li>• 故障模拟与告警</li>
              <li>• 产能优化建议</li>
              <li>• OEE 综合效率计算</li>
            </ul>
          </div>
        </div>
        <div class="pt-6 border-t border-slate-700 text-center text-sm text-slate-500">
          LineFlow v1.0 - 生产系统仿真与优化平台
        </div>
      </div>
    </footer>
  </div>
</template>
