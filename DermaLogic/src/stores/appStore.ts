import { writable, derived, type Writable } from 'svelte/store'
import type { PageRoute, SkinScan, Device, TrendReport } from '../types'
import { dbService } from '../services/database'

export const currentPage: Writable<PageRoute> = writable('dashboard')
export const isSidebarOpen = writable(true)
export const isLoading = writable(false)
export const notification = writable<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

export const currentUser = writable({
  id: 'user-001',
  name: '测试用户',
  email: 'test@example.com',
  preferences: {
    theme: 'light' as const,
    notifications: true,
    language: 'zh-CN'
  },
  createdAt: new Date()
})

export const skinScans: Writable<SkinScan[]> = writable([])
export const selectedScan: Writable<SkinScan | null> = writable(null)
export const devices: Writable<Device[]> = writable([])
export const trendReport: Writable<TrendReport | null> = writable(null)

export const latestScan = derived(skinScans, $scans => {
  if ($scans.length === 0) return null
  return $scans.reduce((latest, scan) => 
    new Date(scan.timestamp) > new Date(latest.timestamp) ? scan : latest
  )
})

export const scanStats = derived(skinScans, $scans => {
  if ($scans.length === 0) {
    return {
      totalScans: 0,
      avgScore: 0,
      bestScore: 0,
      trend: 0
    }
  }

  const scores = $scans.map(s => s.overallScore)
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const bestScore = Math.max(...scores)
  
  const sortedScans = [...$scans].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  const trend = sortedScans.length >= 2 
    ? sortedScans[sortedScans.length - 1].overallScore - sortedScans[0].overallScore
    : 0

  return {
    totalScans: $scans.length,
    avgScore,
    bestScore,
    trend
  }
})

export async function loadUserData(userId: string): Promise<void> {
  isLoading.set(true)
  try {
    const scans = await dbService.getSkinScans(userId)
    const deviceList = await dbService.getDevices()
    skinScans.set(scans)
    devices.set(deviceList)
  } catch (error) {
    console.error('Failed to load user data:', error)
    showNotification('加载数据失败', 'error')
  } finally {
    isLoading.set(false)
  }
}

export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  notification.set({ message, type })
  setTimeout(() => notification.set(null), 3000)
}

export function navigateTo(page: PageRoute): void {
  currentPage.set(page)
}

export async function addSkinScan(scan: SkinScan): Promise<void> {
  try {
    await dbService.saveSkinScan(scan)
    skinScans.update(scans => [...scans, scan])
    showNotification('肤质检测已保存', 'success')
  } catch (error) {
    console.error('Failed to save scan:', error)
    showNotification('保存失败', 'error')
  }
}
