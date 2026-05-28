import { ref, computed } from 'vue'
import type { PoseData, Correction, ActionTemplate, TrainingAction } from '@/types/pose'
import {
  calculatePoseSimilarity,
  mapSimilarityToScore,
  detectCorrections,
  calculateSequenceScore
} from '@/utils/poseMath'

export function useSimilarity() {
  const currentScore = ref(0)
  const currentCorrections = ref<Correction[]>([])
  const scoreHistory = ref<number[]>([])
  const poseSequence = ref<PoseData[]>([])

  const averageScore = computed(() => {
    if (scoreHistory.value.length === 0) return 0
    const sum = scoreHistory.value.reduce((a, b) => a + b, 0)
    return Math.round((sum / scoreHistory.value.length) * 10) / 10
  })

  const latestCorrection = computed(() => {
    if (currentCorrections.value.length === 0) return null
    return currentCorrections.value[currentCorrections.value.length - 1]
  })

  const scoreGrade = computed(() => {
    const score = averageScore.value
    if (score >= 90) return { grade: 'S', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
    if (score >= 80) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-500/20' }
    if (score >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20' }
    if (score >= 60) return { grade: 'C', color: 'text-orange-400', bg: 'bg-orange-500/20' }
    return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/20' }
  })

  function evaluatePose(
    userPose: PoseData,
    actionTemplate: ActionTemplate
  ): { score: number; corrections: Correction[] } {
    const similarity = calculatePoseSimilarity(userPose, actionTemplate.referencePose)
    const score = mapSimilarityToScore(similarity)
    const corrections = detectCorrections(
      userPose,
      actionTemplate.referencePose,
      actionTemplate.keypointThresholds
    )

    currentScore.value = score
    currentCorrections.value = corrections
    scoreHistory.value.push(score)
    poseSequence.value.push(userPose)

    if (scoreHistory.value.length > 100) {
      scoreHistory.value = scoreHistory.value.slice(-100)
    }
    if (poseSequence.value.length > 300) {
      poseSequence.value = poseSequence.value.slice(-300)
    }

    return { score, corrections }
  }

  function finishAction(
    actionTemplate: ActionTemplate,
    startTime: number,
    endTime: number
  ): TrainingAction {
    const sequenceScore = calculateSequenceScore(
      poseSequence.value,
      [actionTemplate.referencePose]
    )

    const allCorrections = poseSequence.value.flatMap(pose =>
      detectCorrections(pose, actionTemplate.referencePose, actionTemplate.keypointThresholds)
    )

    const action: TrainingAction = {
      actionId: actionTemplate.id,
      actionName: actionTemplate.name,
      startTime,
      endTime,
      scores: [...scoreHistory.value],
      averageScore: sequenceScore,
      corrections: allCorrections
    }

    reset()
    return action
  }

  function reset() {
    currentScore.value = 0
    currentCorrections.value = []
    scoreHistory.value = []
    poseSequence.value = []
  }

  return {
    currentScore,
    currentCorrections,
    averageScore,
    latestCorrection,
    scoreGrade,
    evaluatePose,
    finishAction,
    reset
  }
}
