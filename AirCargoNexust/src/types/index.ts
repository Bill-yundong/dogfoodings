export interface Cargo {
  id: string;
  name: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  priority: number;
  isDangerous: boolean;
  constraints?: {
    preferredZone?: string;
    forbiddenZones?: string[];
    maxStacking?: number;
  };
  createdAt: number;
}

export interface CargoZone {
  id: string;
  name: string;
  code: string;
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  maxWeightPerSqm: number;
  maxStackHeight: number;
}

export interface CargoPosition {
  id: string;
  zone: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight: number;
  isOccupied: boolean;
  cargoId?: string;
}

export interface CargoPlacement {
  cargoId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: number;
  zone: string;
}

export interface CenterOfGravity {
  x: number;
  y: number;
  z: number;
}

export interface LoadPlan {
  id: string;
  flightNumber: string;
  aircraftType: string;
  timestamp: number;
  cargoPlacements: CargoPlacement[];
  centerOfGravity: CenterOfGravity;
  totalWeight: number;
  spaceUtilization: number;
  fuelEfficiency: number;
  score: number;
  status: 'draft' | 'confirmed' | 'executed';
}

export interface LoadSnapshot {
  id: string;
  planId: string;
  timestamp: number;
  version: number;
  payload: LoadPlan;
  metadata: {
    createdBy: string;
    comment?: string;
  };
}

export interface AircraftSpec {
  type: string;
  model: string;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
  operatingEmptyWeight: number;
  maxFuelCapacity: number;
  cargoHoldDimensions: {
    length: number;
    width: number;
    height: number;
  };
  mac: {
    length: number;
    leadingEdge: number;
  };
  cargoZones: CargoZone[];
  cgLimits: {
    forward: number;
    aft: number;
    lateral: number;
  };
  floorLoadLimit: number;
}

export interface AlgorithmConfig {
  maxIterations: number;
  timeLimitMs: number;
  optimalCgX: number;
  cgWeight: number;
  balanceWeight: number;
  spaceWeight: number;
  priorityWeight: number;
}

export interface AlgorithmProgress {
  currentIteration: number;
  bestScore: number;
  solutionsEvaluated: number;
  currentDepth: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  elapsedMs: number;
  bestSolution?: LoadPlan;
}

export interface WorkerMessage {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'config' | 'progress' | 'result';
  payload?: unknown;
}

export interface CGPoint {
  x: number;
  y: number;
  fuel: number;
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}
