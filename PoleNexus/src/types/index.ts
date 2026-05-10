export type PoleStatus = 'online' | 'offline' | 'warning'

export type DimmingMode = 'manual' | 'auto' | 'schedule' | 'energy_saving'

export type CommandStatus = 'pending' | 'sent' | 'executed' | 'failed'

export type LogLevel = 'info' | 'warning' | 'error'

export interface Position {
  latitude: number
  longitude: number
}

export interface PoleNode {
  id: string
  name: string
  location: string
  position: Position
  status: PoleStatus
  brightness: number
  temperature: number
  humidity: number
  power: number
  isOn: boolean
  dimmingMode: DimmingMode
  lastHeartbeat: number
  createdAt: number
  updatedAt: number
  zoneId: string
  groupId?: string
}

export interface EnergyData {
  id: string
  poleId: string
  timestamp: number
  power: number
  voltage: number
  current: number
  powerFactor: number
  energyConsumption: number
  cumulativeEnergy: number
}

export interface DimmingCommand {
  id: string
  poleIds: string[]
  brightness: number
  mode: DimmingMode
  reason?: string
  status: CommandStatus
  createdAt: number
  sentAt?: number
  executedAt?: number
  errorMessage?: string
}

export interface OperationLog {
  id: string
  poleId: string
  timestamp: number
  level: LogLevel
  type: string
  message: string
  details?: Record<string, unknown>
  synced: boolean
}

export interface EnergySavingRule {
  id: string
  name: string
  enabled: boolean
  startHour: number
  endHour: number
  brightness: number
  conditions?: {
    minTemperature?: number
    maxTemperature?: number
    trafficThreshold?: number
  }
  priority: number
}

export interface Zone {
  id: string
  name: string
  description?: string
  poleCount: number
  centerPosition: Position
}

export interface SyncEvent {
  type: 'energy_update' | 'command_sent' | 'status_change' | 'log_created'
  payload: unknown
  timestamp: number
}

export interface Statistics {
  totalPoles: number
  onlinePoles: number
  offlinePoles: number
  warningPoles: number
  totalEnergyToday: number
  energySavedToday: number
  averageBrightness: number
  activeCommands: number
}