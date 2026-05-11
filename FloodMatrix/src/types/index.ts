export interface RainfallData {
  id: string;
  timestamp: number;
  duration: number;
  intensity: number;
  area: string;
}

export interface GridCell {
  id: string;
  x: number;
  y: number;
  elevation: number;
  runoffCoefficient: number;
  waterDepth: number;
  drainageCapacity: number;
}

export interface PipeNode {
  id: string;
  x: number;
  y: number;
  type: 'inlet' | 'outlet' | 'junction';
  capacity: number;
  currentFlow: number;
}

export interface PipeConnection {
  id: string;
  from: string;
  to: string;
  diameter: number;
  length: number;
  slope: number;
  maxFlow: number;
}

export interface SimulationConfig {
  gridSize: number;
  timeStep: number;
  totalTime: number;
  rainfallIntensity: number;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  config: SimulationConfig;
  gridStates: GridCell[][];
  pipeFlows: Map<string, number>;
  floodAreas: FloodArea[];
}

export interface FloodArea {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  maxDepth: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrafficAlert {
  id: string;
  location: string;
  roadId: string;
  floodDepth: number;
  status: 'warning' | 'closed' | 'passable';
  timestamp: number;
}

export interface DrainageStatus {
  pumpId: string;
  location: string;
  status: 'active' | 'standby' | 'maintenance';
  currentRate: number;
  maxRate: number;
}

export interface FloodSnapshot {
  id: string;
  name: string;
  timestamp: number;
  rainfallData: RainfallData;
  simulationResult: SimulationResult;
  trafficAlerts: TrafficAlert[];
  drainageStatus: DrainageStatus[];
  notes: string;
}
