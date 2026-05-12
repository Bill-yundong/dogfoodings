export interface Point {
  x: number;
  y: number;
}

export interface Drone {
  id: string;
  position: Point;
  velocity: Point;
  battery: number;
  status: 'idle' | 'patrolling' | 'charging' | 'fault';
  coverageArea: number;
  lastUpdate: number;
}

export interface VoronoiCell {
  droneId: string;
  polygon: Point[];
  centroid: Point;
  area: number;
}

export interface Waypoint {
  x: number;
  y: number;
  altitude: number;
  timestamp: number;
}

export interface CoverageSnapshot {
  id: string;
  droneId: string;
  timestamp: number;
  coverageArea: number;
  position: Point;
  waypoints: Waypoint[];
  coveragePercentage: number;
}

export interface CommandCenterMessage {
  type: 'SYNC' | 'COMMAND' | 'STATUS' | 'ALERT';
  payload: any;
  timestamp: number;
  source: string;
  target?: string;
}

export interface SupportModule {
  id: string;
  name: string;
  type: 'charging' | 'maintenance' | 'logistics';
  position: Point;
  capacity: number;
  available: number;
}

export interface SemanticSyncData {
  version: number;
  timestamp: number;
  drones: Drone[];
  coverage: CoverageSnapshot[];
  modules: SupportModule[];
  hash: string;
}
