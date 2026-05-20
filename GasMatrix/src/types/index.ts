export interface PressureStation {
  id: string;
  name: string;
  lng: number;
  lat: number;
  normalPressure: number;
  minPressure: number;
  maxPressure: number;
  status: 'online' | 'offline' | 'warning' | 'danger';
  address?: string;
  lastUpdate?: number;
}

export interface PressureData {
  id: string;
  stationId: string;
  pressure: number;
  flowRate: number;
  temperature: number;
  timestamp: number;
}

export interface Command {
  id: string;
  stationId: string;
  targetPressure: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  issuedAt: number;
  executedAt?: number;
  completedAt?: number;
  operator: string;
  remark?: string;
}

export interface CommandLog {
  id: string;
  commandId: string;
  action: string;
  operator: string;
  timestamp: number;
  remark?: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  pressureData: Record<string, number>;
  flowData: Record<string, number>;
  totalStorage: number;
  periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  avgPressure: number;
  totalFlow: number;
  peakHour: number;
  abnormalStations: number;
}

export interface Alert {
  id: string;
  stationId: string;
  type: 'pressure_low' | 'pressure_high' | 'flow_abnormal' | 'device_fault' | 'communication_error';
  level: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

export interface PipeSegment {
  id: string;
  fromStation: string;
  toStation: string;
  length: number;
  diameter: number;
  roughness: number;
}

export interface FlowModelResult {
  pressureDistribution: number[];
  velocityDistribution: number[];
  storageVolume: number;
  storageMass: number;
  ReynoldsNumber: number;
  frictionFactor: number;
}

export interface PredictionResult {
  timestamp: number;
  predictedPressure: number;
  predictedFlow: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface PeakingScheme {
  id: string;
  name: string;
  stationAdjustments: {
    stationId: string;
    targetPressure: number;
    priority: number;
  }[];
  expectedEffect: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: number;
}

export interface RealtimeMessage {
  type: 'pressure_update' | 'command_status' | 'alert' | 'snapshot_created';
  timestamp: number;
  payload: any;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'operator' | 'maintenance' | 'admin' | 'engineer';
  permissions: string[];
}

export interface SystemSettings {
  pressureUnit: 'kPa' | 'MPa' | 'bar';
  flowUnit: 'm³/h' | 'm³/s';
  temperatureUnit: 'C' | 'K';
  alertSound: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'dark' | 'light';
}
