import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  currentPage,
  isSidebarOpen,
  isLoading,
  notification,
  currentUser,
  skinScans,
  selectedScan,
  devices,
  latestScan,
  scanStats,
  loadUserData,
  showNotification,
  navigateTo,
  addSkinScan
} from '../stores/appStore'
import type { SkinScan, Device } from '../types'
import { get } from 'svelte/store'

vi.mock('../services/database', () => ({
  dbService: {
    getSkinScans: vi.fn().mockResolvedValue([]),
    getDevices: vi.fn().mockResolvedValue([]),
    saveSkinScan: vi.fn().mockResolvedValue(undefined)
  }
}))

function createMockScan(overrides: Partial<SkinScan> = {}): SkinScan {
  const distribution = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => Math.random())
  )
  return {
    id: `scan-${Date.now()}`,
    userId: 'user-001',
    deviceId: 'device-001',
    timestamp: new Date(),
    overallScore: 72,
    features: {
      moisture: 65,
      oiliness: 45,
      elasticity: 70,
      roughness: 30,
      poreSize: 35,
      wrinkles: 25,
      activeIngredients: {
        hyaluronic_acid: { concentration: 75, penetration: 60, distribution },
        niacinamide: { concentration: 65, penetration: 55, distribution },
        vitamin_c: { concentration: 70, penetration: 50, distribution },
        retinol: { concentration: 45, penetration: 35, distribution },
        peptides: { concentration: 55, penetration: 40, distribution }
      }
    },
    imageIds: [],
    ...overrides
  }
}

