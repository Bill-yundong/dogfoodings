import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema, IDBPTransaction } from 'idb';
import type { TemperaturePoint, AlertRecord, PredictionResult, SensorMetaData } from '@/types';

interface CableLinkDB extends DBSchema {
  sensor_data: {
    key: string;
    value: TemperaturePoint;
    indexes: {
      'by-timestamp': number;
      'by-sensor': string;
      'by-sensor-timestamp': [string, number];
    };
  };
  alerts: {
    key: string;
    value: AlertRecord;
    indexes: {
      'by-timestamp': number;
      'by-status': string;
      'by-severity': string;
      'by-status-severity': [string, string];
    };
  };
  predictions: {
    key: string;
    value: PredictionResult;
    indexes: {
      'by-timestamp': number;
      'by-horizon': number;
    };
  };
  sensor_metadata: {
    key: string;
    value: SensorMetaData;
    indexes: {
      'by-type': string;
    };
  };
  config: {
    key: string;
    value: { key: string; value: unknown; updatedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<CableLinkDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<CableLinkDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CableLinkDB>('cablelink-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sensor_data')) {
          const sensorStore = db.createObjectStore('sensor_data', {
            keyPath: null
          });
          sensorStore.createIndex('by-timestamp', 'timestamp');
          sensorStore.createIndex('by-sensor', 'sensorId');
          sensorStore.createIndex('by-sensor-timestamp', ['sensorId', 'timestamp']);
        }

        if (!db.objectStoreNames.contains('alerts')) {
          const alertStore = db.createObjectStore('alerts', {
            keyPath: 'id'
          });
          alertStore.createIndex('by-timestamp', 'timestamp');
          alertStore.createIndex('by-status', 'status');
          alertStore.createIndex('by-severity', 'severity');
          alertStore.createIndex('by-status-severity', ['status', 'severity']);
        }

        if (!db.objectStoreNames.contains('predictions')) {
          const predStore = db.createObjectStore('predictions', {
            keyPath: null
          });
          predStore.createIndex('by-timestamp', 'timestamp');
          predStore.createIndex('by-horizon', 'horizon');
        }

        if (!db.objectStoreNames.contains('sensor_metadata')) {
          const metaStore = db.createObjectStore('sensor_metadata', {
            keyPath: 'id'
          });
          metaStore.createIndex('by-type', 'type');
        }

        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
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

export async function clearOldData(maxAgeDays: number = 90): Promise<void> {
  const db = await getDB();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const tx = db.transaction(['sensor_data', 'predictions'], 'readwrite');

  const sensorStore = tx.objectStore('sensor_data');
  const sensorIndex = sensorStore.index('by-timestamp');
  let sensorCursor = await sensorIndex.openCursor(IDBKeyRange.upperBound(cutoff));
  let sensorCount = 0;
  while (sensorCursor) {
    await sensorCursor.delete();
    sensorCount++;
    sensorCursor = await sensorCursor.continue();
  }

  const predStore = tx.objectStore('predictions');
  const predIndex = predStore.index('by-timestamp');
  let predCursor = await predIndex.openCursor(IDBKeyRange.upperBound(cutoff));
  let predCount = 0;
  while (predCursor) {
    await predCursor.delete();
    predCount++;
    predCursor = await predCursor.continue();
  }

  await tx.done;
  console.log(`Cleared ${sensorCount} sensor records and ${predCount} prediction records`);
}

export async function getStorageStats(): Promise<{
  sensorRecords: number;
  alertRecords: number;
  predictionRecords: number;
  estimatedSizeMB: number;
}> {
  const db = await getDB();
  const tx = db.transaction(['sensor_data', 'alerts', 'predictions'], 'readonly');

  const sensorCount = await tx.objectStore('sensor_data').count();
  const alertCount = await tx.objectStore('alerts').count();
  const predictionCount = await tx.objectStore('predictions').count();

  await tx.done;

  const estimatedSizeMB = (sensorCount * 150 + alertCount * 200 + predictionCount * 500) / (1024 * 1024);

  return {
    sensorRecords: sensorCount,
    alertRecords: alertCount,
    predictionRecords: predictionCount,
    estimatedSizeMB
  };
}

export async function batchInsert(
  storeName: 'sensor_data' | 'alerts' | 'predictions',
  items: Array<TemperaturePoint | AlertRecord | PredictionResult>,
  getKey?: (item: TemperaturePoint | AlertRecord | PredictionResult) => string
): Promise<void> {
  if (items.length === 0) return;

  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  const BATCH_SIZE = 500;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      if (getKey) {
        await store.put(item, getKey(item));
      } else {
        await store.put(item);
      }
    }
  }

  await tx.done;
}

export async function executeInTransaction(
  stores: Array<'sensor_data' | 'alerts' | 'predictions' | 'sensor_metadata' | 'config'>,
  mode: 'readonly' | 'readwrite',
  callback: (tx: IDBPTransaction<CableLinkDB, typeof stores, typeof mode>) => Promise<void>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(stores, mode);
  await callback(tx as IDBPTransaction<CableLinkDB, typeof stores, typeof mode>);
  await tx.done;
}
