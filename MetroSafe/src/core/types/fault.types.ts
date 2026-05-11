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

export type FaultSource = 'maintenance' | 'operation_control' | 'sensor';

export interface FaultSignal {
  id: string;
  faultType: FaultType;
  source: FaultSource;
  semanticLevel: SemanticLevel;
  timestamp: number;
  acknowledged: boolean;
  doorId?: string;
  description: string;
}

export interface FaultChainNode {
  id: string;
  type: string;
  triggered: boolean;
  timestamp: number;
  faultType?: FaultType;
  semanticLevel?: SemanticLevel;
}

export interface FaultChain {
  id: string;
  name: string;
  nodes: FaultChainNode[];
  active: boolean;
  triggeredAt?: number;
}
