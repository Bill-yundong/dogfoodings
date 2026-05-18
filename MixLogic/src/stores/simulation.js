import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../utils/indexedDB'

export const useSimulationStore = defineStore('simulation', () => {
  const isRunning = ref(false)
  const currentSimulationId = ref(null)
  const snapshots = ref([])
  const fluids = ref([])
  const simulations = ref([])
  const syncStatus = ref(true)
  const currentStep = ref(0)
  const totalSteps = ref(1000)
  const gridSize = ref({ x: 64, y: 64 })
  const impellerSpeed = ref(120)
  const mixingQuality = ref(0)
  const deadZoneRatio = ref(0)

  const snapshotCount = computed(() => snapshots.value.length)
  
  const progress = computed(() => {
    if (totalSteps.value === 0) return 0
    return Math.round((currentStep.value / totalSteps.value) * 100)
  })

  const mixingStatus = computed(() => {
    if (mixingQuality.value >= 0.95) return { text: '混合均匀', class: 'badge-success' }
    if (mixingQuality.value >= 0.7) return { text: '混合良好', class: 'badge-info' }
    if (mixingQuality.value >= 0.4) return { text: '混合中', class: 'badge-warning' }
    return { text: '混合差', class: 'badge-danger' }
  })

  async function loadFluids() {
    try {
      fluids.value = await db.getFluids()
      if (fluids.value.length === 0) {
        const defaultFluids = [
          { name: '水溶液', viscosity: 0.001, density: 1000, color: '#00d4ff' },
          { name: '有机溶液', viscosity: 0.002, density: 850, color: '#7b2cbf' },
          { name: '高粘度流体', viscosity: 0.1, density: 1200, color: '#ff6b6b' },
          { name: '悬浮液', viscosity: 0.05, density: 1100, color: '#ffd93d' }
        ]
        for (const fluid of defaultFluids) {
          const id = await db.addFluid(fluid)
          fluids.value.push({ ...fluid, id })
        }
      }
    } catch (e) {
      console.error('Failed to load fluids:', e)
    }
  }

  async function loadSnapshots(fluidId = null) {
    try {
      snapshots.value = await db.getSnapshots(fluidId, 100)
    } catch (e) {
      console.error('Failed to load snapshots:', e)
    }
  }

  async function loadSimulations() {
    try {
      simulations.value = await db.getSimulations()
    } catch (e) {
      console.error('Failed to load simulations:', e)
    }
  }

  async function saveSnapshot(snapshotData) {
    try {
      const id = await db.addSnapshot(snapshotData)
      snapshots.value.unshift({ ...snapshotData, id })
      if (snapshots.value.length > 100) {
        snapshots.value = snapshots.value.slice(0, 100)
      }
      syncStatus.value = false
      return id
    } catch (e) {
      console.error('Failed to save snapshot:', e)
      throw e
    }
  }

  async function startSimulation(fluidId, params = {}) {
    const simulationData = {
      fluidId,
      startTime: Date.now(),
      status: 'running',
      params: {
        gridSize: params.gridSize || gridSize.value,
        impellerSpeed: params.impellerSpeed || impellerSpeed.value,
        totalSteps: params.totalSteps || totalSteps.value
      }
    }
    
    currentSimulationId.value = await db.addSimulation(simulationData)
    isRunning.value = true
    currentStep.value = 0
    totalSteps.value = simulationData.params.totalSteps
    gridSize.value = simulationData.params.gridSize
    impellerSpeed.value = simulationData.params.impellerSpeed
    
    await loadSimulations()
    return currentSimulationId.value
  }

  async function stopSimulation() {
    if (currentSimulationId.value) {
      await db.updateSimulation(currentSimulationId.value, {
        status: 'stopped',
        endTime: Date.now(),
        finalMixingQuality: mixingQuality.value,
        finalDeadZoneRatio: deadZoneRatio.value
      })
      await loadSimulations()
    }
    isRunning.value = false
    currentSimulationId.value = null
  }

  function updateMixingMetrics(quality, deadZone) {
    mixingQuality.value = quality
    deadZoneRatio.value = deadZone
  }

  function incrementStep() {
    currentStep.value++
    if (currentStep.value >= totalSteps.value) {
      stopSimulation()
    }
  }

  function reset() {
    currentStep.value = 0
    mixingQuality.value = 0
    deadZoneRatio.value = 0
    isRunning.value = false
    currentSimulationId.value = null
  }

  async function markSynced() {
    syncStatus.value = true
  }

  async function deleteSnapshot(id) {
    await db.deleteSnapshot(id)
    snapshots.value = snapshots.value.filter(s => s.id !== id)
  }

  async function clearAllSnapshots() {
    await db.clearSnapshots()
    snapshots.value = []
  }

  return {
    isRunning,
    currentSimulationId,
    snapshots,
    fluids,
    simulations,
    syncStatus,
    currentStep,
    totalSteps,
    gridSize,
    impellerSpeed,
    mixingQuality,
    deadZoneRatio,
    snapshotCount,
    progress,
    mixingStatus,
    loadFluids,
    loadSnapshots,
    loadSimulations,
    saveSnapshot,
    startSimulation,
    stopSimulation,
    updateMixingMetrics,
    incrementStep,
    reset,
    markSynced,
    deleteSnapshot,
    clearAllSnapshots
  }
})
