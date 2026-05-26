export type FluidType = 'LOX' | 'LH2'

export type FillingPhase = 
  | 'IDLE'
  | 'PRECOOLING'
  | 'SLOW_FILL'
  | 'FAST_FILL'
  | 'TOP_OFF'
  | 'PRESSURIZING'
  | 'READY'
  | 'EMERGENCY_STOP'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export type ValveState = 'OPEN' | 'CLOSED' | 'TRANSITIONING'

export interface SolverConfig {
  pipeLength: number
  pipeDiameter: number
  fluidType: FluidType
  initialPressure: number
  initialTemperature: number
  massFlowRate: number
}

export interface SolverOutput {
  timestamp: number
  pressureProfile: Float32Array
  temperatureProfile: Float32Array
  velocityProfile: Float32Array
  voidFractionProfile: Float32Array
  waterHammerRisk: number
  maxPressureGradient: number
}

export interface PropellantRecord {
  id?: number
  timestamp: number
  phase: FillingPhase
  oxygenTankPressure: number
  hydrogenTankPressure: number
  oxygenLinePressure: number
  hydrogenLinePressure: number
  oxygenTemperature: number
  hydrogenTemperature: number
  oxygenFlowRate: number
  hydrogenFlowRate: number
  oxygenFillLevel: number
  hydrogenFillLevel: number
  valveStates: string
  waterHammerRisk: number
  temperatureGradient: number
  pressureDifference: number
}

export interface EventLog {
  id?: number
  eventTimestamp: number
  eventType: string
  eventSeverity: EventSeverity
  eventDescription: string
  relatedParameters: string
  acknowledged: boolean
}

export interface SimulationSession {
  id?: number
  sessionName: string
  startTime: number
  endTime?: number
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED'
  configJson: string
}

export interface ValveConfig {
  id: string
  name: string
  line: 'OXYGEN' | 'HYDROGEN'
  state: ValveState
  position: number
}

export interface SimulationState {
  isRunning: boolean
  isPaused: boolean
  currentPhase: FillingPhase
  countdown: number
  startTime: number | null
  oxygen: {
    tankPressure: number
    linePressure: number
    temperature: number
    flowRate: number
    fillLevel: number
    targetLevel: number
  }
  hydrogen: {
    tankPressure: number
    linePressure: number
    temperature: number
    flowRate: number
    fillLevel: number
    targetLevel: number
  }
  valves: ValveConfig[]
  waterHammerRisk: number
  temperatureGradient: number
  pressureDifference: number
  healthIndex: number
  events: EventLog[]
}

export interface NormalizedParameter {
  name: string
  value: number
  unit: string
  min: number
  max: number
  normalized: number
  modules: string[]
}

export interface WaveformData {
  timestamp: number
  values: Record<string, number>
}

export type FaultType = 
  | 'WATER_HAMMER'
  | 'OVER_TEMPERATURE'
  | 'OVER_PRESSURE'
  | 'LEAKAGE'
  | 'VALVE_STUCK'
  | 'PUMP_FAILURE'
  | 'SENSOR_FAILURE'

export interface FaultConfig {
  type: FaultType
  name: string
  description: string
  severity: EventSeverity
  targetLine?: 'OXYGEN' | 'HYDROGEN' | 'BOTH'
  intensity: number
  duration: number
  startTime?: number
  probability: number
}

export interface ActiveFault {
  id: string
  config: FaultConfig
  startTime: number
  endTime: number
  isActive: boolean
  triggered: boolean
}

export interface SimulationConfig {
  autoAdvancePhase: boolean
  autoValveControl: boolean
  enableFaultInjection: boolean
  simulationSpeed: number
  faultProbability: number
  targetDuration: number
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  autoAdvancePhase: true,
  autoValveControl: true,
  enableFaultInjection: true,
  simulationSpeed: 1,
  faultProbability: 0.3,
  targetDuration: 600000
}

