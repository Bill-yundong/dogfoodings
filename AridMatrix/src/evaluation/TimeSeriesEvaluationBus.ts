import type { SiteSnapshot, TimeSeriesPoint } from '../types'
import { SnapshotCacheManager } from '../cache/SnapshotCacheManager'

export interface EvaluationMetric {
  name: string
  value: number
  trend: 'improving' | 'declining' | 'stable'
  changeRate: number
}

export interface SiteEvaluation {
  siteId: string
  timestamp: Date
  overallScore: number
  metrics: EvaluationMetric[]
  recommendations: string[]
}

export class TimeSeriesEvaluationBus {
  private cacheManager: SnapshotCacheManager
  private siteSubscribers: Map<string, Set<(evaluation: SiteEvaluation) => void>>
  private evaluationInterval: number | null = null

  constructor(cacheManager: SnapshotCacheManager) {
    this.cacheManager = cacheManager
    this.siteSubscribers = new Map()
  }

  async recordSnapshot(snapshot: SiteSnapshot): Promise<void> {
    await this.cacheManager.saveSnapshot(snapshot)

    const timestamp = new Date(snapshot.timestamp).getTime()

    await this.cacheManager.saveTimeSeriesPoint({
      timestamp,
      value: snapshot.coverageRate * 100,
      siteId: snapshot.siteId,
      metric: 'vegetationCoverage'
    })

    const avgMigration = snapshot.dunes.reduce((sum, d) => sum + d.migrationRate, 0) / snapshot.dunes.length
    await this.cacheManager.saveTimeSeriesPoint({
      timestamp,
      value: avgMigration,
      siteId: snapshot.siteId,
      metric: 'duneMigrationRate'
    })

    const evaluation = await this.evaluateSite(snapshot.siteId)
    this.notifySiteSubscribers(snapshot.siteId, evaluation)
  }

  async evaluateSite(siteId: string): Promise<SiteEvaluation> {
    const endTime = Date.now()
    const startTime = endTime - 30 * 24 * 60 * 60 * 1000

    const [coverageData, migrationData] = await Promise.all([
      this.cacheManager.getTimeSeries(siteId, 'vegetationCoverage', startTime, endTime),
      this.cacheManager.getTimeSeries(siteId, 'duneMigrationRate', startTime, endTime)
    ])

    const metrics: EvaluationMetric[] = []

    if (coverageData.length >= 2) {
      const currentValue = coverageData[coverageData.length - 1].value
      const previousValue = coverageData[0].value
      const changeRate = ((currentValue - previousValue) / Math.max(previousValue, 0.1)) * 100

      metrics.push({
        name: '植被覆盖度',
        value: currentValue,
        trend: changeRate > 5 ? 'improving' : changeRate < -5 ? 'declining' : 'stable',
        changeRate
      })
    }

    if (migrationData.length >= 2) {
      const currentValue = migrationData[migrationData.length - 1].value
      const previousValue = migrationData[0].value
      const changeRate = ((currentValue - previousValue) / Math.max(previousValue, 0.1)) * 100

      metrics.push({
        name: '沙丘移动速率',
        value: currentValue,
        trend: changeRate < -5 ? 'improving' : changeRate > 5 ? 'declining' : 'stable',
        changeRate
      })
    }

    const overallScore = this.calculateOverallScore(metrics)
    const recommendations = this.generateRecommendations(metrics)

    return {
      siteId,
      timestamp: new Date(),
      overallScore,
      metrics,
      recommendations
    }
  }

  private calculateOverallScore(metrics: EvaluationMetric[]): number {
    if (metrics.length === 0) return 50

    const coverageMetric = metrics.find(m => m.name === '植被覆盖度')
    const migrationMetric = metrics.find(m => m.name === '沙丘移动速率')

    let score = 0
    let weight = 0

    if (coverageMetric) {
      score += coverageMetric.value * 0.6
      weight += 0.6
    }

    if (migrationMetric) {
      const migrationScore = Math.max(0, 100 - migrationMetric.value * 10)
      score += migrationScore * 0.4
      weight += 0.4
    }

    return weight > 0 ? Math.round(score / weight) : 50
  }

  private generateRecommendations(metrics: EvaluationMetric[]): string[] {
    const recommendations: string[] = []

    const coverageMetric = metrics.find(m => m.name === '植被覆盖度')
    if (coverageMetric) {
      if (coverageMetric.value < 30) {
        recommendations.push('植被覆盖度偏低，建议增加灌木种植密度')
      } else if (coverageMetric.trend === 'improving') {
        recommendations.push('植被恢复趋势良好，建议继续保持现有养护措施')
      }
    }

    const migrationMetric = metrics.find(m => m.name === '沙丘移动速率')
    if (migrationMetric && migrationMetric.value > 5) {
      recommendations.push('沙丘移动速率偏高，建议增设草方格沙障')
    }

    if (recommendations.length === 0) {
      recommendations.push('荒漠化防治工程进展顺利，各项指标正常')
    }

    return recommendations
  }

  subscribe(siteId: string, callback: (evaluation: SiteEvaluation) => void): () => void {
    if (!this.siteSubscribers.has(siteId)) {
      this.siteSubscribers.set(siteId, new Set())
    }
    this.siteSubscribers.get(siteId)!.add(callback)

    return () => {
      this.siteSubscribers.get(siteId)?.delete(callback)
    }
  }

  private notifySiteSubscribers(siteId: string, evaluation: SiteEvaluation): void {
    const subscribers = this.siteSubscribers.get(siteId)
    if (subscribers) {
      subscribers.forEach(callback => callback(evaluation))
    }
  }

  startAutoEvaluation(intervalMs = 60000): void {
    if (this.evaluationInterval !== null) return

    this.evaluationInterval = window.setInterval(async () => {
      for (const siteId of this.siteSubscribers.keys()) {
        const evaluation = await this.evaluateSite(siteId)
        this.notifySiteSubscribers(siteId, evaluation)
      }
    }, intervalMs)
  }

  stopAutoEvaluation(): void {
    if (this.evaluationInterval !== null) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }
  }
}