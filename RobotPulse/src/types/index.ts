export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface JointState {
  jointId: number;
  angle: number;
  velocity: number;
  torque: number;
  temperature: number;
}

export interface RobotPose {
  position: Vector3;
  orientation: Vector3;
  joints: JointState[];
}

export interface RobotState {
  id: string;
  name: string;
  timestamp: number;
  pose: RobotPose;
  status: "idle" | "moving" | "paused" | "error" | "collision";
  targetPose?: RobotPose;
  batteryLevel?: number;
  safetyDistance?: number;
}

export interface Obstacle {
  id: string;
  position: Vector3;
  size: Vector3;
  type: "static" | "dynamic";
  velocity?: Vector3;
}

export interface PathPoint {
  position: Vector3;
  timestamp: number;
  potential?: number;
}

export interface PlannedPath {
  robotId: string;
  points: PathPoint[];
  startTime: number;
  estimatedEndTime: number;
  status: "planning" | "in_progress" | "completed" | "aborted";
}

export interface PotentialFieldConfig {
  attractiveGain: number;
  repulsiveGain: number;
  influenceDistance: number;
  stepSize: number;
  maxIterations: number;
  goalThreshold: number;
}

export interface SafetyAlert {
  id: string;
  robotId: string;
  type: "collision_warning" | "joint_limit" | "velocity_limit" | "temperature_warning" | "path_deviation";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface PoseSnapshot {
  id?: string;
  robotId: string;
  timestamp: number;
  pose: RobotPose;
  obstacles: Obstacle[];
  alerts: SafetyAlert[];
  sessionId: string;
}

export interface DataSyncMessage {
  type: "state_update" | "command" | "alert" | "snapshot";
  source: "master" | "monitor" | "robot";
  payload: unknown;
  timestamp: number;
  sequence: number;
}

export interface MasterControlCommand {
  robotId: string;
  commandType: "move_to" | "pause" | "resume" | "stop" | "home";
  targetPose?: RobotPose;
  velocityLimit?: number;
}
