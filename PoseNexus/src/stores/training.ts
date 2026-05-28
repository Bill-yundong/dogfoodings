import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TrainingSession, TrainingAction, PoseData, Correction } from '@/types/pose'
import { useUserStore } from './user'
import { saveTrainingSession, getTrainingSessionsByUser, saveSnapshot } from '@/utils/db'

export const useTrainingStore = defineStore('training', () => {
  const userStore = useUserStore()
  
  const currentSession = ref<TrainingSession | null>(null)
  const currentActionIndex = ref(0)
  const isTraining = ref(false)
  const isPaused = ref(false)
  const currentPose = ref<PoseData | null>(null)
  const currentScore = ref(0)
  const corrections = ref<Correction[]>([])
  const trainingHistory = ref<TrainingSession[]>([])

  const currentAction = computed(() => {
    if (!currentSession.value) return null
    return currentSession.value.actions[currentActionIndex.value] || null
  })

  const progress = computed(() => {
    if (!currentSession.value?.actions.length) return 0
    return Math.round((currentActionIndex.value / currentSession.value.actions.length) * 100)
  })

  function startSession(courseId: string, actionCount: number) {
    currentSession.value = {
      id: `session_${Date.now()}`,
      userId: userStore.userId,
      courseId,
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      averageScore: 0,
      actions: [],
      synced: false,
      createdAt: Date.now()
    }
    currentActionIndex.value = 0
    isTraining.value = true
    isPaused.value = false
    corrections.value = []
  }

  function addAction(action: TrainingAction) {
    if (currentSession.value) {
      currentSession.value.actions.push(action)
      currentActionIndex.value++
    }
  }

  function updateScore(score: number, newCorrections: Correction[]) {
    currentScore.value = score
    corrections.value = newCorrections
  }

  function updatePose(pose: PoseData | null) {
    currentPose.value = pose
  }

  function togglePause() {
    isPaused.value = !isPaused.value
  }

  async function endSession() {
    if (!currentSession.value) return

    currentSession.value.endTime = Date.now()
    currentSession.value.totalDuration = 
      currentSession.value.endTime - currentSession.value.startTime
    
    if (currentSession.value.actions.length > 0) {
      const totalScore = currentSession.value.actions.reduce(
        (sum, a) => sum + a.averageScore, 0
      )
      currentSession.value.averageScore = 
        Math.round((totalScore / currentSession.value.actions.length) * 10) / 10
    }

    await saveTrainingSession(currentSession.value)
    await saveSnapshot(userStore.userId, 'last_session', currentSession.value)
    
    isTraining.value = false
    isPaused.value = false
    
    return currentSession.value
  }

  async function loadHistory() {
    trainingHistory.value = await getTrainingSessionsByUser(userStore.userId)
  }

  function reset() {
    currentSession.value = null
    currentActionIndex.value = 0
    isTraining.value = false
    isPaused.value = false
    currentPose.value = null
    currentScore.value = 0
    corrections.value = []
  }

  return {
    currentSession,
    currentActionIndex,
    isTraining,
    isPaused,
    currentPose,
    currentScore,
    corrections,
    trainingHistory,
    currentAction,
    progress,
    startSession,
    addAction,
    updateScore,
    updatePose,
    togglePause,
    endSession,
    loadHistory,
    reset
  }
})
