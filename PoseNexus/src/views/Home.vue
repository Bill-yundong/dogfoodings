<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCourseStore } from '@/stores/course'
import { useTrainingStore } from '@/stores/training'
import { useUserStore } from '@/stores/user'
import { getCourseThumbnail } from '@/utils/courseImages'
import {
  Play,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  ChevronRight,
  Dumbbell,
  Zap,
  Star,
  Eye,
  Lightbulb,
  Database
} from 'lucide-vue-next'

const router = useRouter()
const courseStore = useCourseStore()
const trainingStore = useTrainingStore()
const userStore = useUserStore()

const stats = ref([
  { label: '本周训练', value: '0 次', icon: Dumbbell, color: 'text-primary-400', bg: 'bg-primary-500/20' },
  { label: '累计时长', value: '0 分钟', icon: Clock, color: 'text-accent-400', bg: 'bg-accent-500/20' },
  { label: '平均得分', value: '-', icon: Trophy, color: 'text-green-400', bg: 'bg-green-500/20' },
  { label: '完成动作', value: '0 个', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/20' }
])

const recentCourses = computed(() => courseStore.courses.slice(0, 3))

function updateStats() {
  const history = trainingStore.trainingHistory
  if (history.length > 0) {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    
    const weekSessions = history.filter(s => new Date(s.createdAt) >= weekStart)
    const totalDuration = history.reduce((sum, s) => sum + s.totalDuration, 0)
    const avgScore = history.reduce((sum, s) => sum + s.averageScore, 0) / history.length
    const totalActions = history.reduce((sum, s) => sum + s.actions.length, 0)

    stats.value = [
      { label: '本周训练', value: `${weekSessions.length} 次`, icon: Dumbbell, color: 'text-primary-400', bg: 'bg-primary-500/20' },
      { label: '累计时长', value: `${Math.round(totalDuration / 60000)} 分钟`, icon: Clock, color: 'text-accent-400', bg: 'bg-accent-500/20' },
      { label: '平均得分', value: `${Math.round(avgScore)} 分`, icon: Trophy, color: 'text-green-400', bg: 'bg-green-500/20' },
      { label: '完成动作', value: `${totalActions} 个`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/20' }
    ]
  }
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await trainingStore.loadHistory()
    updateStats()
  }
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
</script>

<template>
  <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div class="mb-12 text-center">
      <div class="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500/10 rounded-full mb-6">
        <Zap class="w-4 h-4 text-primary-400" />
        <span class="text-primary-400 text-sm font-medium">AI 驱动的智能视觉纠错</span>
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
        <span class="text-gradient">PoseNexus</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
        实时姿态识别 · 智能动作纠错 · 个性化训练方案
        <br />让专业教练走进你的家中
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <button @click="router.push('/courses')" class="btn-primary flex items-center justify-center space-x-2">
          <Play class="w-5 h-5" />
          <span>开始训练</span>
        </button>
        <button @click="router.push('/courses')" class="btn-secondary flex items-center justify-center space-x-2">
          <TrendingUp class="w-5 h-5" />
          <span>查看课程</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="glass-card p-6 text-center"
      >
        <div :class="[stat.bg, 'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3']">
          <component :is="stat.icon" :class="[stat.color, 'w-6 h-6']" />
        </div>
        <div class="text-2xl font-bold mb-1">{{ stat.value }}</div>
        <div class="text-sm text-gray-400">{{ stat.label }}</div>
      </div>
    </div>

    <div class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">推荐课程</h2>
        <button
          @click="router.push('/courses')"
          class="flex items-center space-x-1 text-primary-400 hover:text-primary-300 transition-colors"
        >
          <span>查看全部</span>
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in recentCourses"
          :key="course.id"
          class="glass-card glass-card-hover overflow-hidden cursor-pointer group"
          @click="router.push(`/courses/${course.id}`)"
        >
          <div class="aspect-video bg-gradient-to-br from-primary-500/20 to-accent-500/20 relative overflow-hidden">
            <img
              :src="getCourseThumbnail(course.thumbnail, course.category)"
              :alt="course.name"
              class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              @error="($event.target as HTMLImageElement).src = getCourseThumbnail('', course.category)"
            />
            <div class="absolute top-3 left-3">
              <span :class="[getDifficultyColor(course.difficulty), 'px-3 py-1 rounded-full text-xs font-medium']">
                {{ getDifficultyLabel(course.difficulty) }}
              </span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-dark-600 to-transparent"></div>
          </div>
          <div class="p-5">
            <h3 class="text-lg font-semibold mb-2 group-hover:text-primary-400 transition-colors">
              {{ course.name }}
            </h3>
            <p class="text-sm text-gray-400 mb-4 line-clamp-2">
              {{ course.description }}
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 text-sm text-gray-400">
                <span class="flex items-center space-x-1">
                  <Clock class="w-4 h-4" />
                  <span>{{ course.duration }} 分钟</span>
                </span>
                <span class="flex items-center space-x-1">
                  <Star class="w-4 h-4" />
                  <span>{{ course.actions.length }} 动作</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">为什么选择 PoseNexus？</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye class="w-8 h-8 text-primary-400" />
          </div>
          <h3 class="text-lg font-semibold mb-2">实时姿态识别</h3>
          <p class="text-gray-400 text-sm">基于 MediaPipe 的高精度骨骼关键点检测，实时捕捉你的每一个动作</p>
        </div>
        <div class="text-center">
          <div class="w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lightbulb class="w-8 h-8 text-accent-400" />
          </div>
          <h3 class="text-lg font-semibold mb-2">智能纠错反馈</h3>
          <p class="text-gray-400 text-sm">AI 引擎实时分析动作偏差，提供专业的纠正建议和评分</p>
        </div>
        <div class="text-center">
          <div class="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database class="w-8 h-8 text-green-400" />
          </div>
          <h3 class="text-lg font-semibold mb-2">数据本地存储</h3>
          <p class="text-gray-400 text-sm">IndexedDB 本地快照存储，离线也能训练，数据跨端同步</p>
        </div>
      </div>
    </div>
  </div>
</template>