export const FAULT_TEMPLATES: Record<FaultType, Omit<FaultConfig, 'startTime'>> = {
  WATER_HAMMER: {
    type: 'WATER_HAMMER',
    name: '水锤冲击',
    description: '阀门快速切换导致压力波在管路中传播',
    severity: 'CRITICAL',
    targetLine: 'BOTH',
    intensity: 0.7,
    duration: 10000,
    probability: 0.1
  },
  OVER_TEMPERATURE: {
    type: 'OVER_TEMPERATURE',
    name: '温度超限',
    description: '预冷不充分导致推进剂温度升高',
    severity: 'WARNING',
    targetLine: 'BOTH',
    intensity: 0.5,
    duration: 30000,
    probability: 0.15
  },
  OVER_PRESSURE: {
    type: 'OVER_PRESSURE',
    name: '压力超限',
    description: '管路压力超过安全阈值',
    severity: 'ERROR',
    targetLine: 'BOTH',
    intensity: 0.6,
    duration: 15000,
    probability: 0.12
  },
  LEAKAGE: {
    type: 'LEAKAGE',
    name: '管路泄漏',
    description: '密封失效导致推进剂泄漏',
    severity: 'ERROR',
    targetLine: 'OXYGEN',
    intensity: 0.4,
    duration: 45000,
    probability: 0.08
  },
  VALVE_STUCK: {
    type: 'VALVE_STUCK',
    name: '阀门卡涩',
    description: '阀门无法正常开关',
    severity: 'WARNING',
    targetLine: 'BOTH',
    intensity: 0.8,
    duration: 20000,
    probability: 0.1
  },
  PUMP_FAILURE: {
    type: 'PUMP_FAILURE',
    name: '泵故障',
    description: '加注泵输出功率下降',
    severity: 'ERROR',
    targetLine: 'BOTH',
    intensity: 0.9,
    duration: 60000,
    probability: 0.05
  },
  SENSOR_FAILURE: {
    type: 'SENSOR_FAILURE',
    name: '传感器故障',
    description: '传感器读数异常',
    severity: 'WARNING',
    targetLine: 'BOTH',
    intensity: 0.3,
    duration: 25000,
    probability: 0.1
  }
}

export const PHASE_TRANSITION_CONDITIONS: Record<FillingPhase, {
  minDuration: number
  conditions: Partial<{
    oxygenTemp: number
    hydrogenTemp: number
    oxygenFillLevel: number
    hydrogenFillLevel: number
    oxygenPressure: number
    hydrogenPressure: number
  }>
}> = {
  IDLE: {
    minDuration: 0,
    conditions: {}
  },
  PRECOOLING: {
    minDuration: 60000,
    conditions: {
      oxygenTemp: 100,
      hydrogenTemp: 25
    }
  },
  SLOW_FILL: {
    minDuration: 45000,
    conditions: {
      oxygenFillLevel: 15
    }
  },
  FAST_FILL: {
    minDuration: 120000,
    conditions: {
      oxygenFillLevel: 90
    }
  },
  TOP_OFF: {
    minDuration: 30000,
    conditions: {
      oxygenFillLevel: 98,
      hydrogenFillLevel: 98
    }
  },
  PRESSURIZING: {
    minDuration: 20000,
    conditions: {
      oxygenPressure: 0.6,
      hydrogenPressure: 0.5
    }
  },
  READY: {
    minDuration: 0,
    conditions: {}
  },
  EMERGENCY_STOP: {
    minDuration: 0,
    conditions: {}
  }
}

export const FLUID_PROPERTIES: Record<FluidType, {
  density: number
  specificHeat: number
  thermalConductivity: number
  viscosity: number
  soundSpeed: number
  boilingPoint: number
}> = {
  LOX: {
    density: 1141,
    specificHeat: 1710,
    thermalConductivity: 0.15,
    viscosity: 0.000188,
    soundSpeed: 1150,
    boilingPoint: 90.19
  },
  LH2: {
    density: 70.85,
    specificHeat: 10000,
    thermalConductivity: 0.098,
    viscosity: 0.000014,
    soundSpeed: 1100,
    boilingPoint: 20.27
  }
}

export const FILLING_PHASE_CONFIG: Record<FillingPhase, {
  name: string
  oxygenFlowRate: number
  hydrogenFlowRate: number
  targetTemp: number
  duration: number
}> = {
  IDLE: {
    name: '待机',
    oxygenFlowRate: 0,
    hydrogenFlowRate: 0,
    targetTemp: 293,
    duration: 0
  },
  PRECOOLING: {
    name: '预冷',
    oxygenFlowRate: 2,
    hydrogenFlowRate: 1,
    targetTemp: 100,
    duration: 300000
  },
  SLOW_FILL: {
    name: '低速加注',
    oxygenFlowRate: 5,
    hydrogenFlowRate: 2.5,
    targetTemp: 90,
    duration: 180000
  },
  FAST_FILL: {
    name: '高速加注',
    oxygenFlowRate: 12,
    hydrogenFlowRate: 6,
    targetTemp: 85,
    duration: 420000
  },
  TOP_OFF: {
    name: '补加加注',
    oxygenFlowRate: 3,
    hydrogenFlowRate: 1.5,
    targetTemp: 88,
    duration: 120000
  },
  PRESSURIZING: {
    name: '增压',
    oxygenFlowRate: 0,
    hydrogenFlowRate: 0,
    targetTemp: 90,
    duration: 60000
  },
  READY: {
    name: '发射就绪',
    oxygenFlowRate: 0,
    hydrogenFlowRate: 0,
    targetTemp: 90,
    duration: 0
  },
  EMERGENCY_STOP: {
    name: '紧急停车',
    oxygenFlowRate: 0,
    hydrogenFlowRate: 0,
    targetTemp: 293,
    duration: 0
  }
}
