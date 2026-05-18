export const DB_NAME = 'beltnexus_db';
export const DB_VERSION = 1;

export const STORES = {
  SENSOR_DATA: 'sensor_data',
  BELT_STATES: 'belt_states',
  ALARMS: 'alarms',
  WEAR_RECORDS: 'wear_records',
  SENSORS: 'sensors',
  SETTINGS: 'settings',
} as const;

export interface DBSchema {
  sensor_data: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      sensorId: string;
      position: number;
      tension: number;
      temperature: number;
      vibration: number;
      strain: number;
    };
    indexes: {
      timestamp: number;
      sensorId: string;
      position: number;
    };
  };
  belt_states: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      length: number;
      speed: number;
      load: number;
      tensionProfile: number[];
      temperatureProfile: number[];
      wearProfile: number[];
      isRunning: boolean;
      healthScore: number;
    };
    indexes: {
      timestamp: number;
      healthScore: number;
    };
  };
  alarms: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: string;
      severity: string;
      position: number;
      sensorId: string;
      value: number;
      threshold: number;
      message: string;
      acknowledged: boolean;
      acknowledgedBy?: string;
      resolved: boolean;
      resolvedAt?: number;
    };
    indexes: {
      timestamp: number;
      severity: string;
      type: string;
      resolved: boolean;
    };
  };
  wear_records: {
    key: string;
    value: {
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
    };
    indexes: {
      date: string;
      beltId: string;
      position: number;
    };
  };
  sensors: {
    key: string;
    value: {
      id: string;
      name: string;
      channel: number;
      position: number;
      samplingRate: number;
      isActive: boolean;
      lastCalibration: number;
    };
    indexes: {
      channel: number;
      position: number;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}
