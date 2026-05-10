export enum TrafficLevel {
  SMOOTH = 0,
  SLOW = 1,
  CONGESTED = 2,
  SEVERE = 3,
}

export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  maxSpeed: number;
  lane: number;
  waitTime: number;
}

export interface Intersection {
  id: string;
  x: number;
  y: number;
  northSouthLight: 'green' | 'yellow' | 'red';
  eastWestLight: 'green' | 'yellow' | 'red';
  lightTimer: number;
  lightDuration: number;
  queueLength: { north: number; south: number; east: number; west: number };
}

export interface GridCell {
  x: number;
  y: number;
  type: 'road' | 'intersection' | 'building' | 'park';
  vehicle: Vehicle | null;
  trafficLevel: TrafficLevel;
  flowRate: number;
}

export interface TrafficIndex {
  timestamp: number;
  overall: number;
  gridData: number[][];
  hotspots: Array<{ x: number; y: number; level: TrafficLevel }>;
}

export interface HistoricalRecord {
  id: string;
  timestamp: number;
  hour: number;
  weekday: number;
  trafficIndex: TrafficIndex;
  peakStatus: 'morning' | 'evening' | 'none';
}

export interface SyncState {
  commandCenter: TrafficIndex | null;
  mobileDevice: TrafficIndex | null;
  lastSyncTime: number;
  syncInterval: number;
  isAligned: boolean;
}

export interface SimulationConfig {
  gridWidth: number;
  gridHeight: number;
  vehicleDensity: number;
  maxSpeed: number;
  lightCycleDuration: number;
  simulationSpeed: number;
}

export interface AlignmentMessage {
  type: 'request' | 'response' | 'update';
  trafficIndex: TrafficIndex;
  timestamp: number;
  source: 'command-center' | 'mobile';
  syncId: string;
}