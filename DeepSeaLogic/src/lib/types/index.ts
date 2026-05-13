export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SedimentParticle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  concentration: number;
  size: number;
  createdAt: number;
}

export interface PumpUnit {
  id: string;
  name: string;
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  mass: number;
  forces: Vector3;
  isActive: boolean;
  power: number;
  flowRate: number;
}

export interface OceanCurrent {
  velocity: Vector3;
  turbulence: number;
  temperature: number;
  salinity: number;
  depth: number;
}

export interface OperationParameters {
  pumpPower: number;
  miningDepth: number;
  sedimentReleaseRate: number;
  currentSpeed: number;
  environmentalThreshold: number;
}

export interface SemanticParameter {
  id: string;
  name: string;
  engineeringValue: number;
  engineeringUnit: string;
  environmentalValue: number;
  environmentalUnit: string;
  isSynced: boolean;
  lastSyncTime: number;
  stakeholder: 'engineering' | 'environmental' | 'both';
}

export interface SimulationState {
  id: string;
  timestamp: number;
  particles: SedimentParticle[];
  pumps: PumpUnit[];
  current: OceanCurrent;
  parameters: OperationParameters;
  semanticParams: SemanticParameter[];
  elapsedTime: number;
}

export interface ForceBalance {
  buoyancy: Vector3;
  drag: Vector3;
  currentForce: Vector3;
  tension: Vector3;
  weight: Vector3;
  netForce: Vector3;
}
