export interface SeismicDataPoint {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WavePrediction {
  pWaveArrival: number;
  sWaveArrival: number;
  timeDiff: number;
  estimatedMagnitude: number;
  confidence: number;
}

export interface WaveformSlice {
  id: string;
  stationId: string;
  startTime: number;
  endTime: number;
  sampleRate: number;
  data: number[];
  createdAt: number;
}

export interface BuildingSafetyStatus {
  buildingId: string;
  buildingName: string;
  currentIntensity: number;
  stressLevel: number;
  safetyScore: number;
  alerts: Alert[];
  lastUpdate: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  timestamp: number;
}

export interface SyncMessage {
  type: 'seismic_data' | 'prediction' | 'alert' | 'status';
  payload: any;
  timestamp: number;
  source: string;
}
