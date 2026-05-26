export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
  altitude?: number;
}

export type StatusType = 'normal' | 'warning' | 'error' | 'info';

export interface Alert {
  id: string;
  type: StatusType;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface WeatherData {
  timestamp: Date;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  precipitation: number;
}

export interface KPIData {
  name: string;
  value: number;
  unit: string;
  trend: number;
  status: StatusType;
}
