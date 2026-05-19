export type AtmosphericStability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface GaussianParams {
  sourceStrength: number
  releaseHeight: number
  windSpeed: number
  windDirection: number
  temperature: number
  humidity: number
  atmosphericStability: AtmosphericStability
  diffusionCoefficient: number
  decayRate: number
}

export interface DiffusionResult {
  timestamp: number
  gridSize: {
    width: number
    height: number
    resolution: number
  }
  origin: {
    x: number
    y: number
  }
  concentrationGrid: number[][]
  riskZones: RiskZone[]
  maxConcentration: number
  affectedArea: number
}

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger' | 'extreme'

export interface RiskZone {
  level: RiskLevel
  concentration: number
  color: string
  polygon: { x: number; y: number }[]
}

export interface WeatherRecord {
  id: string
  timestamp: number
  windSpeed: number
  windDirection: number
  temperature: number
  humidity: number
  pressure: number
  atmosphericStability: AtmosphericStability
}

export interface SimulationRecord {
  id: string
  startTime: number
  endTime?: number
  tankId: string
  tankName: string
  chemical: string
  params: GaussianParams
  status: 'running' | 'paused' | 'completed' | 'stopped'
  results: DiffusionResult[]
  affectedTerminals: string[]
}

export interface DiffusionParameters {
  sigmaY: number
  sigmaZ: number
  a: number
  b: number
  c: number
  d: number
}
