export interface TLEData {
  name: string
  line1: string
  line2: string
}

export interface Satellite {
  id: string
  name: string
  tle: TLEData
  color: string
  active: boolean
}

export interface GroundStation {
  id: string
  name: string
  latitude: number
  longitude: number
  elevation: number
  minElevationAngle: number
  color: string
}

export interface OrbitState {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  timestamp: number
}

export interface TrajectoryPoint {
  latitude: number
  longitude: number
  timestamp: number
}

export interface VisibilityWindow {
  id: string
  satelliteId: string
  satelliteName: string
  stationId: string
  stationName: string
  startTime: number
  endTime: number
  maxElevation: number
  azimuthStart: number
  azimuthEnd: number
}

export interface SatellitePosition {
  satelliteId: string
  state: OrbitState
  trajectory: TrajectoryPoint[]
}

export interface SimulationConfig {
  timeSpeed: number
  trajectoryPoints: number
  predictionHours: number
  updateInterval: number
}

export interface WorkerMessage {
  type: 'initialize' | 'update' | 'predictVisibility' | 'dispose' | 'start' | 'stop' | 'updateConfig'
  payload?: unknown
}

export interface WorkerResponse {
  type: 'positions' | 'visibility' | 'error'
  payload?: unknown
}

export interface OrbitCalculationResult {
  positions: SatellitePosition[]
  timestamp: number
}

export interface VisibilityCalculationResult {
  windows: VisibilityWindow[]
  calculationTime: number
}

export interface DBVisibilitySnapshot {
  id?: string
  timestamp: number
  windows: VisibilityWindow[]
  stationIds: string[]
  satelliteIds: string[]
  timeRange: {
    start: number
    end: number
  }
}
