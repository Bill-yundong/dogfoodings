export interface Position {
  x: number
  y: number
}

export interface Dune {
  id: string
  position: Position
  height: number
  volume: number
  migrationRate: number
  direction: number
}

export interface VegetationZone {
  id: string
  position: Position
  radius: number
  coverage: number
  type: 'shrub' | 'tree' | 'grass'
  growthRate: number
}

export interface EngineeringProject {
  id: string
  name: string
  contractor: string
  forestryBureau: string
  startDate: Date
  endDate: Date
  status: 'planning' | 'in-progress' | 'completed'
  vegetationZones: VegetationZone[]
  targetCoverage: number
}

export interface SiteSnapshot {
  id: string
  siteId: string
  timestamp: Date
  dunes: Dune[]
  vegetationZones: VegetationZone[]
  weatherData: WeatherData
  coverageRate: number
}

export interface WeatherData {
  windSpeed: number
  windDirection: number
  precipitation: number
  temperature: number
}

export interface SimulationConfig {
  timeScale: number
  windIntensity: number
  erosionFactor: number
  depositionFactor: number
}

export interface SemanticSyncState {
  lastSync: Date | null
  forestryBureauVersion: string
  contractorVersion: string
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  id: string
  field: string
  forestryBureauValue: unknown
  contractorValue: unknown
  resolved: boolean
}

export interface TimeSeriesPoint {
  id?: string
  timestamp: number
  value: number
  siteId: string
  metric: string
}