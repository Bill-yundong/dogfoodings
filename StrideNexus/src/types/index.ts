export interface User {
  id: string
  name: string
  email: string
  weight: number
  height: number
  createdAt: Date
}

export interface RunSession {
  id: string
  userId: string
  startTime: Date
  endTime?: Date
  distance: number
  averageCadence: number
  status: 'running' | 'paused' | 'completed'
}

export interface PressurePoint {
  x: number
  y: number
  pressure: number
}

export interface PressureData {
  id: string
  sessionId: string
  timestamp: number
  pressureMap: PressurePoint[]
  totalPressure: number
  leftFoot: PressurePoint[]
  rightFoot: PressurePoint[]
}

export interface CadenceData {
  id: string
  sessionId: string
  timestamp: number
  stepsPerMinute: number
  stepLength: number
  groundContactTime: number
  verticalOscillation: number
}

export interface PostureData {
  id: string
  sessionId: string
  timestamp: number
  ankleAngle: number
  kneeAngle: number
  hipAngle: number
  pronation: number
  trunkAngle: number
}

export interface RiskFactors {
  cadenceVariation: number
  pressureDistribution: number
  postureStability: number
  groundContactTime: number
  pronationExtreme: number
}

export interface RiskAssessment {
  id: string
  sessionId: string
  overallRisk: number
  fatigueLevel: number
  riskFactors: RiskFactors
  recommendations: string[]
  assessedAt: Date
}

export interface Shoes {
  id: string
  userId: string
  brand: string
  model: string
  purchaseDate: Date
  totalKilometers: number
  expectedLifespan: number
  nickname?: string
}

export interface WearRegion {
  region: string
  wearPercentage: number
  pressure: number
}

export interface WearData {
  id: string
  shoesId: string
  recordedAt: Date
  heelWear: WearRegion[]
  forefootWear: WearRegion[]
  midsoleWear: WearRegion[]
  remainingLife: number
}

export interface SyncQueueItem {
  id: string
  tableName: string
  recordId: string
  operation: 'create' | 'update' | 'delete'
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  createdAt: Date
  syncedAt?: Date
  data: any
}

export interface PosturePrediction {
  timestamp: number
  predictedAngles: {
    ankle: number
    knee: number
    hip: number
  }
  distortionProbability: number
  confidence: number
}

export type FatigueLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface FatigueState {
  level: FatigueLevel
  score: number
  factors: RiskFactors
  recommendations: string[]
}

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger'

export interface WearSyncState {
  lastSyncTimestamp: number
  pendingRecords: number
  syncProgress: number
  conflicts: Array<{
    recordId: string
    localVersion: any
    remoteVersion: any
    resolution: 'local' | 'remote' | 'manual'
  }>
}
