export type EquipmentType = 'tug' | 'bridge' | 'baggage' | 'fuel' | 'catering' | 'bus';
export type EquipmentStatus = 'idle' | 'moving' | 'working' | 'charging' | 'error' | 'offline';
export type CommandPriority = 'emergency' | 'high' | 'normal' | 'low';
export type CommandType = 'move' | 'work' | 'charge' | 'recall' | 'stop';
export type CommandStatus = 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertType = 'collision' | 'deadlock' | 'zone_violation' | 'low_battery' | 'malfunction';
export type NetworkStatus = 'online' | 'weak' | 'offline';

export interface Position {
  x: number;
  y: number;
  heading: number;
}

export interface Velocity {
  linear: number;
  angular: number;
}

export interface PathPoint {
  x: number;
  y: number;
  t: number;
  v?: number;
}

export interface EquipmentHealth {
  temperature: number;
  tirePressure: number;
  brakeStatus: boolean;
  motorStatus: boolean;
}

export interface EquipmentState {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  position: Position;
  velocity: Velocity;
  battery: number;
  currentTask: string | null;
  timestamp: number;
  health: EquipmentHealth;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxSpeed: number;
  maxAcceleration: number;
  minTurnRadius: number;
}

export interface DispatchCommand {
  id: string;
  priority: CommandPriority;
  type: CommandType;
  equipmentId: string;
  targetPosition: Position;
  path: PathPoint[];
  expectedDuration: number;
  scheduledTime: number;
  deadline: number;
  status: CommandStatus;
  progress: number;
  protocolVersion: string;
  signature: string;
  createdAt: number;
  executedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface ConflictAlert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  involvedEquipment: string[];
  predictedTime: number;
  predictedPosition: Position;
  timeToCollision: number;
  suggestedAction: {
    type: 'reroute' | 'slow_down' | 'stop';
    equipmentId: string;
    newPath?: PathPoint[];
  };
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface SystemSnapshot {
  timestamp: number;
  equipmentStates: EquipmentState[];
  activeCommands: DispatchCommand[];
  activeAlerts: ConflictAlert[];
  networkStatus: NetworkStatus;
  checksum: string;
}

export interface WorkerMessage<T = unknown> {
  type: string;
  payload: T;
  requestId: string;
  timestamp: number;
}

export interface PathPlanningRequest {
  equipmentId: string;
  startPosition: Position;
  targetPosition: Position;
  obstacles: Position[];
  constraints: {
    maxSpeed: number;
    maxAcceleration: number;
    minTurnRadius: number;
  };
  priority: CommandPriority;
}

export interface PathPlanningResult {
  requestId: string;
  equipmentId: string;
  path: PathPoint[];
  duration: number;
  distance: number;
  success: boolean;
  error?: string;
}

export interface ConflictDetectionRequest {
  equipmentStates: EquipmentState[];
  commands: DispatchCommand[];
  predictionHorizon: number;
  timeStep: number;
}

export interface ConflictDetectionResult {
  requestId: string;
  alerts: ConflictAlert[];
  processingTime: number;
}

export interface SyncRequest {
  type: 'push' | 'pull';
  data: unknown;
  lastSyncTime: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  conflicts: string[];
  nextSyncTime: number;
}

export interface MapZone {
  id: string;
  name: string;
  type: 'gate' | 'taxiway' | 'parking' | 'restricted' | 'charging';
  polygon: Position[];
  gateNumber?: string;
  flightId?: string;
}

export interface GateInfo {
  id: string;
  number: string;
  position: Position;
  flightId?: string;
  status: 'available' | 'occupied' | 'scheduled';
  arrivalTime?: number;
  departureTime?: number;
}

export interface FlightInfo {
  id: string;
  flightNumber: string;
  aircraftType: string;
  gateId: string;
  arrivalTime: number;
  departureTime: number;
  status: 'scheduled' | 'arrived' | 'boarding' | 'departed';
  requiredServices: EquipmentType[];
}
