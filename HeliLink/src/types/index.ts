export type DataQuality = 'good' | 'warning' | 'critical';

export type PlatformStatus = 'active' | 'maintenance' | 'emergency';

export type CableStatus = 'normal' | 'warning' | 'damaged';

export type RiskLevel = 'safe' | 'caution' | 'danger';

export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'failed';

export type SourceSystem = 'meteorology' | 'fleet' | 'platform';

export type DataType = 'weather' | 'landing' | 'route' | 'alert';

export type UserRole = 'platform_safety' | 'fleet_commander' | 'meteorologist' | 'admin';

export interface WeatherData {
  id: string;
  timestamp: number;
  platformId: string;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
  temperature: number;
  pressure: number;
  visibility: number;
  dataQuality: DataQuality;
}

export interface PlatformMetadata {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  altitude: number;
  helipadCount: number;
  maxWindSpeed: number;
  maxWaveHeight: number;
  status: PlatformStatus;
  cables: string[];
  lastSync?: number;
}

export interface SubmarineCable {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  depth: number;
  voltage: number;
  status: CableStatus;
  lastSync?: number;
}

export interface DWAParams {
  safetyWeight: number;
  timeWeight: number;
  fuelWeight: number;
  windowSize: number;
  predictionHorizon: number;
  minLandingDuration: number;
  maxWindSpeed: number;
  maxWaveHeight: number;
}

export interface LandingWindow {
  id: string;
  platformId: string;
  startTime: number;
  endTime: number;
  feasibilityScore: number;
  safetyScore: number;
  timeScore: number;
  fuelScore: number;
  weatherConditions: {
    avgWindSpeed: number;
    maxWaveHeight: number;
    visibility: number;
  };
  riskLevel: RiskLevel;
  createdAt?: number;
}

export interface RoutePlan {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: { lat: number; lng: number; alt: number }[];
  distance: number;
  estimatedTime: number;
  fuelConsumption: number;
  riskScore: number;
  obstacles: string[];
  isRecommended: boolean;
}

export interface SemanticTag {
  id: string;
  dataType: DataType;
  metricName: string;
  businessLabel: string;
  severity: 'info' | 'warning' | 'danger';
  colorCode: string;
  thresholdMin?: number;
  thresholdMax?: number;
}

export interface SemanticSyncData {
  id: string;
  dataType: DataType;
  sourceSystem: SourceSystem;
  semanticTags: string[];
  payload: unknown;
  timestamp: number;
  syncStatus: SyncStatus;
  version: number;
}

export interface SyncLogEntry {
  id: string;
  tagId?: string;
  sourceSystem: SourceSystem;
  targetSystem: SourceSystem;
  syncStatus: SyncStatus;
  timestamp: number;
  version: number;
  latency?: number;
  message?: string;
}

export interface OfflineQueueItem {
  id: string;
  dataType: DataType;
  payload: unknown;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'synced';
  createdAt: number;
  lastAttempt?: number;
}

export interface SyncStatusItem {
  system: SourceSystem;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  lastSync: number;
  tagMatchRate: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
}

export interface HelicopterPosition {
  id: string;
  flightNumber: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  origin: string;
  destination: string;
  status: 'en-route' | 'landing' | 'hovering' | 'departing';
  timestamp: number;
}

export interface Alert {
  id: string;
  type: 'weather' | 'system' | 'safety' | 'sync';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  platformId?: string;
  timestamp: number;
  acknowledged: boolean;
}

export const defaultDWAParams: DWAParams = {
  safetyWeight: 0.6,
  timeWeight: 0.25,
  fuelWeight: 0.15,
  windowSize: 15,
  predictionHorizon: 24,
  minLandingDuration: 10,
  maxWindSpeed: 20,
  maxWaveHeight: 4,
};

export const rolePermissions: Record<UserRole, string[]> = {
  platform_safety: ['monitor:read', 'offline:access', 'alert:acknowledge'],
  fleet_commander: ['monitor:read', 'route:create', 'route:update', 'offline:access', 'alert:acknowledge', 'history:read'],
  meteorologist: ['monitor:read', 'dwa:configure', 'sync:configure', 'weather:calibrate', 'offline:access', 'history:read'],
  admin: ['*'],
};
