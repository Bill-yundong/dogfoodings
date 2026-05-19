export interface JointState {
  position: number;
  velocity: number;
  effort: number;
}

export interface RobotPose {
  robotId: string;
  timestamp: number;
  frameNumber: number;
  joints: number[];
  jointStates: JointState[];
  endEffector: {
    position: [number, number, number];
    orientation: [number, number, number, number];
  };
}

export interface DHParameter {
  alpha: number;
  a: number;
  d: number;
  theta: number;
}

export interface RobotModel {
  id: string;
  name: string;
  color: string;
  basePosition: [number, number, number];
  dhParameters: DHParameter[];
  jointLimits: Array<{ min: number; max: number }>;
  maxJointVelocities: number[];
  linkDimensions: Array<{ length: number; radius: number }>;
}

export interface Obstacle {
  id: string;
  type: 'box' | 'sphere' | 'cylinder';
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface APFParameters {
  kAtt: number;
  kRep: number;
  d0: number;
  maxForce: number;
  gain: number;
}

export interface CollisionWarning {
  level: 'safe' | 'warning' | 'danger' | 'emergency';
  distance: number;
  obstacleId: string;
  robotId: string;
}

export interface DataFrame {
  frameNumber: number;
  timestamp: number;
  robotId: string;
  joints: number[];
  checksum: string;
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'error';

export interface SnapshotRecord {
  id?: string;
  robotId: string;
  timestamp: number;
  pose: RobotPose;
  simulationTime: number;
  collisionWarning: boolean;
  warningLevel?: CollisionWarning['level'];
}
