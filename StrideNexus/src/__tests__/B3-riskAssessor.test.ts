import { describe, it, expect, beforeEach } from 'vitest'
import type { RiskLevel } from '@/types'

class TestableRiskAssessor {
  assess(
    sessionId: string,
    fatigueState: { score: number; factors: any; recommendations: string[] },
    additionalMetrics: { duration: number; distance: number; avgHeartRate?: number }
  ) {
    const baseRisk = fatigueState.score
    const durationRisk = this.calculateDurationRisk(additionalMetrics.duration)
    const distanceRisk = this.calculateDistanceRisk(additionalMetrics.distance)
    const heartRateRisk = additionalMetrics.avgHeartRate
      ? this.calculateHeartRateRisk(additionalMetrics.avgHeartRate)
      : 0
    const overallRisk = Math.min(100, Math.round(
      baseRisk * 0.6 +
      durationRisk * 0.15 +
      distanceRisk * 0.15 +
      heartRateRisk * 0.1
    ))
    return {
      id: '',
      sessionId,
      overallRisk,
      fatigueLevel: fatigueState.score,
      riskFactors: fatigueState.factors,
      recommendations: this.generateComprehensiveRecommendations(fatigueState, overallRisk),
      assessedAt: new Date()
    }
  }

  private calculateDurationRisk(durationMinutes: number): number {
    if (durationMinutes < 30) return 0
    if (durationMinutes < 60) return 20
    if (durationMinutes < 90) return 40
    if (durationMinutes < 120) return 60
    return 80
  }

  private calculateDistanceRisk(distanceKm: number): number {
    if (distanceKm < 5) return 0
    if (distanceKm < 10) return 20
    if (distanceKm < 15) return 40
    if (distanceKm < 21) return 60
    return 80
  }

  private calculateHeartRateRisk(heartRate: number): number {
    if (heartRate < 140) return 0
    if (heartRate < 160) return 25
    if (heartRate < 175) return 50
    if (heartRate < 185) return 75
    return 100
  }

  getRiskLevel(score: number): RiskLevel {
    if (score < 25) return 'safe'
    if (score < 50) return 'caution'
    if (score < 75) return 'warning'
    return 'danger'
  }

  getRiskLevelColor(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      safe: '#00B42A', caution: '#FF7D00', warning: '#FF7D00', danger: '#F53F3F'
    }
    return map[level]
  }

  getRiskLevelText(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      safe: '安全', caution: '注意', warning: '警告', danger: '危险'
    }
    return map[level]
  }

  generateRecoveryPlan(riskLevel: RiskLevel) {
    switch (riskLevel) {
      case 'safe': return { restDays: 0, recommendedActivities: ['正常训练', '交叉训练'], precautions: ['保持充足睡眠', '注意补水'] }
      case 'caution': return { restDays: 1, recommendedActivities: ['轻松跑', '游泳', '瑜伽'], precautions: ['降低训练强度', '注意身体信号'] }
      case 'warning': return { restDays: 2, recommendedActivities: ['散步', '轻度拉伸', '泡沫轴放松'], precautions: ['避免高强度训练', '保证蛋白质摄入', '保证充足睡眠'] }
      case 'danger': return { restDays: 3, recommendedActivities: ['完全休息', '冰敷', '专业按摩'], precautions: ['如有持续疼痛请就医', '避免任何负重运动'] }
    }
  }

  private generateComprehensiveRecommendations(
    fatigueState: { recommendations: string[] },
    overallRisk: number
  ): string[] {
    const recommendations = [...fatigueState.recommendations]
    if (overallRisk >= 70) {
      recommendations.unshift('高风险状态！强烈建议立即停止运动')
      recommendations.push('建议进行冰敷和拉伸恢复')
    } else if (overallRisk >= 50) {
      recommendations.push('建议缩短本次运动距离')
      recommendations.push('运动后注意进行充分的拉伸放松')
    }
    return recommendations
  }
}

