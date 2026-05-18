export interface Alarm {
  id: string;
  timestamp: number;
  type: 'tear' | 'tension' | 'temperature' | 'wear' | 'sensor';
  severity: 'info' | 'warning' | 'critical';
  position: number;
  sensorId: string;
  value: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: number;
}

export interface AlarmThresholds {
  tension: {
    warning: number;
    critical: number;
  };
  temperature: {
    warning: number;
    critical: number;
  };
  vibration: {
    warning: number;
    critical: number;
  };
  wear: {
    warning: number;
    critical: number;
  };
}
