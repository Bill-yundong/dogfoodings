<template>
  <div class="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
    <div class="text-center max-w-lg">
      <div class="relative mb-8">
        <h1 class="text-[150px] font-bold font-mono leading-none bg-gradient-to-b from-electric-blue to-electric-blue-dark bg-clip-text text-transparent">
          404
        </h1>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-32 h-32 rounded-full bg-electric-blue/10 animate-pulse-glow"></div>
        </div>
      </div>
      
      <h2 class="text-2xl font-semibold text-cyber-text mb-3">
        信号丢失 · 坐标未找到
      </h2>
      
      <p class="text-cyber-text-secondary mb-8">
        您访问的页面不存在或已被移动到其他坐标位置。
        <br />
        请检查您的导航路径或返回控制中心。
      </p>

      <div class="cyber-card mb-8 p-4">
        <div class="text-xs text-cyber-text-muted font-mono space-y-1 text-left">
          <p>> 系统状态: <span class="text-warning-orange">导航异常</span></p>
          <p>> 请求路径: <span class="text-electric-blue">{{ currentPath }}</span></p>
          <p>> 时间戳: <span class="text-cyber-text">{{ timestamp }}</span></p>
          <p>> 建议操作: <span class="text-success-green">返回仪表盘</span></p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          @click="goHome"
          class="cyber-btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <component :is="icons.Home" class="w-4 h-4" />
          返回控制中心
        </button>
        <button
          @click="goBack"
          class="cyber-btn flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <component :is="icons.ArrowLeft" class="w-4 h-4" />
          返回上一页
        </button>
      </div>

      <div class="mt-12 flex items-center justify-center gap-8 text-cyber-text-muted">
        <div class="flex items-center gap-2">
          <span class="status-dot status-dot-online"></span>
          <span class="text-xs">系统在线</span>
        </div>
        <div class="flex items-center gap-2">
          <component :is="icons.Signal" class="w-4 h-4 text-success-green" />
          <span class="text-xs">信号正常</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, ArrowLeft, Signal } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const icons = {
  Home,
  ArrowLeft,
  Signal
}

const currentPath = ref(route.fullPath)
const timestamp = ref(new Date().toLocaleString('zh-CN'))

function goHome() {
  router.push('/dashboard')
}

function goBack() {
  router.go(-1)
}

onMounted(() => {
  currentPath.value = route.fullPath
  timestamp.value = new Date().toLocaleString('zh-CN')
})
</script>
