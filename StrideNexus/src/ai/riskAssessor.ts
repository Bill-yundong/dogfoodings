import type { RiskAssessment, RiskLevel, FatigueState } from '@/types'

class RiskAssessor {
  assess(
    sessionId: string,
    fatigueState: FatigueState,
    additionalMetrics: {
      duration: number
      distance: number
      avgHeartRate?: number
    }
  ): RiskAssessment {
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
    switch (level) {
      case 'safe': return '#00B42A'
      case 'caution': return '#FF7D00'
      case 'warning': return '#FF7D00'
      case 'danger': return '#F53F3F'
    }
  }

  getRiskLevelText(level: RiskLevel): string {
    switch (level) {
      case 'safe': return '安全'
      case 'caution': return '注意'
      case 'warning': return '警告'
      case 'danger': return '危险'
    }
  }

  private generateComprehensiveRecommendations(
    fatigueState: FatigueState,
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

  generateRecoveryPlan(riskLevel: RiskLevel): {
    restDays: number
    recommendedActivities: string[]
    precautions: string[]
  } {
    switch (riskLevel) {
      case 'safe':
        return {
          restDays: 0,
          recommendedActivities: ['正常训练', '交叉训练'],
          precautions: ['保持充足睡眠', '注意补水']
        }
      case 'caution':
        return {
          restDays: 1,
          recommendedActivities: ['轻松跑', '游泳', '瑜伽'],
          precautions: ['降低训练强度', '注意身体信号']
        }
      case 'warning':
        return {
          restDays: 2,
          recommendedActivities: ['散步', '轻度拉伸', '泡沫轴放松'],
          precautions: ['避免高强度训练', '保证蛋白质摄入', '保证充足睡眠']
        }
      case 'danger':
        return {
          restDays: 3,
          recommendedActivities: ['完全休息', '冰敷', '专业按摩'],
          precautions: ['如有持续疼痛请就医', '避免任何负重运动']
        }
    }
  }
}

export const riskAssessor = new RiskAssessor()
