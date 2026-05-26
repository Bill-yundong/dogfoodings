export type GridSignalType = 'normal' | 'peak' | 'valley' | 'emergency';

export type ChargeType = 'fast' | 'normal' | 'slow' | 'v2g';

export interface GridSignal {
  id: string;
  timestamp: Date;
  gridLoad: number;
  gridCapacity: number;
  electricityPrice: number;
  signalType: GridSignalType;
  targetLoad?: number;
  frequency: number;
  renewableRatio: number;
}

export interface ChargeSession {
  id: string;
  batteryId: string;
  gridSignalId?: string;
  startTime: Date;
  endTime?: Date;
  energyCharged: number;
  maxPower: number;
  averagePower: number;
  chargeType: ChargeType;
  status: 'charging' | 'completed' | 'cancelled' | 'v2g-active';
  cost: number;
  carbonFootprint: number;
}

export interface ChargeCurvePoint {
  timestamp: Date;
  power: number;
  soc: number;
  voltage: number;
  current: number;
  temperature: number;
}

export interface V2GResponse {
  id: string;
  sessionId: string;
  requestTime: Date;
  targetPower: number;
  duration: number;
  energyDischarged: number;
  revenue: number;
  status: 'pending' | 'active' | 'completed' | 'declined';
}

export interface EnergyForecast {
  timestamp: Date;
  predictedLoad: number;
  predictedPrice: number;
  predictedRenewableRatio: number;
  confidence: number;
}

export interface ChargingPlan {
  batteryId: string;
  priority: number;
  scheduledStartTime: Date;
  scheduledDuration: number;
  targetSOC: number;
  chargeType: ChargeType;
  estimatedCost: number;
  constraints: {
    deadline: Date;
    minSOC: number;
  };
}
