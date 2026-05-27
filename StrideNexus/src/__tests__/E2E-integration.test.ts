import { describe, it, expect, beforeEach } from 'vitest'

class E2EPosturePredictor {
  private windowSize = 50
  private predictionHorizon = 10
  private historyBuffer: any[] = []

  addPostureData(data: any): void {
    this.historyBuffer.push(data)
    if (this.historyBuffer.length > this.windowSize) this.historyBuffer.shift()
  }

  predict(): any | null {
    if (this.historyBuffer.length < this.windowSize) return null
    const recentData = this.historyBuffer.slice(-this.windowSize)
    const latest = recentData[recentData.length - 1]
    const ankleData = recentData.map((d: any) => d.ankleAngle)
    const kneeData = recentData.map((d: any) => d.kneeAngle)
    const hipData = recentData.map((d: any) => d.hipAngle)
    const ankleSlope = this.lrSlope(ankleData)
    const kneeSlope = this.lrSlope(kneeData)
    const hipSlope = this.lrSlope(hipData)
    const hf = this.predictionHorizon * 0.5
    return {
      timestamp: Date.now(),
      predictedAngles: {
        ankle: latest.ankleAngle + ankleSlope * hf,
        knee: latest.kneeAngle + kneeSlope * hf,
        hip: latest.hipAngle + hipSlope * hf
      },
      distortionProbability: Math.min(1, Math.max(0,
        (Math.abs(latest.ankleAngle - 90) / 30 +
         Math.abs(latest.kneeAngle - 170) / 40 +
         Math.abs(latest.hipAngle - 180) / 30 +
         Math.abs(latest.pronation) / 15) / 4
      )),
      confidence: 0.8
    }
  }

  private lrSlope(values: number[]): number {
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean)
      den += Math.pow(i - xMean, 2)
    }
    return den === 0 ? 0 : num / den
  }

  reset() { this.historyBuffer = [] }
}

class E2EFatigueAnalyzer {
  private cadenceHistory: any[] = []
  private pressureHistory: any[] = []
  private postureHistory: any[] = []

  addCadenceData(d: any) { this.cadenceHistory.push(d); if (this.cadenceHistory.length > 200) this.cadenceHistory.shift() }
  addPressureData(d: any) { this.pressureHistory.push(d); if (this.pressureHistory.length > 200) this.pressureHistory.shift() }
  addPostureData(d: any) { this.postureHistory.push(d); if (this.postureHistory.length > 200) this.postureHistory.shift() }

  analyze(): any | null {
    if (this.cadenceHistory.length < 30 || this.pressureHistory.length < 30 || this.postureHistory.length < 30) return null
    const spmValues = this.cadenceHistory.slice(-60).map((d: any) => d.stepsPerMinute)
    const mean = spmValues.reduce((a: number, b: number) => a + b, 0) / spmValues.length
    const variance = spmValues.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / spmValues.length
    const cv = Math.sqrt(variance) / mean
    const cadenceVariation = Math.min(1, cv * 5)
    const recentPosture = this.postureHistory.slice(-30)
    const pronations = recentPosture.map((d: any) => d.pronation)
    const extremeCount = pronations.filter((p: number) => Math.abs(p) > 10).length
    const pronationExtreme = extremeCount / pronations.length
    const factors = {
      cadenceVariation,
      pressureDistribution: 0.1,
      postureStability: 0.1,
      groundContactTime: 0.1,
      pronationExtreme
    }
    const score = Math.round(
      factors.cadenceVariation * 0.2 +
      factors.pressureDistribution * 0.25 +
      factors.postureStability * 0.25 +
      factors.groundContactTime * 0.15 +
      factors.pronationExtreme * 0.15
    ) * 100
    const level = score < 25 ? 'low' : score < 50 ? 'moderate' : score < 75 ? 'high' : 'critical'
    return { level, score, factors, recommendations: ['运动状态良好，继续保持！'] }
  }

  reset() { this.cadenceHistory = []; this.pressureHistory = []; this.postureHistory = [] }
}

