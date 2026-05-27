export interface DeviceReading {
  deviceId: string;
  name: string;
  power: number;
  isOn: boolean;
  isStandby: boolean;
  standbyDuration: number;
}

export interface EnergyReading {
  timestamp: number;
  totalPower: number;
  standbyPower: number;
  devices: DeviceReading[];
}

export interface LoadFeature {
  id: string;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  waveform: number[];
  patternMatch: number;
  anomalyScore: number;
  isWaste: boolean;
  wasteLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  resolved: boolean;
}

export interface DeviceSnapshot {
  deviceId: string;
  name: string;
  consumption: number;
  runHours: number;
  standbyHours: number;
  category: string;
}

export interface EnergySnapshot {
  id: string;
  timestamp: number;
  date: string;
  hour: number;
  totalConsumption: number;
  standbyConsumption: number;
  cost: number;
  efficiencyScore: number;
  deviceBreakdown: DeviceSnapshot[];
  detectedWastePoints: string[];
  weather?: {
    temperature: number;
    humidity: number;
  };
}

export interface Device {
  id: string;
  name: string;
  category: string;
  icon: string;
  ratedPower: number;
  standbyPower: number;
  isSmart: boolean;
  isOn: boolean;
  location: string;
}

export type SyncEventType =
  | 'energy:reading'
  | 'device:state-change'
  | 'waste:detected'
  | 'snapshot:created'
  | 'ui:navigate'
  | 'sync:request'
  | 'suggestion:generated'
  | 'engine:status';

export type ModuleSource = 'dashboard' | 'control' | 'detection' | 'history' | 'engine' | 'bus' | 'db';

export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  source: ModuleSource;
  target?: ModuleSource;
  payload: T;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
}

export interface EnergySuggestion {
  id: string;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  type: 'standby' | 'efficiency' | 'schedule' | 'replacement';
  title: string;
  description: string;
  potentialSaving: number;
  savingUnit: 'kWh' | 'yuan';
  priority: 'low' | 'medium' | 'high';
  implemented: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: number;
  sourceModule: ModuleSource;
  targetModule?: ModuleSource;
  dataType: SyncEventType;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

export type PageRoute = '/' | '/control' | '/detection' | '/history';

export interface WastePattern {
  id: string;
  name: string;
  description: string;
  signature: number[];
  threshold: number;
}
