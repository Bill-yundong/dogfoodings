import { openDB, type IDBPDatabase } from 'idb';
import type { Borehole, TemperatureSnapshot, ThermalBalanceRecord, SyncQueueItem } from '@/types';

const DB_NAME = 'geotherm-logic-db';
const DB_VERSION = 1;

interface DBSchema {
  boreholes: {
    key: string;
    indexes: { 'by-status': string; 'by-location': string };
    data: Borehole;
  };
  temperatureSnapshots: {
    key: string;
    indexes: { 'by-borehole': string; 'by-timestamp': string };
    data: TemperatureSnapshot;
  };
  thermalBalanceCache: {
    key: string;
    indexes: { 'by-borehole': string };
    data: ThermalBalanceRecord;
  };
  syncQueue: {
    key: string;
    indexes: { 'by-status': string };
    data: SyncQueueItem;
  };
}

let dbInstance: IDBPDatabase<DBSchema> | null = null;

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('boreholes')) {
        const boreholeStore = db.createObjectStore('boreholes', { keyPath: 'id' });
        boreholeStore.createIndex('by-status', 'status');
        boreholeStore.createIndex('by-location', ['location.lat', 'location.lng']);
      }

      if (!db.objectStoreNames.contains('temperatureSnapshots')) {
        const snapshotStore = db.createObjectStore('temperatureSnapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-borehole', 'boreholeId');
        snapshotStore.createIndex('by-timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('thermalBalanceCache')) {
        const balanceStore = db.createObjectStore('thermalBalanceCache', { keyPath: 'id' });
        balanceStore.createIndex('by-borehole', 'boreholeId');
      }

      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
      }
    },
  });

  return dbInstance;
}

export async function saveBoreholes(boreholes: Borehole[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('boreholes', 'readwrite');
  await Promise.all(boreholes.map((b) => tx.store.put(b)));
  await tx.done;
}

export async function getBoreholes(): Promise<Borehole[]> {
  const db = await initDB();
  return db.getAll('boreholes');
}

export async function saveTemperatureSnapshots(snapshots: TemperatureSnapshot[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('temperatureSnapshots', 'readwrite');
  await Promise.all(snapshots.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function getSnapshotsByBorehole(boreholeId: string): Promise<TemperatureSnapshot[]> {
  const db = await initDB();
  return db.getAllFromIndex('temperatureSnapshots', 'by-borehole', boreholeId);
}

export async function saveThermalBalanceRecord(record: ThermalBalanceRecord): Promise<void> {
  const db = await initDB();
  await db.put('thermalBalanceCache', record);
}

export async function getThermalBalanceCache(boreholeId: string): Promise<ThermalBalanceRecord[]> {
  const db = await initDB();
  return db.getAllFromIndex('thermalBalanceCache', 'by-borehole', boreholeId);
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await initDB();
  await db.add('syncQueue', item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  return db.getAllFromIndex('syncQueue', 'by-status', 'pending');
}

export async function updateSyncItemStatus(id: string, status: SyncQueueItem['status']): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const item = await tx.store.get(id);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await tx.store.put(item);
  }
  await tx.done;
}

export async function clearOldSnapshots(days: number): Promise<number> {
  const db = await initDB();
  const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();
  const tx = db.transaction('temperatureSnapshots', 'readwrite');
  const allSnapshots = await tx.store.getAll();
  let deletedCount = 0;

  for (const snapshot of allSnapshots) {
    if (snapshot.timestamp < cutoffDate) {
      await tx.store.delete(snapshot.id);
      deletedCount++;
    }
  }

  await tx.done;
  return deletedCount;
}

export async function getDBStats(): Promise<{ size: number; stores: string[] }> {
  const db = await initDB();
  const stores = Array.from(db.objectStoreNames);
  let size = 0;

  for (const storeName of stores) {
    const count = await db.count(storeName as keyof DBSchema);
    size += count;
  }

  return { size, stores };
}
