export type NodeType = 'junction' | 'valve' | 'pump' | 'reservoir' | 'sensor';
export type ValveType = 'gate' | 'ball' | 'butterfly' | 'check';
export type ValveStatus = 'normal' | 'opening' | 'closing' | 'closed' | 'fault';
export type WarningType = 'overpressure' | 'underpressure' | 'cavitation' | 'valveFault';
export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';
export type MaterialType = 'steel' | 'castIron' | 'plastic';

export interface PipelineNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  region: string;
  elevation: number;
  pressure: number;
  flowRate: number;
  velocity: number;
}

export interface PipelineSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  diameter: number;
  wallThickness: number;
  length: number;
  material: MaterialType;
  roughness: number;
  waveSpeed: number;
}

export interface Valve {
  id: string;
  nodeId: string;
  type: ValveType;
  opening: number;
  targetOpening: number;
  maxFlowRate: number;
  responseTime: number;
  status: ValveStatus;
  autoProtection: boolean;
}

export interface MOCPoint {
  x: number;
  Q: number;
  H: number;
  Cp: number;
  Cm: number;
}

export interface MOCGrid {
  points: MOCPoint[][];
  segmentId: string;
  nx: number;
  dx: number;
}

export interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  nodeId?: string;
  segmentId?: string;
  message: string;
  timestamp: number;
}

export interface PressureSnapshot {
  id: string;
  timestamp: number;
  simulationTime: number;
  nodePressures: Record<string, number>;
  segmentPressures: Record<string, number[]>;
  valveStates: Record<string, number>;
  warnings: Warning[];
}

export interface MOCConfig {
  timeStep: number;
  totalTime: number;
  courantNumber: number;
  gravity: number;
  fluidDensity: number;
  fluidViscosity: number;
  pressureMin: number;
  pressureMax: number;
  snapInterval: number;
}

export interface MaterialProperties {
  youngsModulus: number;
  poissonsRatio: number;
}

export const MATERIAL_PROPERTIES: Record<MaterialType, MaterialProperties> = {
  steel: { youngsModulus: 200e9, poissonsRatio: 0.3 },
  castIron: { youngsModulus: 100e9, poissonsRatio: 0.25 },
  plastic: { youngsModulus: 2e9, poissonsRatio: 0.4 },
};

export interface SimulationState {
  status: SimulationStatus;
  currentTime: number;
  speed: number;
  warnings: Warning[];
}

export interface Region {
  id: string;
  name: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
}
