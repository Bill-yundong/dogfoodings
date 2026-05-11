import { openDB, IDBPDatabase } from 'idb';
import { SnapshotData } from '../types';

const DB_NAME = 'SonicGridDB';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let db: IDBPDatabase | null = null;

export const initDB = async (): Promise<void> => {
  if (db) return;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    }
  });
};

export const saveSnapshot = async (snapshot: Omit<SnapshotData, 'id'>): Promise<number> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  const id = await db.add(STORE_NAME, snapshot);
  return id as number;
};

export const getSnapshot = async (id: number): Promise<SnapshotData | undefined> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  return await db.get(STORE_NAME, id);
};

export const getAllSnapshots = async (): Promise<SnapshotData[]> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  return await db.getAll(STORE_NAME);
};

export const getSnapshotsByTimeRange = async (
  startTime: number,
  endTime: number
): Promise<SnapshotData[]> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store;
  const index = store.index('timestamp');

  const range = IDBKeyRange.bound(startTime, endTime);
  const snapshots: SnapshotData[] = [];

  let cursor = await index.openCursor(range);
  while (cursor) {
    snapshots.push(cursor.value);
    cursor = await cursor.continue();
  }

  return snapshots;
};

export const deleteSnapshot = async (id: number): Promise<void> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  await db.delete(STORE_NAME, id);
};

export const deleteOldSnapshots = async (olderThan: number): Promise<void> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  const index = store.index('timestamp');

  const range = IDBKeyRange.upperBound(olderThan);

  let cursor = await index.openCursor(range);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
};

export const clearAllSnapshots = async (): Promise<void> => {
  if (!db) await initDB();
  if (!db) throw new Error('Database not initialized');

  await db.clear(STORE_NAME);
};

export const getSnapshotStats = async (): Promise<{
  count: number;
  oldest: number | null;
  newest: number | null;
}> => {
  const snapshots = await getAllSnapshots();

  if (snapshots.length === 0) {
    return { count: 0, oldest: null, newest: null };
  }

  const timestamps = snapshots.map(s => s.timestamp);
  return {
    count: snapshots.length,
    oldest: Math.min(...timestamps),
    newest: Math.max(...timestamps)
  };
};
