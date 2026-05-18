export interface SensorData {
  id: string;
  timestamp: number;
  sensorId: string;
  position: number;
  tension: number;
  temperature: number;
  vibration: number;
  strain: number;
}

export interface FiberSensor {
  id: string;
  name: string;
  channel: number;
  position: number;
  samplingRate: number;
  isActive: boolean;
  lastCalibration: number;
}

export interface SemanticSensorData extends SensorData {
  semantics: {
    domain: string;
    entity: string;
    quantity: string;
    unit: string;
    timestamp: string;
  };
}
