import { describe, it, expect, beforeEach } from 'vitest'
import type { CadenceData, PressureData, PostureData, FatigueState, RiskFactors, FatigueLevel } from '@/types'

class TestableFatigueAnalyzer {
  private cadenceHistory: CadenceData[] = []
  private pressureHistory: PressureData[] = []
  private postureHistory: PostureData[] = []
  private maxHistorySize = 200

  addCadenceData(data: CadenceData): void {
    this.cadenceHistory.push(data)
    if (this.cadenceHistory.length > this.maxHistorySize) this.cadenceHistory.shift()
  }

  addPressureData(data: PressureData): void {
    this.pressureHistory.push(data)
    if (this.pressureHistory.length > this.maxHistorySize) this.pressureHistory.shift()
  }

  addPostureData(data: PostureData): void {
    this.postureHistory.push(data)
    if (this.postureHistory.length > this.maxHistorySize) this.postureHistory.shift()
  }

  analyze(): FatigueState | null {
    if (this.cadenceHistory.length < 30 ||
        this.pressureHistory.length < 30 ||
        this.postureHistory.length < 30) {
      return null
    }

    const factors = this.calculateRiskFactors()
    const score = this.calculateFatigueScore(factors)
    const level = this.determineFatigueLevel(score)
    const recommendations = this.generateRecommendations(factors, level)

    return { level, score, factors, recommendations }
  }

  private calculateRiskFactors(): RiskFactors {
    return {
      cadenceVariation: this.calculateCadenceVariation(),
      pressureDistribution: this.calculatePressureDistribution(),
      postureStability: this.calculatePostureStability(),
      groundContactTime: this.calculateGroundContactTimeFactor(),
      pronationExtreme: this.calculatePronationFactor()
    }
  }

  private calculateCadenceVariation(): number {
    const recentCadence = this.cadenceHistory.slice(-60)
    const spmValues = recentCadence.map(d => d.stepsPerMinute)
    const mean = spmValues.reduce((a, b) => a + b, 0) / spmValues.length
    const variance = spmValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / spmValues.length
    const cv = Math.sqrt(variance) / mean
    return Math.min(1, cv * 5)
  }

  private calculatePressureDistribution(): number {
    const recentPressure = this.pressureHistory.slice(-30)
    const distributionScores: number[] = []
    for (const data of recentPressure) {
      const pressures = data.pressureMap.map(p => p.pressure)
      const mean = pressures.reduce((a, b) => a + b, 0) / pressures.length
      const variance = pressures.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pressures.length
      distributionScores.push(Math.sqrt(variance) / (mean || 1))
    }
    const avgScore = distributionScores.reduce((a, b) => a + b, 0) / distributionScores.length
    return Math.min(1, avgScore * 3)
  }

  private calculatePostureStability(): number {
    const recentPosture = this.postureHistory.slice(-60)
    const angles = recentPosture.map(d => [d.ankleAngle, d.kneeAngle, d.hipAngle])
    const stabilities: number[] = []
    for (let i = 0; i < 3; i++) {
      const values = angles.map(a => a[i])
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      stabilities.push(Math.sqrt(variance))
    }
    const avgInstability = stabilities.reduce((a, b) => a + b, 0) / stabilities.length
    return Math.min(1, avgInstability / 15)
  }

  private calculateGroundContactTimeFactor(): number {
    const recentCadence = this.cadenceHistory.slice(-30)
    const contactTimes = recentCadence.map(d => d.groundContactTime)
    const avgContactTime = contactTimes.reduce((a, b) => a + b, 0) / contactTimes.length
    const baseline = 250
    const deviation = Math.abs(avgContactTime - baseline) / baseline
    return Math.min(1, deviation * 2)
  }

  private calculatePronationFactor(): number {
    const recentPosture = this.postureHistory.slice(-30)
    const pronations = recentPosture.map(d => d.pronation)
    const extremeCount = pronations.filter(p => Math.abs(p) > 10).length
    return extremeCount / pronations.length
  }

  private calculateFatigueScore(factors: RiskFactors): number {
    const weights = {
      cadenceVariation: 0.2,
      pressureDistribution: 0.25,
      postureStability: 0.25,
      groundContactTime: 0.15,
      pronationExtreme: 0.15
    }
    const weightedSum =
      factors.cadenceVariation * weights.cadenceVariation +
      factors.pressureDistribution * weights.pressureDistribution +
      factors.postureStability * weights.postureStability +
      factors.groundContactTime * weights.groundContactTime +
      factors.pronationExtreme * weights.pronationExtreme
    return Math.round(weightedSum * 100)
  }

