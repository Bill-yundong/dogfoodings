export interface Keypoint {
  id: number;
  name: string;
  position: [number, number, number];
  confidence: number;
}

export interface KeypointFrame {
  timestamp: number;
  keypoints: Keypoint[];
  confidence: number;
  frameIndex: number;
}

export interface SwingPhase {
  name: 'address' | 'backswing' | 'downswing' | 'impact' | 'follow_through';
  startFrame: number;
  endFrame: number;
}

export interface SwingTrajectory {
  id: string;
  startTime: number;
  endTime: number;
  clubHeadPath: [number, number, number][];
  centerOfGravityPath: [number, number, number][];
  phases: SwingPhase[];
}

export interface TimeSeriesData {
  timestamps: number[];
  values: number[];
  anomalies: { index: number; severity: number }[];
}

export interface BiomechanicsMetrics {
  angularVelocity: TimeSeriesData;
  linearVelocity: TimeSeriesData;
  jointTorques: TimeSeriesData[];
  centerOfGravityDisplacement: TimeSeriesData;
  stabilityScore: number;
  subScores: {
    rhythmConsistency: number;
    cogStability: number;
    jointCoordination: number;
  };
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  deviation: number;
}

export interface AlignmentResult {
  alignmentScore: number;
  fieldMappings: FieldMapping[];
  deviationHeatmap: number[][];
}

export interface SwingSnapshot {
  id: string;
  createdAt: number;
  trajectory: SwingTrajectory;
  metrics: BiomechanicsMetrics;
  alignment: AlignmentResult;
  keypointFrames: KeypointFrame[];
  tags: string[];
  rating: number;
}

export interface EngineStatus {
  state: 'idle' | 'processing' | 'error';
  queueSize: number;
  throughput: number;
  avgLatency: number;
  lastFrameIndex: number;
}

export interface CollectionStatus {
  connected: boolean;
  fps: number;
  alignmentScore: number;
  engineLatency: number;
}

export const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
] as const;

export const SKELETON_CONNECTIONS: [number, number][] = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12], [11, 13], [13, 15],
  [12, 14], [14, 16],
];

export const PHASE_COLORS: Record<SwingPhase['name'], string> = {
  address: '#6366F1',
  backswing: '#00F0B5',
  downswing: '#FF6B2B',
  impact: '#FF2D55',
  follow_through: '#FFD60A',
};
