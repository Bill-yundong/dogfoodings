<template>
  <div class="app-container">
    <header class="app-header">
      <h1>🌫️ SmogLogic - 大气颗粒物运移逻辑引擎</h1>
      <p class="subtitle">PM2.5 跨区域传输建模与分析平台</p>
    </header>
    
    <main class="app-main">
      <aside class="control-panel">
        <PluginManager />
        <SimulationControls
          ref="simulationControlsRef"
          @start="handleStartSimulation"
          @reset="handleResetSimulation"
        />
      </aside>
      
      <section class="visualization-area">
        <MapVisualization
          :stations="stations"
          :particles="particles"
        />
        <TimeSeriesChart
          :particlesHistory="particlesHistory"
        />
      </section>
      
      <aside class="analysis-panel">
        <TraceabilityAnalysis
          :particles="particles"
        />
        <DataStatus
          @stationsLoaded="handleStationsLoaded"
          @weatherLoaded="handleWeatherLoaded"
        />
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PluginManager from './components/PluginManager.vue'
import SimulationControls from './components/SimulationControls.vue'
import MapVisualization from './components/MapVisualization.vue'
import TimeSeriesChart from './components/TimeSeriesChart.vue'
import TraceabilityAnalysis from './components/TraceabilityAnalysis.vue'
import DataStatus from './components/DataStatus.vue'
import { transportModel } from './core/TransportModel'
import type { MonitoringStation, Particle, SimulationConfig, WeatherData } from './types'

const simulationControlsRef = ref()

const stations = ref<MonitoringStation[]>([])
const weatherData = ref<WeatherData[]>([])
const particles = ref<Particle[]>([])
const particlesHistory = ref<Particle[][]>([])

onMounted(async () => {
  await transportModel.init()
})

function handleStationsLoaded(newStations: MonitoringStation[]) {
  stations.value = newStations
}

function handleWeatherLoaded(newWeather: WeatherData[]) {
  weatherData.value = newWeather
}

async function handleStartSimulation(config: SimulationConfig, steps: number) {
  const sources = stations.value.map(s => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    pm25: s.pm25
  }))

  const result = await transportModel.runSimulation(
    sources,
    weatherData.value,
    config,
    steps,
    (current, total) => {
      simulationControlsRef.value?.updateProgress(current)
    }
  )

  particles.value = result.finalParticles
  particlesHistory.value = result.particles
}

function handleResetSimulation() {
  particles.value = []
  particlesHistory.value = []
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.app-header h1 {
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.control-panel, .analysis-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.visualization-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}
</style>