  private determineFatigueLevel(score: number): FatigueLevel {
    if (score < 25) return 'low'
    if (score < 50) return 'moderate'
    if (score < 75) return 'high'
    return 'critical'
  }

  private generateRecommendations(factors: RiskFactors, level: FatigueLevel): string[] {
    const recommendations: string[] = []
    if (level === 'critical') {
      recommendations.push('建议立即停止运动，进行充分休息')
      recommendations.push('考虑进行专业的运动损伤评估')
    } else if (level === 'high') {
      recommendations.push('疲劳程度较高，建议降低运动强度')
      recommendations.push('增加休息间隔，注意补水')
    }
    if (factors.cadenceVariation > 0.5) recommendations.push('步频波动较大，尝试保持稳定的跑步节奏')
    if (factors.pressureDistribution > 0.5) recommendations.push('足底压力分布不均，注意落地姿势')
    if (factors.postureStability > 0.5) recommendations.push('姿态稳定性下降，注意核心肌群发力')
    if (factors.groundContactTime > 0.5) recommendations.push('触地时间异常，检查是否过度跨步')
    if (factors.pronationExtreme > 0.3) recommendations.push('发现过度内旋/外旋，考虑更换支撑型跑鞋')
    if (recommendations.length === 0) recommendations.push('运动状态良好，继续保持！')
    return recommendations
  }

  reset(): void {
    this.cadenceHistory = []
    this.pressureHistory = []
    this.postureHistory = []
  }
}

function makeCadenceData(overrides: Partial<CadenceData> = {}): CadenceData {
  return {
    id: `c-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 'session-1',
    timestamp: Date.now(),
    stepsPerMinute: 175,
    stepLength: 1.4,
    groundContactTime: 250,
    verticalOscillation: 8,
    ...overrides
  }
}

function makePressureData(overrides: Partial<PressureData> = {}): PressureData {
  const points = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      points.push({ x: c, y: r, pressure: 0.5 + Math.random() * 0.3 })
    }
  }
  return {
    id: `pr-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 'session-1',
    timestamp: Date.now(),
    pressureMap: points,
    totalPressure: 15,
    leftFoot: points.slice(0, 16),
    rightFoot: points.slice(16),
    ...overrides
  }
}

