import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES, type DBSchema } from './schema';

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.WAVEFORM_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORES.WAVEFORM_SNAPSHOTS, {
            keyPath: 'id'
          });
          snapshotStore.createIndex('by-startTime', 'startTime');
          snapshotStore.createIndex('by-triggerType', 'triggerType');
          snapshotStore.createIndex('by-createdAt', 'createdAt');
        }

        if (!db.objectStoreNames.contains(STORES.SEMANTIC_MAPPINGS)) {
          const mappingStore = db.createObjectStore(STORES.SEMANTIC_MAPPINGS, {
            keyPath: 'id'
          });
          mappingStore.createIndex('by-sourceTag', 'sourceTag');
          mappingStore.createIndex('by-targetTag', 'targetTag');
        }

        if (!db.objectStoreNames.contains(STORES.HISTORY_DATA)) {
          const historyStore = db.createObjectStore(STORES.HISTORY_DATA, {
            keyPath: 'id'
          });
          historyStore.createIndex('by-semanticTag', 'semanticTag');
          historyStore.createIndex('by-timestamp', 'timestamp');
          historyStore.createIndex('by-tag-time', ['semanticTag', 'timestamp']);
        }

        if (!db.objectStoreNames.contains(STORES.ANALYSIS_REPORTS)) {
          const reportStore = db.createObjectStore(STORES.ANALYSIS_REPORTS, {
            keyPath: 'id'
          });
          reportStore.createIndex('by-type', 'type');
          reportStore.createIndex('by-createdAt', 'createdAt');
        }
      }
    });
  }
  return dbPromise;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export async function clearDB(): Promise<void> {
  const db = await getDB();
  const stores = [STORES.WAVEFORM_SNAPSHOTS, STORES.SEMANTIC_MAPPINGS, STORES.HISTORY_DATA, STORES.ANALYSIS_REPORTS];
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(
    stores.map((storeName) => tx.objectStore(storeName).clear())
  );
  await tx.done;

  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      await navigator.storage.persist();
    } catch (e) {
      console.warn('Failed to persist storage after clear:', e);
    }
  }
}

export async function getStorageInfo(): Promise<{
  used: number;
  quota: number;
  usageDetails: Record<string, number>;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      usageDetails: (estimate.usageDetails as Record<string, number>) || {}
    };
  }
  return { used: 0, quota: 0, usageDetails: {} };
}
