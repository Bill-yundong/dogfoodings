import type { PostureData, PosturePrediction } from '@/types'

class PosturePredictor {
  private windowSize: number = 50
  private predictionHorizon: number = 10
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

  private calculateTrends(data: PostureData[]): {
    ankle: number
    knee: number
    hip: number
  } {
    const ankleData = data.map(d => d.ankleAngle)
    const kneeData = data.map(d => d.kneeAngle)
    const hipData = data.map(d => d.hipAngle)

    return {
      ankle: this.linearRegressionSlope(ankleData),
      knee: this.linearRegressionSlope(kneeData),
      hip: this.linearRegressionSlope(hipData)
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

  private calculateVolatility(data: PostureData[]): {
    ankle: number
    knee: number
    hip: number
  } {
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
  ): { ankle: number; knee: number; hip: number } {
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

export const posturePredictor = new PosturePredictor()
