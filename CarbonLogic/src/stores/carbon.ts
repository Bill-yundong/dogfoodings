import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { carbonCalculator } from '@/engine/carbonCalculator'
import { lcaEngine } from '@/engine/lcaEngine'
import type { CarbonRecord, SimulationParams, LCACalculation } from '@/types/carbon'

export const useCarbonStore = defineStore('carbon', () => {
  const records = ref<CarbonRecord[]>([])
  const totalEmissions = ref(0)
  const emissionsByScope = ref({ 1: 0, 2: 0, 3: 0 })
  const emissionsByType = ref<Record<string, number>>({})
  const emissionsByDepartment = ref<Record<string, number>>({})
  const emissionsTrend = ref<Array<{ date: string; emissions: number }>>([])
  const forecast = ref<Array<{ date: string; projectedEmissions: number }>>([])

  const lcaCalculations = ref<LCACalculation[]>([])
  const currentLcaJob = ref<string | null>(null)
  const lcaProgress = ref(0)
  const lcaCurrentStage = ref('')

  const simulationResults = ref<Array<{
    name: string
    baseEmissions: number
    simulatedEmissions: number
    reductionPercentage: number
    params: SimulationParams
  }>>([])

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const scope1Percentage = computed(() =>
    totalEmissions.value > 0 ? (emissionsByScope.value[1] / totalEmissions.value) * 100 : 0
  )
  const scope2Percentage = computed(() =>
    totalEmissions.value > 0 ? (emissionsByScope.value[2] / totalEmissions.value) * 100 : 0
  )
  const scope3Percentage = computed(() =>
    totalEmissions.value > 0 ? (emissionsByScope.value[3] / totalEmissions.value) * 100 : 0
  )

  async function addEmissionRecord(input: {
    sourceId: string
    sourceName: string
    type: CarbonRecord['type']
    quantity: number
    unit: string
    department: string
    scope: 1 | 2 | 3
    factor?: number
  }) {
    try {
      await carbonCalculator.calculateAndRecord(input)
      await loadAggregatedData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add record'
      throw err
    }
  }

  async function loadAggregatedData() {
    isLoading.value = true
    try {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 12)

      const result = await carbonCalculator.aggregateByTimeRange(start, end)
      totalEmissions.value = result.totalEmissions
      emissionsByScope.value = result.byScope
      emissionsByType.value = result.byType
      emissionsByDepartment.value = result.byDepartment
      emissionsTrend.value = result.trend

      forecast.value = carbonCalculator.generateForecast(result.trend, 6)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load data'
    } finally {
      isLoading.value = false
    }
  }

  async function startLCACalculation(
    productId: string,
    productName: string,
    parameters: {
      productionVolume: number
      materialWeight: number
      transportDistance: number
      lifespan: number
      recyclability: number
    }
  ) {
    const jobId = lcaEngine.addJob({ productId, productName, parameters })
    currentLcaJob.value = jobId

    lcaEngine.addListener(jobId, (update) => {
      lcaProgress.value = update.progress
      lcaCurrentStage.value = update.stage

      if (update.stage === 'complete' && update.result) {
        lcaCalculations.value.push({
          id: crypto.randomUUID(),
          productId,
          productName,
          timestamp: new Date().toISOString(),
          status: 'completed',
          stages: update.result.stages,
          totalEmissions: update.result.totalEmissions,
          breakdown: update.result.breakdown
        })
        currentLcaJob.value = null
      }
    })

    return jobId
  }

  async function runSimulation(
    baseEmissions: number,
    params: SimulationParams,
    scenarioName: string
  ) {
    const result = await lcaEngine.simulateReduction(baseEmissions, params, scenarioName)
    simulationResults.value.push({
      name: scenarioName,
      baseEmissions: result.baseEmissions,
      simulatedEmissions: result.simulatedEmissions,
      reductionPercentage: result.reductionPercentage,
      params
    })
    return result
  }

  function clearSimulationResults() {
    simulationResults.value = []
  }

  function $reset() {
    records.value = []
    totalEmissions.value = 0
    emissionsByScope.value = { 1: 0, 2: 0, 3: 0 }
    emissionsByType.value = {}
    emissionsByDepartment.value = {}
    emissionsTrend.value = []
    forecast.value = []
    lcaCalculations.value = []
    simulationResults.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    records,
    totalEmissions,
    emissionsByScope,
    emissionsByType,
    emissionsByDepartment,
    emissionsTrend,
    forecast,
    lcaCalculations,
    currentLcaJob,
    lcaProgress,
    lcaCurrentStage,
    simulationResults,
    isLoading,
    error,
    scope1Percentage,
    scope2Percentage,
    scope3Percentage,
    addEmissionRecord,
    loadAggregatedData,
    startLCACalculation,
    runSimulation,
    clearSimulationResults,
    $reset
  }
})
