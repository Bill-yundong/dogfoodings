export interface GeoPoint {
  lat: number
  lng: number
}

export interface MonitoringStation extends GeoPoint {
  id: string
  name: string
  pm25: number
  timestamp: number
}

export interface WeatherData extends GeoPoint {
  id: string
  timestamp: number
  windSpeed: number
  windDirection: number
  temperature: number
  humidity: number
  pressure: number
}

export interface Particle {
  id: string
  lat: number
  lng: number
  pm25: number
  age: number
  sourceId: string
  velocity: { u: number; v: number }
}

export interface InterpolationResult {
  grid: GridPoint[][]
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  resolution: number
  timestamp: number
}

export interface GridPoint extends GeoPoint {
  pm25: number
  variance?: number
}

export interface SimulationConfig {
  timeStep: number
  particleCount: number
  diffusionCoefficient: number
  advectionWeight: number
  decayRate: number
}

export interface TraceResult {
  sourceId: string
  contribution: number
  path: GeoPoint[]
  startTime: number
  endTime: number
}

export interface ComputationPlugin<T = unknown, R = unknown> {
  id: string
  name: string
  version: string
  description: string
  type: 'interpolation' | 'simulation' | 'analysis' | 'preprocessing'
  dependencies?: string[]
  execute: (input: T, context?: ExecutionContext) => Promise<R>
  validate?: (input: T) => boolean
}

export interface ExecutionContext {
  signal?: AbortSignal
  progress?: (current: number, total: number) => void
  db?: IDBDatabase
}

export interface PluginRegistry {
  register: (plugin: ComputationPlugin) => void
  unregister: (pluginId: string) => void
  get: (pluginId: string) => ComputationPlugin | undefined
  list: () => ComputationPlugin[]
  execute: <T, R>(pluginId: string, input: T, context?: ExecutionContext) => Promise<R>
}

export interface WindField {
  getVelocity: (lat: number, lng: number, time: number) => { u: number; v: number }
  update: (weatherData: WeatherData[]) => void
}
