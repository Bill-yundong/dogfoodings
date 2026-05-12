import type { FaultType } from './Fault';

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

export const createCycle = (
  doorId: string,
  cycleNumber: number,
  success: boolean = true,
  faultType?: FaultType
): CycleData => {
  const now = Date.now();
  const duration = 1500 + Math.random() * 2000;
  
  return {
    doorId,
    cycleNumber,
    startTime: now - duration,
    endTime: now,
    duration,
    maxMotorCurrent: 2.5 + Math.random() * 3 + (success ? 0 : 2),
    avgSpeed: 0.4 + Math.random() * 0.2,
    vibrationLevel: 10 + Math.random() * 20 + (success ? 0 : 15),
    obstaclesDetected: success ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1,
    success,
    faultType
  };
};