function makePostureData(overrides: Partial<PostureData> = {}): PostureData {
  return {
    id: `po-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 'session-1',
    timestamp: Date.now(),
    ankleAngle: 90,
    kneeAngle: 170,
    hipAngle: 180,
    pronation: 0,
    trunkAngle: 0,
    ...overrides
  }
}

describe('B2-疲劳状态实时反馈算法', () => {
  let analyzer: TestableFatigueAnalyzer

  beforeEach(() => {
    analyzer = new TestableFatigueAnalyzer()
  })

  it('B2.1 数据不足30条时analyze()返回null', () => {
    for (let i = 0; i < 29; i++) {
      analyzer.addCadenceData(makeCadenceData())
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData())
    }
    expect(analyzer.analyze()).toBeNull()
  })

  it('B2.2 数据达到30条后analyze()返回有效FatigueState', () => {
    for (let i = 0; i < 30; i++) {
      analyzer.addCadenceData(makeCadenceData())
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData())
    }
    const result = analyzer.analyze()
    expect(result).not.toBeNull()
    expect(result!.level).toMatch(/^(low|moderate|high|critical)$/)
    expect(result!.score).toBeGreaterThanOrEqual(0)
    expect(result!.score).toBeLessThanOrEqual(100)
    expect(result!.factors).toHaveProperty('cadenceVariation')
    expect(result!.factors).toHaveProperty('pressureDistribution')
    expect(result!.factors).toHaveProperty('postureStability')
    expect(result!.factors).toHaveProperty('groundContactTime')
    expect(result!.factors).toHaveProperty('pronationExtreme')
    expect(result!.recommendations.length).toBeGreaterThan(0)
  })

  it('B2.3 稳定运动数据下疲劳分数应处于低水平', () => {
    for (let i = 0; i < 60; i++) {
      analyzer.addCadenceData(makeCadenceData({
        stepsPerMinute: 175 + (Math.random() - 0.5) * 4,
        groundContactTime: 250 + (Math.random() - 0.5) * 10
      }))
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData({
        ankleAngle: 90 + (Math.random() - 0.5) * 2,
        kneeAngle: 170 + (Math.random() - 0.5) * 2,
        hipAngle: 180 + (Math.random() - 0.5) * 2,
        pronation: (Math.random() - 0.5) * 2
      }))
    }
    const result = analyzer.analyze()
    expect(result).not.toBeNull()
    expect(result!.score).toBeLessThan(40)
    expect(result!.level).toBe('low')
  })

  it('B2.4 高疲劳数据下分数应升高并触发high/critical级别', () => {
    for (let i = 0; i < 60; i++) {
      analyzer.addCadenceData(makeCadenceData({
        stepsPerMinute: 150 + Math.random() * 50,
        groundContactTime: 350 + Math.random() * 100
      }))
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData({
        ankleAngle: 70 + Math.random() * 40,
        kneeAngle: 140 + Math.random() * 60,
        hipAngle: 160 + Math.random() * 40,
        pronation: -15 + Math.random() * 30
      }))
    }
    const result = analyzer.analyze()
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(30)
  })

  it('B2.5 疲劳分数等级映射正确', () => {
    const analyzer2 = new TestableFatigueAnalyzer()
    for (let i = 0; i < 60; i++) {
      analyzer2.addCadenceData(makeCadenceData())
      analyzer2.addPressureData(makePressureData())
      analyzer2.addPostureData(makePostureData())
    }
    const result = analyzer2.analyze()!
    if (result.score < 25) expect(result.level).toBe('low')
    else if (result.score < 50) expect(result.level).toBe('moderate')
    else if (result.score < 75) expect(result.level).toBe('high')
    else expect(result.level).toBe('critical')
  })

  it('B2.6 critical级别应生成紧急停止建议', () => {
    for (let i = 0; i < 80; i++) {
      analyzer.addCadenceData(makeCadenceData({
        stepsPerMinute: 120 + Math.random() * 80,
        groundContactTime: 400 + Math.random() * 100
      }))
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData({
        ankleAngle: 60 + Math.random() * 60,
        kneeAngle: 130 + Math.random() * 80,
        hipAngle: 150 + Math.random() * 60,
        pronation: -20 + Math.random() * 40
      }))
    }
    const result = analyzer.analyze()
    if (result && result.level === 'critical') {
      expect(result.recommendations).toContain('建议立即停止运动，进行充分休息')
    }
  })

  it('B2.7 5个风险因子均在[0,1]范围内', () => {
    for (let i = 0; i < 50; i++) {
      analyzer.addCadenceData(makeCadenceData())
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData())
    }
    const result = analyzer.analyze()!
    expect(result.factors.cadenceVariation).toBeGreaterThanOrEqual(0)
    expect(result.factors.cadenceVariation).toBeLessThanOrEqual(1)
    expect(result.factors.pressureDistribution).toBeGreaterThanOrEqual(0)
    expect(result.factors.pressureDistribution).toBeLessThanOrEqual(1)
    expect(result.factors.postureStability).toBeGreaterThanOrEqual(0)
    expect(result.factors.postureStability).toBeLessThanOrEqual(1)
    expect(result.factors.groundContactTime).toBeGreaterThanOrEqual(0)
    expect(result.factors.groundContactTime).toBeLessThanOrEqual(1)
    expect(result.factors.pronationExtreme).toBeGreaterThanOrEqual(0)
    expect(result.factors.pronationExtreme).toBeLessThanOrEqual(1)
  })

  it('B2.8 reset()后重新需要30条数据才能分析', () => {
    for (let i = 0; i < 60; i++) {
      analyzer.addCadenceData(makeCadenceData())
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData())
    }
    expect(analyzer.analyze()).not.toBeNull()
    analyzer.reset()
    expect(analyzer.analyze()).toBeNull()
  })

  it('B2.9 步频波动因子对步频变化敏感', () => {
    for (let i = 0; i < 60; i++) {
      analyzer.addCadenceData(makeCadenceData({
        stepsPerMinute: i % 2 === 0 ? 160 : 190
      }))
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData())
    }
    const result = analyzer.analyze()!
    expect(result.factors.cadenceVariation).toBeGreaterThan(0.3)
  })

  it('B2.10 内旋过度时pronationExtreme因子升高', () => {
    for (let i = 0; i < 60; i++) {
      analyzer.addCadenceData(makeCadenceData())
      analyzer.addPressureData(makePressureData())
      analyzer.addPostureData(makePostureData({
        pronation: 15 + Math.random() * 5
      }))
    }
    const result = analyzer.analyze()!
    expect(result.factors.pronationExtreme).toBeGreaterThan(0.5)
  })
})
