export interface CellData {
  id: string
  moduleId: number
  row: number
  col: number
  voltage: number
  temperature: number
  soc: number
  internalResistance: number
  status: 'normal' | 'warning' | 'thermal_runaway'
  timestamp: number
}

export interface BatteryModule {
  id: number
  name: string
  cellCount: number
  cells: CellData[]
}

export interface BatteryPack {
  id: string
  name: string
  model: string
  moduleCount: number
  cellCount: number
  capacity: number
  voltage: number
  modules: BatteryModule[]
}

export interface ThermalSnapshot {
  id: string
  timestamp: number
  packId: string
  cellsData: CellData[]
  status: 'normal' | 'warning' | 'critical'
}

export interface Alarm {
  id: string
  type: 'temperature' | 'voltage' | 'thermal_runaway' | 'fire'
  level: 'info' | 'warning' | 'critical'
  cellId?: string
  moduleId?: number
  message: string
  timestamp: number
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
}

export interface ArrheniusParams {
  activationEnergy: number
  preExponentialFactor: number
  gasConstant: number
  initialTemperature: number
  heatCapacity: number
  thermalConductivity: number
  mass: number
  reactionHeat: number
  volume: number
}

export interface ThermalRunawayPrediction {
  cellId: string
  timeToRunaway: number
  temperatureCurve: number[]
  timePoints: number[]
  criticalTemperature: number
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
}

export interface SemanticTag {
  id: string
  domain: 'bms' | 'fire'
  label: string
  unit?: string
  dataType: 'number' | 'boolean' | 'string' | 'enum'
  thresholds?: Threshold[]
}

export interface Threshold {
  min?: number
  max?: number
  level: 'normal' | 'warning' | 'critical'
}

export interface MappingRule {
  id: string
  source: string
  target: string
  transformType: 'direct' | 'linear' | 'threshold' | 'custom'
  transformConfig?: Record<string, any>
  condition?: string
  enabled: boolean
  description: string
}

export interface FireControlSignal {
  id: string
  target: string
  action: string
  value?: any
  level: 'info' | 'warning' | 'critical'
  timestamp: number
}

export interface PowerStation {
  id: string
  name: string
  location: {
    lat: number
    lng: number
    address: string
  }
  capacity: number
  packCount: number
  status: 'online' | 'offline' | 'warning' | 'critical'
  lastUpdate: number
}

export interface LinkageRule {
  id: string
  name: string
  description: string
  condition: {
    type: 'temperature' | 'voltage' | 'prediction'
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between'
    threshold: number | [number, number]
    duration?: number
  }
  actions: {
    type: 'alarm' | 'fire_control' | 'shutdown' | 'notification'
    target: string
    config?: Record<string, any>
  }[]
  enabled: boolean
}

export interface WorkerMessage {
  type: 'calculate' | 'cancel' | 'progress'
  payload?: any
}

export interface WorkerResult {
  type: 'result' | 'error' | 'progress'
  payload: any
}
