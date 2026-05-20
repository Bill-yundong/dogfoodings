import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BatteryPack, CellData, ThermalRunawayPrediction, Alarm, FireControlSignal } from '@/types'
import { createBatteryPack, updateBatteryPack, generateAlarms, getPackStats } from '@/utils/bmsSimulator'
import { DEFAULT_ARRHENIUS_PARAMS } from '@/utils/arrhenius'
import { DEFAULT_MAPPING_RULES, generateFireControlSignals } from '@/utils/semantic'
import type { ArrheniusParams, MappingRule } from '@/types'

export const useBatteryStore = defineStore('battery', () => {
  const pack = ref<BatteryPack>(createBatteryPack())
  const isSimulating = ref(false)
  const thermalRunawayCellId = ref<string | undefined>(undefined)
  const lastUpdateTime = ref(Date.now())
  const simulationInterval = ref<number | null>(null)

  const arrheniusParams = ref<ArrheniusParams>({ ...DEFAULT_ARRHENIUS_PARAMS })
  const predictions = ref<ThermalRunawayPrediction[]>([])
  const propagationMap = ref<Map<string, string[]>>(new Map())
  const isCalculating = ref(false)
  const calculationProgress = ref(0)

  const alarms = ref<Alarm[]>([])
  const fireSignals = ref<FireControlSignal[]>([])
  const mappingRules = ref<MappingRule[]>([...DEFAULT_MAPPING_RULES])

  const allCells = computed(() => pack.value.modules.flatMap(m => m.cells))
  const stats = computed(() => getPackStats(pack.value))

  const overallStatus = computed(() => {
    if (stats.value.runawayCount > 0) return 'critical'
    if (stats.value.warningCount > 0) return 'warning'
    return 'normal'
  })

  const unacknowledgedAlarms = computed(() =>
    alarms.value.filter(a => !a.acknowledged)
  )

  const highRiskPredictions = computed(() =>
    predictions.value.filter(p => p.riskLevel === 'high' || p.riskLevel === 'extreme')
  )

  function startSimulation(updateInterval: number = 1000) {
    if (isSimulating.value) return

    isSimulating.value = true
    lastUpdateTime.value = Date.now()

    simulationInterval.value = window.setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastUpdateTime.value) / 1000
      lastUpdateTime.value = now

      pack.value = updateBatteryPack(pack.value, deltaTime, thermalRunawayCellId.value)

      const newAlarms = generateAlarms(allCells.value, alarms.value)
      if (newAlarms.length > 0) {
        alarms.value = [...newAlarms, ...alarms.value].slice(0, 100)
        updateFireSignals()
      }
    }, updateInterval)
  }

  function stopSimulation() {
    isSimulating.value = false
    if (simulationInterval.value) {
      clearInterval(simulationInterval.value)
      simulationInterval.value = null
    }
  }

  function triggerThermalRunaway(cellId: string) {
    thermalRunawayCellId.value = cellId
  }

  function resetSimulation() {
    stopSimulation()
    pack.value = createBatteryPack()
    thermalRunawayCellId.value = undefined
    alarms.value = []
    fireSignals.value = []
    predictions.value = []
    propagationMap.value = new Map()
  }

  async function runThermalPrediction(): Promise<void> {
    if (isCalculating.value) return

    isCalculating.value = true
    calculationProgress.value = 0

    try {
      const worker = new Worker(
        new URL('@/workers/arrhenius.worker.ts', import.meta.url),
        { type: 'module' }
      )

      worker.postMessage({
        type: 'calculate',
        payload: {
          cells: allCells.value,
          params: arrheniusParams.value,
          timeHorizon: 3600,
          timeStep: 5,
          criticalTemp: 180,
          ambientTemp: 25
        }
      })

      worker.onmessage = (e) => {
        const { type, payload } = e.data

        if (type === 'progress') {
          calculationProgress.value = payload.progress
        } else if (type === 'result') {
          predictions.value = payload.predictions
          propagationMap.value = new Map(Object.entries(payload.propagationMap || {}))
          updateFireSignals()
          isCalculating.value = false
          worker.terminate()
        } else if (type === 'error') {
          console.error('Calculation error:', payload.message)
          isCalculating.value = false
          worker.terminate()
        }
      }
    } catch (error) {
      console.error('Failed to start worker:', error)
      isCalculating.value = false
    }
  }

  function updateFireSignals() {
    const signals = generateFireControlSignals(
      allCells.value,
      predictions.value,
      mappingRules.value
    )
    fireSignals.value = [...signals, ...fireSignals.value].slice(0, 50)
  }

  function acknowledgeAlarm(alarmId: string) {
    const alarm = alarms.value.find(a => a.id === alarmId)
    if (alarm) {
      alarm.acknowledged = true
      alarm.acknowledgedAt = Date.now()
      alarm.acknowledgedBy = 'current_user'
    }
  }

  function updateArrheniusParams(params: Partial<ArrheniusParams>) {
    arrheniusParams.value = { ...arrheniusParams.value, ...params }
  }

  function updateMappingRules(rules: MappingRule[]) {
    mappingRules.value = rules
    updateFireSignals()
  }

  function getCellById(cellId: string): CellData | undefined {
    return allCells.value.find(c => c.id === cellId)
  }

  function getPredictionForCell(cellId: string): ThermalRunawayPrediction | undefined {
    return predictions.value.find(p => p.cellId === cellId)
  }

  return {
    pack,
    isSimulating,
    thermalRunawayCellId,
    arrheniusParams,
    predictions,
    propagationMap,
    isCalculating,
    calculationProgress,
    alarms,
    fireSignals,
    mappingRules,
    allCells,
    stats,
    overallStatus,
    unacknowledgedAlarms,
    highRiskPredictions,
    startSimulation,
    stopSimulation,
    triggerThermalRunaway,
    resetSimulation,
    runThermalPrediction,
    acknowledgeAlarm,
    updateArrheniusParams,
    updateMappingRules,
    getCellById,
    getPredictionForCell
  }
})
