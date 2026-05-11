export interface SoilLayer {
  id: string
  depth: number
  thickness: number
  name: string
  color: string
  porosity: number
  bulkDensity: number
  organicMatter: number
  ph: number
}

export interface HeavyMetal {
  name: string
  symbol: string
  concentration: number
  unit: string
  threshold: number
  color: string
}

export interface SamplingPoint {
  id: string
  name: string
  lng: number
  lat: number
  altitude: number
  layers: SoilLayer[]
  heavyMetals: HeavyMetal[]
  samplingDate: string
  qualityGrade: 'excellent' | 'good' | 'moderate' | 'poor' | 'severe'
}

export interface SimulationParams {
  diffusionCoefficient: number
  advectionVelocity: number
  retardationFactor: number
  decayCoefficient: number
  timeStep: number
  totalTime: number
  sourceConcentration: number
  sourceDepth: number
}

export interface SimulationResult {
  time: number
  depths: number[]
  concentrations: number[]
  maxConcentration: number
  plumeFront: number
}

export interface SpatialTemporalData {
  id?: number
  pointId: string
  year: number
  month: number
  data: SamplingPoint
  createdAt?: Date
}

export type MountTarget = 'agriculture_bureau' | 'land_regulation' | 'both'

export interface MountConfig {
  target: MountTarget
  apiEndpoint?: string
  permissions: string[]
  theme?: 'light' | 'dark'
}
