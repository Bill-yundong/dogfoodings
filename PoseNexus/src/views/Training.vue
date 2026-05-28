<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCourseStore } from '@/stores/course'
import { useTrainingStore } from '@/stores/training'
import { usePoseEngine } from '@/composables/usePoseEngine'
import { useSimilarity } from '@/composables/useSimilarity'
import SkeletonOverlay from '@/components/pose/SkeletonOverlay.vue'
import ScoreRing from '@/components/pose/ScoreRing.vue'
import type { Correction } from '@/types/pose'
import {
  X,
  Pause,
  Play,
  SkipForward,
  Clock,
  AlertTriangle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()
const trainingStore = useTrainingStore()
const { isInitialized, isProcessing, currentPose, error, startCamera, stopProcessing } = usePoseEngine()
const { currentScore, currentCorrections, averageScore, evaluatePose, finishAction, reset } = useSimilarity()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)

const isMuted = ref(false)
const showResult = ref(false)
const finalSession = ref<any>(null)
const actionTimer = ref(0)
const actionStartTime = ref(0)
const timerInterval = ref<number | null>(null)
const currentActionIndex = ref(0)

const videoWidth = 640
const videoHeight = 480

const currentCourse = computed(() => courseStore.selectedCourse)
const currentAction = computed(() => {
  if (!currentCourse.value) return null
  return currentCourse.value.actions[currentActionIndex.value] || null
})

const progress = computed(() => {
  if (!currentCourse.value) return 0
  return Math.round((currentActionIndex.value / currentCourse.value.actions.length) * 100)
})

const latestCorrection = computed((): Correction | null => {
  if (currentCorrections.value.length === 0) return null
  return currentCorrections.value[currentCorrections.value.length - 1]
})

function speak(text: string) {
  if (isMuted.value) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 1
  speechSynthesis.speak(utterance)
}

async function nextAction() {
  if (!currentCourse.value || !currentAction.value) return

  const actionData = finishAction(
    currentAction.value,
    actionStartTime.value,
    Date.now()
  )
  trainingStore.addAction(actionData)

  currentActionIndex.value++

  if (currentActionIndex.value >= currentCourse.value.actions.length) {
    await endTraining()
  } else {
    startActionTimer()
    speak(`下一个动作：${currentCourse.value.actions[currentActionIndex.value].name}`)
  }
}

function startActionTimer() {
  actionTimer.value = currentAction.value?.duration || 30
  actionStartTime.value = Date.now()

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  timerInterval.value = window.setInterval(() => {
    if (trainingStore.isPaused) return

    actionTimer.value--
    if (actionTimer.value <= 0) {
      nextAction()
    }
  }, 1000)
}

watch(currentPose, (pose) => {
  if (!pose || !currentAction.value || trainingStore.isPaused) return

  const { score, corrections } = evaluatePose(pose, currentAction.value)
  trainingStore.updateScore(score, corrections)
  trainingStore.updatePose(pose)

  if (corrections.length > 0 && Math.random() > 0.7) {
    const correction = corrections[0]
    speak(correction.suggestion)
  }
})

async function endTraining() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  stopProcessing()
  const session = await trainingStore.endSession()
  finalSession.value = session
  showResult.value = true
  speak('训练已完成，做得很好！')
}

function togglePause() {
  trainingStore.togglePause()
  if (trainingStore.isPaused) {
    speak('训练已暂停')
  } else {
    speak('继续训练')
  }
}

function exitTraining() {
  if (confirm('确定要退出训练吗？当前进度将不会保存。')) {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
    stopProcessing()
    trainingStore.reset()
    reset()
    router.push('/courses')
  }
}

