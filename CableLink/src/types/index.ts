export interface TemperaturePoint {
  timestamp: number;
  sensorId: string;
  position: {
    distance: number;
    depth: number;
  };
  temperature: number;
  current: number;
  voltage: number;
  ambientTemp: number;
}

export interface CableParameters {
  id: string;
  name: string;
  length: number;
  maxCurrent: number;
  maxTemperature: number;
  thermalResistance: number;
  ambientTemperature: number;
  conductorResistance: number;
  dielectricLoss: number;
}

export interface AlertRecord {
  id: string;
  timestamp: number;
  type: 'overheat' | 'overcurrent' | 'abnormal' | 'prediction';
  severity: 'info' | 'warning' | 'danger';
  sensorId: string;
  position?: { distance: number; depth: number };
  value: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  acknowledgedBy?: string;
  resolvedAt?: number;
}

export interface PredictionResult {
  timestamp: number;
  horizon: number;
  temperatureForecast: Array<{
    time: number;
    temp: number;
    confidence: number;
  }>;
  safeCurrent: number;
  riskLevel: 'low' | 'medium' | 'high';
  hotspotProbability: number;
}

export interface SensorMetaData {
  id: string;
  type: string;
  manufacturer: string;
  calibrationDate: number;
  location: {
    distance: number;
    depth: number;
  };
  samplingRate: number;
  accuracy: number;
}

export interface ThermalFieldData {
  timestamp: number;
  gridPoints: Array<{
    x: number;
    y: number;
    temperature: number;
    heatFlux: number;
  }>;
  maxTemperature: number;
  avgTemperature: number;
}

export interface SemanticMapping {
  sourceSystem: string;
  targetField: string;
  transform: string;
  unit: string;
  dataType: 'number' | 'string' | 'boolean' | 'timestamp';
}

export type AlertSeverity = 'info' | 'warning' | 'danger';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
