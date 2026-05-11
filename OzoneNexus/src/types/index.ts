export interface OzoneDataPoint {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  ozoneConcentration: number;
  uvIndex: number;
  dataVersion: string;
  source: string;
}

export interface PolarVortexData {
  id: string;
  timestamp: number;
  region: "arctic" | "antarctic";
  strength: number;
  temperature: number;
  windSpeed: number;
  area: number;
  dataVersion: string;
}

export interface PredictionResult {
  timestamp: number;
  predictedConcentration: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidence: number;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export interface SyncStatus {
  lastSync: number;
  dataVersion: string;
  pendingChanges: number;
  isSyncing: boolean;
}

export interface OzoneLayerMetrics {
  globalAverage: number;
  antarcticMinimum: number;
  arcticMinimum: number;
  recoveryRate: number;
  expectedFullRecoveryYear: number;
}
