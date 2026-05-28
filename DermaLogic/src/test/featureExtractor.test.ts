import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FeatureExtractorService } from '../services/featureExtractor'
import type { SkinFeatures, SkinScan, TrendReport } from '../types'

class MockWorker {
  onmessage: ((e: any) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor(private _responseData?: any, private _responseType?: string) {
    if (_responseData && _responseType) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({ data: { type: _responseType, data: _responseData } })
        }
      }, 0)
    }
  }
}

function createMockImageData(w = 1, h = 1): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('FeatureExtractorService', () => {
  let service: FeatureExtractorService

  beforeEach(() => {
    service = new FeatureExtractorService()
  })

  afterEach(() => {
    service.terminate()
    vi.restoreAllMocks()
  })

  // ── 1. calculateOverallScore 纯函数测试 ──────────────────────────
  describe('calculateOverallScore - 加权评分计算', () => {
    it('应按正确权重计算综合评分', () => {
      const features: SkinFeatures = {
        moisture: 80,
        oiliness: 50,
        elasticity: 70,
        roughness: 30,
        poreSize: 25,
        wrinkles: 15,
        activeIngredients: {}
      }

      const score = service.calculateOverallScore(features)

      const normalizedOiliness = 100 - Math.abs(50 - 50) * 2
      const expected =
        80 * 0.25 +
        normalizedOiliness * 0.15 +
        70 * 0.20 +
        (100 - 30) * 0.15 +
        (100 - 25) * 0.15 +
        (100 - 15) * 0.10

      expect(score).toBe(Math.round(Math.max(0, Math.min(100, expected))))
    })

    it('oiliness 为 50 时归一化值应为 100（最优）', () => {
      const features: SkinFeatures = {
        moisture: 100,
        oiliness: 50,
        elasticity: 100,
        roughness: 0,
        poreSize: 0,
        wrinkles: 0,
        activeIngredients: {}
      }

      const score = service.calculateOverallScore(features)

      const normalizedOiliness = 100 - Math.abs(50 - 50) * 2
      expect(normalizedOiliness).toBe(100)

      const expected =
        100 * 0.25 +
        100 * 0.15 +
        100 * 0.20 +
        100 * 0.15 +
        100 * 0.15 +
        100 * 0.10
      expect(score).toBe(Math.round(Math.min(100, expected)))
    })

    it('oiliness 偏离 50 时归一化值应降低', () => {
      const features: SkinFeatures = {
        moisture: 100,
        oiliness: 80,
        elasticity: 100,
        roughness: 0,
        poreSize: 0,
        wrinkles: 0,
        activeIngredients: {}
      }

      const score = service.calculateOverallScore(features)

      const normalizedOiliness = 100 - Math.abs(80 - 50) * 2
      expect(normalizedOiliness).toBe(40)
      expect(score).toBeLessThan(100)
    })

    it('oiliness 为 0 或 100 时归一化值应为 0', () => {
      const featuresA: SkinFeatures = {
        moisture: 50, oiliness: 0, elasticity: 50,
        roughness: 50, poreSize: 50, wrinkles: 50,
        activeIngredients: {}
      }
      const featuresB: SkinFeatures = {
        moisture: 50, oiliness: 100, elasticity: 50,
        roughness: 50, poreSize: 50, wrinkles: 50,
        activeIngredients: {}
      }

      expect(100 - Math.abs(0 - 50) * 2).toBe(0)
      expect(100 - Math.abs(100 - 50) * 2).toBe(0)

      expect(service.calculateOverallScore(featuresA)).toBe(
        service.calculateOverallScore(featuresB)
      )
    })

    it('所有指标最优时分数应为 100', () => {
      const features: SkinFeatures = {
        moisture: 100,
        oiliness: 50,
        elasticity: 100,
        roughness: 0,
        poreSize: 0,
        wrinkles: 0,
        activeIngredients: {}
      }

      expect(service.calculateOverallScore(features)).toBe(100)
    })

    it('所有指标最差时分数应为 0', () => {
      const features: SkinFeatures = {
        moisture: 0,
        oiliness: 0,
        elasticity: 0,
        roughness: 100,
        poreSize: 100,
        wrinkles: 100,
        activeIngredients: {}
      }

      expect(service.calculateOverallScore(features)).toBe(0)
    })

    it('分数应 clamp 在 0-100 范围内', () => {
      const features: SkinFeatures = {
        moisture: 0,
        oiliness: 100,
        elasticity: 0,
        roughness: 100,
        poreSize: 100,
        wrinkles: 100,
        activeIngredients: {}
      }

      const score = service.calculateOverallScore(features)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('权重验证：moisture 0.25, oiliness 0.15, elasticity 0.20, roughness 0.15, poreSize 0.15, wrinkles 0.10', () => {
      const features: SkinFeatures = {
        moisture: 100,
        oiliness: 50,
        elasticity: 0,
        roughness: 100,
        poreSize: 100,
        wrinkles: 100,
        activeIngredients: {}
      }

      const score = service.calculateOverallScore(features)

      const normalizedOiliness = 100
      const expected =
        100 * 0.25 +
        normalizedOiliness * 0.15 +
        0 * 0.20 +
        0 * 0.15 +
        0 * 0.15 +
        0 * 0.10

      expect(score).toBe(Math.round(expected))
      expect(score).toBe(40)
    })
  })

  // ── 2. initWorker 测试 ──────────────────────────────────────────
  describe('initWorker - 创建 Worker 实例', () => {
    it('应通过 Blob URL 创建 Worker', () => {
      vi.stubGlobal('Worker', MockWorker)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')

      const blobSpy = vi.spyOn(globalThis, 'Blob')

      service.initWorker()

      expect(blobSpy).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: 'application/javascript' }
      )
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })
  })

  // ── 3. extractFeatures 测试 ─────────────────────────────────────
  describe('extractFeatures - 通过 Worker 异步提取特征', () => {
    it('应返回 SkinFeatures 结构，所有数值在 0-100 范围', async () => {
      const featuresData: SkinFeatures = {
        moisture: 65,
        oiliness: 45,
        elasticity: 78,
        roughness: 32,
        poreSize: 28,
        wrinkles: 18,
        activeIngredients: {
          hyaluronic_acid: { concentration: 60, penetration: 70, distribution: [[0.5]] },
          niacinamide: { concentration: 50, penetration: 60, distribution: [[0.5]] },
          vitamin_c: { concentration: 55, penetration: 65, distribution: [[0.5]] },
          retinol: { concentration: 40, penetration: 50, distribution: [[0.5]] },
          peptides: { concentration: 45, penetration: 55, distribution: [[0.5]] }
        }
      }

      vi.stubGlobal('Worker', class extends MockWorker {
        constructor() { super(featuresData, 'features') }
      })

      const result = await service.extractFeatures(createMockImageData())

      expect(result).toHaveProperty('moisture')
      expect(result).toHaveProperty('oiliness')
      expect(result).toHaveProperty('elasticity')
      expect(result).toHaveProperty('roughness')
      expect(result).toHaveProperty('poreSize')
      expect(result).toHaveProperty('wrinkles')
      expect(result).toHaveProperty('activeIngredients')

      const numericKeys = ['moisture', 'oiliness', 'elasticity', 'roughness', 'poreSize', 'wrinkles'] as const
      for (const key of numericKeys) {
        expect(result[key]).toBeGreaterThanOrEqual(0)
        expect(result[key]).toBeLessThanOrEqual(100)
      }
    })

    it('activeIngredients 应包含 5 种成分', async () => {
      const featuresData: SkinFeatures = {
        moisture: 65, oiliness: 45, elasticity: 78,
        roughness: 32, poreSize: 28, wrinkles: 18,
        activeIngredients: {
          hyaluronic_acid: { concentration: 60, penetration: 70, distribution: [[0.5]] },
          niacinamide: { concentration: 50, penetration: 60, distribution: [[0.5]] },
          vitamin_c: { concentration: 55, penetration: 65, distribution: [[0.5]] },
          retinol: { concentration: 40, penetration: 50, distribution: [[0.5]] },
          peptides: { concentration: 45, penetration: 55, distribution: [[0.5]] }
        }
      }

      vi.stubGlobal('Worker', class extends MockWorker {
        constructor() { super(featuresData, 'features') }
      })

      const result = await service.extractFeatures(createMockImageData())

      expect(Object.keys(result.activeIngredients)).toHaveLength(5)
      expect(result.activeIngredients).toHaveProperty('hyaluronic_acid')
      expect(result.activeIngredients).toHaveProperty('niacinamide')
      expect(result.activeIngredients).toHaveProperty('vitamin_c')
      expect(result.activeIngredients).toHaveProperty('retinol')
      expect(result.activeIngredients).toHaveProperty('peptides')
    })
  })

  // ── 4. analyzeTrends 测试 ───────────────────────────────────────
  describe('analyzeTrends - 趋势分析', () => {
    it('应返回 TrendReport 结构（overallChange, featureTrends, insights）', async () => {
      const trendReport: TrendReport = {
        period: '2天',
        overallChange: 10,
        featureTrends: {
          moisture: { values: [60, 70], change: 16.67 },
          oiliness: { values: [40, 35], change: -12.5 },
          elasticity: { values: [75, 80], change: 6.67 },
          roughness: { values: [30, 25], change: -16.67 },
          poreSize: { values: [25, 20], change: -20 },
          wrinkles: { values: [15, 12], change: -20 }
        },
        insights: ['肌肤含水量显著提升，继续保持当前补水方案', '肌肤弹性有所改善，抗衰护理见效']
      }

      vi.stubGlobal('Worker', class extends MockWorker {
        constructor() { super(trendReport, 'trend') }
      })

      const scans: SkinScan[] = [
        {
          id: 'scan-1', userId: 'user-1', deviceId: 'device-1',
          timestamp: new Date('2024-01-01'), overallScore: 70,
          features: { moisture: 60, oiliness: 40, elasticity: 75, roughness: 30, poreSize: 25, wrinkles: 15, activeIngredients: {} },
          imageIds: []
        },
        {
          id: 'scan-2', userId: 'user-1', deviceId: 'device-1',
          timestamp: new Date('2024-01-02'), overallScore: 80,
          features: { moisture: 70, oiliness: 35, elasticity: 80, roughness: 25, poreSize: 20, wrinkles: 12, activeIngredients: {} },
          imageIds: []
        }
      ]

      const result = await service.analyzeTrends(scans)

      expect(result).toHaveProperty('overallChange')
      expect(result).toHaveProperty('featureTrends')
      expect(result).toHaveProperty('insights')
      expect(result).toHaveProperty('period')
      expect(typeof result.overallChange).toBe('number')
      expect(Array.isArray(result.insights)).toBe(true)
      expect(result.insights.length).toBeGreaterThan(0)
    })

    it('featureTrends 应包含全部 6 项肤质指标的趋势数据', async () => {
      const trendReport: TrendReport = {
        period: '2天',
        overallChange: 10,
        featureTrends: {
          moisture: { values: [60, 70], change: 16.67 },
          oiliness: { values: [40, 35], change: -12.5 },
          elasticity: { values: [75, 80], change: 6.67 },
          roughness: { values: [30, 25], change: -16.67 },
          poreSize: { values: [25, 20], change: -20 },
          wrinkles: { values: [15, 12], change: -20 }
        },
        insights: ['肌肤含水量显著提升，继续保持当前补水方案']
      }

      vi.stubGlobal('Worker', class extends MockWorker {
        constructor() { super(trendReport, 'trend') }
      })

      const result = await service.analyzeTrends([])

      const expectedFeatures = ['moisture', 'oiliness', 'elasticity', 'roughness', 'poreSize', 'wrinkles']
      for (const feature of expectedFeatures) {
        expect(result.featureTrends).toHaveProperty(feature)
        expect(result.featureTrends[feature]).toHaveProperty('values')
        expect(result.featureTrends[feature]).toHaveProperty('change')
      }
    })
  })

  // ── 5. terminate 测试 ───────────────────────────────────────────
  describe('terminate - 终止 Worker', () => {
    it('应调用 worker.terminate() 并将 worker 置为 null', () => {
      const terminateSpy = vi.fn()
      vi.stubGlobal('Worker', class {
        onmessage: ((e: any) => void) | null = null
        postMessage = vi.fn()
        terminate = terminateSpy
      })

      service.initWorker()
      service.terminate()

      expect(terminateSpy).toHaveBeenCalled()
    })

    it('未初始化 Worker 时 terminate 不应报错', () => {
      expect(() => service.terminate()).not.toThrow()
    })
  })
})
