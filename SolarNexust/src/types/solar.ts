export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export type PanelStatus = 'normal' | 'degraded' | 'fault';
export type BuildingType = 'residential' | 'commercial' | 'industrial';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SolarPanel {
  id: string;
  regionId: string;
  position: Vector3;
  rotation: Vector3;
  efficiency: number;
  area: number;
  status: PanelStatus;
  temperature: number;
  ratedPower: number;
}

export interface Building {
  id: string;
  regionId: string;
  vertices: Vector3[];
  height: number;
  type: BuildingType;
}

export interface Region {
  id: string;
  name: string;
  latCenter: number;
  lngCenter: number;
  radius: number;
}

export interface RayTracingResult {
  panelId: string;
  shadowCoverage: number;
  directIrradiance: number;
  diffuseIrradiance: number;
  timestamp: number;
  sunAltitude: number;
  sunAzimuth: number;
}

export interface MPPTData {
  panelId: string;
  voltage: number;
  current: number;
  maxPower: number;
  trackingEfficiency: number;
  temperatureCoefficient: number;
}

export interface PowerGeneration {
  id: string;
  panelId: string;
  timestamp: number;
  irradiance: number;
  temperature: number;
  outputPower: number;
  theoreticalPower: number;
  lossRate: number;
  shadowLoss: number;
  temperatureLoss: number;
  mpptLoss: number;
}

export interface MPPTRecord {
  id: string;
  generationId: string;
  voltage: number;
  current: number;
  maxPowerPoint: number;
  trackingEfficiency: number;
}

export interface ShadowRecord {
  id: string;
  panelId: string;
  buildingId: string;
  timestamp: number;
  coverageRate: number;
  powerLoss: number;
}

export interface MaintenanceTask {
  id: string;
  panelId: string;
  type: string;
  description: string;
  scheduledTime: number;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedLoss: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
  panelId?: string;
  regionId?: string;
  acknowledged: boolean;
}

export interface SchedulingSuggestion {
  id: string;
  type: string;
  description: string;
  targetRegionId: string;
  estimatedBenefit: number;
  confidence: number;
  timestamp: number;
}

export interface SimulationConfig {
  latitude: number;
  longitude: number;
  startTime: number;
  endTime: number;
  timeStep: number;
  rayCount: number;
  ambientTemperature: number;
}

export interface SolarPosition {
  altitude: number;
  azimuth: number;
  declination: number;
  hourAngle: number;
}
