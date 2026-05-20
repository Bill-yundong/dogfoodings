export interface Vector3D {
  x: number
  y: number
  z: number
}

export interface GPSPosition {
  latitude: number
  longitude: number
  altitude: number
}

export interface WindData {
  speed: number
  direction: number
  turbulence: number
  temperature: number
  pressure: number
  humidity: number
}

export interface WeatherGridCell {
  position: Vector3D
  wind: WindData
  timestamp: number
}

export interface DroneState {
  id: string
  position: Vector3D
  gps: GPSPosition
  velocity: Vector3D
  acceleration: Vector3D
  battery: number
  status: 'idle' | 'flying' | 'landing' | 'charging' | 'error'
  currentMission: string | null
  heading: number
  altitude: number
}

export interface Waypoint {
  id: string
  position: Vector3D
  gps: GPSPosition
  speed: number
  waitTime: number
  actions: DroneAction[]
}

export interface DroneAction {
  type: 'photo' | 'video' | 'sensor' | 'payload'
  duration: number
  parameters: Record<string, any>
}

export interface Mission {
  id: string
  name: string
  droneId: string
  waypoints: Waypoint[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  priority: 'low' | 'medium' | 'high'
  estimatedEnergy: number
  estimatedDuration: number
}

export interface PathOptimizationResult {
  missionId: string
  optimizedPath: Vector3D[]
  totalDistance: number
  estimatedEnergy: number
  estimatedDuration: number
  windPenalty: number
  collisionRisk: number
}

export interface BlackBoxLog {
  id: string
  droneId: string
  timestamp: number
  position: Vector3D
  gps: GPSPosition
  velocity: Vector3D
  acceleration: Vector3D
  battery: number
  motorOutput: number[]
  windCondition: WindData
  status: string
  errorCode?: string
  synced: boolean
}

export interface SemanticSyncMessage {
  id: string
  source: 'terminal' | 'regulatory'
  type: 'position' | 'mission' | 'weather' | 'alert' | 'command'
  payload: any
  timestamp: number
  version: number
  hash: string
}

export interface AirspaceZone {
  id: string
  name: string
  type: 'restricted' | 'warning' | 'allowed' | 'temporary'
  boundary: Vector3D[]
  altitudeMin: number
  altitudeMax: number
  activeHours: string
  reason?: string
}

export interface EnergyConsumption {
  hover: number
  forward: number
  climb: number
  descend: number
  windResistance: number
  total: number
}

export interface CollisionDetectionResult {
  hasCollision: boolean
  distance: number
  obstacleId: string
  position: Vector3D
  timeToCollision: number
}

export interface AgentMessage {
  id: string
  from: string
  to: string
  type: 'request' | 'response' | 'broadcast'
  topic: 'path' | 'collision' | 'weather' | 'battery'
  content: any
  timestamp: number
}
