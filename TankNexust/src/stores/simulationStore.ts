import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GaussianParams, DiffusionResult, SimulationRecord } from '@/types/simulation'
import { nanoid } from 'nanoid'

export const useSimulationStore = defineStore('simulation', () => {
  const isRunning = ref(false)
  const isPaused = ref(false)
  const currentTime = ref(0)
  const simulationSpeed = ref(1)
  const maxSimulationTime = ref(3600)

  const params = ref<GaussianParams>({
    sourceStrength: 50,
    releaseHeight: 15,
    windSpeed: 3.5,
    windDirection: 90,
    temperature: 25,
    humidity: 60,
    atmosphericStability: 'D',
    diffusionCoefficient: 0.1,
    decayRate: 0.01
  })

  const currentResult = ref<DiffusionResult | null>(null)
  const resultHistory = ref<DiffusionResult[]>([])
  const simulationRecords = ref<SimulationRecord[]>([])
  const activeSimulationId = ref<string | null>(null)

  const formattedTime = computed(() => {
    const hours = Math.floor(currentTime.value / 3600)
    const minutes = Math.floor((currentTime.value % 3600) / 60)
    const seconds = Math.floor(currentTime.value % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  const maxConcentration = computed(() => {
    return currentResult.value?.maxConcentration || 0
  })

  const affectedArea = computed(() => {
    return currentResult.value?.affectedArea || 0
  })

  const riskLevelCount = computed(() => {
    if (!currentResult.value) return []
    return currentResult.value.riskZones.map(z => ({
      level: z.level,
      count: z.polygon.length > 0 ? 1 : 0
    }))
  })

  function updateParams(newParams: Partial<GaussianParams>) {
    params.value = { ...params.value, ...newParams }
  }

  function startSimulation(tankId: string, tankName: string, chemical: string) {
    isRunning.value = true
    isPaused.value = false
    currentTime.value = 0
    resultHistory.value = []

    const record: SimulationRecord = {
      id: `sim-${nanoid(8)}`,
      startTime: Date.now(),
      tankId,
      tankName,
      chemical,
      params: { ...params.value },
      status: 'running',
      results: [],
      affectedTerminals: []
    }

    simulationRecords.value.unshift(record)
    activeSimulationId.value = record.id
  }

  function pauseSimulation() {
    isPaused.value = true
    isRunning.value = false
    updateRecordStatus('paused')
  }

  function resumeSimulation() {
    isPaused.value = false
    isRunning.value = true
    updateRecordStatus('running')
  }

  function stopSimulation() {
    isRunning.value = false
    isPaused.value = false
    updateRecordStatus('stopped')
    activeSimulationId.value = null
  }

  function updateRecordStatus(status: SimulationRecord['status']) {
    if (activeSimulationId.value) {
      const record = simulationRecords.value.find(r => r.id === activeSimulationId.value)
      if (record) {
        record.status = status
        if (status === 'stopped' || status === 'completed') {
          record.endTime = Date.now()
        }
      }
    }
  }

  function setResult(result: DiffusionResult) {
    currentResult.value = result
    resultHistory.value.push(result)

    if (activeSimulationId.value) {
      const record = simulationRecords.value.find(r => r.id === activeSimulationId.value)
      if (record) {
        record.results.push(result)
      }
    }
  }

  function setSimulationSpeed(speed: number) {
    simulationSpeed.value = Math.max(0.1, Math.min(10, speed))
  }

  function setTime(time: number) {
    currentTime.value = time
  }

  function resetSimulation() {
    stopSimulation()
    currentTime.value = 0
    currentResult.value = null
    resultHistory.value = []
  }

  return {
    isRunning,
    isPaused,
    currentTime,
    simulationSpeed,
    maxSimulationTime,
    params,
    currentResult,
    resultHistory,
    simulationRecords,
    activeSimulationId,
    formattedTime,
    maxConcentration,
    affectedArea,
    riskLevelCount,
    updateParams,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setResult,
    setSimulationSpeed,
    setTime,
    resetSimulation
  }
})
