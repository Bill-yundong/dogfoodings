import { RainflowCycle, StressAccumulation, FatiguePrediction, CriticalPoint, DieHealthRecord } from '../types'

const MATERIAL_CONSTANTS = {
  CR12MOV: {
    k: 1.2e12,
    m: 5,
    fatigueLimit: 250,
    ultimateStrength: 750,
    yieldStrength: 550,
  },
  SKD11: {
    k: 1.5e12,
    m: 4.8,
    fatigueLimit: 280,
    ultimateStrength: 800,
    yieldStrength: 600,
  },
  D2: {
    k: 1.0e12,
    m: 5.2,
    fatigueLimit: 300,
    ultimateStrength: 850,
    yieldStrength: 650,
  },
}

export interface MaterialProperties {
  k: number
  m: number
  fatigueLimit: number
  ultimateStrength: number
  yieldStrength: number
}

export class FatigueLifePredictor {
  private materialProps: MaterialProperties

  constructor(materialType: keyof typeof MATERIAL_CONSTANTS = 'CR12MOV') {
    this.materialProps = MATERIAL_CONSTANTS[materialType]
  }

  calculateDamage(cycles: RainflowCycle[]): number {
    let totalDamage = 0

    for (const cycle of cycles) {
      const stressAmplitude = cycle.range / 2
      
      if (stressAmplitude >= this.materialProps.fatigueLimit) {
        const lifeCycles = this.calculateCyclesToFailure(stressAmplitude)
        const damage = cycle.count / lifeCycles
        totalDamage += damage
      }
    }

    return totalDamage
  }

  calculateCyclesToFailure(stressAmplitude: number): number {
    const { k, m } = this.materialProps
    return k * Math.pow(stressAmplitude, -m)
  }

  predictRemainingLife(
    currentDamage: number,
    currentStressRate: number,
    operationHoursPerDay: number = 24
  ): { days: number; hours: number; cycles: number } {
    const remainingDamage = 1 - currentDamage
    
    if (remainingDamage <= 0) {
      return { days: 0, hours: 0, cycles: 0 }
    }

    const damagePerCycle = this.calculateDamagePerCycle(currentStressRate)
    const remainingCycles = remainingDamage / damagePerCycle
    const cyclesPerHour = this.estimateCyclesPerHour()
    const remainingHours = remainingCycles / cyclesPerHour
    const remainingDays = remainingHours / operationHoursPerDay

    return {
      days: Math.max(0, Math.round(remainingDays)),
      hours: Math.max(0, Math.round(remainingHours)),
      cycles: Math.max(0, Math.round(remainingCycles)),
    }
  }

  private calculateDamagePerCycle(stressAmplitude: number): number {
    if (stressAmplitude < this.materialProps.fatigueLimit) {
      return 0
    }
    const lifeCycles = this.calculateCyclesToFailure(stressAmplitude)
    return 1 / lifeCycles
  }

  private estimateCyclesPerHour(): number {
    return 3600
  }

  calculateFailureProbability(currentDamage: number, daysSinceInstallation: number): number {
    const baseProbability = currentDamage
    const timeFactor = Math.min(1, daysSinceInstallation / 1000)
    const probability = baseProbability * (0.7 + 0.3 * timeFactor)
    
    return Math.min(1, Math.max(0, probability))
  }

  findCriticalPoints(
    cycles: RainflowCycle[],
    threshold: number = 0.8
  ): CriticalPoint[] {
    const criticalPoints: CriticalPoint[] = []
    const { ultimateStrength } = this.materialProps
    const thresholdStress = ultimateStrength * threshold

    const sortedCycles = [...cycles].sort((a, b) => b.range - a.range)
    
    for (let i = 0; i < Math.min(10, sortedCycles.length); i++) {
      const cycle = sortedCycles[i]
      const stressLevel = cycle.range / 2
      const stressRatio = stressLevel / ultimateStrength

      let riskLevel: CriticalPoint['riskLevel'] = 'low'
      if (stressRatio >= 0.9) riskLevel = 'critical'
      else if (stressRatio >= 0.75) riskLevel = 'high'
      else if (stressRatio >= 0.5) riskLevel = 'medium'

      criticalPoints.push({
        location: `Point_${i + 1}`,
        stressLevel,
        riskLevel,
      })
    }

    return criticalPoints
  }

