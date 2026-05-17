export interface WeldPoolData {
  id: string;
  timestamp: number;
  temperature: number;
  current: number;
  voltage: number;
  wireFeedSpeed: number;
  gasFlowRate: number;
  poolWidth: number;
  poolDepth: number;
  oscillationFrequency: number;
  oscillationAmplitude: number;
}

export interface WeldPoint {
  id: string;
  sequence: number;
  startTime: number;
  endTime: number;
  qualityScore: number;
  defectRisk: DefectRisk;
  waveformSlice: WaveformPoint[];
  features: WeldFeatures;
  robotStatus: RobotStatus;
  qcAligned: boolean;
}

export interface WaveformPoint {
  timestamp: number;
  value: number;
  type: 'current' | 'voltage' | 'temperature';
}

export interface WeldFeatures {
  stabilityIndex: number;
  heatInput: number;
  penetrationDepth: number;
  beadWidth: number;
  spatterCount: number;
  porosityLevel: number;
}

export interface DefectRisk {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  types: string[];
  recommendations: string[];
}

export interface RobotStatus {
  position: { x: number; y: number; z: number };
  speed: number;
  torchAngle: number;
  standoffDistance: number;
}

export interface AlignmentStatus {
  robotTimestamp: number;
  qcTimestamp: number;
  latency: number;
  synchronized: boolean;
  drift: number;
}

export interface FluctuationFeature {
  frequency: number;
  amplitude: number;
  phase: number;
  harmonic: number;
  energy: number;
}