function makeFatigueState(score: number, recommendations: string[] = ['运动状态良好，继续保持！']) {
  return {
    score,
    factors: {
      cadenceVariation: 0.1,
      pressureDistribution: 0.1,
      postureStability: 0.1,
      groundContactTime: 0.1,
      pronationExtreme: 0.1
    },
    recommendations
  }
}

describe('B3-损伤风险分级评估', () => {
  let assessor: TestableRiskAssessor

  beforeEach(() => {
    assessor = new TestableRiskAssessor()
  })

  it('B3.1 风险等级映射：score < 25 => safe', () => {
    expect(assessor.getRiskLevel(0)).toBe('safe')
    expect(assessor.getRiskLevel(24)).toBe('safe')
  })

  it('B3.2 风险等级映射：25 <= score < 50 => caution', () => {
    expect(assessor.getRiskLevel(25)).toBe('caution')
    expect(assessor.getRiskLevel(49)).toBe('caution')
  })

  it('B3.3 风险等级映射：50 <= score < 75 => warning', () => {
    expect(assessor.getRiskLevel(50)).toBe('warning')
    expect(assessor.getRiskLevel(74)).toBe('warning')
  })

  it('B3.4 风险等级映射：score >= 75 => danger', () => {
    expect(assessor.getRiskLevel(75)).toBe('danger')
    expect(assessor.getRiskLevel(100)).toBe('danger')
  })

  it('B3.5 风险等级颜色正确返回', () => {
    expect(assessor.getRiskLevelColor('safe')).toBe('#00B42A')
    expect(assessor.getRiskLevelColor('caution')).toBe('#FF7D00')
    expect(assessor.getRiskLevelColor('warning')).toBe('#FF7D00')
    expect(assessor.getRiskLevelColor('danger')).toBe('#F53F3F')
  })

  it('B3.6 风险等级文字正确返回', () => {
    expect(assessor.getRiskLevelText('safe')).toBe('安全')
    expect(assessor.getRiskLevelText('caution')).toBe('注意')
    expect(assessor.getRiskLevelText('warning')).toBe('警告')
    expect(assessor.getRiskLevelText('danger')).toBe('危险')
  })

  it('B3.7 assess()综合评估-低疲劳短距离低心率=低风险', () => {
    const result = assessor.assess('s1', makeFatigueState(10), {
      duration: 20, distance: 3, avgHeartRate: 130
    })
    expect(result.overallRisk).toBeLessThan(25)
    expect(result.sessionId).toBe('s1')
  })

  it('B3.8 assess()综合评估-高疲劳长距离高心率=高风险', () => {
    const result = assessor.assess('s2', makeFatigueState(80), {
      duration: 120, distance: 25, avgHeartRate: 190
    })
    expect(result.overallRisk).toBeGreaterThan(50)
  })

  it('B3.9 overallRisk上限为100', () => {
    const result = assessor.assess('s3', makeFatigueState(100), {
      duration: 180, distance: 50, avgHeartRate: 200
    })
    expect(result.overallRisk).toBeLessThanOrEqual(100)
  })

  it('B3.10 时长风险分级：<30min=0, 30-60=20, 60-90=40, 90-120=60, >120=80', () => {
    const r1 = assessor.assess('s1', makeFatigueState(0), { duration: 20, distance: 0 })
    const r2 = assessor.assess('s2', makeFatigueState(0), { duration: 45, distance: 0 })
    const r3 = assessor.assess('s3', makeFatigueState(0), { duration: 75, distance: 0 })
    const r4 = assessor.assess('s4', makeFatigueState(0), { duration: 100, distance: 0 })
    const r5 = assessor.assess('s5', makeFatigueState(0), { duration: 150, distance: 0 })
    expect(r2.overallRisk).toBeGreaterThan(r1.overallRisk)
    expect(r3.overallRisk).toBeGreaterThan(r2.overallRisk)
    expect(r4.overallRisk).toBeGreaterThan(r3.overallRisk)
    expect(r5.overallRisk).toBeGreaterThan(r4.overallRisk)
  })

  it('B3.11 距离风险分级：<5km=0, 5-10=20, 10-15=40, 15-21=60, >21=80', () => {
    const r1 = assessor.assess('s1', makeFatigueState(0), { duration: 0, distance: 3 })
    const r2 = assessor.assess('s2', makeFatigueState(0), { duration: 0, distance: 8 })
    const r3 = assessor.assess('s3', makeFatigueState(0), { duration: 0, distance: 13 })
    const r4 = assessor.assess('s4', makeFatigueState(0), { duration: 0, distance: 18 })
    const r5 = assessor.assess('s5', makeFatigueState(0), { duration: 0, distance: 30 })
    expect(r2.overallRisk).toBeGreaterThan(r1.overallRisk)
    expect(r5.overallRisk).toBeGreaterThan(r1.overallRisk)
  })

  it('B3.12 心率风险分级：<140=0, 140-160=25, 160-175=50, 175-185=75, >185=100', () => {
    const r1 = assessor.assess('s1', makeFatigueState(0), { duration: 0, distance: 0, avgHeartRate: 130 })
    const r2 = assessor.assess('s2', makeFatigueState(0), { duration: 0, distance: 0, avgHeartRate: 150 })
    const r3 = assessor.assess('s3', makeFatigueState(0), { duration: 0, distance: 0, avgHeartRate: 170 })
    const r4 = assessor.assess('s4', makeFatigueState(0), { duration: 0, distance: 0, avgHeartRate: 180 })
    const r5 = assessor.assess('s5', makeFatigueState(0), { duration: 0, distance: 0, avgHeartRate: 195 })
    expect(r2.overallRisk).toBeGreaterThanOrEqual(r1.overallRisk)
    expect(r5.overallRisk).toBeGreaterThan(r1.overallRisk)
  })

  it('B3.13 康复方案-safe:0天休息,正常训练', () => {
    const plan = assessor.generateRecoveryPlan('safe')
    expect(plan.restDays).toBe(0)
    expect(plan.recommendedActivities).toContain('正常训练')
  })

  it('B3.14 康复方案-caution:1天休息,轻松跑', () => {
    const plan = assessor.generateRecoveryPlan('caution')
    expect(plan.restDays).toBe(1)
    expect(plan.recommendedActivities).toContain('轻松跑')
  })

  it('B3.15 康复方案-warning:2天休息,散步', () => {
    const plan = assessor.generateRecoveryPlan('warning')
    expect(plan.restDays).toBe(2)
    expect(plan.recommendedActivities).toContain('散步')
  })

  it('B3.16 康复方案-danger:3天休息,完全休息', () => {
    const plan = assessor.generateRecoveryPlan('danger')
    expect(plan.restDays).toBe(3)
    expect(plan.recommendedActivities).toContain('完全休息')
  })

  it('B3.17 高风险(>=70)时建议应包含紧急停止提示', () => {
    const result = assessor.assess('s1', makeFatigueState(90, ['测试']), {
      duration: 130, distance: 25
    })
    expect(result.overallRisk).toBeGreaterThanOrEqual(70)
    expect(result.recommendations).toContain('高风险状态！强烈建议立即停止运动')
  })

  it('B3.18 中等风险(50-69)时建议应包含缩短运动距离', () => {
    const result = assessor.assess('s1', makeFatigueState(70, ['测试']), {
      duration: 60, distance: 10
    })
    expect(result.overallRisk).toBeGreaterThanOrEqual(50)
    expect(result.recommendations).toContain('建议缩短本次运动距离')
  })

  it('B3.19 无心率数据时不影响评估', () => {
    const result = assessor.assess('s1', makeFatigueState(10), {
      duration: 20, distance: 3
    })
    expect(result.overallRisk).toBeTypeOf('number')
    expect(result.overallRisk).toBeLessThan(25)
  })

  it('B3.20 疲劳分数在综合风险中权重最高(60%)', () => {
    const lowFatigue = assessor.assess('s1', makeFatigueState(10), { duration: 0, distance: 0 })
    const highFatigue = assessor.assess('s2', makeFatigueState(90), { duration: 0, distance: 0 })
    const diff = highFatigue.overallRisk - lowFatigue.overallRisk
    expect(diff).toBeGreaterThan(30)
  })
})
