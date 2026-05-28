<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useTrainingStore } from '@/stores/training'
import { useCourseStore } from '@/stores/course'
import {
  Clock,
  Trophy,
  Target,
  Calendar,
  ChevronRight,
  LogOut,
  User,
  Database,
  Cloud
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const trainingStore = useTrainingStore()
const courseStore = useCourseStore()

const isLoading = ref(true)
const syncStatus = ref('synced')

const stats = computed(() => {
  const history = trainingStore.trainingHistory
  const totalSessions = history.length
  const totalDuration = history.reduce((sum, s) => sum + s.totalDuration, 0)
  const avgScore = totalSessions > 0
    ? history.reduce((sum, s) => sum + s.averageScore, 0) / totalSessions
    : 0
  const totalActions = history.reduce((sum, s) => sum + s.actions.length, 0)

  return [
    { label: '训练次数', value: `${totalSessions} 次`, icon: Target, color: 'text-primary-400', bg: 'bg-primary-500/20' },
    { label: '累计时长', value: `${Math.round(totalDuration / 60000)} 分钟`, icon: Clock, color: 'text-accent-400', bg: 'bg-accent-500/20' },
    { label: '平均得分', value: `${Math.round(avgScore)} 分`, icon: Trophy, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: '完成动作', value: `${totalActions} 个`, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/20' }
  ]
})

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function getCourseName(courseId: string) {
  const course = courseStore.courses.find(c => c.id === courseId)
  return course?.name || '未知课程'
}

function handleLogout() {
  userStore.logout()
  router.push('/')
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await trainingStore.loadHistory()
  isLoading.value = false
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div class="glass-card p-6 mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center">
            <User class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold">{{ userStore.currentUser?.name }}</h1>
            <p class="text-gray-400">{{ userStore.currentUser?.email }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut class="w-5 h-5" />
          <span>退出</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

    <div class="glass-card p-6 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">数据同步</h2>
        <div class="flex items-center space-x-2">
          <Cloud class="w-5 h-5 text-green-400" />
          <span class="text-sm text-green-400">已同步</span>
        </div>
      </div>
      <div class="flex items-center space-x-4 text-sm text-gray-400">
        <Database class="w-5 h-5" />
        <span>训练数据已保存在本地 IndexedDB 中，支持离线训练</span>
      </div>
    </div>

    <div class="glass-card p-6">
      <h2 class="text-xl font-semibold mb-6">训练记录</h2>

      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-20 skeleton rounded-xl"></div>
      </div>

      <div v-else-if="trainingStore.trainingHistory.length === 0" class="text-center py-12">
        <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy class="w-8 h-8 text-gray-500" />
        </div>
        <h3 class="text-lg font-medium mb-2">暂无训练记录</h3>
        <p class="text-gray-400 mb-6">开始你的第一次训练吧！</p>
        <button @click="router.push('/courses')" class="btn-primary">
          浏览课程
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="session in trainingStore.trainingHistory"
          :key="session.id"
          class="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <span class="text-primary-400 font-bold text-sm">
                {{ Math.round(session.averageScore) }}
              </span>
            </div>
            <div>
              <h3 class="font-medium">{{ getCourseName(session.courseId) }}</h3>
              <div class="flex items-center space-x-4 text-sm text-gray-400">
                <span class="flex items-center space-x-1">
                  <Calendar class="w-4 h-4" />
                  <span>{{ formatDate(session.createdAt) }}</span>
                </span>
                <span class="flex items-center space-x-1">
                  <Clock class="w-4 h-4" />
                  <span>{{ formatDuration(session.totalDuration) }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium',
                session.averageScore >= 80
                  ? 'bg-green-500/20 text-green-400'
                  : session.averageScore >= 60
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
              ]"
            >
              {{ session.averageScore >= 80 ? '优秀' : session.averageScore >= 60 ? '良好' : '需努力' }}
            </span>
            <ChevronRight class="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
