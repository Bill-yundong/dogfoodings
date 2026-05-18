export interface WaveformFeatures {
  peakCount: number;
  avgAmplitude: number;
  frequency: number;
  riseTime: number;
  decayTime: number;
  harmonics: number[];
}

export type DefectRisk = 'low' | 'medium' | 'high';
export type DeviceStatus = 'normal' | 'warning' | 'error' | 'offline';

export interface WeldPoint {
  id: string;
  timestamp: number;
  robotId: string;
  weldProgram: string;
  poolTemperature: number[];
  current: number[];
  voltage: number[];
  oscillation: number[];
  stabilityIndex: number;
  defectRisk: DefectRisk;
  defectType?: string;
  features: WaveformFeatures;
}

export interface RealTimeData {
  timestamp: number;
  robotId: string;
  poolTemp: number;
  current: number;
  voltage: number;
  stability: number;
  status: DeviceStatus;
}

export interface RobotController {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: DeviceStatus;
  lastSync: number;
}

export interface QualitySystemConfig {
  endpoint: string;
  apiKey: string;
  syncInterval: number;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'warning' | 'critical';
  enabled: boolean;
}

export interface SystemConfig {
  robotControllers: RobotController[];
  qualitySystem: QualitySystemConfig;
  alertRules: AlertRule[];
}

export interface Alert {
  id: string;
  timestamp: number;
  robotId: string;
  ruleId: string;
  message: string;
  severity: 'warning' | 'critical';
  acknowledged: boolean;
  value: number;
  threshold: number;
}

export interface SimulationConfig {
  weldPrograms: string[];
  baseTemperature: number;
  temperatureVariation: number;
  defectProbability: number;
  updateInterval: number;
}
