<template>
  <div class="app-container">
    <header class="app-header">
      <h1>WindPulse - 远海风机叶片结冰预警系统</h1>
      <p class="subtitle">基于异步热传导-对流耦合模型的智能预测平台</p>
    </header>

    <main class="app-main">
      <div class="main-grid">
        <div class="left-column">
          <IcingWarningPanel
            :current-sensor="currentSensor"
            :current-prediction="currentPrediction"
          />
          <SyncStatusPanel
            @sync-started="startDataSimulation"
            @sync-stopped="stopDataSimulation"
          />
        </div>

        <div class="right-column">
          <IcingTrendChart :history-data="historyData" />
          <IcingEventList />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { SensorData, IcingPrediction } from './types'
import { icingPredictionService } from './services/IcingPredictionService'
import { semanticSyncService } from './services/SemanticSyncService'
import { icingEventDB } from './services/IcingEventDB'

import IcingWarningPanel from './components/IcingWarningPanel.vue'
import SyncStatusPanel from './components/SyncStatusPanel.vue'
import IcingTrendChart from './components/IcingTrendChart.vue'
import IcingEventList from './components/IcingEventList.vue'

const currentSensor = ref<SensorData>({
  timestamp: Date.now(),
  temperature: 25,
  humidity: 60,
  windSpeed: 8,
  altitude: 100
})

const currentPrediction = ref<IcingPrediction>({
  timestamp: Date.now(),
  icingMass: 0,
  riskLevel: 'low',
  confidence: 0.95
})

const historyData = ref<Array<{ sensor: SensorData; prediction: IcingPrediction }>>([])
const simulationInterval = ref<number | null>(null)

function generateSensorData(): SensorData {
  const baseTemp = -5 + Math.random() * 10
  const baseHumidity = 80 + Math.random() * 20
  const baseWindSpeed = 6 + Math.random() * 12

  return {
    timestamp: Date.now(),
    temperature: baseTemp + (Math.random() - 0.5) * 2,
    humidity: Math.min(100, baseHumidity + (Math.random() - 0.5) * 5),
    windSpeed: Math.max(0, baseWindSpeed + (Math.random() - 0.5) * 3),
    altitude: 80 + Math.random() * 40
  }
}

async function updatePrediction() {
  const sensorData = generateSensorData()
  currentSensor.value = sensorData

  const prediction = await icingPredictionService.predictIcingMassAsync(sensorData)
  currentPrediction.value = prediction

  historyData.value.push({ sensor: sensorData, prediction })
  if (historyData.value.length > 20) {
    historyData.value.shift()
  }

  semanticSyncService.pushPlatformData(sensorData)
  semanticSyncService.pushDeicingSystemData(sensorData)

  if (prediction.riskLevel === 'critical' && historyData.value.length % 10 === 0) {
    await addMockIcingEvent(prediction)
  }
}

async function addMockIcingEvent(prediction: IcingPrediction) {
  const event = {
    startTime: prediction.timestamp - 3600000,
    endTime: prediction.timestamp,
    maxIcingMass: prediction.icingMass,
    averageTemperature: currentSensor.value.temperature,
    averageHumidity: currentSensor.value.humidity,
    windFarmId: 'WF-001',
    turbineId: 'Turbine-' + Math.floor(Math.random() * 10 + 1),
    severity: 'extreme' as const,
    maintenanceCost: Math.floor(50000 + Math.random() * 100000)
  }

  try {
    await icingEventDB.addEvent(event)
  } catch (error) {
    console.error('Failed to add icing event:', error)
  }
}

function startDataSimulation() {
  if (simulationInterval.value) return

  simulationInterval.value = window.setInterval(() => {
    updatePrediction()
  }, 2000)

  updatePrediction()
}

function stopDataSimulation() {
  if (simulationInterval.value) {
    clearInterval(simulationInterval.value)
    simulationInterval.value = null
  }
}

semanticSyncService.onDataSynced = (data) => {
  console.log(`Data synced: ${data.length} records`)
}

onMounted(async () => {
  try {
    await icingEventDB.init()
    const eventCount = await icingEventDB.getEventCount()
    
    if (eventCount === 0) {
      const mockEvents = [
        {
          startTime: Date.now() - 86400000 * 3,
          endTime: Date.now() - 86400000 * 3 + 7200000,
          maxIcingMass: 4.5,
          averageTemperature: -3.2,
          averageHumidity: 92,
          windFarmId: 'WF-001',
          turbineId: 'Turbine-3',
          severity: 'severe' as const,
          maintenanceCost: 85000
        },
        {
          startTime: Date.now() - 86400000 * 7,
          endTime: Date.now() - 86400000 * 7 + 10800000,
          maxIcingMass: 2.1,
          averageTemperature: -1.5,
          averageHumidity: 88,
          windFarmId: 'WF-001',
          turbineId: 'Turbine-7',
          severity: 'moderate' as const,
          maintenanceCost: 35000
        },
        {
          startTime: Date.now() - 86400000 * 14,
          endTime: Date.now() - 86400000 * 14 + 14400000,
          maxIcingMass: 6.8,
          averageTemperature: -5.8,
          averageHumidity: 95,
          windFarmId: 'WF-001',
          turbineId: 'Turbine-2',
          severity: 'extreme' as const,
          maintenanceCost: 125000
        }
      ]

      for (const event of mockEvents) {
        await icingEventDB.addEvent(event)
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
})

onUnmounted(() => {
  stopDataSimulation()
  semanticSyncService.stopSync()
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  padding: 24px;
}

.app-header {
  text-align: center;
  margin-bottom: 32px;
}

.app-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

.app-main {
  max-width: 1600px;
  margin: 0 auto;
}

.main-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>