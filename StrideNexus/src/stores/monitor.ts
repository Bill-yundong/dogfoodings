import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PressureData,
  CadenceData,
  PostureData,
  FatigueState,
  PosturePrediction,
  RiskLevel,
  RunSession
} from '@/types'
import { posturePredictor } from '@/ai/posturePredictor'
import { fatigueAnalyzer } from '@/ai/fatigueAnalyzer'
import { riskAssessor } from '@/ai/riskAssessor'
import {
  generatePressureData,
  generateCadenceData,
  generatePostureData
} from '@/utils/mockDataGenerator'
import {
  pressureDataRepository,
  cadenceDataRepository,
  postureDataRepository,
  runSessionRepository
} from '@/database/repository'

export const useMonitorStore = defineStore('monitor', () => {
  const isRunning = ref(false)
  const currentSession = ref<RunSession | null>(null)
  const currentPressureData = ref<PressureData | null>(null)
  const currentCadenceData = ref<CadenceData | null>(null)
  const currentPostureData = ref<PostureData | null>(null)
  const pressureHistory = ref<PressureData[]>([])
  const cadenceHistory = ref<CadenceData[]>([])
  const postureHistory = ref<PostureData[]>([])
  const fatigueState = ref<FatigueState | null>(null)
  const posturePrediction = ref<PosturePrediction | null>(null)
  const elapsedTime = ref(0)
  const distance = ref(0)
  const steps = ref(0)
  const baseCadence = ref(175)
  const fatigueDrift = ref(0)

  const currentRiskLevel = computed((): RiskLevel => {
    if (!fatigueState.value) return 'safe'
    return riskAssessor.getRiskLevel(fatigueState.value.score)
  })

  const currentRiskColor = computed(() => {
    return riskAssessor.getRiskLevelColor(currentRiskLevel.value)
  })

  const currentRiskText = computed(() => {
    return riskAssessor.getRiskLevelText(currentRiskLevel.value)
  })

  const avgCadence = computed(() => {
    if (cadenceHistory.value.length === 0) return 0
    const sum = cadenceHistory.value.reduce((acc, c) => acc + c.stepsPerMinute, 0)
    return Math.round(sum / cadenceHistory.value.length)
  })

  const avgStepLength = computed(() => {
    if (cadenceHistory.value.length === 0) return 0
    const sum = cadenceHistory.value.reduce((acc, c) => acc + c.stepLength, 0)
    return sum / cadenceHistory.value.length
  })

  let dataInterval: ReturnType<typeof setInterval> | null = null
  let timeInterval: ReturnType<typeof setInterval> | null = null

  async function startSession() {
    isRunning.value = true
    fatigueDrift.value = 0

    const session = await runSessionRepository.create({
      userId: 'demo-user',
      startTime: new Date(),
      distance: 0,
      averageCadence: 0,
      status: 'running'
    })
    currentSession.value = session

    posturePredictor.reset()
    fatigueAnalyzer.reset()

    pressureHistory.value = []
    cadenceHistory.value = []
    postureHistory.value = []
    elapsedTime.value = 0
    distance.value = 0
    steps.value = 0

    generateMockData()

    timeInterval = setInterval(() => {
      elapsedTime.value++
      distance.value = parseFloat((elapsedTime.value * (avgCadence.value / 60) * (avgStepLength.value || 1.4) / 1000).toFixed(2))
      steps.value = Math.round(elapsedTime.value * (avgCadence.value / 60))
      fatigueDrift.value = Math.min(30, elapsedTime.value / 120)
    }, 1000)
  }

  function generateMockData() {
    const sessionId = currentSession.value?.id || 'demo'
    let frameCount = 0

    dataInterval = setInterval(() => {
      if (!isRunning.value) return

      const timestamp = Date.now()
      const fatigueLevel = fatigueState.value?.score || 0

      const pressure = generatePressureData(sessionId, timestamp)
      const cadence = generateCadenceData(sessionId, timestamp, baseCadence.value - fatigueDrift.value)
      const posture = generatePostureData(sessionId, timestamp, fatigueLevel + fatigueDrift.value)

      currentPressureData.value = pressure
      currentCadenceData.value = cadence
      currentPostureData.value = posture

      pressureHistory.value.push(pressure)
      cadenceHistory.value.push(cadence)
      postureHistory.value.push(posture)

      if (pressureHistory.value.length > 200) pressureHistory.value.shift()
      if (cadenceHistory.value.length > 200) cadenceHistory.value.shift()
      if (postureHistory.value.length > 200) postureHistory.value.shift()

      posturePredictor.addPostureData(posture)
      fatigueAnalyzer.addCadenceData(cadence)
      fatigueAnalyzer.addPressureData(pressure)
      fatigueAnalyzer.addPostureData(posture)

      frameCount++

      if (frameCount % 10 === 0) {
        const prediction = posturePredictor.predict()
        if (prediction) {
          posturePrediction.value = prediction
        }
      }

      if (frameCount % 30 === 0) {
        const fatigue = fatigueAnalyzer.analyze()
        if (fatigue) {
          fatigueState.value = fatigue
        }
      }

      if (frameCount % 100 === 0) {
        saveBatchData()
      }
    }, 100)
  }

  async function saveBatchData() {
    if (!currentSession.value) return

    const recentPressure = pressureHistory.value.slice(-50)
    const recentCadence = cadenceHistory.value.slice(-50)
    const recentPosture = postureHistory.value.slice(-50)

    try {
      for (const p of recentPressure) {
        await pressureDataRepository.create(p)
      }
      for (const c of recentCadence) {
        await cadenceDataRepository.create(c)
      }
      for (const p of recentPosture) {
        await postureDataRepository.create(p)
      }
    } catch (e) {
      console.error('Failed to save batch data:', e)
    }
  }

  async function pauseSession() {
    isRunning.value = false
    if (dataInterval) clearInterval(dataInterval)
    if (timeInterval) clearInterval(timeInterval)

    if (currentSession.value) {
      await runSessionRepository.update(currentSession.value.id, {
        status: 'paused',
        distance: distance.value,
        averageCadence: avgCadence.value
      })
    }
  }

  async function resumeSession() {
    if (currentSession.value) {
      await runSessionRepository.update(currentSession.value.id, {
        status: 'running'
      })
    }
    isRunning.value = true
    generateMockData()

    timeInterval = setInterval(() => {
      elapsedTime.value++
      distance.value = parseFloat((elapsedTime.value * (avgCadence.value / 60) * (avgStepLength.value || 1.4) / 1000).toFixed(2))
      steps.value = Math.round(elapsedTime.value * (avgCadence.value / 60))
      fatigueDrift.value = Math.min(30, elapsedTime.value / 120)
    }, 1000)
  }

  async function endSession() {
    isRunning.value = false
    if (dataInterval) clearInterval(dataInterval)
    if (timeInterval) clearInterval(timeInterval)

    await saveBatchData()

    if (currentSession.value) {
      await runSessionRepository.update(currentSession.value.id, {
        endTime: new Date(),
        status: 'completed',
        distance: distance.value,
        averageCadence: avgCadence.value
      })
    }

    return currentSession.value
  }

  function reset() {
    isRunning.value = false
    currentSession.value = null
    currentPressureData.value = null
    currentCadenceData.value = null
    currentPostureData.value = null
    pressureHistory.value = []
    cadenceHistory.value = []
    postureHistory.value = []
    fatigueState.value = null
    posturePrediction.value = null
    elapsedTime.value = 0
    distance.value = 0
    steps.value = 0
    fatigueDrift.value = 0
  }

  return {
    isRunning,
    currentSession,
    currentPressureData,
    currentCadenceData,
    currentPostureData,
    pressureHistory,
    cadenceHistory,
    postureHistory,
    fatigueState,
    posturePrediction,
    elapsedTime,
    distance,
    steps,
    baseCadence,
    currentRiskLevel,
    currentRiskColor,
    currentRiskText,
    avgCadence,
    avgStepLength,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    reset
  }
})
