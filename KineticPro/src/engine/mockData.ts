import type {
  KeypointFrame,
  Keypoint,
  SwingTrajectory,
  SwingPhase,
  BiomechanicsMetrics,
  TimeSeriesData,
  AlignmentResult,
  FieldMapping,
  SwingSnapshot,
} from '@/types';
import { KEYPOINT_NAMES } from '@/types';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateKeypoints(frameIndex: number, phase: SwingPhase['name']): Keypoint[] {
  const basePositions: Record<string, [number, number, number]> = {
    nose: [0, 1.7, 0],
    left_eye: [-0.03, 1.73, 0],
    right_eye: [0.03, 1.73, 0],
    left_ear: [-0.07, 1.72, 0],
    right_ear: [0.07, 1.72, 0],
    left_shoulder: [-0.2, 1.5, 0],
    right_shoulder: [0.2, 1.5, 0],
    left_elbow: [-0.35, 1.25, 0],
    right_elbow: [0.35, 1.25, 0],
    left_wrist: [-0.4, 1.0, 0],
    right_wrist: [0.4, 1.0, 0],
    left_hip: [-0.15, 0.9, 0],
    right_hip: [0.15, 0.9, 0],
    left_knee: [-0.15, 0.5, 0],
    right_knee: [0.15, 0.5, 0],
    left_ankle: [-0.15, 0.05, 0],
    right_ankle: [0.15, 0.05, 0],
  };

  const phaseOffsets: Record<string, Partial<Record<string, [number, number, number]>>> = {
    address: {},
    backswing: {
      right_wrist: [0.1, 1.4, -0.3],
      right_elbow: [0.0, 1.3, -0.2],
      left_wrist: [-0.3, 1.2, 0.1],
    },
    downswing: {
      right_wrist: [0.3, 1.1, 0.2],
      right_elbow: [0.25, 1.2, 0.15],
      left_wrist: [-0.25, 1.05, -0.1],
    },
    impact: {
      right_wrist: [0.35, 1.0, 0.4],
      right_elbow: [0.3, 1.15, 0.25],
      left_hip: [-0.12, 0.88, 0.05],
      right_hip: [0.18, 0.92, -0.05],
    },
    follow_through: {
      right_wrist: [0.15, 1.5, 0.5],
      right_elbow: [0.1, 1.35, 0.35],
      left_wrist: [-0.1, 1.3, 0.2],
    },
  };

  const t = frameIndex / 120;
  const noise = Math.sin(t * 3) * 0.01;

  return KEYPOINT_NAMES.map((name, i) => {
    const base = basePositions[name] || [0, 0, 0];
    const offset = phaseOffsets[phase]?.[name] || [0, 0, 0];
    return {
      id: i,
      name,
      position: [
        base[0] + offset[0] * t + rand(-0.01, 0.01) + noise,
        base[1] + offset[1] * t + rand(-0.005, 0.005),
        base[2] + offset[2] * t + rand(-0.01, 0.01) + noise,
      ] as [number, number, number],
      confidence: rand(0.85, 0.99),
    };
  });
}

export function generateSwingTrajectory(id?: string): SwingTrajectory {
  const totalFrames = 120;
  const phases: SwingPhase[] = [
    { name: 'address', startFrame: 0, endFrame: 20 },
    { name: 'backswing', startFrame: 20, endFrame: 50 },
    { name: 'downswing', startFrame: 50, endFrame: 75 },
    { name: 'impact', startFrame: 75, endFrame: 85 },
    { name: 'follow_through', startFrame: 85, endFrame: totalFrames },
  ];

  const clubHeadPath: [number, number, number][] = [];
  const cogPath: [number, number, number][] = [];

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const phase = phases.find(p => i >= p.startFrame && i < phaseEnd(p)) || phases[phases.length - 1];
    const phaseT = (i - phase.startFrame) / (phaseEnd(phase) - phase.startFrame);

    const clubX = Math.sin(t * Math.PI * 2) * 0.8 + Math.cos(t * Math.PI * 3) * 0.2;
    const clubY = 1.0 + Math.sin(t * Math.PI) * 0.6 - phaseT * 0.1;
    const clubZ = Math.cos(t * Math.PI * 1.5) * 0.6 - 0.3 + phaseT * 0.4;
    clubHeadPath.push([clubX + rand(-0.02, 0.02), clubY + rand(-0.01, 0.01), clubZ + rand(-0.02, 0.02)]);

    const cogX = Math.sin(t * Math.PI * 0.5) * 0.08;
    const cogY = 0.95 + Math.sin(t * Math.PI * 2) * 0.03;
    const cogZ = Math.cos(t * Math.PI * 0.8) * 0.05;
    cogPath.push([cogX, cogY, cogZ]);
  }

  return {
    id: id || `swing_${Date.now()}`,
    startTime: Date.now() - 2000,
    endTime: Date.now(),
    clubHeadPath,
    centerOfGravityPath: cogPath,
    phases,
  };
}

