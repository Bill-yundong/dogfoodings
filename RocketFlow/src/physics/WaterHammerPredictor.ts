import type { SolverOutput } from '@/types'
import { clamp, maxAbs } from '@/utils/math'

interface PredictionResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  predictedPressure: Float32Array
  timeToImpact: number
  peakPressure: number
}

interface HistoricalData {
  timestamp: number
  pressure: Float32Array
  velocity: Float32Array
}

export class WaterHammerPredictor {
  private predictionHorizon: number = 5000
  private historicalData: HistoricalData[] = []
  private maxHistory: number = 100
  
  update(data: SolverOutput): void {
    this.historicalData.push({
      timestamp: data.timestamp,
      pressure: new Float32Array(data.pressureProfile),
      velocity: new Float32Array(data.velocityProfile)
    })
    
    if (this.historicalData.length > this.maxHistory) {
      this.historicalData.shift()
    }
  }
  
  predict(soundSpeed: number, pipeLength: number): PredictionResult {
    if (this.historicalData.length < 2) {
      return {
        riskLevel: 'LOW',
        riskScore: 0,
        predictedPressure: new Float32Array(),
        timeToImpact: Infinity,
        peakPressure: 0
      }
    }
    
    const current = this.historicalData[this.historicalData.length - 1]
    const previous = this.historicalData[this.historicalData.length - 2]
    
    const dt = (current.timestamp - previous.timestamp) / 1000
    
    const pressureTrend = this.calculatePressureTrend(dt)
    const velocityTrend = this.calculateVelocityTrend(dt)
    
    const predictedPressure = this.extrapolatePressure(current.pressure, pressureTrend, soundSpeed, pipeLength)
    const peakPressure = this.calculatePeakPressure(current, velocityTrend, soundSpeed)
    const timeToImpact = this.estimateTimeToImpact(pressureTrend, peakPressure)
    const riskScore = this.calculateRiskScore(peakPressure, pressureTrend, timeToImpact)
    
    return {
      riskLevel: this.getRiskLevel(riskScore),
      riskScore: riskScore,
      predictedPressure: predictedPressure,
      timeToImpact: timeToImpact,
      peakPressure: peakPressure
    }
  }
  
  private calculatePressureTrend(_dt: number): Float32Array {
    const n = this.historicalData.length
    const current = this.historicalData[n - 1]
    const previous = this.historicalData[Math.max(0, n - 10)]
    
    const dtAvg = (current.timestamp - previous.timestamp) / 1000 / Math.min(10, n - 1)
    const trend = new Float32Array(current.pressure.length)
    
    for (let i = 0; i < current.pressure.length; i++) {
      trend[i] = (current.pressure[i] - previous.pressure[i]) / dtAvg
    }
    
    return trend
  }
  
  private calculateVelocityTrend(_dt: number): Float32Array {
    const n = this.historicalData.length
    const current = this.historicalData[n - 1]
    const previous = this.historicalData[Math.max(0, n - 10)]
    
    const dtAvg = (current.timestamp - previous.timestamp) / 1000 / Math.min(10, n - 1)
    const trend = new Float32Array(current.velocity.length)
    
    for (let i = 0; i < current.velocity.length; i++) {
      trend[i] = (current.velocity[i] - previous.velocity[i]) / dtAvg
    }
    
    return trend
  }
  
  private extrapolatePressure(
    currentPressure: Float32Array,
    trend: Float32Array,
    soundSpeed: number,
    pipeLength: number
  ): Float32Array {
    const gridPoints = currentPressure.length
    const predicted = new Float32Array(gridPoints)
    
    const reflectionTime = 2 * pipeLength / soundSpeed
    const steps = Math.min(50, Math.floor(this.predictionHorizon / 10))
    
    for (let i = 0; i < gridPoints; i++) {
      let p = currentPressure[i]
      let t = 0
      
      for (let s = 0; s < steps; s++) {
        const dt = this.predictionHorizon / steps / 1000
        const wavePhase = Math.sin(2 * Math.PI * t / reflectionTime)
        
        const waveTerm = trend[i] * dt * (1 + 0.3 * wavePhase)
        p += waveTerm
        
        const friction = 0.001 * Math.abs(p) * dt
        p = p * (1 - friction)
        
        t += dt
      }
      
      predicted[i] = p
    }
    
    return predicted
  }
  
  private calculatePeakPressure(
    current: HistoricalData,
    velocityTrend: Float32Array,
    soundSpeed: number
  ): number {
    const rho = 1000
    let maxDeltaP = 0
    
    for (let i = 0; i < velocityTrend.length; i++) {
      const dv = Math.abs(velocityTrend[i]) * (this.predictionHorizon / 1000)
      const deltaP = rho * soundSpeed * dv
      if (deltaP > maxDeltaP) {
        maxDeltaP = deltaP
      }
    }
    
    const currentPeak = maxAbs(current.pressure)
    
    return currentPeak + maxDeltaP / 1e6
  }
  
  private estimateTimeToImpact(pressureTrend: Float32Array, peakPressure: number): number {
    const maxTrend = maxAbs(pressureTrend)
    if (maxTrend < 0.001) return Infinity
    
    const threshold = 5
    const currentPressure = peakPressure
    const timeToThreshold = (threshold - currentPressure) / maxTrend * 1000
    
    return Math.max(0, timeToThreshold)
  }
  
  private calculateRiskScore(
    peakPressure: number,
    pressureTrend: Float32Array,
    timeToImpact: number
  ): number {
    const pressureScore = clamp(peakPressure / 10 * 100, 0, 60)
    
    const trendScore = clamp(maxAbs(pressureTrend) / 0.01 * 40, 0, 40)
    
    let timeScore = 0
    if (timeToImpact < 1000) {
      timeScore = 20
    } else if (timeToImpact < 5000) {
      timeScore = 10
    }
    
    return clamp(pressureScore + trendScore + timeScore, 0, 100)
  }
  
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score < 30) return 'LOW'
    if (score < 50) return 'MEDIUM'
    if (score < 80) return 'HIGH'
    return 'CRITICAL'
  }
  
  clear(): void {
    this.historicalData = []
  }
}
