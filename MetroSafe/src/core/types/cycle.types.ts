import type { FaultType } from './fault.types';

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

export interface CycleStats {
  totalCycles: number;
  successfulCycles: number;
  failedCycles: number;
  avgDuration: number;
  avgMotorCurrent: number;
  faultDistribution: Map<FaultType, number>;
}

export interface CycleFilter {
  doorId?: string;
  startTime?: number;
  endTime?: number;
  success?: boolean;
  faultType?: FaultType;
}
