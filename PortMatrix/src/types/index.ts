export type PassengerType = 'business' | 'tourist' | 'transfer' | 'special';

export type AgentStatus =
  | 'arriving'
  | 'in_checkin_queue'
  | 'at_checkin'
  | 'in_security_queue'
  | 'at_security'
  | 'walking'
  | 'shopping'
  | 'waiting_gate'
  | 'boarding'
  | 'exited';

export type EventType =
  | 'ARRIVAL'
  | 'CHECKIN_START'
  | 'CHECKIN_END'
  | 'SECURITY_ENTER'
  | 'SECURITY_EXIT'
  | 'SHOP_ENTER'
  | 'SHOP_EXIT'
  | 'BOARDING_CALL'
  | 'BOARDING_COMPLETE'
  | 'GATE_REACHED';

export type ZoneType = 'checkin' | 'security' | 'retail' | 'gate' | 'lounge' | 'corridor' | 'entrance' | 'customs';

export type FacilityType = 'checkin_counter' | 'security_channel' | 'shop' | 'gate' | 'baggage_drop';

export interface Vector2D {
  x: number;
  y: number;
}

export interface PassengerAgent {
  id: string;
  type: PassengerType;
  position: Vector2D;
  velocity: Vector2D;
  desiredVelocity: Vector2D;
  target: Vector2D | null;
  targetFacilityId: string | null;
  currentZone: string;
  status: AgentStatus;
  patience: number;
  maxPatience: number;
  hasBaggage: boolean;
  shoppingInterest: number;
  flightId: string;
  boardingTime: number;
  arrivalTime: number;
  checkinStartTime: number;
  securityStartTime: number;
  shoppingStartTime: number;
  visitedShops: string[];
  trail: Vector2D[];
}

export interface CompactAgentState {
  idIdx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  typeCode: number;
  statusCode: number;
}

export interface SocialForceParams {
  selfDrivingCoeff: number;
  socialRepulsionCoeff: number;
  socialRepulsionRange: number;
  boundaryRepulsionCoeff: number;
  attractionCoeff: number;
  maxSpeed: number;
  relaxationTime: number;
}

export interface SimulationEvent {
  id: string;
  type: EventType;
  timestamp: number;
  passengerId: string;
  data?: Record<string, unknown>;
  priority: number;
}

export interface QueueServer {
  id: string;
  status: 'idle' | 'busy';
  currentPassenger: string | null;
  serviceStartTime: number;
  totalServed: number;
}

export interface Queue {
  id: string;
  name: string;
  type: 'checkin' | 'security';
  servers: QueueServer[];
  waitingLine: string[];
  maxLength: number;
  serviceRate: number;
  arrivalRate: number;
  avgWaitTime: number;
  totalServed: number;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  polygon: Vector2D[];
  color: string;
  capacity: number;
  currentCount: number;
}

export interface Obstacle {
  id: string;
  polygon: Vector2D[];
}

export interface Facility {
  id: string;
  zoneId: string;
  type: FacilityType;
  position: Vector2D;
  capacity: number;
  serviceRate: number;
  status: 'open' | 'closed' | 'busy';
  queueId: string | null;
  attractiveness: number;
  name: string;
}

export interface TerminalLayout {
  width: number;
  height: number;
  scale: number;
  zones: Zone[];
  obstacles: Obstacle[];
  facilities: Facility[];
  entrances: Vector2D[];
  exits: Vector2D[];
}

export interface SimulationMetrics {
  simulationTime: number;
  realTime: number;
  speedMultiplier: number;
  totalPassengers: number;
  activePassengers: number;
  completedPassengers: number;
  throughput: number;
  avgTotalTime: number;
  avgWaitTime: Record<string, number>;
  queueLengths: Record<string, number>;
  zoneCounts: Record<string, number>;
  zoneDensities: Record<string, number>;
  bottlenecks: string[];
  fps: number;
}

export interface FlowSnapshot {
  id: string;
  waveId: string;
  timestamp: number;
  simulationTime: number;
  passengerCount: number;
  zoneCounts: Record<string, number>;
  zoneDensities: Record<string, number>;
  queueLengths: Record<string, number>;
  averageWaitTimes: Record<string, number>;
  throughput: number;
  bottlenecks: string[];
  agentPositions: Array<{
    id: string;
    x: number;
    y: number;
    type: PassengerType;
    status: AgentStatus;
  }>;
}

export interface FlightWave {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  expectedPassengers: number;
  flightIds: string[];
  createdAt: number;
}

export type WorkerMessageType =
  | 'init'
  | 'start'
  | 'pause'
  | 'reset'
  | 'speed_change'
  | 'params_update'
  | 'agent_states'
  | 'metrics'
  | 'snapshot'
  | 'error';

export interface WorkerControlMessage {
  type: Extract<WorkerMessageType, 'init' | 'start' | 'pause' | 'reset' | 'speed_change' | 'params_update'>;
  data?: Record<string, unknown>;
}

export interface WorkerUpdateMessage {
  type: Extract<WorkerMessageType, 'agent_states' | 'metrics' | 'snapshot' | 'error'>;
  agents?: CompactAgentState[];
  metrics?: SimulationMetrics;
  snapshot?: FlowSnapshot;
  error?: string;
  timestamp: number;
}

export const PASSENGER_TYPE_COLORS: Record<PassengerType, string> = {
  business: '#7c4dff',
  tourist: '#ff4081',
  transfer: '#00e5ff',
  special: '#ff6e40',
};

export const STATUS_CODE: Record<AgentStatus, number> = {
  arriving: 0,
  in_checkin_queue: 1,
  at_checkin: 2,
  in_security_queue: 3,
  at_security: 4,
  walking: 5,
  shopping: 6,
  waiting_gate: 7,
  boarding: 8,
  exited: 9,
};

export const TYPE_CODE: Record<PassengerType, number> = {
  business: 0,
  tourist: 1,
  transfer: 2,
  special: 3,
};
