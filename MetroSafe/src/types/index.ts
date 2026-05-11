export const DoorState = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
  FAULT: 'fault'
} as const;

export type DoorState = typeof DoorState[keyof typeof DoorState];

export const FaultType = {
  NONE: 'none',
  OBSTACLE_DETECTED: 'obstacle_detected',
  MOTOR_FAILURE: 'motor_failure',
  SENSOR_ERROR: 'sensor_error',
  COMMUNICATION_ERROR: 'communication_error',
  DOOR_MISALIGNMENT: 'door_misalignment'
} as const;

export type FaultType = typeof FaultType[keyof typeof FaultType];

export const SemanticLevel = {
  INFORMATIONAL: 'informational',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
} as const;

export type SemanticLevel = typeof SemanticLevel[keyof typeof SemanticLevel];

export interface DoorStatus {
  doorId: string;
  state: DoorState;
  position: number;
  speed: number;
  motorCurrent: number;
  timestamp: number;
}

export interface FaultSignal {
  id: string;
  faultType: FaultType;
  source: 'maintenance' | 'operation_control' | 'sensor';
  semanticLevel: SemanticLevel;
  timestamp: number;
  acknowledged: boolean;
  doorId?: string;
  description: string;
}

export interface CycleData {
  id?: number;
  doorId: string;
  cycleNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  maxMotorCurrent: number;
  avgSpeed: number;
  vibrationLevel: number;
  obstaclesDetected: number;
  success: boolean;
  faultType?: FaultType;
}

export interface LogicGateInput {
  id: string;
  value: boolean;
  timestamp: number;
}

export interface LogicGateOutput {
  value: boolean;
  propagated: boolean;
  timestamp: number;
  faultChain?: string[];
}
