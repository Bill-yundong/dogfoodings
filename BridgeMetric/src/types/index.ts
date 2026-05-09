export type SensorType = 'strain_gauge' | 'displacement' | 'acceleration' | 'temperature'

export type BridgeStructureType = 'main_girder' | 'pier' | 'cable' | 'deck' | 'bearing'

export type HealthStatus = 'normal' | 'warning' | 'danger' | 'critical'

export type SystemType = 'operation_center' | 'emergency_command'

export interface SensorData {
  id: string
  sensorId: string
  type: SensorType
  bridgeStructureType: BridgeStructureType
  timestamp: number
  value: number
  unit: string
  temperature?: number
  rawValue?: number
  calibratedValue?: number
  metadata?: Record<string, any>
}

export interface SensorInfo {
  id: string
  name: string
  type: SensorType
  location: {
    x: number
    y: number
    z: number
    structureType: BridgeStructureType
    description: string
  }
  calibration: {
    offset: number
    scale: number
    temperatureCoefficient: number
  }
  thresholds: {
    warning: number
    danger: number
    critical: number
  }
  installationDate: number
  lastCalibrationDate: number
}

export interface SemanticMapping {
  operationCenter: Record<string, string>
  emergencyCommand: Record<string, string>
}

export interface NormalizedData {
  sensorId: string
  timestamp: number
  semanticType: string
  value: number
  unit: string
  healthStatus: HealthStatus
  description: string
  recommendations: string[]
}

export interface BridgePose {
  timestamp: number
  deformations: {
    [key: string]: {
      dx: number
      dy: number
      dz: number
    }
  }
  stresses: {
    [key: string]: number
  }
  overallHealthScore: number
}

export interface HealthRecord {
  id: string
  timestamp: number
  sensorId: string
  sensorType: SensorType
  structureType: BridgeStructureType
  value: number
  unit: string
  healthStatus: HealthStatus
  threshold: {
    warning: number
    danger: number
    critical: number
  }
  metadata?: Record<string, any>
}

export interface DailyHealthReport {
  date: string
  bridgeId: string
  averageHealthScore: number
  sensorCount: number
  anomalyCount: number
  criticalAlerts: number
  topConcerns: {
    sensorId: string
    structureType: BridgeStructureType
    maxValue: number
    status: HealthStatus
  }[]
}
