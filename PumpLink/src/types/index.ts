export type DeviceStatus = 'running' | 'standby' | 'maintenance' | 'fault'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export type FaultSeverity = 'minor' | 'moderate' | 'severe' | 'catastrophic'

export interface PumpDevice {
  id: string
  name: string
  model: string
  location: string
  region: string
  installDate: string
  ratedPower: number
  ratedFlow: number
  ratedHead: number
  currentStatus: DeviceStatus
  healthScore: number
  lastSnapshotTime: string
  sensorIds: string[]
  coordinates: {
    lat: number
    lng: number
  }
}

export interface VibrationSignal {
  id: string
  deviceId: string
  sensorId: string
  timestamp: number
  samplingRate: number
  duration: number
  rawData: Float32Array
  frequencyDomain: {
    frequencies: number[]
    amplitudes: number[]
  }
  waveletResult: WaveletCoefficient[][]
}

export interface WaveletCoefficient {
  scale: number
  time: number
  value: number
}

export interface WaveletResult {
  scales: number[]
  times: number[]
  coefficients: number[][]
}

export interface HealthSnapshot {
  id: string
  deviceId: string
  timestamp: number
  healthScore: number
  vibrationFeatures: VibrationFeatures
  cavitationRisk: CavitationRisk
  recommendations: string[]
}

export interface VibrationFeatures {
  rms: number
  peak: number
  crestFactor: number
  kurtosis: number
  skewness: number
  peakFrequency: number
  harmonicRatio: number
}

export interface CavitationRisk {
  level: RiskLevel
  probability: number
  factors: RiskFactor[]
  trend: 'improving' | 'stable' | 'deteriorating'
}

export interface RiskFactor {
  name: string
  weight: number
  value: number
  threshold: number
  unit: string
}

export interface FaultChain {
  id: string
  deviceId: string
  rootCause: FaultNode
  propagationPath: FaultEdge[]
  nodes: FaultNode[]
  affectedComponents: string[]
  estimatedTimeToFailure: number
  severity: FaultSeverity
  confidence: number
}

export interface FaultNode {
  id: string
  type: 'cause' | 'effect' | 'symptom'
  component: string
  description: string
  probability: number
  timePoint: number
  x?: number
  y?: number
}

export interface FaultEdge {
  from: string
  to: string
  relationship: string
  delay: number
  confidence: number
}

export interface Alert {
  id: string
  deviceId: string
  deviceName: string
  severity: AlertSeverity
  title: string
  description: string
  timestamp: number
  status: 'pending' | 'acknowledged' | 'resolved'
  acknowledgedBy?: string
  acknowledgedAt?: number
  resolvedAt?: number
}

export interface RegionStats {
  region: string
  deviceCount: number
  avgHealthScore: number
  runningCount: number
  warningCount: number
  faultCount: number
}