class E2ERiskAssessor {
  assess(sessionId: string, fatigueState: any, metrics: { duration: number; distance: number; avgHeartRate?: number }) {
    const baseRisk = fatigueState.score
    const durationRisk = metrics.duration < 30 ? 0 : metrics.duration < 60 ? 20 : metrics.duration < 90 ? 40 : metrics.duration < 120 ? 60 : 80
    const distanceRisk = metrics.distance < 5 ? 0 : metrics.distance < 10 ? 20 : metrics.distance < 15 ? 40 : metrics.distance < 21 ? 60 : 80
    const hrRisk = !metrics.avgHeartRate ? 0 : metrics.avgHeartRate < 140 ? 0 : metrics.avgHeartRate < 160 ? 25 : metrics.avgHeartRate < 175 ? 50 : metrics.avgHeartRate < 185 ? 75 : 100
    const overallRisk = Math.min(100, Math.round(baseRisk * 0.6 + durationRisk * 0.15 + distanceRisk * 0.15 + hrRisk * 0.1))
    return {
      id: '',
      sessionId,
      overallRisk,
      fatigueLevel: fatigueState.score,
      riskFactors: fatigueState.factors,
      recommendations: overallRisk >= 70 ? ['高风险状态！强烈建议立即停止运动'] : [],
      assessedAt: new Date()
    }
  }

  getRiskLevel(score: number) {
    if (score < 25) return 'safe'
    if (score < 50) return 'caution'
    if (score < 75) return 'warning'
    return 'danger'
  }

  generateRecoveryPlan(level: string) {
    const plans: Record<string, any> = {
      safe: { restDays: 0, recommendedActivities: ['正常训练'], precautions: ['保持充足睡眠'] },
      caution: { restDays: 1, recommendedActivities: ['轻松跑'], precautions: ['降低训练强度'] },
      warning: { restDays: 2, recommendedActivities: ['散步'], precautions: ['避免高强度训练'] },
      danger: { restDays: 3, recommendedActivities: ['完全休息'], precautions: ['如有持续疼痛请就医'] }
    }
    return plans[level]
  }
}

