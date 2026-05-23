import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const currentTheme = ref<'dark' | 'light'>('dark')
  const showNotifications = ref(true)
  const notifications = ref<Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: number
    read: boolean
  }>>([])
  const loadingOverlay = ref(false)
  const loading = ref(false)
  const loadingText = ref('')
  const loadingProgress = ref(0)
  const activePanel = ref<'left' | 'right' | 'both' | 'none'>('both')

  const unreadNotifications = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => b.timestamp - a.timestamp)
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
  }

  function toggleTheme() {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(theme: 'dark' | 'light') {
    currentTheme.value = theme
  }

  function addNotification(notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
  }) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    notifications.value.unshift({
      ...notification,
      id,
      timestamp: Date.now(),
      read: false
    })
    
    if (notifications.value.length > 100) {
      notifications.value = notifications.value.slice(0, 100)
    }
    
    if (showNotifications.value) {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }
    
    return id
  }

  function removeNotification(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function markAsRead(id: string) {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  function markAllAsRead() {
    notifications.value.forEach(n => n.read = true)
  }

  function clearNotifications() {
    notifications.value = []
  }

  function showLoading(message?: string, progress?: number) {
    loadingOverlay.value = true
    loading.value = true
    loadingText.value = message || '加载中...'
    loadingProgress.value = progress || 0
    if (message) {
      addNotification({
        type: 'info',
        title: '加载中',
        message
      })
    }
  }

  function hideLoading() {
    loadingOverlay.value = false
    loading.value = false
    loadingText.value = ''
    loadingProgress.value = 0
  }

  function setActivePanel(panel: 'left' | 'right' | 'both' | 'none') {
    activePanel.value = panel
  }

  function toggleLeftPanel() {
    if (activePanel.value === 'left') {
      activePanel.value = 'none'
    } else if (activePanel.value === 'both') {
      activePanel.value = 'right'
    } else if (activePanel.value === 'right') {
      activePanel.value = 'both'
    } else {
      activePanel.value = 'left'
    }
  }

  function toggleRightPanel() {
    if (activePanel.value === 'right') {
      activePanel.value = 'none'
    } else if (activePanel.value === 'both') {
      activePanel.value = 'left'
    } else if (activePanel.value === 'left') {
      activePanel.value = 'both'
    } else {
      activePanel.value = 'right'
    }
  }

  return {
    sidebarCollapsed,
    currentTheme,
    showNotifications,
    notifications,
    loadingOverlay,
    loading,
    loadingText,
    loadingProgress,
    activePanel,
    unreadNotifications,
    sortedNotifications,
    toggleSidebar,
    setSidebarCollapsed,
    toggleTheme,
    setTheme,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    showLoading,
    hideLoading,
    setActivePanel,
    toggleLeftPanel,
    toggleRightPanel
  }
})
