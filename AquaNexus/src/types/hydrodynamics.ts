export interface WaterQualityParam {
  readonly pH: number;
  readonly turbidity: number;
  readonly dissolvedOxygen: number;
  readonly temperature: number;
  readonly conductivity: number;
  readonly ammoniaNitrogen: number;
  readonly totalPhosphorus: number;
  readonly chemicalOxygenDemand: number;
}

export interface SpatialCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface TemporalField {
  readonly timestamp: number;
  readonly timeStep: number;
}

export interface MonitoringPoint {
  readonly id: string;
  readonly name: string;
  readonly coordinate: SpatialCoordinate;
  readonly waterQuality: WaterQualityParam;
  readonly velocity: SpatialCoordinate;
  readonly pressure: number;
  readonly lastUpdate: number;
  readonly status: 'normal' | 'warning' | 'critical' | 'offline';
}

export interface ChemicalDriftTrajectory {
  readonly id: string;
  readonly chemicalType: string;
  readonly startPoint: SpatialCoordinate;
  readonly currentPosition: SpatialCoordinate;
  readonly concentration: number;
  readonly diffusionRate: number;
  readonly velocityVector: SpatialCoordinate;
  readonly timestamps: number[];
  readonly positions: SpatialCoordinate[];
  readonly riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export interface HydrodynamicField {
  readonly gridSize: { x: number; y: number; z: number };
  readonly cellSize: number;
  readonly velocityField: Float32Array;
  readonly pressureField: Float32Array;
  readonly concentrationField: Float32Array;
  readonly time: TemporalField;
}

export interface SnapshotMetadata {
  readonly id: string;
  readonly timestamp: number;
  readonly monitoringPointCount: number;
  readonly hash: string;
  readonly isOffline: boolean;
  readonly synchronizationStatus: 'pending' | 'synced' | 'conflict';
}

export interface SystemSnapshot {
  readonly metadata: SnapshotMetadata;
  readonly monitoringPoints: MonitoringPoint[];
  readonly hydrodynamicField: HydrodynamicField;
  readonly chemicalTrajectories: ChemicalDriftTrajectory[];
  readonly dispatchCommands: DispatchCommand[];
}

export interface DispatchCommand {
  readonly id: string;
  readonly type: 'valve_control' | 'pump_adjustment' | 'reservoir_release' | 'emergency_shutdown';
  readonly targetId: string;
  readonly parameters: Record<string, number | boolean | string>;
  readonly timestamp: number;
  readonly issuer: string;
  readonly status: 'pending' | 'executing' | 'completed' | 'failed';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlignmentStatus {
  readonly environmentalMonitoring: { latency: number; dataPoints: number; lastSync: number };
  readonly municipalWaterSupply: { latency: number; dataPoints: number; lastSync: number };
  readonly alignmentScore: number;
  readonly isAligned: boolean;
}

export interface WorkerMessage<T = unknown> {
  readonly type: WorkerMessageType;
  readonly payload: T;
  readonly requestId: string;
}

export enum WorkerMessageType {
  PARSE_SPATIOTEMPORAL_FIELD = 'PARSE_SPATIOTEMPORAL_FIELD',
  SIMULATE_CHEMICAL_DRIFT = 'SIMULATE_CHEMICAL_DRIFT',
  UPDATE_HYDRODYNAMIC_FIELD = 'UPDATE_HYDRODYNAMIC_FIELD',
  COMPUTE_ALIGNMENT_SCORE = 'COMPUTE_ALIGNMENT_SCORE',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
}

export interface WorkerProgress {
  readonly task: string;
  readonly progress: number;
  readonly processedItems: number;
  readonly totalItems: number;
}

export interface DriftSimulationConfig {
  readonly timeSteps: number;
  readonly diffusionCoefficient: number;
  readonly advectionCoefficient: number;
  readonly decayRate: number;
  readonly boundaryConditions: BoundaryCondition[];
}

export interface BoundaryCondition {
  readonly type: 'dirichlet' | 'neumann' | 'robin';
  readonly region: { min: SpatialCoordinate; max: SpatialCoordinate };
  readonly value: number;
}
