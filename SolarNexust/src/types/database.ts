import type { IDBPDatabase } from 'idb';
import type {
  Region,
  SolarPanel,
  Building,
  ShadowRecord,
  PowerGeneration,
  MPPTRecord,
  MaintenanceTask,
} from './solar';

export type SolarDB = IDBPDatabase<SolarDBSchema>;

export interface SolarDBSchema {
  regions: {
    key: string;
    value: Region;
    indexes: { 'by-name': string; 'by-lat': number; 'by-lng': number };
  };
  solarPanels: {
    key: string;
    value: SolarPanel;
    indexes: { 'by-region': string; 'by-status': string };
  };
  buildings: {
    key: string;
    value: Building;
    indexes: { 'by-region': string };
  };
  shadowRecords: {
    key: string;
    value: ShadowRecord;
    indexes: { 'by-panel': string; 'by-timestamp': number; 'by-panel-time': [string, number] };
  };
  powerGeneration: {
    key: string;
    value: PowerGeneration;
    indexes: { 'by-panel': string; 'by-timestamp': number; 'by-panel-time': [string, number] };
  };
  mpptRecords: {
    key: string;
    value: MPPTRecord;
    indexes: { 'by-generation': string };
  };
  maintenanceTasks: {
    key: string;
    value: MaintenanceTask;
    indexes: { 'by-panel': string; 'by-status': string; 'by-priority': string };
  };
  syncState: {
    key: string;
    value: SyncState;
    indexes: { 'by-timestamp': number };
  };
}

export interface SyncState {
  id: string;
  storeName: string;
  lastSync: number;
  pendingChanges: number;
  status: 'idle' | 'syncing' | 'error';
}

export interface StoreStats {
  count: number;
  size: number;
}

export interface DBStats {
  totalPanels: number;
  totalBuildings: number;
  totalRecords: number;
  totalSize: number;
  storageUsed: number;
  storageQuota: number;
  storeStats: Record<string, StoreStats>;
}

export type StoreName = keyof SolarDBSchema;
