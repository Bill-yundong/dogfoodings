import type { VibrationFeatures, CavitationRisk, RiskFactor, WaveletResult } from '@/types'

export class CavitationRiskModel {
  private thresholds = {
    rms: { warning: 5.0, critical: 10.0 },
    peak: { warning: 20.0, critical: 40.0 },
    crestFactor: { warning: 6.0, critical: 8.0 },
    kurtosis: { warning: 4.0, critical: 6.0 },
    harmonicRatio: { warning: 0.3, critical: 0.5 },
    energyConcentration: { warning: 0.6, critical: 0.8 }
  }

  evaluate(features: VibrationFeatures, waveletResult?: WaveletResult): CavitationRisk {
    const factors: RiskFactor[] = []

    factors.push({
      name: '振动有效值 (RMS)',
      weight: 0.25,
      value: features.rms,
      threshold: this.thresholds.rms.warning,
      unit: 'mm/s'
    })

    factors.push({
      name: '峰值振幅',
      weight: 0.2,
      value: features.peak,
      threshold: this.thresholds.peak.warning,
      unit: 'mm/s'
    })

    factors.push({
      name: '波峰因子',
      weight: 0.15,
      value: features.crestFactor,
      threshold: this.thresholds.crestFactor.warning,
      unit: ''
    })

    factors.push({
      name: '峭度指标',
      weight: 0.2,
      value: features.kurtosis,
      threshold: this.thresholds.kurtosis.warning,
      unit: ''
    })

    factors.push({
      name: '谐波占比',
      weight: 0.1,
      value: features.harmonicRatio,
      threshold: this.thresholds.harmonicRatio.warning,
      unit: '%'
    })

    let energyConcentration = 0.5
    if (waveletResult?.coefficients) {
      energyConcentration = this.calculateEnergyConcentration(waveletResult)
    }

    factors.push({
      name: '能量集中度',
      weight: 0.1,
      value: energyConcentration,
      threshold: this.thresholds.energyConcentration.warning,
      unit: ''
    })

    let totalScore = 0
    let weightedThreshold = 0

    for (const factor of factors) {
      const ratio = Math.min(factor.value / factor.threshold, 3)
      totalScore += ratio * factor.weight
      weightedThreshold += factor.weight
    }

    const normalizedScore = totalScore / weightedThreshold
    let level: CavitationRisk['level'] = 'low'
    let trend: CavitationRisk['trend'] = 'stable'

    if (normalizedScore >= 2.0) {
      level = 'critical'
      trend = 'deteriorating'
    } else if (normalizedScore >= 1.5) {
      level = 'high'
      trend = 'deteriorating'
    } else if (normalizedScore >= 1.0) {
      level = 'medium'
      trend = 'stable'
    } else {
      level = 'low'
      trend = 'stable'
    }

    const probability = Math.min(normalizedScore * 50, 100)

    return {
      level,
      probability,
      factors,
      trend
    }
  }

  private calculateEnergyConcentration(waveletResult: WaveletResult): number {
    const { coefficients } = waveletResult
    const numScales = coefficients.length
    const numTimes = coefficients[0]?.length || 0

    if (numTimes === 0) return 0.5

    let totalEnergy = 0
    const scaleEnergies: number[] = []

    for (let s = 0; s < numScales; s++) {
      let scaleEnergy = 0
      for (let t = 0; t < numTimes; t++) {
        scaleEnergy += coefficients[s][t] * coefficients[s][t]
      }
      scaleEnergies.push(scaleEnergy)
      totalEnergy += scaleEnergy
    }

    if (totalEnergy === 0) return 0.5

    const normalizedEnergies = scaleEnergies.map(e => e / totalEnergy)
    const maxEnergy = Math.max(...normalizedEnergies)
    const top3Sum = normalizedEnergies
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((sum, e) => sum + e, 0)

    return Math.min(top3Sum, 1)
  }

  generateRecommendations(risk: CavitationRisk): string[] {
    const recommendations: string[] = []

    if (risk.level === 'low') {
      recommendations.push('设备运行状态良好，继续保持正常监测频率')
      recommendations.push('建议每季度进行一次全面检测')
    } else if (risk.level === 'medium') {
      recommendations.push('检测到轻微异常信号，建议增加监测频率至每周一次')
      recommendations.push('检查入口压力是否稳定，排查可能的气蚀诱因')
      recommendations.push('分析近期运行数据，确认异常趋势')
    } else if (risk.level === 'high') {
      recommendations.push('⚠️ 存在较高气蚀风险，建议立即安排专业检测')
      recommendations.push('检查泵入口滤网是否堵塞')
      recommendations.push('验证 NPSH (净正吸头) 是否满足设计要求')
      recommendations.push('考虑降低运行负荷，避免工况恶化')
    } else {
      recommendations.push('🚨 严重气蚀风险！建议立即停机检查')
      recommendations.push('检查叶轮是否有损伤，必要时进行更换')
      recommendations.push('核查系统设计参数，评估是否需要改造')
      recommendations.push('建立紧急维护预案，防止突发故障')
    }

    return recommendations
  }

  predictTrend(history: CavitationRisk[], steps: number = 5): number[] {
    if (history.length < 2) return [50, 50, 50, 50, 50]

    const probabilities = history.map(h => h.probability)
    const recent = probabilities.slice(-5)
    const trend = recent.length >= 2 
      ? (recent[recent.length - 1] - recent[0]) / recent.length 
      : 0

    const predictions: number[] = []
    let lastVal = probabilities[probabilities.length - 1]

    for (let i = 0; i < steps; i++) {
      lastVal = Math.max(0, Math.min(100, lastVal + trend + (Math.random() - 0.5) * 5))
      predictions.push(Math.round(lastVal))
    }

    return predictions
  }
}

export const cavitationModel = new CavitationRiskModel()
