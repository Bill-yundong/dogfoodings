import { DoorState } from '../value-objects/DoorState';

export interface CycleData {
  readonly id?: number;
  readonly doorId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly startState: DoorState;
  readonly endState: DoorState;
  readonly maxPosition: number;
  readonly avgSpeed: number;
  readonly maxSpeed: number;
  readonly avgMotorCurrent: number;
  readonly maxMotorCurrent: number;
  readonly hasObstacle: boolean;
  readonly obstacleCount: number;
  readonly duration: number;
}

export interface CycleStats {
  totalCycles: number;
  successfulCycles: number;
  failedCycles: number;
  avgDuration: number;
  avgMotorCurrent: number;
  obstacleRate: number;
  lastCycleTime?: number;
}

export const createCycle = (
  doorId: string,
  startTime: number,
  endTime: number,
  startState: DoorState,
  endState: DoorState,
  maxPosition: number,
  avgSpeed: number,
  maxSpeed: number,
  avgMotorCurrent: number,
  maxMotorCurrent: number,
  hasObstacle: boolean,
  obstacleCount: number
): CycleData => ({
  doorId,
  startTime,
  endTime,
  startState,
  endState,
  maxPosition,
  avgSpeed,
  maxSpeed,
  avgMotorCurrent,
  maxMotorCurrent,
  hasObstacle,
  obstacleCount,
  duration: endTime - startTime
});
