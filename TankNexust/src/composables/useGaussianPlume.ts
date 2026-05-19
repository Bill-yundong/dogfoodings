import { ref, reactive, computed, onUnmounted } from 'vue'
import type { GaussianParams, DiffusionResult } from '@/types/simulation'
import { runGaussianSimulation } from '@/utils/gaussian'

export function useGaussianPlume() {
  const isRunning = ref(false)
  const currentTime = ref(0)
  const simulationSpeed = ref(1)
  const results = ref<DiffusionResult[]>([])
  const currentResult = ref<DiffusionResult | null>(null)

  const params = reactive<GaussianParams>({
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

  const gridConfig = reactive({
    width: 200,
    height: 200,
    resolution: 5
  })

  let animationFrameId: number | null = null
  let lastTimestamp = 0

  const maxConcentration = computed(() => {
    return currentResult.value?.maxConcentration || 0
  })

  const affectedArea = computed(() => {
    return currentResult.value?.affectedArea || 0
  })

  const riskZones = computed(() => {
    return currentResult.value?.riskZones || []
  })

  function updateParams(newParams: Partial<GaussianParams>) {
    Object.assign(params, newParams)
  }

  function updateGridConfig(config: Partial<typeof gridConfig>) {
    Object.assign(gridConfig, config)
  }

  function stepSimulation() {
    const result = runGaussianSimulation(
      params,
      gridConfig.width,
      gridConfig.height,
      gridConfig.resolution,
      0,
      0,
      currentTime.value
    )

    currentResult.value = result
    results.value.push(result)
  }

  function animate(timestamp: number) {
    if (!isRunning.value) return

    const deltaTime = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    currentTime.value += deltaTime * simulationSpeed.value

    stepSimulation()

    animationFrameId = requestAnimationFrame(animate)
  }

  function startSimulation() {
    if (isRunning.value) return

    isRunning.value = true
    lastTimestamp = performance.now()
    animationFrameId = requestAnimationFrame(animate)
  }

  function pauseSimulation() {
    isRunning.value = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function resetSimulation() {
    pauseSimulation()
    currentTime.value = 0
    results.value = []
    currentResult.value = null
  }

  function setTime(time: number) {
    currentTime.value = time
    stepSimulation()
  }

  onUnmounted(() => {
    pauseSimulation()
  })

  return {
    isRunning,
    currentTime,
    simulationSpeed,
    params,
    gridConfig,
    results,
    currentResult,
    maxConcentration,
    affectedArea,
    riskZones,
    updateParams,
    updateGridConfig,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setTime,
    stepSimulation
  }
}
