<template>
  <header class="h-14 bg-cyber-bg-light/80 backdrop-blur-md border-b border-cyber-border flex items-center justify-between px-4">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-semibold text-cyber-text">{{ currentPageTitle }}</h1>
      <span v-if="currentPageSubtitle" class="text-sm text-cyber-text-secondary">{{ currentPageSubtitle }}</span>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-bg-lighter">
        <span :class="linkStatus.droneConnected ? 'status-dot-online' : 'status-dot-offline'" class="status-dot"></span>
        <span class="text-xs text-cyber-text-secondary">无人机</span>
      </div>
      
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-bg-lighter">
        <span :class="linkStatus.databaseConnected ? 'status-dot-online' : 'status-dot-offline'" class="status-dot"></span>
        <span class="text-xs text-cyber-text-secondary">数据库</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-bg-lighter">
        <component :is="icons.Wifi" class="w-4 h-4 text-cyber-text-secondary" />
        <span class="text-xs text-cyber-text-secondary font-mono">{{ linkStatus.networkLatency }}ms</span>
      </div>

      <button
        @click="showNotifications = !showNotifications"
        class="relative p-2 rounded-lg text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
      >
        <component :is="icons.Bell" class="w-5 h-5" />
        <span
          v-if="unreadCount > 0"
          class="absolute top-0 right-0 w-4 h-4 bg-error-red text-white text-xs rounded-full flex items-center justify-center"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <button
        @click="toggleTheme"
        class="p-2 rounded-lg text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
      >
        <component :is="theme === 'dark' ? icons.Sun : icons.Moon" class="w-5 h-5" />
      </button>

      <div class="w-px h-6 bg-cyber-border"></div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-electric-blue to-electric-purple flex items-center justify-center">
          <span class="text-sm font-bold text-cyber-bg">G</span>
        </div>
        <div class="hidden md:block">
          <p class="text-sm font-medium text-cyber-text">地面站操作员</p>
          <p class="text-xs text-cyber-text-secondary">admin@uavscan.grid</p>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showNotifications"
        class="absolute top-14 right-4 w-80 max-h-96 bg-cyber-bg-light border border-cyber-border rounded-lg shadow-xl overflow-hidden z-50"
      >
        <div class="flex items-center justify-between p-3 border-b border-cyber-border">
          <h3 class="font-medium text-cyber-text">通知中心</h3>
          <button
            @click="markAllRead"
            class="text-xs text-electric-blue hover:text-electric-blue-light"
          >
            全部已读
          </button>
        </div>
        <div class="overflow-y-auto max-h-80">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            @click="markAsRead(notification.id)"
            class="p-3 border-b border-cyber-border hover:bg-cyber-bg-lighter cursor-pointer transition-colors"
            :class="{ 'bg-electric-blue/5': !notification.read }"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                :class="{
                  'bg-electric-blue/20': notification.type === 'info',
                  'bg-success-green/20': notification.type === 'success',
                  'bg-warning-orange/20': notification.type === 'warning',
                  'bg-error-red/20': notification.type === 'error'
                }"
              >
                <component
                  :is="getNotificationIcon(notification.type)"
                  class="w-4 h-4"
                  :class="{
                    'text-electric-blue': notification.type === 'info',
                    'text-success-green': notification.type === 'success',
                    'text-warning-orange': notification.type === 'warning',
                    'text-error-red': notification.type === 'error'
                  }"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-cyber-text">{{ notification.title }}</p>
                <p class="text-xs text-cyber-text-secondary truncate">{{ notification.message }}</p>
                <p class="text-xs text-cyber-text-muted mt-1">{{ formatTime(notification.timestamp) }}</p>
              </div>
              <span v-if="!notification.read" class="w-2 h-2 rounded-full bg-electric-blue flex-shrink-0"></span>
            </div>
          </div>
          <div v-if="notifications.length === 0" class="p-8 text-center text-cyber-text-secondary">
            <component :is="icons.CheckCircle" class="w-8 h-8 mx-auto mb-2 text-success-green" />
            <p class="text-sm">暂无新通知</p>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bell,
  Sun,
  Moon,
  Wifi,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-vue-next'
import { useUiStore, useSyncStore } from '@/stores'

const route = useRoute()
const uiStore = useUiStore()
const syncStore = useSyncStore()

const showNotifications = ref(false)
const theme = ref<'dark' | 'light'>('dark')

const icons = {
  Bell,
  Sun,
  Moon,
  Wifi,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle
}

const linkStatus = computed(() => syncStore.linkStatus)

const currentPageTitle = computed(() => {
  return route.meta.title as string || '电力巡检点云中枢'
})

const currentPageSubtitle = computed(() => {
  const subtitles: Record<string, string> = {
    '/dashboard': '实时监控系统运行状态',
    '/processing': '点云数据处理任务管理',
    '/visualizer': '3D点云交互式可视化',
    '/sync': '地面站与省电网数据同步',
    '/snapshots': '拓扑快照持久化缓存管理',
    '/settings': '系统参数配置与优化'
  }
  return subtitles[route.path] || ''
})

const notifications = computed(() => uiStore.sortedNotifications)
const unreadCount = computed(() => uiStore.unreadNotifications)

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  uiStore.setTheme(theme.value)
}

function getNotificationIcon(type: string) {
  const iconMap: Record<string, any> = {
    info: icons.Info,
    success: icons.CheckCircle,
    warning: icons.AlertTriangle,
    error: icons.XCircle
  }
  return iconMap[type] || icons.Info
}

function markAsRead(id: string) {
  uiStore.markAsRead(id)
}

function markAllRead() {
  uiStore.markAllAsRead()
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.notification-panel') && !target.closest('[data-notification-btn]')) {
    showNotifications.value = false
  }
}

let linkMonitorInterval: number | null = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  syncStore.startLinkMonitoring()
  
  linkMonitorInterval = window.setInterval(() => {
    syncStore.refreshLinkStatus()
  }, 5000)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  syncStore.stopLinkMonitoring()
  if (linkMonitorInterval) {
    clearInterval(linkMonitorInterval)
  }
})

watch(showNotifications, (val) => {
  if (val) {
    uiStore.addNotification({
      type: 'info',
      title: '系统提示',
      message: '点击通知可标记为已读'
    })
  }
})
</script>
