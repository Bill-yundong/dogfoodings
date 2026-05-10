export interface Position {
  lng: number;
  lat: number;
}

export enum HydrantStatus {
  NORMAL = 'normal',
  LOW_PRESSURE = 'low_pressure',
  CRITICAL = 'critical',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

export enum DataSource {
  FIRE_DEPARTMENT = 'fire_department',
  WATER_COMPANY = 'water_company',
  SIMULATED = 'simulated',
}

export interface Hydrant {
  id: string;
  code: string;
  name: string;
  position: Position;
  diameter: number;
  elevation: number;
  connectedMainId: string;
  status: HydrantStatus;
  installationDate: string;
  lastMaintenanceDate?: string;
  region: string;
  address: string;
}

export interface PressureReading {
  hydrantId: string;
  pressure: number;
  timestamp: number;
  source: DataSource;
  flowRate?: number;
  temperature?: number;
  confidence: number;
}

export interface WaterMain {
  id: string;
  name: string;
  diameter: number;
  material: 'cast_iron' | 'ductile_iron' | 'steel' | 'pvc' | 'hdpe';
  frictionCoefficient: number;
  maxPressure: number;
  minPressure: number;
}

export interface SemanticMetadata {
  fireDeptSemantic: FireDeptSemantic;
  waterCompanySemantic: WaterCompanySemantic;
  mappingVersion: string;
  lastSyncTime: number;
  syncStatus: 'synced' | 'out_of_sync' | 'conflict';
}

export interface FireDeptSemantic {
  category: '消防供水设施';
  criticalThreshold: number;
  alertThreshold: number;
  responsePriority: 'high' | 'medium' | 'low';
}

export interface WaterCompanySemantic {
  category: '管网末端压力点';
  supplyZone: string;
  networkNodeType: 'terminal' | 'branch' | 'junction';
  maintenanceCycle: number;
}

export interface SyncMessage {
  type: 'data_sync' | 'conflict_resolution' | 'schema_update';
  payload: PressureReading | PressureReading[] | SemanticMetadata;
  source: DataSource;
  timestamp: number;
  version: string;
  correlationId?: string;
}

export interface FlowDecayParams {
  initialFlow: number;
  distance: number;
  pipeDiameter: number;
  frictionCoefficient: number;
  viscosity: number;
  time: number;
}

export interface PressureDistribution {
  hydrantId: string;
  currentPressure: number;
  simulatedPressure?: number;
  historicalPressure: number[];
  trend: 'rising' | 'falling' | 'stable';
  anomalyScore: number;
  lastUpdate: number;
}

export interface ConflictRecord {
  hydrantId: string;
  fireDeptReading: PressureReading;
  waterCompanyReading: PressureReading;
  detectedTime: number;
  resolved?: boolean;
  resolution?: 'fire_dept' | 'water_company' | 'average' | 'manual';
}
