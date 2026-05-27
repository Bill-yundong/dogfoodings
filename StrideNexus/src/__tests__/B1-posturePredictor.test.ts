import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PostureData, PosturePrediction } from '@/types'

class TestablePosturePredictor {
  private windowSize = 50
  private predictionHorizon = 10
  private historyBuffer: PostureData[] = []

  addPostureData(data: PostureData): void {
    this.historyBuffer.push(data)
    if (this.historyBuffer.length > this.windowSize) {
      this.historyBuffer.shift()
    }
  }

  predict(): PosturePrediction | null {
    if (this.historyBuffer.length < this.windowSize) {
      return null
    }

    const recentData = this.historyBuffer.slice(-this.windowSize)
    const trends = this.calculateTrends(recentData)
    const volatility = this.calculateVolatility(recentData)
    const predictedAngles = this.extrapolateAngles(recentData, trends)
    const distortionProbability = this.calculateDistortionProbability(volatility, recentData)
    const confidence = this.calculateConfidence(volatility)

    return {
      timestamp: Date.now(),
      predictedAngles,
      distortionProbability,
      confidence
    }
  }

  private calculateTrends(data: PostureData[]) {
    return {
      ankle: this.linearRegressionSlope(data.map(d => d.ankleAngle)),
      knee: this.linearRegressionSlope(data.map(d => d.kneeAngle)),
      hip: this.linearRegressionSlope(data.map(d => d.hipAngle))
    }
  }

  private linearRegressionSlope(values: number[]): number {
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += Math.pow(i - xMean, 2)
    }
    return denominator === 0 ? 0 : numerator / denominator
  }

  private calculateVolatility(data: PostureData[]) {
    return {
      ankle: this.standardDeviation(data.map(d => d.ankleAngle)),
      knee: this.standardDeviation(data.map(d => d.kneeAngle)),
      hip: this.standardDeviation(data.map(d => d.hipAngle))
    }
  }

  private standardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  }

  private extrapolateAngles(
    data: PostureData[],
    trends: { ankle: number; knee: number; hip: number }
  ) {
    const latest = data[data.length - 1]
    const horizonFactor = this.predictionHorizon * 0.5
    return {
      ankle: latest.ankleAngle + trends.ankle * horizonFactor,
      knee: latest.kneeAngle + trends.knee * horizonFactor,
      hip: latest.hipAngle + trends.hip * horizonFactor
    }
  }

  private calculateDistortionProbability(
    volatility: { ankle: number; knee: number; hip: number },
    recentData: PostureData[]
  ): number {
    const latest = recentData[recentData.length - 1]
    const ankleDeviation = Math.abs(latest.ankleAngle - 90) / 30
    const kneeDeviation = Math.abs(latest.kneeAngle - 170) / 40
    const hipDeviation = Math.abs(latest.hipAngle - 180) / 30
    const pronationRisk = Math.abs(latest.pronation) / 15
    const volatilityScore = (volatility.ankle / 10 + volatility.knee / 15 + volatility.hip / 8) / 3
    const rawProbability = (ankleDeviation + kneeDeviation + hipDeviation + pronationRisk + volatilityScore) / 5
    return Math.min(1, Math.max(0, rawProbability))
  }

  private calculateConfidence(volatility: { ankle: number; knee: number; hip: number }): number {
    const avgVolatility = (volatility.ankle + volatility.knee + volatility.hip) / 3
    const confidence = 1 - Math.min(1, avgVolatility / 20)
    return Math.max(0.5, confidence)
  }

  reset(): void {
    this.historyBuffer = []
  }
}

function makePostureData(overrides: Partial<PostureData> = {}): PostureData {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
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

describe('B1-异步姿态畸变预测模型', () => {
  let predictor: TestablePosturePredictor

  beforeEach(() => {
    predictor = new TestablePosturePredictor()
  })

  it('B1.1 数据窗口未满时predict()返回null', () => {
    for (let i = 0; i < 49; i++) {
      predictor.addPostureData(makePostureData())
    }
    expect(predictor.predict()).toBeNull()
  })

  it('B1.2 数据窗口满50帧后predict()返回有效预测结果', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData(makePostureData())
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.timestamp).toBeTypeOf('number')
    expect(result!.predictedAngles).toHaveProperty('ankle')
    expect(result!.predictedAngles).toHaveProperty('knee')
    expect(result!.predictedAngles).toHaveProperty('hip')
    expect(result!.distortionProbability).toBeGreaterThanOrEqual(0)
    expect(result!.distortionProbability).toBeLessThanOrEqual(1)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.5)
    expect(result!.confidence).toBeLessThanOrEqual(1)
  })

  it('B1.3 稳定姿态下畸变概率应处于低水平', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData(makePostureData({
        ankleAngle: 90 + (Math.random() - 0.5) * 2,
        kneeAngle: 170 + (Math.random() - 0.5) * 2,
        hipAngle: 180 + (Math.random() - 0.5) * 2,
        pronation: (Math.random() - 0.5) * 2
      }))
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.distortionProbability).toBeLessThan(0.3)
  })

  it('B1.4 姿态持续恶化时畸变概率应升高', () => {
    for (let i = 0; i < 50; i++) {
      const drift = i * 0.5
      predictor.addPostureData(makePostureData({
        ankleAngle: 90 + drift,
        kneeAngle: 170 - drift * 0.5,
        hipAngle: 180 + drift * 0.3,
        pronation: drift * 0.2
      }))
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.distortionProbability).toBeGreaterThan(0.1)
  })

  it('B1.5 reset()后历史数据清空，predict()返回null', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData(makePostureData())
    }
    expect(predictor.predict()).not.toBeNull()
    predictor.reset()
    expect(predictor.predict()).toBeNull()
  })

  it('B1.6 预测角度基于线性回归外推，应跟随趋势方向', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData(makePostureData({
        ankleAngle: 90 + i * 0.3,
        kneeAngle: 170 - i * 0.1,
        hipAngle: 180 + i * 0.05
      }))
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.predictedAngles.ankle).toBeGreaterThan(90)
    expect(result!.predictedAngles.knee).toBeLessThan(170)
    expect(result!.predictedAngles.hip).toBeGreaterThan(180)
  })

  it('B1.7 超出窗口大小的数据应被丢弃（滑动窗口）', () => {
    for (let i = 0; i < 100; i++) {
      predictor.addPostureData(makePostureData({ ankleAngle: 90 + i }))
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.predictedAngles.ankle).toBeGreaterThan(140)
  })

  it('B1.8 置信度在高波动下降低', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData(makePostureData({
        ankleAngle: 90 + (Math.random() - 0.5) * 30,
        kneeAngle: 170 + (Math.random() - 0.5) * 30,
        hipAngle: 180 + (Math.random() - 0.5) * 30
      }))
    }
    const result = predictor.predict()
    expect(result).not.toBeNull()
    expect(result!.confidence).toBeLessThan(0.9)
  })
})
