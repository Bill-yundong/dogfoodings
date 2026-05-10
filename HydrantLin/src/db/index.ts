import { openDB, IDBPDatabase } from 'idb';
import { Hydrant, PressureReading, WaterMain, SemanticMetadata, ConflictRecord } from '../types';

const DB_NAME = 'HydrantLinDB';
const DB_VERSION = 1;

interface HydrantDB {
  hydrants: {
    key: string;
    value: Hydrant;
    indexes: { 'by-region': string; 'by-status': string };
  };
  pressureReadings: {
    key: string;
    value: PressureReading;
    indexes: { 'by-hydrant': string; 'by-timestamp': string; 'by-source': string };
  };
  waterMains: {
    key: string;
    value: WaterMain;
  };
  semanticMetadata: {
    key: string;
    value: SemanticMetadata;
  };
  conflictRecords: {
    key: string;
    value: ConflictRecord;
    indexes: { 'by-hydrant': string; 'by-time': string };
  };
}

let db: IDBPDatabase<HydrantDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<HydrantDB>> => {
  if (db) return db;

  db = await openDB<HydrantDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('hydrants')) {
        const hydrantStore = db.createObjectStore('hydrants', { keyPath: 'id' });
        hydrantStore.createIndex('by-region', 'region');
        hydrantStore.createIndex('by-status', 'status');
      }

      if (!db.objectStoreNames.contains('pressureReadings')) {
        const readingStore = db.createObjectStore('pressureReadings', {
          keyPath: ['hydrantId', 'timestamp'],
        });
        readingStore.createIndex('by-hydrant', 'hydrantId');
        readingStore.createIndex('by-timestamp', 'timestamp');
        readingStore.createIndex('by-source', 'source');
      }

      if (!db.objectStoreNames.contains('waterMains')) {
        db.createObjectStore('waterMains', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('semanticMetadata')) {
        db.createObjectStore('semanticMetadata', { keyPath: 'mappingVersion' });
      }

      if (!db.objectStoreNames.contains('conflictRecords')) {
        const conflictStore = db.createObjectStore('conflictRecords', {
          keyPath: ['hydrantId', 'detectedTime'],
        });
        conflictStore.createIndex('by-hydrant', 'hydrantId');
        conflictStore.createIndex('by-time', 'detectedTime');
      }
    },
  });

  return db;
};

export const saveHydrants = async (hydrants: Hydrant[]): Promise<void> => {
  const database = await initDB();
  const tx = database.transaction('hydrants', 'readwrite');
  const store = tx.store;

  for (const hydrant of hydrants) {
    await store.put(hydrant);
  }
  await tx.done;
};

export const getHydrants = async (): Promise<Hydrant[]> => {
  const database = await initDB();
  return database.getAll('hydrants');
};

export const getHydrantById = async (id: string): Promise<Hydrant | undefined> => {
  const database = await initDB();
  return database.get('hydrants', id);
};

export const getHydrantsByRegion = async (region: string): Promise<Hydrant[]> => {
  const database = await initDB();
  const index = database.transaction('hydrants').store.index('by-region');
  return index.getAll(region);
};

export const savePressureReadings = async (
  readings: PressureReading[]
): Promise<void> => {
  const database = await initDB();
  const tx = database.transaction('pressureReadings', 'readwrite');
  const store = tx.store;

  for (const reading of readings) {
    await store.put(reading);
  }
  await tx.done;
};

export const getLatestReadings = async (
  hydrantId: string,
  limit: number = 100
): Promise<PressureReading[]> => {
  const database = await initDB();
  const index = database.transaction('pressureReadings').store.index('by-hydrant');
  const allReadings = await index.getAll(hydrantId);
  return allReadings
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

export const saveWaterMain = async (main: WaterMain): Promise<void> => {
  const database = await initDB();
  await database.put('waterMains', main);
};

export const getWaterMain = async (id: string): Promise<WaterMain | undefined> => {
  const database = await initDB();
  return database.get('waterMains', id);
};

export const saveSemanticMetadata = async (
  metadata: SemanticMetadata
): Promise<void> => {
  const database = await initDB();
  await database.put('semanticMetadata', metadata);
};

export const getLatestSemanticMetadata = async (): Promise<
  SemanticMetadata | undefined
> => {
  const database = await initDB();
  const all = await database.getAll('semanticMetadata');
  return all.sort((a, b) => b.lastSyncTime - a.lastSyncTime)[0];
};

export const saveConflictRecord = async (
  conflict: ConflictRecord
): Promise<void> => {
  const database = await initDB();
  await database.put('conflictRecords', conflict);
};

export const getUnresolvedConflicts = async (): Promise<ConflictRecord[]> => {
  const database = await initDB();
  const index = database.transaction('conflictRecords').store.index('by-time');
  const all = await index.getAll();
  return all.filter((c) => !c.resolved);
};

export const bulkInsertHydrants = async (
  hydrants: Hydrant[]
): Promise<{ success: number; failed: number }> => {
  const database = await initDB();
  const tx = database.transaction('hydrants', 'readwrite');
  const store = tx.store;

  let success = 0;
  let failed = 0;

  for (const hydrant of hydrants) {
    try {
      await store.put(hydrant);
      success++;
    } catch (error) {
      failed++;
      console.error(`Failed to save hydrant ${hydrant.id}:`, error);
    }
  }

  await tx.done;
  return { success, failed };
};

export const bulkInsertReadings = async (
  readings: PressureReading[]
): Promise<{ success: number; failed: number }> => {
  const database = await initDB();
  const tx = database.transaction('pressureReadings', 'readwrite');
  const store = tx.store;

  let success = 0;
  let failed = 0;

  for (const reading of readings) {
    try {
      await store.put(reading);
      success++;
    } catch (error) {
      failed++;
      console.error(`Failed to save reading for ${reading.hydrantId}:`, error);
    }
  }

  await tx.done;
  return { success, failed };
};

export const clearOldReadings = async (olderThan: number): Promise<number> => {
  const database = await initDB();
  const tx = database.transaction('pressureReadings', 'readwrite');
  const store = tx.store;
  const index = store.index('by-timestamp');
  const range = IDBKeyRange.upperBound(olderThan);

  let count = 0;
  let cursor = await index.openCursor(range);

  while (cursor) {
    await cursor.delete();
    count++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return count;
};

export const getDBStats = async (): Promise<{
  hydrantCount: number;
  readingCount: number;
  waterMainCount: number;
  conflictCount: number;
}> => {
  const database = await initDB();
  const [hydrantCount, readingCount, waterMainCount, conflictCount] =
    await Promise.all([
      database.count('hydrants'),
      database.count('pressureReadings'),
      database.count('waterMains'),
      database.count('conflictRecords'),
    ]);

  return {
    hydrantCount,
    readingCount,
    waterMainCount,
    conflictCount,
  };
};

export const closeDB = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