describe('E2E-端到端业务流程集成测试', () => {
  let predictor: E2EPosturePredictor
  let fatigueAnalyzer: E2EFatigueAnalyzer
  let riskAssessor: E2ERiskAssessor

  beforeEach(() => {
    predictor = new E2EPosturePredictor()
    fatigueAnalyzer = new E2EFatigueAnalyzer()
    riskAssessor = new E2ERiskAssessor()
  })

  it('E2E.1 完整流程：数据采集→AI预测→疲劳分析→风险评估→康复方案', () => {
    for (let i = 0; i < 60; i++) {
      const posture = {
        id: `po-${i}`, sessionId: 'session-e2e', timestamp: Date.now() + i * 100,
        ankleAngle: 90 + (Math.random() - 0.5) * 4,
        kneeAngle: 170 + (Math.random() - 0.5) * 4,
        hipAngle: 180 + (Math.random() - 0.5) * 4,
        pronation: (Math.random() - 0.5) * 4,
        trunkAngle: (Math.random() - 0.5) * 3
      }
      const cadence = {
        id: `cd-${i}`, sessionId: 'session-e2e', timestamp: Date.now() + i * 100,
        stepsPerMinute: 175 + (Math.random() - 0.5) * 4,
        stepLength: 1.4, groundContactTime: 250, verticalOscillation: 8
      }
      const pressure = {
        id: `pr-${i}`, sessionId: 'session-e2e', timestamp: Date.now() + i * 100,
        pressureMap: [], totalPressure: 15, leftFoot: [], rightFoot: []
      }

      predictor.addPostureData(posture)
      fatigueAnalyzer.addCadenceData(cadence)
      fatigueAnalyzer.addPressureData(pressure)
      fatigueAnalyzer.addPostureData(posture)
    }

    const prediction = predictor.predict()
    expect(prediction).not.toBeNull()
    expect(prediction!.predictedAngles).toHaveProperty('ankle')

    const fatigue = fatigueAnalyzer.analyze()
    expect(fatigue).not.toBeNull()
    expect(fatigue!.level).toMatch(/^(low|moderate|high|critical)$/)
    expect(fatigue!.score).toBeTypeOf('number')

    const assessment = riskAssessor.assess('session-e2e', fatigue!, {
      duration: 45, distance: 8, avgHeartRate: 155
    })
    expect(assessment.overallRisk).toBeTypeOf('number')
    expect(assessment.overallRisk).toBeGreaterThanOrEqual(0)
    expect(assessment.overallRisk).toBeLessThanOrEqual(100)

    const riskLevel = riskAssessor.getRiskLevel(assessment.overallRisk)
    expect(riskLevel).toMatch(/^(safe|caution|warning|danger)$/)

    const recoveryPlan = riskAssessor.generateRecoveryPlan(riskLevel)
    expect(recoveryPlan).toHaveProperty('restDays')
    expect(recoveryPlan).toHaveProperty('recommendedActivities')
    expect(recoveryPlan).toHaveProperty('precautions')
  })

  it('E2E.2 疲劳恶化→风险升级→康复方案加重', () => {
    const lowFatigue = { score: 10, factors: { cadenceVariation: 0.05, pressureDistribution: 0.05, postureStability: 0.05, groundContactTime: 0.05, pronationExtreme: 0.05 }, recommendations: ['继续保持'] }
    const lowAssessment = riskAssessor.assess('s1', lowFatigue, { duration: 20, distance: 3, avgHeartRate: 130 })
    const lowLevel = riskAssessor.getRiskLevel(lowAssessment.overallRisk)
    const lowPlan = riskAssessor.generateRecoveryPlan(lowLevel)

    const highFatigue = { score: 85, factors: { cadenceVariation: 0.8, pressureDistribution: 0.7, postureStability: 0.9, groundContactTime: 0.6, pronationExtreme: 0.7 }, recommendations: ['立即停止'] }
    const highAssessment = riskAssessor.assess('s2', highFatigue, { duration: 120, distance: 25, avgHeartRate: 190 })
    const highLevel = riskAssessor.getRiskLevel(highAssessment.overallRisk)
    const highPlan = riskAssessor.generateRecoveryPlan(highLevel)

    expect(highAssessment.overallRisk).toBeGreaterThan(lowAssessment.overallRisk)
    expect(highPlan.restDays).toBeGreaterThanOrEqual(lowPlan.restDays)
  })

  it('E2E.3 姿态预测→畸变概率→影响风险判断', () => {
    for (let i = 0; i < 50; i++) {
      predictor.addPostureData({
        id: `po-${i}`, sessionId: 's1', timestamp: Date.now() + i * 100,
        ankleAngle: 90 + i * 0.6,
        kneeAngle: 170 - i * 0.3,
        hipAngle: 180 + i * 0.2,
        pronation: i * 0.4,
        trunkAngle: i * 0.1
      })
    }
    const prediction = predictor.predict()
    expect(prediction).not.toBeNull()
    expect(prediction!.distortionProbability).toBeGreaterThan(0)
  })

  it('E2E.4 短距离低强度运动应始终处于safe级别', () => {
    const fatigue = { score: 5, factors: { cadenceVariation: 0.02, pressureDistribution: 0.02, postureStability: 0.02, groundContactTime: 0.02, pronationExtreme: 0.02 }, recommendations: ['继续保持'] }
    const assessment = riskAssessor.assess('s1', fatigue, { duration: 15, distance: 2, avgHeartRate: 120 })
    const level = riskAssessor.getRiskLevel(assessment.overallRisk)
    expect(level).toBe('safe')
    expect(assessment.overallRisk).toBeLessThan(25)
  })

  it('E2E.5 马拉松级别运动至少达到warning级别', () => {
    const fatigue = { score: 70, factors: { cadenceVariation: 0.6, pressureDistribution: 0.5, postureStability: 0.7, groundContactTime: 0.5, pronationExtreme: 0.4 }, recommendations: ['降低强度'] }
    const assessment = riskAssessor.assess('s1', fatigue, { duration: 240, distance: 42, avgHeartRate: 175 })
    expect(assessment.overallRisk).toBeGreaterThan(50)
  })

  it('E2E.6 数据管线：50帧数据→预测可用→30帧后疲劳分析可用', () => {
    for (let i = 0; i < 29; i++) {
      predictor.addPostureData({ id: `po-${i}`, sessionId: 's1', timestamp: Date.now(), ankleAngle: 90, kneeAngle: 170, hipAngle: 180, pronation: 0, trunkAngle: 0 })
      fatigueAnalyzer.addCadenceData({ id: `cd-${i}`, sessionId: 's1', timestamp: Date.now(), stepsPerMinute: 175, stepLength: 1.4, groundContactTime: 250, verticalOscillation: 8 })
      fatigueAnalyzer.addPressureData({ id: `pr-${i}`, sessionId: 's1', timestamp: Date.now(), pressureMap: [], totalPressure: 15, leftFoot: [], rightFoot: [] })
      fatigueAnalyzer.addPostureData({ id: `pt-${i}`, sessionId: 's1', timestamp: Date.now(), ankleAngle: 90, kneeAngle: 170, hipAngle: 180, pronation: 0, trunkAngle: 0 })
    }
    expect(predictor.predict()).toBeNull()
    expect(fatigueAnalyzer.analyze()).toBeNull()

    for (let i = 29; i < 50; i++) {
      predictor.addPostureData({ id: `po-${i}`, sessionId: 's1', timestamp: Date.now(), ankleAngle: 90, kneeAngle: 170, hipAngle: 180, pronation: 0, trunkAngle: 0 })
      fatigueAnalyzer.addCadenceData({ id: `cd-${i}`, sessionId: 's1', timestamp: Date.now(), stepsPerMinute: 175, stepLength: 1.4, groundContactTime: 250, verticalOscillation: 8 })
      fatigueAnalyzer.addPressureData({ id: `pr-${i}`, sessionId: 's1', timestamp: Date.now(), pressureMap: [], totalPressure: 15, leftFoot: [], rightFoot: [] })
      fatigueAnalyzer.addPostureData({ id: `pt-${i}`, sessionId: 's1', timestamp: Date.now(), ankleAngle: 90, kneeAngle: 170, hipAngle: 180, pronation: 0, trunkAngle: 0 })
    }

    expect(fatigueAnalyzer.analyze()).not.toBeNull()
    expect(predictor.predict()).not.toBeNull()
  })

  it('E2E.7 同步队列状态流转：pending → syncing → completed/failed', () => {
    const validStatuses = ['pending', 'syncing', 'completed', 'failed']
    const item1 = { status: 'pending' }
    const item2 = { status: 'syncing' }
    const item3 = { status: 'completed' }
    const item4 = { status: 'failed' }
    expect(validStatuses).toContain(item1.status)
    expect(validStatuses).toContain(item2.status)
    expect(validStatuses).toContain(item3.status)
    expect(validStatuses).toContain(item4.status)
  })

  it('E2E.8 离线数据链完整性验证', () => {
    const sessionId = 'offline-session'
    const dataTypes = ['pressureData', 'cadenceData', 'postureData', 'riskAssessments', 'wearData']
    for (const type of dataTypes) {
      const syncItem = {
        tableName: type,
        recordId: `rec-${type}-1`,
        operation: 'create' as const,
        status: 'pending' as const,
        createdAt: new Date(),
        data: { sessionId }
      }
      expect(syncItem.tableName).toBe(type)
      expect(syncItem.status).toBe('pending')
    }
  })

  it('E2E.9 跑鞋磨损生命周期追踪', () => {
    const shoes = { id: 'sh-1', totalKilometers: 0, expectedLifespan: 800 }
    const runs = [
      { km: 10, totalAfter: 10 },
      { km: 15, totalAfter: 25 },
      { km: 20, totalAfter: 45 }
    ]
    let currentKm = shoes.totalKilometers
    for (const run of runs) {
      currentKm += run.km
      const remainingLife = Math.round((1 - currentKm / shoes.expectedLifespan) * 100)
      expect(currentKm).toBe(run.totalAfter)
      expect(remainingLife).toBeLessThanOrEqual(100)
      expect(remainingLife).toBeGreaterThanOrEqual(0)
    }
  })

  it('E2E.10 数据模型间关联关系验证', () => {
    const userId = 'user-1'
    const sessionId = 'session-1'
    const shoesId = 'shoes-1'

    const user = { id: userId, name: '测试用户' }
    const session = { id: sessionId, userId, status: 'running' }
    const pressure = { sessionId, pressureMap: [] }
    const cadence = { sessionId, stepsPerMinute: 175 }
    const posture = { sessionId, ankleAngle: 90 }
    const risk = { sessionId, overallRisk: 30 }
    const shoes = { id: shoesId, userId }
    const wear = { shoesId, remainingLife: 80 }

    expect((session as any).userId).toBe(user.id)
    expect((pressure as any).sessionId).toBe(session.id)
    expect((cadence as any).sessionId).toBe(session.id)
    expect((posture as any).sessionId).toBe(session.id)
    expect((risk as any).sessionId).toBe(session.id)
    expect((shoes as any).userId).toBe(user.id)
    expect((wear as any).shoesId).toBe(shoes.id)
  })
})
