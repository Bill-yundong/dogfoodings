import Dexie, { Table } from 'dexie';
import {
  Trip,
  Location,
  TripSnapshot,
  OperationLog,
  UserSetting,
  SyncQueueItem,
  CalendarEvent,
  TravelApplication,
} from '@/lib/types';

export class TripNexusDB extends Dexie {
  trips!: Table<Trip, string>;
  locations!: Table<Location, string>;
  snapshots!: Table<TripSnapshot, string>;
  operationLogs!: Table<OperationLog, string>;
  settings!: Table<UserSetting, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  travelApplications!: Table<TravelApplication, string>;

  constructor() {
    super('TripNexusDB');

    this.version(1).stores({
      trips: '&id, userId, status, createdAt, updatedAt',
      locations: '&id, tripId, orderIndex',
      snapshots: '&id, tripId, version, createdAt, synced, syncStatus',
      operationLogs: '&id, tripId, snapshotId, timestamp, offline',
      settings: '&key',
      syncQueue: '&id, type, status, createdAt',
      calendarEvents: '&id, locationId, externalId, provider, startTime',
      travelApplications: '&id, tripId, externalId, system, status',
    });
  }
}

let dbInstance: TripNexusDB | null = null;

export const getDB = (): TripNexusDB => {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbInstance) {
    dbInstance = new TripNexusDB();
  }

  return dbInstance;
};

export const closeDB = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

export const deleteDB = async (): Promise<void> => {
  closeDB();
  await Dexie.delete('TripNexusDB');
};

export const isDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};
