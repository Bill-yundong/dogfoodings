export interface Point {
  x: number
  y: number
}

export interface Node {
  id: string
  floor: number
  position: Point
  type: 'corridor' | 'exit' | 'stair' | 'elevator' | 'room' | 'junction'
  name?: string
  connections: string[]
}

export interface Edge {
  id: string
  from: string
  to: string
  distance: number
  width: number
  isAccessible: boolean
}

export interface FloorMap {
  floor: number
  name: string
  bounds: { min: Point; max: Point }
  nodes: Node[]
  edges: Edge[]
  rooms: Room[]
  walls: Wall[]
}

export interface Room {
  id: string
  name: string
  floor: number
  polygon: Point[]
  capacity: number
  exitPoints: string[]
}

export interface Wall {
  id: string
  floor: number
  start: Point
  end: Point
  thickness: number
}

export interface SmokeGridPoint {
  x: number
  y: number
  floor: number
  concentration: number
  temperature: number
  visibility: number
  timestamp: number
}

export interface SmokeField {
  id: string
  floor: number
  gridSize: number
  points: SmokeGridPoint[]
  timestamp: number
}

export interface PathNode {
  nodeId: string
  position: Point
  floor: number
  riskLevel: number
}

export interface EvacuationPath {
  id: string
  startNodeId: string
  endNodeId: string
  nodes: PathNode[]
  totalDistance: number
  estimatedTime: number
  riskScore: number
  isStable: boolean
}

export interface Device {
  id: string
  type: 'monitor' | 'terminal' | 'sensor'
  name: string
  floor: number
  position: Point
  status: 'online' | 'offline' | 'error'
  lastHeartbeat: number
}

export interface SensorReading {
  id: string
  sensorId: string
  floor: number
  position: Point
  smokeConcentration: number
  temperature: number
  coLevel: number
  timestamp: number
}

export interface EvacuationStatus {
  totalPopulation: number
  evacuatedCount: number
  trappedCount: number
  safeZones: string[]
  activePaths: string[]
  lastUpdate: number
}

export interface SystemState {
  isEmergency: boolean
  isOfflineMode: boolean
  powerStatus: 'normal' | 'backup' | 'critical'
  activeFloor: number
  syncStatus: 'synced' | 'syncing' | 'conflict'
}
