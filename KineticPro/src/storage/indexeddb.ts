import { openDB, type IDBPDatabase } from 'idb';
import type { SwingSnapshot } from '@/types';

const DB_NAME = 'kineticpro-db';
const DB_VERSION = 1;
const SNAPSHOTS_STORE = 'swing_snapshots';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('rating', 'rating', { unique: false });
      }
    },
  });

  return dbInstance;
}

export async function saveSnapshot(snapshot: SwingSnapshot): Promise<void> {
  const db = await getDB();
  await db.put(SNAPSHOTS_STORE, snapshot);
}

export async function getSnapshot(id: string): Promise<SwingSnapshot | undefined> {
  const db = await getDB();
  return db.get(SNAPSHOTS_STORE, id);
}

export async function getAllSnapshots(): Promise<SwingSnapshot[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(SNAPSHOTS_STORE, 'createdAt');
  return all.reverse();
}

export async function getSnapshotsByRating(minRating: number): Promise<SwingSnapshot[]> {
  const db = await getDB();
  const all = await db.getAll(SNAPSHOTS_STORE);
  return all.filter(s => s.rating >= minRating).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(SNAPSHOTS_STORE, id);
}

export async function getSnapshotCount(): Promise<number> {
  const db = await getDB();
  return db.count(SNAPSHOTS_STORE);
}