onMounted(async () => {
  const courseId = route.params.courseId as string
  await courseStore.selectCourse(courseId)

  if (!courseStore.selectedCourse) {
    router.push('/courses')
    return
  }

  trainingStore.startSession(courseId, courseStore.selectedCourse.actions.length)

  if (videoRef.value) {
    const canvas = document.createElement('canvas')
    await startCamera(videoRef.value, canvas)
    startActionTimer()
    speak(`开始训练：${courseStore.selectedCourse.name}，第一个动作：${courseStore.selectedCourse.actions[0].name}`)
  }
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  stopProcessing()
})

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="fixed inset-0 bg-dark-700 z-50">
    <div v-if="showResult && finalSession" class="absolute inset-0 bg-dark-700/95 flex items-center justify-center z-50">
      <div class="glass-card p-8 max-w-md w-full mx-4 text-center">
        <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle class="w-10 h-10 text-green-400" />
        </div>
        <h2 class="text-2xl font-bold mb-2">训练完成！</h2>
        <p class="text-gray-400 mb-6">做得很棒，继续保持！</p>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-3xl font-bold text-primary-400">{{ finalSession.averageScore }}</div>
            <div class="text-sm text-gray-400">平均分</div>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-3xl font-bold text-accent-400">
              {{ formatTime(finalSession.totalDuration) }}
            </div>
            <div class="text-sm text-gray-400">训练时长</div>
          </div>
        </div>

        <div class="space-y-3">
          <button
            @click="router.push('/courses')"
            class="w-full btn-primary"
          >
            返回课程
          </button>
          <button
            @click="router.push('/profile')"
            class="w-full btn-secondary"
          >
            查看记录
          </button>
        </div>
      </div>
    </div>

    <div class="h-full flex">
      <div class="flex-1 relative">
        <div
          ref="canvasContainerRef"
          class="absolute inset-0 flex items-center justify-center bg-black"
        >
          <video
            ref="videoRef"
            class="transform scale-x-[-1]"
            :width="videoWidth"
            :height="videoHeight"
            style="width: 100%; height: 100%; object-fit: contain;"
            autoplay
            playsinline
            muted
          />
          <div class="absolute inset-0 flex items-center justify-center" style="width: 100%; height: 100%;">
            <div class="relative" style="width: 100%; height: 100%; max-width: 640px; max-height: 480px;">
              <SkeletonOverlay
                :pose="currentPose"
                :width="videoWidth"
                :height="videoHeight"
                :score="currentScore"
              />
            </div>
          </div>
        </div>

        <div class="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            @click="exitTraining"
            class="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X class="w-6 h-6" />
          </button>

          <div class="flex items-center space-x-4">
            <button
              @click="isMuted = !isMuted"
              class="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Volume2 v-if="!isMuted" class="w-6 h-6" />
              <VolumeX v-else class="w-6 h-6" />
            </button>
            <div class="px-4 py-2 bg-white/10 rounded-full">
              <span class="font-mono text-lg">
                {{ currentActionIndex + 1 }} / {{ currentCourse?.actions.length || 0 }}
              </span>
            </div>
          </div>
        </div>

        <div class="absolute bottom-4 left-4 right-4">
          <div class="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              class="h-full bg-primary-500 transition-all duration-300"
              :style="{ width: progress + '%' }"
            />
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button
                @click="togglePause"
                class="p-4 bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
              >
                <Pause v-if="!trainingStore.isPaused" class="w-6 h-6" />
                <Play v-else class="w-6 h-6" />
              </button>
              <button
                @click="nextAction"
                class="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <SkipForward class="w-6 h-6" />
              </button>
            </div>

            <div class="text-center">
              <div class="text-sm text-gray-400">{{ currentAction?.name }}</div>
              <div class="text-3xl font-bold font-mono">{{ actionTimer }}s</div>
            </div>

            <ScoreRing :score="currentScore" :size="80" />
          </div>
        </div>
      </div>

      <div class="w-80 bg-dark-600 p-6 flex flex-col">
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">{{ currentCourse?.name }}</h3>
          <div class="flex items-center space-x-2 text-sm text-gray-400">
            <Clock class="w-4 h-4" />
            <span>{{ currentAction?.name }}</span>
          </div>
        </div>

        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-400 mb-3">动作描述</h4>
          <p class="text-sm">{{ currentAction?.description }}</p>
        </div>

        <div class="flex-1 overflow-auto">
          <h4 class="text-sm font-medium text-gray-400 mb-3">实时反馈</h4>
          <div class="space-y-3">
            <div
              v-if="latestCorrection"
              :class="[
                'p-4 rounded-xl',
                latestCorrection.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-yellow-500/10 border border-yellow-500/20'
              ]"
            >
              <div class="flex items-start space-x-3">
                <AlertTriangle
                  :class="[
                    'w-5 h-5 flex-shrink-0 mt-0.5',
                    latestCorrection.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                  ]"
                />
                <div>
                  <p
                    :class="[
                      'text-sm font-medium',
                      latestCorrection.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                    ]"
                  >
                    {{ latestCorrection.message }}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ latestCorrection.suggestion }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else-if="currentScore >= 80"
              class="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
            >
              <div class="flex items-start space-x-3">
                <CheckCircle class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-green-400">动作标准</p>
                  <p class="text-xs text-gray-400 mt-1">继续保持！</p>
                </div>
              </div>
            </div>

            <div v-else class="p-4 rounded-xl bg-white/5 border border-white/10">
              <p class="text-sm text-gray-400 text-center">
                请在摄像头前做出正确的动作
              </p>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-white/10">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-400">平均得分</span>
            <span class="font-mono text-lg font-bold text-primary-400">{{ averageScore }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
