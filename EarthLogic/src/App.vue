<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SoilLayer, HeavyMetal, SimulationParams, SimulationResult, MountConfig } from './types'
import { SoluteTransportSolver, createDefaultSimulationParams } from './utils/soluteTransportSolver'
import SoilLayerVisualization from './components/SoilLayerVisualization.vue'
import HeavyMetalMonitor from './components/HeavyMetalMonitor.vue'
import SimulationControl from './components/SimulationControl.vue'
import SystemMount from './components/SystemMount.vue'

const soilLayers = ref<SoilLayer[]>([
  { id: '1', depth: 0, thickness: 0.3, name: '表土层', color: '#8B4513', porosity: 0.45, bulkDensity: 1.3, organicMatter: 2.5, ph: 6.8 },
  { id: '2', depth: 0.3, thickness: 0.7, name: '心土层', color: '#A0522D', porosity: 0.4, bulkDensity: 1.4, organicMatter: 1.2, ph: 7.0 },
  { id: '3', depth: 1.0, thickness: 1.0, name: '底土层', color: '#CD853F', porosity: 0.35, bulkDensity: 1.5, organicMatter: 0.5, ph: 7.2 },
  { id: '4', depth: 2.0, thickness: 1.0, name: '母质层', color: '#DEB887', porosity: 0.3, bulkDensity: 1.6, organicMatter: 0.2, ph: 7.5 }
])

const heavyMetals = ref<HeavyMetal[]>([
  { name: '镉(Cd)', symbol: 'Cd', concentration: 0.3, unit: 'mg/kg', threshold: 0.3, color: '#ef4444' },
  { name: '铅(Pb)', symbol: 'Pb', concentration: 80, unit: 'mg/kg', threshold: 120, color: '#f59e0b' },
  { name: '铬(Cr)', symbol: 'Cr', concentration: 150, unit: 'mg/kg', threshold: 200, color: '#3b82f6' },
  { name: '砷(As)', symbol: 'As', concentration: 15, unit: 'mg/kg', threshold: 25, color: '#8b5cf6' },
  { name: '汞(Hg)', symbol: 'Hg', concentration: 0.8, unit: 'mg/kg', threshold: 1.0, color: '#10b981' }
])

const simulationParams = ref<SimulationParams>(createDefaultSimulationParams())
const simulationResults = ref<SimulationResult[]>([])
const currentTimeIndex = ref(0)
const isSimulating = ref(false)
let solver: SoluteTransportSolver | null = null
let animationFrame: number | null = null

const initSolver = () => {
  solver = new SoluteTransportSolver(simulationParams.value)
}

const startSimulation = async () => {
  if (!solver) return
  
  isSimulating.value = true
  solver.updateParams(simulationParams.value)
  const results = await solver.solve()
  
  if (!isSimulating.value) {
    return
  }
  
  simulationResults.value = results
  isSimulating.value = false
  animateResults()
}

const animateResults = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  
  currentTimeIndex.value = 0
  
  const animate = () => {
    if (currentTimeIndex.value < simulationResults.value.length - 1) {
      currentTimeIndex.value++
      animationFrame = requestAnimationFrame(animate)
    }
  }
  
  animate()
}

const stopSimulation = () => {
  if (solver) {
    solver.stop()
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  isSimulating.value = false
}

const resetSimulation = () => {
  stopSimulation()
  simulationResults.value = []
  currentTimeIndex.value = 0
  initSolver()
}

const handleTimeChange = (time: number) => {
  const index = Math.floor(time / simulationParams.value.timeStep) - 1
  currentTimeIndex.value = Math.max(0, Math.min(index, simulationResults.value.length - 1))
}

const handleMount = (config: MountConfig) => {
  console.log('Mounted to:', config.target, 'with permissions:', config.permissions)
}

const handleUnmount = (target: string) => {
  console.log('Unmounted from:', target)
}

onMounted(() => {
  initSolver()
})
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>🌍 农田土壤重金属运移监测系统</h1>
      <p class="subtitle">基于 Vue 3 + 异步溶质运移方程 + IndexedDB 时空数据缓存</p>
    </header>

    <div class="main-content">
      <div class="left-column">
        <SimulationControl
          :params="simulationParams"
          :is-running="isSimulating"
          :current-time="simulationResults[currentTimeIndex]?.time || 0"
          :total-time="simulationParams.totalTime"
          @update:params="simulationParams = $event"
          @start="startSimulation"
          @stop="stopSimulation"
          @reset="resetSimulation"
          @time-change="handleTimeChange"
        />
        
        <div style="margin-top: 20px;">
          <SystemMount @mount="handleMount" @unmount="handleUnmount" />
        </div>
      </div>

      <div class="right-column">
        <SoilLayerVisualization
          :layers="soilLayers"
          :simulation-results="simulationResults"
          :heavy-metals="heavyMetals"
          :current-time-index="currentTimeIndex"
        />
        
        <div style="margin-top: 20px;">
          <HeavyMetalMonitor
            :heavy-metals="heavyMetals"
            :simulation-results="simulationResults"
            :current-time-index="currentTimeIndex"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  padding: 20px;
}

.header {
  margin-bottom: 24px;
}

.main-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.left-column {
  display: flex;
  flex-direction: column;
}

.right-column {
  display: flex;
  flex-direction: column;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
