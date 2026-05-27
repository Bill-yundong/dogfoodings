export interface Facility {
  id: string
  name: string
  type: 'compressor' | 'tank' | 'dispenser' | 'pipeline' | 'vent' | 'sensor'
  status: 'normal' | 'warning' | 'alarm' | 'offline'
  pressure: number
  temperature: number
  x: number
  y: number
}

export interface LeakEvent {
  id: string
  facilityId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  leakRate: number
  windSpeed: number
  windDirection: number
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  timestamp: number
}

export interface CloudDataPoint {
  x: number
  y: number
  concentration: number
}

export interface OverpressureResult {
  id: string
  leakEventId: string
  tntEquivalent: number
  distances: number[]
  peakOverpressure: number[]
  timestamp: number
}

export interface CoordinationOrder {
  id: string
  fromRole: 'station' | 'fire' | 'admin'
  toRole: 'station' | 'fire' | 'admin'
  action: string
  status: 'sent' | 'confirmed' | 'executing' | 'completed' | 'failed'
  timestamp: number
  detail?: string
}

export interface TopologyConnection {
  from: string
  to: string
  type: 'pipe' | 'cable' | 'signal'
}

export interface TopologySnapshot {
  id: string
  facilities: Facility[]
  connections: TopologyConnection[]
  version: number
  timestamp: number
}

export interface AlertEvent {
  id: string
  type: 'pressure' | 'temperature' | 'leak' | 'system' | 'communication'
  level: 'info' | 'warning' | 'alarm' | 'critical'
  message: string
  facilityId?: string
  timestamp: number
  acknowledged: boolean
}

export type SafetyDimension = 'storage' | 'compression' | 'dispensing' | 'environment'

export interface SafetyScore {
  overall: number
  dimensions: Record<SafetyDimension, number>
}
