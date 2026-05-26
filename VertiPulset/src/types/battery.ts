export interface Battery {
  id: string;
  serialNumber: string;
  nominalCapacity: number;
  nominalVoltage: number;
  manufactureDate: Date;
  aircraftId: string;
  cellCount: number;
  chemistry: 'lfp' | 'ncm' | 'other';
  currentCapacity: number;
  cycleCount: number;
  status: 'healthy' | 'degrading' | 'replace' | 'maintenance';
}

export interface BatterySnapshot {
  id: string;
  batteryId: string;
  flightId: string;
  timestamp: Date;
  soh: number;
  soc: number;
  temperature: number;
  cycleCount: number;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  cellData: CellData[];
  operationPhase: 'idle' | 'takeoff' | 'cruise' | 'landing' | 'charging' | 'discharging';
}

export interface CellData {
  cellIndex: number;
  voltage: number;
  temperature: number;
  soc: number;
  resistance: number;
}

export interface BatteryHealthPrediction {
  batteryId: string;
  predictionDate: Date;
  projectedSOH: number[];
  projectedCycles: number[];
  expectedEndOfLife: Date;
  confidence: number;
  recommendedReplacementDate?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SOHTrendPoint {
  timestamp: Date;
  soh: number;
  cycleCount: number;
  temperature: number;
}

export interface BatteryAlert {
  id: string;
  batteryId: string;
  type: 'overheat' | 'low_soh' | 'cell_imbalance' | 'overcharge' | 'overdischarge';
  severity: 'warning' | 'critical';
  timestamp: Date;
  value: number;
  threshold: number;
  acknowledged: boolean;
}
