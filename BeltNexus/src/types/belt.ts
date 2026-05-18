export interface BeltState {
  id: string;
  length: number;
  speed: number;
  load: number;
  tensionProfile: number[];
  temperatureProfile: number[];
  wearProfile: number[];
  isRunning: boolean;
  healthScore: number;
}

export interface TensionAnalysisResult {
  profile: number[];
  stressPoints: StressPoint[];
  anomalies: AnomalyPoint[];
  healthScore: number;
}

export interface StressPoint {
  position: number;
  tension: number;
  severity: 'low' | 'medium' | 'high';
}

export interface AnomalyPoint {
  position: number;
  type: 'tension' | 'temperature' | 'vibration';
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}
