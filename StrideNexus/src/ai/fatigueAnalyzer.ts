import type { FatigueState, FatigueLevel, RiskFactors, CadenceData, PressureData, PostureData } from '@/types'

class FatigueAnalyzer {
  private cadenceHistory: CadenceData[] = []
  private pressureHistory: PressureData[] = []
  private postureHistory: PostureData[] = []
  private maxHistorySize: number = 200

  addCadenceData(data: CadenceData): void {
    this.cadenceHistory.push(data)
    if (this.cadenceHistory.length > this.maxHistorySize) {
      this.cadenceHistory.shift()
    }
  }

  addPressureData(data: PressureData): void {
    this.pressureHistory.push(data)
    if (this.pressureHistory.length > this.maxHistorySize) {
      this.pressureHistory.shift()
    }
  }

  addPostureData(data: PostureData): void {
    this.postureHistory.push(data)
    if (this.postureHistory.length > this.maxHistorySize) {
      this.postureHistory.shift()
    }
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

    return {
      level,
      score,
      factors,
      recommendations
    }
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
    const ratio = extremeCount / pronations.length
    
    return ratio
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

    if (factors.cadenceVariation > 0.5) {
      recommendations.push('步频波动较大，尝试保持稳定的跑步节奏')
    }

    if (factors.pressureDistribution > 0.5) {
      recommendations.push('足底压力分布不均，注意落地姿势')
    }

    if (factors.postureStability > 0.5) {
      recommendations.push('姿态稳定性下降，注意核心肌群发力')
    }

    if (factors.groundContactTime > 0.5) {
      recommendations.push('触地时间异常，检查是否过度跨步')
    }

    if (factors.pronationExtreme > 0.3) {
      recommendations.push('发现过度内旋/外旋，考虑更换支撑型跑鞋')
    }

    if (recommendations.length === 0) {
      recommendations.push('运动状态良好，继续保持！')
    }

    return recommendations
  }

  reset(): void {
    this.cadenceHistory = []
    this.pressureHistory = []
    this.postureHistory = []
  }
}

export const fatigueAnalyzer = new FatigueAnalyzer()
