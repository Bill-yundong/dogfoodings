<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCourseStore } from '@/stores/course'
import { useUserStore } from '@/stores/user'
import { getCourseThumbnail } from '@/utils/courseImages'
import {
  Clock,
  Star,
  Play,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Dumbbell,
  Trophy
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()
const userStore = useUserStore()

const course = ref<any>(null)
const isLoading = ref(true)

const totalDuration = computed(() => {
  if (!course.value) return 0
  return course.value.actions.reduce((sum: number, a: any) => sum + a.duration, 0)
})

onMounted(async () => {
  const courseId = route.params.id as string
  await courseStore.selectCourse(courseId)
  course.value = courseStore.selectedCourse
  isLoading.value = false
})

function getDifficultyLabel(difficulty: string) {
  const labels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级'
  }
  return labels[difficulty] || difficulty
}

function getDifficultyColor(difficulty: string) {
  const colors: Record<string, string> = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400'
  }
  return colors[difficulty] || 'bg-gray-500/20 text-gray-400'
}

function startTraining() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push(`/training/${course.value.id}`)
}
</script>

<template>
  <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <button
      @click="router.back()"
      class="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
    >
      <ArrowLeft class="w-5 h-5" />
      <span>返回</span>
    </button>

    <div v-if="isLoading" class="space-y-6">
      <div class="aspect-video skeleton rounded-2xl"></div>
      <div class="h-8 skeleton w-1/3"></div>
      <div class="h-4 skeleton w-2/3"></div>
    </div>

    <div v-else-if="course" class="space-y-8">
      <div class="grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <div class="aspect-video rounded-2xl overflow-hidden relative">
            <img
              :src="getCourseThumbnail(course.thumbnail, course.category)"
              :alt="course.name"
              class="w-full h-full object-cover"
              @error="($event.target as HTMLImageElement).src = getCourseThumbnail('', course.category)"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-dark-600 via-transparent to-transparent"></div>
            <div class="absolute bottom-6 left-6">
              <span :class="[getDifficultyColor(course.difficulty), 'px-4 py-2 rounded-full text-sm font-medium mb-3 inline-block']">
                {{ getDifficultyLabel(course.difficulty) }} · {{ course.category }}
              </span>
              <h1 class="text-3xl font-bold">{{ course.name }}</h1>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-xl font-semibold mb-4">课程介绍</h2>
            <p class="text-gray-400 leading-relaxed">{{ course.description }}</p>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-xl font-semibold mb-4">动作列表</h2>
            <div class="space-y-3">
              <div
                v-for="(action, index) in course.actions"
                :key="action.id"
                class="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <span class="text-primary-400 font-medium">{{ index + 1 }}</span>
                  </div>
                  <div>
                    <h3 class="font-medium">{{ action.name }}</h3>
                    <p class="text-sm text-gray-400">{{ action.description }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2 text-gray-400">
                  <Clock class="w-4 h-4" />
                  <span>{{ action.duration }} 秒</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="glass-card p-6 sticky top-24">
            <h2 class="text-lg font-semibold mb-4">开始训练</h2>
            
            <div class="space-y-4 mb-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 text-gray-400">
                  <Clock class="w-5 h-5" />
                  <span>总时长</span>
                </div>
                <span class="font-medium">{{ totalDuration }} 秒</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 text-gray-400">
                  <Dumbbell class="w-5 h-5" />
                  <span>动作数量</span>
                </div>
                <span class="font-medium">{{ course.actions.length }} 个</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 text-gray-400">
                  <Trophy class="w-5 h-5" />
                  <span>难度等级</span>
                </div>
                <span class="font-medium">{{ getDifficultyLabel(course.difficulty) }}</span>
              </div>
            </div>

            <button
              @click="startTraining"
              class="w-full btn-primary flex items-center justify-center space-x-2 py-4"
            >
              <Play class="w-5 h-5" />
              <span>开始训练</span>
            </button>

            <div class="mt-6 space-y-3">
              <div class="flex items-start space-x-3">
                <CheckCircle class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span class="text-sm text-gray-400">实时 AI 姿态检测与纠错</span>
              </div>
              <div class="flex items-start space-x-3">
                <CheckCircle class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span class="text-sm text-gray-400">详细的动作评分和建议</span>
              </div>
              <div class="flex items-start space-x-3">
                <CheckCircle class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span class="text-sm text-gray-400">训练数据本地保存</span>
              </div>
            </div>

            <div class="mt-6 p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl">
              <div class="flex items-start space-x-3">
                <AlertCircle class="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-accent-400">温馨提示</p>
                  <p class="text-xs text-gray-400 mt-1">训练前请确保充足的空间，并在摄像头前保持适当距离。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16">
      <h3 class="text-xl font-medium mb-2">课程不存在</h3>
      <p class="text-gray-400 mb-4">请返回课程列表重新选择</p>
      <button @click="router.push('/courses')" class="btn-primary">
        返回课程列表
      </button>
    </div>
  </div>
</template>
