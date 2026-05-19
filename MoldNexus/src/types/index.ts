export interface User {
  id: string;
  name: string;
  role: 'process_engineer' | 'production_operator' | 'quality_engineer' | 'admin';
  email: string;
  createdAt: number;
}

export interface MoldGeometry {
  width: number;
  height: number;
  depth: number;
  obstacles: Obstacle[];
  gates: Gate[];
}

export interface Obstacle {
  id: string;
  type: 'circle' | 'rectangle' | 'polygon';
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
}

export interface Gate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  injectionDirection: number;
}

export interface Mold {
  id: string;
  name: string;
  geometry: MoldGeometry;
  material: string;
  cavityVolume: number;
  createdAt: number;
  updatedAt: number;
}

export interface ParameterSet {
  id: string;
  simulationId: string;
  meltTemperature: number;
  moldTemperature: number;
  injectionSpeed: number;
  packingPressure: number;
  packingTime: number;
  coolingTime: number;
  viscosity: number;
  surfaceTension: number;
  customParams?: Record<string, number | string>;
  createdAt: number;
}

export interface Simulation {
  id: string;
  moldId: string;
  userId: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  currentStep: number;
  totalSteps: number;
  createdAt: number;
  updatedAt: number;
}

export interface FlowFieldData {
  density: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  pressure: Float32Array;
  temperature: Float32Array;
}

export interface FlowFrontPoint {
  x: number;
  y: number;
  time: number;
  velocity: number;
}

export interface PressureWaveData {
  timestamp: number;
  position: { x: number; y: number };
  amplitude: number;
  frequency: number;
  propagationSpeed: number;
}

export interface Snapshot {
  id: string;
  simulationId: string;
  parameterSetId: string;
  version: number;
  step: number;
  fillTime: number;
  fillPercentage: number;
  maxPressure: number;
  avgTemperature: number;
  flowFrontData: FlowFrontPoint[];
  pressureWaveData: PressureWaveData[];
  flowField?: FlowFieldData;
  createdAt: number;
}

export interface Defect {
  id: string;
  snapshotId: string;
  type: DefectType;
  severity: number;
  position: { x: number; y: number };
  area?: number;
  description: string;
  confidence: number;
}

export type DefectType = 'weld_line' | 'air_trap' | 'short_shot' | 'burn_mark' | 'sink_mark';

export interface MappingRule {
  id: string;
  sourceField: string;
  targetField: string;
  transformType: 'direct' | 'unit' | 'formula' | 'enum' | 'conditional';
  transformExpression: string;
  sourceSystem: string;
  targetSystem: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MappingResult {
  sourceValue: unknown;
  targetValue: unknown;
  success: boolean;
  error?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string;
  creatorId: string;
  simulationId?: string;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  simulationId?: string;
  taskId?: string;
  userId: string;
  content: string;
  mentions?: string[];
  attachments?: string[];
  createdAt: number;
}

export interface LBMConfig {
  gridWidth: number;
  gridHeight: number;
  relaxationTime: number;
  initialDensity: number;
  maxSteps: number;
  timeStep: number;
}

export interface EngineState {
  isRunning: boolean;
  currentStep: number;
  fps: number;
  lastUpdate: number;
}

export interface AnalyticsData {
  totalSimulations: number;
  defectsByType: Record<DefectType, number>;
  averageFillTime: number;
  successRate: number;
  commonDefectAreas: { x: number; y: number; count: number }[];
}

export type SimulationStatus = Simulation['status'];
export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
