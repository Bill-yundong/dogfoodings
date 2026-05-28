<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCourseStore } from '@/stores/course'
import {
  Clock,
  Star,
  Search,
  Filter,
  Dumbbell,
  Flame,
  Heart
} from 'lucide-vue-next'

const router = useRouter()
const courseStore = useCourseStore()

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedDifficulty = ref('all')

const categories = [
  { id: 'all', name: '全部', icon: Dumbbell },
  { id: '瑜伽', name: '瑜伽', icon: Heart },
  { id: 'HIIT', name: 'HIIT', icon: Flame }
]

const difficulties = [
  { id: 'all', name: '全部难度' },
  { id: 'beginner', name: '入门' },
  { id: 'intermediate', name: '进阶' },
  { id: 'advanced', name: '高级' }
]

const filteredCourses = computed(() => {
  return courseStore.courses.filter(course => {
    const matchSearch = course.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                       course.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCategory = selectedCategory.value === 'all' || course.category === selectedCategory.value
    const matchDifficulty = selectedDifficulty.value === 'all' || course.difficulty === selectedDifficulty.value
    return matchSearch && matchCategory && matchDifficulty
  })
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
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">课程中心</h1>
      <p class="text-gray-400">发现适合你的训练课程，开启智能健身体验</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 mb-8">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索课程..."
          class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>
      <div class="flex items-center space-x-2">
        <Filter class="w-5 h-5 text-gray-400" />
        <select
          v-model="selectedDifficulty"
          class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
        >
          <option v-for="diff in difficulties" :key="diff.id" :value="diff.id">
            {{ diff.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-8">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectedCategory = cat.id"
        :class="[
          'flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200',
          selectedCategory === cat.id
            ? 'bg-primary-500 text-white'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
        ]"
      >
        <component :is="cat.icon" class="w-4 h-4" />
        <span>{{ cat.name }}</span>
      </button>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="course in filteredCourses"
        :key="course.id"
        class="glass-card glass-card-hover overflow-hidden cursor-pointer group"
        @click="router.push(`/courses/${course.id}`)"
      >
        <div class="aspect-video bg-gradient-to-br from-primary-500/20 to-accent-500/20 relative overflow-hidden">
          <img
            :src="course.thumbnail"
            :alt="course.name"
            class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
          <div class="absolute top-3 left-3">
            <span :class="[getDifficultyColor(course.difficulty), 'px-3 py-1 rounded-full text-xs font-medium']">
              {{ getDifficultyLabel(course.difficulty) }}
            </span>
          </div>
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1 bg-dark-600/80 rounded-full text-xs font-medium text-white">
              {{ course.category }}
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

    <div v-if="filteredCourses.length === 0" class="text-center py-16">
      <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search class="w-8 h-8 text-gray-500" />
      </div>
      <h3 class="text-lg font-medium mb-2">没有找到匹配的课程</h3>
      <p class="text-gray-400">尝试调整搜索条件或筛选器</p>
    </div>
  </div>
</template>
