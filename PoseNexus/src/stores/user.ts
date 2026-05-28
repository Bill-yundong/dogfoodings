import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoggedIn = ref(false)

  const userId = computed(() => currentUser.value?.id || 'guest')

  function login(email: string, password: string): boolean {
    currentUser.value = {
      id: 'user_' + Date.now(),
      name: email.split('@')[0],
      email
    }
    isLoggedIn.value = true
    localStorage.setItem('user', JSON.stringify(currentUser.value))
    return true
  }

  function logout() {
    currentUser.value = null
    isLoggedIn.value = false
    localStorage.removeItem('user')
  }

  function restoreSession() {
    const saved = localStorage.getItem('user')
    if (saved) {
      currentUser.value = JSON.parse(saved)
      isLoggedIn.value = true
    }
  }

  return {
    currentUser,
    isLoggedIn,
    userId,
    login,
    logout,
    restoreSession
  }
})
