export interface TemperaturePoint {
  x: number;
  y: number;
  z: number;
  temperature: number;
  timestamp: number;
}

export interface StressPoint {
  x: number;
  y: number;
  z: number;
  stress: number;
  principalStress: number[];
}

export interface CoolingSnapshot {
  id?: string;
  batchId: string;
  timestamp: number;
  temperatureField: TemperaturePoint[];
  coolingRate: number;
  averageTemperature: number;
  maxTemperature: number;
  minTemperature: number;
}

export interface ForgingBatch {
  id: string;
  partNumber: string;
  startTime: number;
  endTime?: number;
  material: string;
  initialTemperature: number;
  targetCoolingRate: number;
  status: 'ongoing' | 'completed' | 'failed';
  snapshots: string[];
  qualityScore?: number;
  predictedStress?: StressPoint[];
}

export interface ProcessParams {
  materialConductivity: number;
  density: number;
  specificHeat: number;
  ambientTemperature: number;
  convectionCoefficient: number;
  timeStep: number;
  gridSize: number;
}

export interface QualityData {
  batchId: string;
  inspectionTime: number;
  hardness: number;
  microstructure: string;
  defects: string[];
  passed: boolean;
  coolingRateDeviation: number;
}

export interface DataLinkEvent {
  id: string;
  batchId: string;
  source: 'manufacturing' | 'quality';
  eventType: 'cooling_rate_update' | 'quality_feedback';
  data: Record<string, unknown>;
  timestamp: number;
}
