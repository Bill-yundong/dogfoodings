export type DataSource = 'DCS' | 'FSSS';
export type DataQuality = 'good' | 'bad';
export type ControlMode = 'manual' | 'auto';
export type SystemStatus = 'running' | 'warning' | 'error' | 'offline';

export interface OxygenData {
  timestamp: number;
  value: number;
  deviceId: string;
  quality: DataQuality;
  source: DataSource;
}

export interface EfficiencyData {
  timestamp: number;
  value: number;
  coalConsumption: number;
  steamOutput: number;
}

export interface FanControl {
  timestamp: number;
  forcedDraftSpeed: number;
  inducedDraftSpeed: number;
  damperOpening: number;
  oxygenSetpoint: number;
}

export interface MPCPrediction {
  timestamp: number;
  horizon: number;
  predictedOxygen: number[];
  predictedEfficiency: number[];
  optimizedParams: FanControl;
  confidence: number;
}

export interface WaveformChannel {
  name: string;
  unit: string;
  data: number[];
  timestamps: number[];
}

export interface WaveformSnapshot {
  id: string;
  startTime: number;
  endTime: number;
  triggerType: string;
  channels: WaveformChannel[];
  tags: string[];
  notes: string;
  createdAt: number;
}

export interface SemanticMapping {
  id: string;
  sourceTag: string;
  targetTag: string;
  transform: string;
  unit: string;
  description: string;
}

export interface StandardizedData {
  uuid: string;
  semanticTag: string;
  value: number;
  unit: string;
  timestamp: number;
  provenance: {
    source: string;
    originalId: string;
    receivedAt: number;
  };
}

export interface SyncStatus {
  source: DataSource;
  lastSync: number;
  status: SystemStatus;
  latency: number;
  dataPoints: number;
}

export interface ModelStatus {
  accuracy: number;
  lastUpdate: number;
  predictionCount: number;
  errorRate: number;
  controlMode: ControlMode;
}

export interface BoilerStatus {
  oxygenLevel: number;
  efficiency: number;
  coalConsumption: number;
  steamOutput: number;
  load: number;
  status: SystemStatus;
  fanControl: FanControl;
}
