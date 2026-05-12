import { SemanticLevel } from './SemanticLevel';

export const FaultType = {
  MOTOR_FAILURE: 'motor_failure',
  SENSOR_ERROR: 'sensor_error',
  DOOR_OBSTACLE: 'door_obstacle',
  COMMUNICATION_LOST: 'communication_lost',
  POWER_FAILURE: 'power_failure',
  OVERLOAD: 'overload'
} as const;

export type FaultType = typeof FaultType[keyof typeof FaultType];

export const FaultTypeLabel: Record<FaultType, string> = {
  [FaultType.MOTOR_FAILURE]: '电机故障',
  [FaultType.SENSOR_ERROR]: '传感器错误',
  [FaultType.DOOR_OBSTACLE]: '门体障碍物',
  [FaultType.COMMUNICATION_LOST]: '通信中断',
  [FaultType.POWER_FAILURE]: '电源故障',
  [FaultType.OVERLOAD]: '过载保护'
};

export const FaultTypeDefaultLevel: Record<FaultType, SemanticLevel> = {
  [FaultType.MOTOR_FAILURE]: SemanticLevel.CRITICAL,
  [FaultType.SENSOR_ERROR]: SemanticLevel.WARNING,
  [FaultType.DOOR_OBSTACLE]: SemanticLevel.WARNING,
  [FaultType.COMMUNICATION_LOST]: SemanticLevel.EMERGENCY,
  [FaultType.POWER_FAILURE]: SemanticLevel.EMERGENCY,
  [FaultType.OVERLOAD]: SemanticLevel.CRITICAL
};