  calculateHealthIndex(currentDamage: number): number {
    return Math.max(0, 100 * (1 - currentDamage))
  }

  updateStressAccumulation(
    currentAccumulation: StressAccumulation,
    newCycles: RainflowCycle[]
  ): StressAccumulation {
    const additionalDamage = this.calculateDamage(newCycles)
    const totalDamage = currentAccumulation.damageAccumulated + additionalDamage

    const allCycles = [...currentAccumulation.cycleHistory, ...newCycles]
    
    const maxStress = Math.max(
      currentAccumulation.maxStress,
      ...newCycles.map(c => c.range / 2)
    )
    const newMinStress = Math.min(...newCycles.map(c => c.range / 2))
    const minStress = currentAccumulation.minStress === 0 
      ? newMinStress 
      : Math.min(currentAccumulation.minStress, newMinStress)

    const totalCycles = allCycles.reduce((sum, c) => sum + c.count, 0)

    return {
      totalCycles,
      damageAccumulated: totalDamage,
      maxStress,
      minStress,
      cycleHistory: allCycles.slice(-1000),
    }
  }

  predictFailure(
    dieRecord: DieHealthRecord,
    averageDailyStress: number = 200
  ): FatiguePrediction {
    const { stressAccumulation, installDate } = dieRecord
    const daysSinceInstallation = (Date.now() - installDate) / (1000 * 60 * 60 * 24)

    const remainingLife = this.predictRemainingLife(
      stressAccumulation.damageAccumulated,
      averageDailyStress
    )

    const predictedFailureDate = Date.now() + remainingLife.days * 24 * 60 * 60 * 1000

    const confidenceLevel = this.calculateConfidenceLevel(
      stressAccumulation.cycleHistory.length,
      daysSinceInstallation
    )

    const criticalPoints = this.findCriticalPoints(stressAccumulation.cycleHistory)

    const recommendedMaintenanceDate = predictedFailureDate * 0.7 + Date.now() * 0.3

    return {
      dieId: dieRecord.id,
      predictedFailureDate,
      confidenceLevel,
      criticalPoints,
      recommendedMaintenanceDate,
    }
  }

  private calculateConfidenceLevel(dataPoints: number, days: number): number {
    const dataFactor = Math.min(1, dataPoints / 1000)
    const timeFactor = Math.min(1, days / 365)
    return 0.5 + 0.3 * dataFactor + 0.2 * timeFactor
  }

  calculateFailureProbabilityDistribution(
    cycles: RainflowCycle[],
    percentiles: number[] = [10, 50, 90]
  ): Map<number, number> {
    const distribution = new Map<number, number>()
    
    for (const percentile of percentiles) {
      const stressThreshold = this.getPercentileStress(cycles, percentile)
      const cyclesToFailure = this.calculateCyclesToFailure(stressThreshold)
      distribution.set(percentile, cyclesToFailure)
    }

    return distribution
  }

  private getPercentileStress(cycles: RainflowCycle[], percentile: number): number {
    const sortedStresses = cycles
      .map(c => c.range / 2)
      .sort((a, b) => a - b)
    
    const index = Math.floor((percentile / 100) * sortedStresses.length)
    return sortedStresses[Math.min(index, sortedStresses.length - 1)]
  }

  recommendMaintenanceAction(damage: number, healthIndex: number): string {
    if (healthIndex < 30 || damage > 0.7) {
      return '立即更换模具'
    } else if (healthIndex < 50 || damage > 0.5) {
      return '计划近期维修'
    } else if (healthIndex < 70 || damage > 0.3) {
      return '增加检查频率'
    }
    return '正常维护'
  }
}

export function createEmptyStressAccumulation(): StressAccumulation {
  return {
    totalCycles: 0,
    damageAccumulated: 0,
    maxStress: 0,
    minStress: 0,
    cycleHistory: [],
  }
}

export function generateSampleLoadData(
  count: number,
  baseLoad: number = 200,
  variance: number = 50
): { timestamp: number; load: number; sensorId: string }[] {
  const data: { timestamp: number; load: number; sensorId: string }[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const load = baseLoad + (Math.random() - 0.5) * 2 * variance
    data.push({
      timestamp: now - (count - i) * 1000,
      load: Math.max(0, load),
      sensorId: 'sensor_001',
    })
  }

  return data
}

export const defaultPredictor = new FatigueLifePredictor()
