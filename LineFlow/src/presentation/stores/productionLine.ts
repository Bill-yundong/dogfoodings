import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productionLineService } from '@application/ProductionLineService'
import type { ProductionLine } from '@domain/index'

export const useProductionLineStore = defineStore('productionLine', () => {
  const productionLine = ref<ProductionLine | null>(null)
  const alerts = ref<any[]>([])
  const isInitialized = ref(false)
  const snapshotCount = ref(0)

  const isRunning = computed(() => productionLineService.isSimulationRunning())
  const isPaused = computed(() => productionLineService.isSimulationPaused())
  const simulationSpeed = computed(() => productionLineService.getSimulationSpeed())

  const bottleneckStation = computed(() => {
    if (!productionLine.value) return null
    const stations = productionLine.value.workstations
    return stations.find(s => s.isBottleneck)
  })

  const overallOEE = computed(() => {
    if (!productionLine.value) return 0
    return Math.round(productionLine.value.getOEE() * 1000) / 10
  })

  const runningStationsCount = computed(() => {
    if (!productionLine.value) return 0
    return productionLine.value.workstations.filter(w => w.isRunning).length
  })

  const totalStationsCount = computed(() => {
    return productionLine.value?.workstations.length || 0
  })

  const wipCount = computed(() => productionLine.value?.wipCount || 0)
  const completedCount = computed(() => productionLine.value?.completedCount || 0)
  const throughput = computed(() => productionLine.value?.throughput || 0)

  const criticalAlerts = computed(() => {
    return alerts.value.filter(a => a.level === 'critical' && !a.acknowledged)
  })

  async function initialize(): Promise<void> {
    if (isInitialized.value) return

    await productionLineService.initialize()
    productionLine.value = productionLineService.getProductionLine()
    
    productionLineService.addUpdateListener(handleUpdate)
    productionLineService.addAlertListener(handleAlert)

    await loadAlerts()
    await updateSnapshotCount()
    isInitialized.value = true
  }

  function handleUpdate(line: ProductionLine): void {
    productionLine.value = line
  }

  function handleAlert(alert: any): void {
    alerts.value.unshift(alert)
    if (alerts.value.length > 200) {
      alerts.value.pop()
    }
  }

  async function loadAlerts(): Promise<void> {
    // Implementation will load alerts from storage
  }

  async function updateSnapshotCount(): Promise<void> {
    snapshotCount.value = await productionLineService.getSnapshotCount()
  }

  function startSimulation(): void {
    productionLineService.startSimulation()
  }

  function pauseSimulation(): void {
    productionLineService.pauseSimulation()
  }

  function resumeSimulation(): void {
    productionLineService.resumeSimulation()
  }

  function stopSimulation(): void {
    productionLineService.stopSimulation()
  }

  function setSimulationSpeed(speed: number): void {
    productionLineService.setSimulationSpeed(speed)
  }

  function triggerStationBreakdown(stationIndex: number): void {
    productionLineService.triggerStationBreakdown(stationIndex)
  }

  async function acknowledgeAlert(alertId: string): Promise<void> {
    await productionLineService.acknowledgeAlert(alertId)
    const alert = alerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  function getOptimizationSuggestions(stationId: string): string[] {
    return productionLineService.getOptimizationSuggestions(stationId)
  }

  function getBottleneckSeverity(stationId: string): string {
    return productionLineService.getBottleneckSeverity(stationId)
  }

  function dispose(): void {
    productionLineService.dispose()
  }

  return {
    productionLine,
    alerts,
    isInitialized,
    snapshotCount,
    isRunning,
    isPaused,
    simulationSpeed,
    bottleneckStation,
    overallOEE,
    runningStationsCount,
    totalStationsCount,
    wipCount,
    completedCount,
    throughput,
    criticalAlerts,
    initialize,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSimulationSpeed,
    triggerStationBreakdown,
    acknowledgeAlert,
    getOptimizationSuggestions,
    getBottleneckSeverity,
    updateSnapshotCount,
    dispose
  }
})