function phaseEnd(p: SwingPhase): number {
  return p.endFrame;
}

function generateTimeSeries(length: number, baseValue: number, variance: number, anomalyCount: number = 0): TimeSeriesData {
  const timestamps: number[] = [];
  const values: number[] = [];
  const anomalies: { index: number; severity: number }[] = [];
  let current = baseValue;

  for (let i = 0; i < length; i++) {
    timestamps.push(i * (2000 / length));
    current += rand(-variance, variance);
    current = Math.max(0, current);
    values.push(current);
  }

  for (let i = 0; i < anomalyCount; i++) {
    const idx = Math.floor(rand(length * 0.2, length * 0.8));
    anomalies.push({ index: idx, severity: rand(0.3, 1.0) });
    values[idx] += rand(-variance * 5, variance * 5);
  }

  return { timestamps, values, anomalies };
}

export function generateBiomechanicsMetrics(): BiomechanicsMetrics {
  return {
    angularVelocity: generateTimeSeries(120, 180, 15, 3),
    linearVelocity: generateTimeSeries(120, 25, 3, 2),
    jointTorques: [
      generateTimeSeries(120, 45, 8, 2),
      generateTimeSeries(120, 35, 6, 1),
      generateTimeSeries(120, 55, 10, 2),
    ],
    centerOfGravityDisplacement: generateTimeSeries(120, 0.05, 0.01, 1),
    stabilityScore: Math.floor(rand(55, 95)),
    subScores: {
      rhythmConsistency: Math.floor(rand(50, 95)),
      cogStability: Math.floor(rand(55, 90)),
      jointCoordination: Math.floor(rand(60, 95)),
    },
  };
}

export function generateAlignmentResult(): AlignmentResult {
  const fieldMappings: FieldMapping[] = [
    { sourceField: 'club_head_pos', targetField: 'trajectory.clubHeadPath', confidence: rand(0.85, 0.99), deviation: rand(0, 0.05) },
    { sourceField: 'cog_pos', targetField: 'trajectory.centerOfGravityPath', confidence: rand(0.88, 0.99), deviation: rand(0, 0.04) },
    { sourceField: 'joint_angles', targetField: 'metrics.angularVelocity', confidence: rand(0.82, 0.96), deviation: rand(0.01, 0.08) },
    { sourceField: 'velocity', targetField: 'metrics.linearVelocity', confidence: rand(0.9, 0.99), deviation: rand(0, 0.03) },
    { sourceField: 'torque', targetField: 'metrics.jointTorques', confidence: rand(0.8, 0.95), deviation: rand(0.02, 0.1) },
    { sourceField: 'phase_label', targetField: 'trajectory.phases', confidence: rand(0.92, 0.99), deviation: rand(0, 0.02) },
  ];

  const deviationHeatmap: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const row: number[] = [];
    for (let j = 0; j < 6; j++) {
      row.push(i === j ? rand(0, 0.05) : rand(0.1, 0.6));
    }
    deviationHeatmap.push(row);
  }

  const alignmentScore = fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / fieldMappings.length;

  return {
    alignmentScore,
    fieldMappings,
    deviationHeatmap,
  };
}

export function generateKeypointFrames(count: number = 120): KeypointFrame[] {
  const phases: SwingPhase[] = [
    { name: 'address', startFrame: 0, endFrame: 20 },
    { name: 'backswing', startFrame: 20, endFrame: 50 },
    { name: 'downswing', startFrame: 50, endFrame: 75 },
    { name: 'impact', startFrame: 75, endFrame: 85 },
    { name: 'follow_through', startFrame: 85, endFrame: count },
  ];

  const frames: KeypointFrame[] = [];
  for (let i = 0; i < count; i++) {
    const phase = phases.find(p => i >= p.startFrame && i < p.endFrame) || phases[phases.length - 1];
    frames.push({
      timestamp: Date.now() - (count - i) * 16,
      keypoints: generateKeypoints(i, phase.name),
      confidence: rand(0.82, 0.98),
      frameIndex: i,
    });
  }
  return frames;
}

export function generateSwingSnapshot(): SwingSnapshot {
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    trajectory: generateSwingTrajectory(),
    metrics: generateBiomechanicsMetrics(),
    alignment: generateAlignmentResult(),
    keypointFrames: generateKeypointFrames(),
    tags: ['practice', 'driver', 'full_swing'].slice(0, Math.floor(rand(1, 4))),
    rating: Math.floor(rand(50, 100)),
  };
}
