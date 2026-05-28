import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/database', () => ({
  dbService: {
    saveSkinScan: vi.fn().mockResolvedValue(undefined),
    saveDevice: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('模拟数据工具 - 测试数据生成支撑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateRandomFeatures - 随机特征生成', () => {
    it('应通过 addMockScan 生成有效 SkinFeatures 结构', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)

      expect(dbService.saveSkinScan).toHaveBeenCalledOnce()
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]
      const features = savedScan.features

      expect(typeof features.moisture).toBe('number')
      expect(typeof features.oiliness).toBe('number')
      expect(typeof features.elasticity).toBe('number')
      expect(typeof features.roughness).toBe('number')
      expect(typeof features.poreSize).toBe('number')
      expect(typeof features.wrinkles).toBe('number')
    })

    it('特征值应在 0-100 合理范围内', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      for (let i = 0; i < 10; i++) {
        vi.clearAllMocks()
        await addMockScan(i)
        const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]
        const f = savedScan.features

        expect(f.moisture).toBeGreaterThanOrEqual(0)
        expect(f.moisture).toBeLessThanOrEqual(100)
        expect(f.oiliness).toBeGreaterThanOrEqual(0)
        expect(f.oiliness).toBeLessThanOrEqual(100)
        expect(f.elasticity).toBeGreaterThanOrEqual(0)
        expect(f.elasticity).toBeLessThanOrEqual(100)
        expect(f.roughness).toBeGreaterThanOrEqual(0)
        expect(f.roughness).toBeLessThanOrEqual(100)
        expect(f.poreSize).toBeGreaterThanOrEqual(0)
        expect(f.poreSize).toBeLessThanOrEqual(100)
        expect(f.wrinkles).toBeGreaterThanOrEqual(0)
        expect(f.wrinkles).toBeLessThanOrEqual(100)
      }
    })

    it('activeIngredients 应包含 5 种成分', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]
      const keys = Object.keys(savedScan.features.activeIngredients)

      expect(keys).toContain('hyaluronic_acid')
      expect(keys).toContain('niacinamide')
      expect(keys).toContain('vitamin_c')
      expect(keys).toContain('retinol')
      expect(keys).toContain('peptides')
    })

    it('每种活性成分应包含浓度、渗透率和分布数据', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]

      Object.values(savedScan.features.activeIngredients).forEach(ingredient => {
        expect(typeof ingredient.concentration).toBe('number')
        expect(typeof ingredient.penetration).toBe('number')
        expect(Array.isArray(ingredient.distribution)).toBe(true)
        expect(ingredient.distribution.length).toBe(10)
        ingredient.distribution.forEach(row => {
          expect(row.length).toBe(10)
          row.forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThanOrEqual(1)
          })
        })
      })
    })
  })

  describe('addMockScan - 模拟扫描记录生成 (PRD: 数据闭环-初始化)', () => {
    it('应生成正确的用户和设备关联', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]

      expect(savedScan.userId).toBe('user-001')
      expect(savedScan.deviceId).toBe('device-001')
    })

    it('daysAgo 参数应正确设置时间戳', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')
      const now = Date.now()

      await addMockScan(3)
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]
      const diffDays = (now - new Date(savedScan.timestamp).getTime()) / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeGreaterThanOrEqual(2.9)
      expect(diffDays).toBeLessThanOrEqual(3.1)
    })

    it('应计算有效的综合评分', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)
      const savedScan = vi.mocked(dbService.saveSkinScan).mock.calls[0][0]

      expect(savedScan.overallScore).toBeGreaterThanOrEqual(0)
      expect(savedScan.overallScore).toBeLessThanOrEqual(100)
    })

    it('不同 daysAgo 应生成不同 ID', async () => {
      const { addMockScan } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await addMockScan(0)
      await addMockScan(1)
      expect(dbService.saveSkinScan).toHaveBeenCalledTimes(2)

      const id1 = vi.mocked(dbService.saveSkinScan).mock.calls[0][0].id
      const id2 = vi.mocked(dbService.saveSkinScan).mock.calls[1][0].id
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateMockDevices - 模拟设备生成 (PRD: 设备管理页-设备列表)', () => {
    it('应生成 2 个模拟设备', async () => {
      const { generateMockDevices } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await generateMockDevices()
      expect(dbService.saveDevice).toHaveBeenCalledTimes(2)
    })

    it('设备应包含正确字段', async () => {
      const { generateMockDevices } = await import('../utils/mockData')
      const { dbService } = await import('../services/database')

      await generateMockDevices()
      const device1 = vi.mocked(dbService.saveDevice).mock.calls[0][0]
      const device2 = vi.mocked(dbService.saveDevice).mock.calls[1][0]

      expect(device1.id).toBe('device-001')
      expect(device1.name).toBe('DermaScan Pro')
      expect(device1.type).toBe('scanner')
      expect(device1.battery).toBeGreaterThanOrEqual(0)
      expect(device1.battery).toBeLessThanOrEqual(100)

      expect(device2.id).toBe('device-002')
      expect(device2.name).toBe('SkinAnalyzer Mini')
      expect(device2.type).toBe('analyzer')
    })
  })
})
