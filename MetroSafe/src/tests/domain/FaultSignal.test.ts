import { describe, it, expect } from 'vitest';
import {
  FaultType,
  FaultTypeLabel,
  FaultTypeDefaultLevel,
  SemanticLevel,
  SemanticLevelLabel,
  SemanticLevelColor,
  SemanticLevelPriority,
  SemanticSyncDelay,
  createFaultSignal,
  acknowledgeFault
} from '../../domain';

describe('SemanticLevel Value Object', () => {
  it('should have all 4 semantic levels', () => {
    expect(SemanticLevel).toEqual({
      INFORMATIONAL: 'informational',
      WARNING: 'warning',
      CRITICAL: 'critical',
      EMERGENCY: 'emergency'
    });
  });

  it('should have correct Chinese labels', () => {
    expect(SemanticLevelLabel[SemanticLevel.INFORMATIONAL]).toBe('信息');
    expect(SemanticLevelLabel[SemanticLevel.WARNING]).toBe('警告');
    expect(SemanticLevelLabel[SemanticLevel.CRITICAL]).toBe('严重');
    expect(SemanticLevelLabel[SemanticLevel.EMERGENCY]).toBe('紧急');
  });

  it('should have correct color codes', () => {
    expect(SemanticLevelColor[SemanticLevel.INFORMATIONAL]).toBe('#2196F3');
    expect(SemanticLevelColor[SemanticLevel.WARNING]).toBe('#FFC107');
    expect(SemanticLevelColor[SemanticLevel.CRITICAL]).toBe('#FF9800');
    expect(SemanticLevelColor[SemanticLevel.EMERGENCY]).toBe('#F44336');
  });

  it('should have correct priority order', () => {
    expect(SemanticLevelPriority[SemanticLevel.INFORMATIONAL]).toBe(0);
    expect(SemanticLevelPriority[SemanticLevel.WARNING]).toBe(1);
    expect(SemanticLevelPriority[SemanticLevel.CRITICAL]).toBe(2);
    expect(SemanticLevelPriority[SemanticLevel.EMERGENCY]).toBe(3);
  });

  it('should have correct sync delays based on priority', () => {
    expect(SemanticSyncDelay[SemanticLevel.EMERGENCY]).toBe(50);
    expect(SemanticSyncDelay[SemanticLevel.CRITICAL]).toBe(200);
    expect(SemanticSyncDelay[SemanticLevel.WARNING]).toBe(500);
    expect(SemanticSyncDelay[SemanticLevel.INFORMATIONAL]).toBe(1000);
  });
});

describe('FaultType Value Object', () => {
  it('should have all fault types', () => {
    expect(FaultType).toEqual({
      MOTOR_FAILURE: 'motor_failure',
      SENSOR_ERROR: 'sensor_error',
      DOOR_OBSTACLE: 'door_obstacle',
      COMMUNICATION_LOST: 'communication_lost',
      POWER_FAILURE: 'power_failure',
      OVERLOAD: 'overload'
    });
  });

  it('should have correct Chinese labels', () => {
    expect(FaultTypeLabel[FaultType.MOTOR_FAILURE]).toBe('电机故障');
    expect(FaultTypeLabel[FaultType.SENSOR_ERROR]).toBe('传感器错误');
    expect(FaultTypeLabel[FaultType.DOOR_OBSTACLE]).toBe('门体障碍物');
    expect(FaultTypeLabel[FaultType.COMMUNICATION_LOST]).toBe('通信中断');
    expect(FaultTypeLabel[FaultType.POWER_FAILURE]).toBe('电源故障');
    expect(FaultTypeLabel[FaultType.OVERLOAD]).toBe('过载保护');
  });

  it('should have correct default semantic levels', () => {
    expect(FaultTypeDefaultLevel[FaultType.MOTOR_FAILURE]).toBe(SemanticLevel.CRITICAL);
    expect(FaultTypeDefaultLevel[FaultType.SENSOR_ERROR]).toBe(SemanticLevel.WARNING);
    expect(FaultTypeDefaultLevel[FaultType.DOOR_OBSTACLE]).toBe(SemanticLevel.WARNING);
    expect(FaultTypeDefaultLevel[FaultType.COMMUNICATION_LOST]).toBe(SemanticLevel.EMERGENCY);
    expect(FaultTypeDefaultLevel[FaultType.POWER_FAILURE]).toBe(SemanticLevel.EMERGENCY);
    expect(FaultTypeDefaultLevel[FaultType.OVERLOAD]).toBe(SemanticLevel.CRITICAL);
  });
});

describe('FaultSignal Entity', () => {
  it('should create a fault signal with all required fields', () => {
    const fault = createFaultSignal(
      FaultType.MOTOR_FAILURE,
      'sensor',
      SemanticLevel.CRITICAL,
      'PSD-01',
      '电机电流过载'
    );

    expect(fault.id).toBeDefined();
    expect(fault.id.startsWith('fault-')).toBe(true);
    expect(fault.faultType).toBe(FaultType.MOTOR_FAILURE);
    expect(fault.source).toBe('sensor');
    expect(fault.semanticLevel).toBe(SemanticLevel.CRITICAL);
    expect(fault.doorId).toBe('PSD-01');
    expect(fault.description).toBe('电机电流过载');
    expect(fault.timestamp).toBeDefined();
    expect(fault.acknowledged).toBe(false);
  });

  it('should acknowledge a fault signal', () => {
    const fault = createFaultSignal(
      FaultType.SENSOR_ERROR,
      'sensor',
      SemanticLevel.WARNING,
      'PSD-02',
      '传感器数据异常'
    );

    const acknowledgedFault = acknowledgeFault(fault);

    expect(acknowledgedFault.acknowledged).toBe(true);
    expect(acknowledgedFault.acknowledgedAt).toBeDefined();
  });

  it('should not mutate original fault signal when acknowledging', () => {
    const fault = createFaultSignal(
      FaultType.DOOR_OBSTACLE,
      'sensor',
      SemanticLevel.WARNING,
      'PSD-03',
      '检测到障碍物'
    );
    const originalAckValue = fault.acknowledged;

    acknowledgeFault(fault);

    expect(fault.acknowledged).toBe(originalAckValue);
  });

  it('should have unique IDs for different fault signals', () => {
    const fault1 = createFaultSignal(
      FaultType.MOTOR_FAILURE,
      'sensor',
      SemanticLevel.CRITICAL,
      'PSD-01',
      '电机故障1'
    );
    const fault2 = createFaultSignal(
      FaultType.MOTOR_FAILURE,
      'sensor',
      SemanticLevel.CRITICAL,
      'PSD-01',
      '电机故障2'
    );

    expect(fault1.id).not.toBe(fault2.id);
  });
});