describe('状态管理层 - 路由/用户/肤质数据统一管理', () => {
  beforeEach(() => {
    currentPage.set('dashboard')
    isSidebarOpen.set(true)
    isLoading.set(false)
    skinScans.set([])
    selectedScan.set(null)
    devices.set([])
  })

  describe('路由管理 (PRD: 六大页面路由)', () => {
    it('初始路由应为 dashboard', () => {
      expect(get(currentPage)).toBe('dashboard')
    })

    it('navigateTo 应正确切换路由', () => {
      navigateTo('skin-3d')
      expect(get(currentPage)).toBe('skin-3d')
    })

    it('应支持所有 6 个页面路由', () => {
      const routes = ['dashboard', 'skin-3d', 'capture', 'analysis', 'care', 'devices'] as const
      routes.forEach(route => {
        navigateTo(route)
        expect(get(currentPage)).toBe(route)
      })
    })

    it('路由切换应独立于其他状态', () => {
      isSidebarOpen.set(false)
      navigateTo('capture')
      expect(get(currentPage)).toBe('capture')
      expect(get(isSidebarOpen)).toBe(false)
    })
  })

  describe('侧边栏状态', () => {
    it('初始状态应为展开', () => {
      expect(get(isSidebarOpen)).toBe(true)
    })

    it('应能切换侧边栏状态', () => {
      isSidebarOpen.set(false)
      expect(get(isSidebarOpen)).toBe(false)
      isSidebarOpen.set(true)
      expect(get(isSidebarOpen)).toBe(true)
    })
  })

  describe('用户状态 (PRD: 用户角色-普通用户)', () => {
    it('应包含默认用户信息', () => {
      const user = get(currentUser)
      expect(user.id).toBe('user-001')
      expect(user.name).toBe('测试用户')
      expect(user.email).toBe('test@example.com')
    })

    it('用户偏好应包含主题/通知/语言', () => {
      const user = get(currentUser)
      expect(user.preferences.theme).toBe('light')
      expect(user.preferences.notifications).toBe(true)
      expect(user.preferences.language).toBe('zh-CN')
    })
  })

  describe('肤质扫描数据管理 (PRD: 首页仪表盘-肤质卡片)', () => {
    it('初始扫描列表应为空', () => {
      expect(get(skinScans)).toEqual([])
    })

    it('应能设置扫描数据', () => {
      const scan = createMockScan()
      skinScans.set([scan])
      expect(get(skinScans)).toHaveLength(1)
    })

    it('应能选中特定扫描记录', () => {
      const scan = createMockScan()
      selectedScan.set(scan)
      expect(get(selectedScan)).toEqual(scan)
    })

    it('addSkinScan 应向列表追加新记录', async () => {
      const scan = createMockScan()
      await addSkinScan(scan)
      const scans = get(skinScans)
      expect(scans.some(s => s.id === scan.id)).toBe(true)
    })
  })

  describe('latestScan 派生状态 (PRD: 首页仪表盘-最新检测入口)', () => {
    it('无扫描数据时应返回 null', () => {
      expect(get(latestScan)).toBeNull()
    })

    it('应返回最新时间戳的扫描记录', () => {
      const oldScan = createMockScan({ id: 'old', timestamp: new Date('2026-01-01') })
      const newScan = createMockScan({ id: 'new', timestamp: new Date('2026-05-27') })
      skinScans.set([oldScan, newScan])
      expect(get(latestScan)!.id).toBe('new')
    })

    it('单条记录时应返回该记录', () => {
      const scan = createMockScan()
      skinScans.set([scan])
      expect(get(latestScan)).toEqual(scan)
    })
  })

  describe('scanStats 派生状态 (PRD: 首页仪表盘-肤质概览)', () => {
    it('无扫描数据时统计应为零', () => {
      const stats = get(scanStats)
      expect(stats.totalScans).toBe(0)
      expect(stats.avgScore).toBe(0)
      expect(stats.bestScore).toBe(0)
      expect(stats.trend).toBe(0)
    })

    it('应正确计算总检测次数', () => {
      skinScans.set([
        createMockScan({ id: 's1', overallScore: 70 }),
        createMockScan({ id: 's2', overallScore: 80 }),
        createMockScan({ id: 's3', overallScore: 75 })
      ])
      expect(get(scanStats).totalScans).toBe(3)
    })

    it('应正确计算平均分', () => {
      skinScans.set([
        createMockScan({ id: 's1', overallScore: 70 }),
        createMockScan({ id: 's2', overallScore: 80 })
      ])
      expect(get(scanStats).avgScore).toBe(75)
    })

    it('应正确计算最高分', () => {
      skinScans.set([
        createMockScan({ id: 's1', overallScore: 65 }),
        createMockScan({ id: 's2', overallScore: 85 }),
        createMockScan({ id: 's3', overallScore: 72 })
      ])
      expect(get(scanStats).bestScore).toBe(85)
    })

    it('应正确计算趋势变化（最新-最早）', () => {
      skinScans.set([
        createMockScan({ id: 's1', timestamp: new Date('2026-05-20'), overallScore: 60 }),
        createMockScan({ id: 's2', timestamp: new Date('2026-05-27'), overallScore: 75 })
      ])
      expect(get(scanStats).trend).toBe(15)
    })

    it('趋势下降应为负数', () => {
      skinScans.set([
        createMockScan({ id: 's1', timestamp: new Date('2026-05-20'), overallScore: 80 }),
        createMockScan({ id: 's2', timestamp: new Date('2026-05-27'), overallScore: 65 })
      ])
      expect(get(scanStats).trend).toBe(-15)
    })

    it('仅一条记录时趋势应为 0', () => {
      skinScans.set([createMockScan({ overallScore: 70 })])
      expect(get(scanStats).trend).toBe(0)
    })
  })

  describe('通知系统', () => {
    it('应能显示通知', () => {
      showNotification('测试通知', 'info')
      const notif = get(notification)
      expect(notif).not.toBeNull()
      expect(notif!.message).toBe('测试通知')
      expect(notif!.type).toBe('info')
    })

    it('应支持不同通知类型', () => {
      showNotification('成功', 'success')
      expect(get(notification)!.type).toBe('success')
      showNotification('错误', 'error')
      expect(get(notification)!.type).toBe('error')
    })
  })

  describe('loadUserData 数据加载 (PRD: 数据闭环-初始化)', () => {
    it('加载开始时 isLoading 应为 true', async () => {
      const { dbService } = await import('../services/database')
      vi.mocked(dbService.getSkinScans).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)))
      vi.mocked(dbService.getDevices).mockResolvedValue([])

      const loadPromise = loadUserData('user-001')
      expect(get(isLoading)).toBe(true)
      await loadPromise
      expect(get(isLoading)).toBe(false)
    })

    it('加载完成后应更新扫描和设备数据', async () => {
      const { dbService } = await import('../services/database')
      const mockScan = createMockScan()
      const mockDevice: Device = {
        id: 'device-001',
        name: 'DermaScan Pro',
        type: 'scanner',
        status: 'connected',
        lastSync: new Date(),
        battery: 85
      }
      vi.mocked(dbService.getSkinScans).mockResolvedValue([mockScan])
      vi.mocked(dbService.getDevices).mockResolvedValue([mockDevice])

      await loadUserData('user-001')
      expect(get(skinScans)).toHaveLength(1)
      expect(get(devices)).toHaveLength(1)
    })
  })
})
