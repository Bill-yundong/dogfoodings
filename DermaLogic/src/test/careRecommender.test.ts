import { describe, it, expect } from 'vitest'
import { CareRecommenderService } from '../services/careRecommender'
import type { SkinFeatures, CarePlan } from '../types'

function createFeatures(overrides: Partial<SkinFeatures> = {}): SkinFeatures {
  const distribution = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => Math.random())
  )
  return {
    moisture: 60,
    oiliness: 50,
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
    },
    ...overrides
  }
}

describe('护理推荐引擎 - 个性化精准护理数据闭环', () => {
  let recommender: CareRecommenderService

  beforeEach(() => {
    recommender = new CareRecommenderService()
  })

  describe('护理方案生成 (PRD: 护理方案页-方案推荐)', () => {
    it('应基于肤质特征生成个性化护理方案', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80, elasticity: 40, roughness: 60, poreSize: 60, wrinkles: 50 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      expect(plan).toBeDefined()
      expect(plan.userId).toBe('user-001')
      expect(plan.recommendations.length).toBeGreaterThan(0)
    })

    it('方案应包含有效日期范围（30天）', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const diffDays = (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(30)
    })

    it('方案 ID 应包含 plan 前缀和时间戳', () => {
      const features = createFeatures({ moisture: 30 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      expect(plan.id).toMatch(/^plan-\d+$/)
    })

    it('推荐数量不应超过 6 条', () => {
      const features = createFeatures({ moisture: 10, oiliness: 90, elasticity: 20, roughness: 80, poreSize: 80, wrinkles: 70 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      expect(plan.recommendations.length).toBeLessThanOrEqual(6)
    })

    it('每条推荐应包含完整字段', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      plan.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id')
        expect(rec).toHaveProperty('type')
        expect(rec).toHaveProperty('product')
        expect(rec).toHaveProperty('ingredients')
        expect(rec).toHaveProperty('frequency')
        expect(rec).toHaveProperty('matchScore')
      })
    })

    it('推荐类型应属于合法类型', () => {
      const validTypes = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen']
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      plan.recommendations.forEach(rec => {
        expect(validTypes).toContain(rec.type)
      })
    })

    it('匹配度应在 70-95 之间', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      plan.recommendations.forEach(rec => {
        expect(rec.matchScore).toBeGreaterThanOrEqual(70)
        expect(rec.matchScore).toBeLessThanOrEqual(95)
      })
    })
  })

  describe('肤况需求分析 (PRD: 护理方案页-成分匹配)', () => {
    it('含水量低应优先推荐保湿产品', () => {
      const features = createFeatures({ moisture: 20 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const hasMoistureRec = plan.recommendations.some(rec =>
        rec.ingredients.some(ing => ing.includes('透明质酸') || ing.includes('神经酰胺'))
      )
      expect(hasMoistureRec).toBe(true)
    })

    it('油脂高应推荐控油产品', () => {
      const features = createFeatures({ oiliness: 85 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const hasOilRec = plan.recommendations.some(rec =>
        rec.ingredients.some(ing => ing.includes('烟酰胺') || ing.includes('水杨酸'))
      )
      expect(hasOilRec).toBe(true)
    })

    it('弹性低应推荐抗衰产品', () => {
      const features = createFeatures({ elasticity: 30 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const hasElasticityRec = plan.recommendations.some(rec =>
        rec.ingredients.some(ing => ing.includes('视黄醇') || ing.includes('肽类'))
      )
      expect(hasElasticityRec).toBe(true)
    })

    it('细纹多应推荐抗皱产品', () => {
      const features = createFeatures({ wrinkles: 65 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const hasWrinkleRec = plan.recommendations.some(rec =>
        rec.ingredients.some(ing => ing.includes('视黄醇') || ing.includes('维生素C'))
      )
      expect(hasWrinkleRec).toBe(true)
    })

    it('多种问题并存时应生成综合方案', () => {
      const features = createFeatures({ moisture: 20, oiliness: 85, wrinkles: 65 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      expect(plan.recommendations.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('成分数据库查询', () => {
    it('应能查询透明质酸信息', () => {
      const info = recommender.getIngredientInfo('hyaluronic_acid')
      expect(info).not.toBeNull()
      expect(info!.name).toBe('透明质酸')
      expect(info!.benefits).toContain('保湿')
    })

    it('应能查询烟酰胺信息', () => {
      const info = recommender.getIngredientInfo('niacinamide')
      expect(info).not.toBeNull()
      expect(info!.name).toBe('烟酰胺')
      expect(info!.benefits).toContain('控油')
    })

    it('查询不存在成分应返回 null', () => {
      const info = recommender.getIngredientInfo('nonexistent')
      expect(info).toBeNull()
    })
  })

  describe('详细方案报告生成 (Bug Fix: 生成详细方案报告功能)', () => {
    it('应生成完整结构的报告文本', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('DermaLogic 个性化护理方案报告')
      expect(report).toContain('一、肤质检测分析')
      expect(report).toContain('二、活性成分分布')
      expect(report).toContain('三、推荐护理流程')
      expect(report).toContain('四、护理建议')
    })

    it('报告应包含生成日期', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('生成日期:')
    })

    it('报告应包含方案有效期', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('方案有效期:')
    })

    it('报告肤质指标应标注状态（优秀/良好/需改善）', () => {
      const features = createFeatures({ moisture: 80, roughness: 40, wrinkles: 20 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('优秀')
    })

    it('报告应包含活性成分浓度数据', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('透明质酸')
      expect(report).toContain('烟酰胺')
      expect(report).toContain('维生素C')
      expect(report).toContain('视黄醇')
    })

    it('报告推荐流程应包含产品名称和匹配度', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      plan.recommendations.forEach(rec => {
        expect(report).toContain(rec.product)
        expect(report).toContain(`${rec.matchScore}%`)
      })
    })

    it('报告应包含护理建议条目', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const report = recommender.generateDetailedReport(plan, features)
      expect(report).toContain('1. 请按照推荐频率坚持使用产品')
      expect(report).toContain('2. 建议每2周进行一次肤质检测')
    })
  })

  describe('使用频率推荐 (PRD: 护理方案页-方案推荐)', () => {
    it('洁面产品应推荐早晚各一次', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80, roughness: 60 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const cleanser = plan.recommendations.find(r => r.type === 'cleanser')
      if (cleanser) {
        expect(cleanser.frequency).toContain('早晚')
      }
    })

    it('防晒产品应推荐每日早上', () => {
      const features = createFeatures({ moisture: 30, oiliness: 80, roughness: 60 })
      const plan = recommender.generateCarePlan(features, 'user-001')
      const sunscreen = plan.recommendations.find(r => r.type === 'sunscreen')
      if (sunscreen) {
        expect(sunscreen.frequency).toContain('早上')
      }
    })
  })
})
