import Dexie, { Table } from 'dexie';
import type {
  Pet,
  VitalSigns,
  GaitData,
  AnomalyDetection,
  HealthRecord,
  Device,
  SyncQueueItem,
} from '@/types';

export class PetLinkDB extends Dexie {
  pets!: Table<Pet>;
  vitalSigns!: Table<VitalSigns>;
  gaitData!: Table<GaitData>;
  anomalies!: Table<AnomalyDetection>;
  healthRecords!: Table<HealthRecord>;
  devices!: Table<Device>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('PetLinkDB');

    this.version(1).stores({
      pets: 'id, ownerId, name, updatedAt, version',
      vitalSigns: 'id, petId, timestamp, synced, version',
      gaitData: 'id, petId, timestamp, synced, version',
      anomalies: 'id, petId, timestamp, acknowledged, synced, version',
      healthRecords: 'id, petId, date, synced, version',
      devices: 'id, petId, macAddress, connected',
      syncQueue: '++id, entityType, entityId, timestamp',
    });
  }
}

let dbInstance: PetLinkDB | null = null;

export function getDB(): PetLinkDB {
  if (typeof window === 'undefined') {
    return {} as PetLinkDB;
  }
  if (!dbInstance) {
    dbInstance = new PetLinkDB();
  }
  return dbInstance;
}

export const db = typeof window !== 'undefined' ? new PetLinkDB() : {} as PetLinkDB;
