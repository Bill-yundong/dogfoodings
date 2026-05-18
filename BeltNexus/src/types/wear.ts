export interface WearRecord {
  id: string;
  date: string;
  beltId: string;
  position: number;
  wearDepth: number;
  wearRate: number;
  tensionAvg: number;
  temperatureAvg: number;
  operatingHours: number;
  loadCycles: number;
}

export interface WearPrediction {
  position: number;
  currentWear: number;
  wearRate: number;
  remainingLife: number;
  predictedFailureDate: string;
  confidence: number;
}
