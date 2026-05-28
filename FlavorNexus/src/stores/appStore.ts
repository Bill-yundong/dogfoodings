import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const currentRoute = ref('home')
  const sidebarOpen = ref(true)
  const theme = ref<'dark' | 'light'>('dark')
  const notifications = ref<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([])

  const setCurrentRoute = (route: string) => {
    currentRoute.value = route
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString()
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      removeNotification(id)
    }, 3000)
  }

  const removeNotification = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  const hasNotifications = computed(() => notifications.value.length > 0)

  return {
    currentRoute,
    sidebarOpen,
    theme,
    notifications,
    hasNotifications,
    setCurrentRoute,
    toggleSidebar,
    addNotification,
    removeNotification
  }
})
