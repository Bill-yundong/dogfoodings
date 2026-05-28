import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态应该是未登录', () => {
    const userStore = useUserStore()
    expect(userStore.isLoggedIn).toBe(false)
    expect(userStore.currentUser).toBeNull()
  })

  it('登录应该更新用户状态', () => {
    const userStore = useUserStore()
    
    userStore.login('test@example.com', 'password123')
    
    expect(userStore.isLoggedIn).toBe(true)
    expect(userStore.currentUser).not.toBeNull()
    expect(userStore.currentUser?.email).toBe('test@example.com')
    expect(userStore.currentUser?.name).toBe('test')
  })

  it('登出应该清除用户状态', () => {
    const userStore = useUserStore()
    
    userStore.login('test@example.com', 'password123')
    
    expect(userStore.isLoggedIn).toBe(true)
    
    userStore.logout()
    
    expect(userStore.isLoggedIn).toBe(false)
    expect(userStore.currentUser).toBeNull()
  })
})
