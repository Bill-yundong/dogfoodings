export interface SensorData {
  timestamp: number
  temperature: number
  humidity: number
  windSpeed: number
  altitude: number
}

export interface IcingPrediction {
  timestamp: number
  icingMass: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
}

export interface IcingEvent {
  id?: number
  startTime: number
  endTime: number
  maxIcingMass: number
  averageTemperature: number
  averageHumidity: number
  windFarmId: string
  turbineId: string
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  maintenanceCost: number
}

export interface SyncStatus {
  lastSync: number
  platformConnected: boolean
  deicingSystemConnected: boolean
}

export interface ThermalConvectionParams {
  thermalConductivity: number
  convectionCoefficient: number
  surfaceArea: number
  bladeThickness: number
}