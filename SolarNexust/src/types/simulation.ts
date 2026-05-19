import type { Vector3, SolarPanel, Building, SimulationConfig } from './solar';

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

export interface RayHit {
  distance: number;
  point: Vector3;
  normal: Vector3;
  buildingId: string;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface BVHNode {
  bounds: BoundingBox;
  left?: BVHNode;
  right?: BVHNode;
  buildingIndex?: number;
}

export interface RayTracingWorkerInput {
  type: 'INIT' | 'TRACE' | 'UPDATE_BUILDINGS' | 'UPDATE_PANELS';
  payload:
    | InitPayload
    | TracePayload
    | UpdateBuildingsPayload
    | UpdatePanelsPayload;
}

export interface RayTracingWorkerOutput {
  type: 'INIT_COMPLETE' | 'TRACE_RESULT' | 'ERROR' | 'PROGRESS';
  payload: TraceResultPayload | ProgressPayload | ErrorPayload | null;
}

export interface InitPayload {
  buildings: Building[];
  panels: SolarPanel[];
  config: SimulationConfig;
}

export interface TracePayload {
  timestamp: number;
  sunDirection: Vector3;
  sunIntensity: number;
  sunAltitude: number;
  sunAzimuth: number;
}

export interface UpdateBuildingsPayload {
  buildings: Building[];
}

export interface UpdatePanelsPayload {
  panels: SolarPanel[];
}

export interface TraceResultPayload {
  results: Array<{
    panelId: string;
    shadowCoverage: number;
    directIrradiance: number;
    diffuseIrradiance: number;
    timestamp: number;
    sunAltitude: number;
    sunAzimuth: number;
  }>;
  duration: number;
}

export interface ProgressPayload {
  progress: number;
  message: string;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  speed: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  showWireframe: boolean;
  showShadows: boolean;
  autoRotate: boolean;
}
