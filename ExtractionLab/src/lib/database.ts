import { openDB, IDBPDatabase, DBSchema, IDBPTransaction } from 'idb';
import { DATABASE_CONFIG } from './constants';
import { generateId, getCurrentTimestamp, calculateHash } from './utils';
import type {
  CoffeeBean,
  BrewingPreset,
  StoreLocation,
  BrewingRecord,
  SyncOperation,
  RnDExperiment,
  QualityConsistencyReport,
  ExtractionCurve,
} from '@/types';

interface ExtractionLabDB extends DBSchema {
  presets: {
    key: string;
    value: BrewingPreset;
    indexes: {
      beanId: string;
      status: string;
      region: string;
      updatedAt: number;
    };
  };
  beans: {
    key: string;
    value: CoffeeBean;
    indexes: {
      origin: string;
      roastLevel: string;
      process: string;
    };
  };
  stores: {
    key: string;
    value: StoreLocation;
    indexes: {
      region: string;
      syncStatus: string;
      qualityScore: number;
    };
  };
  records: {
    key: string;
    value: BrewingRecord;
    indexes: {
      presetId: string;
      storeId: string;
      createdAt: number;
    };
  };
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: {
      status: string;
      type: string;
      createdAt: number;
    };
  };
  experiments: {
    key: string;
    value: RnDExperiment;
    indexes: {
      beanId: string;
      status: string;
      createdAt: number;
    };
  };
  reports: {
    key: string;
    value: QualityConsistencyReport;
    indexes: {
      storeId: string;
      presetId: string;
      period: string;
    };
  };
  extractionCurves: {
    key: string;
    value: ExtractionCurve;
    indexes: {
      presetId: string;
      startTime: number;
    };
  };
}

type StoreName = keyof ExtractionLabDB;

let dbInstance: IDBPDatabase<ExtractionLabDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ExtractionLabDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ExtractionLabDB>(
    DATABASE_CONFIG.name,
    DATABASE_CONFIG.version,
    {
      upgrade(db, oldVersion, newVersion, transaction) {
        const config = DATABASE_CONFIG.stores;

        if (!db.objectStoreNames.contains('beans')) {
          const beanStore = db.createObjectStore('beans', {
            keyPath: config.beans.keyPath,
          });
          config.beans.indexes.forEach(idx =>
            beanStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('presets')) {
          const presetStore = db.createObjectStore('presets', {
            keyPath: config.presets.keyPath,
          });
          config.presets.indexes.forEach(idx =>
            presetStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('stores')) {
          const storeStore = db.createObjectStore('stores', {
            keyPath: config.stores.keyPath,
          });
          config.stores.indexes.forEach(idx =>
            storeStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', {
            keyPath: config.records.keyPath,
          });
          config.records.indexes.forEach(idx =>
            recordStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: config.syncQueue.keyPath,
          });
          config.syncQueue.indexes.forEach(idx =>
            syncStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('experiments')) {
          const expStore = db.createObjectStore('experiments', {
            keyPath: config.experiments.keyPath,
          });
          config.experiments.indexes.forEach(idx =>
            expStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('reports')) {
          const reportStore = db.createObjectStore('reports', {
            keyPath: config.reports.keyPath,
          });
          config.reports.indexes.forEach(idx =>
            reportStore.createIndex(idx, idx, { unique: false })
          );
        }

        if (!db.objectStoreNames.contains('extractionCurves')) {
          const curveStore = db.createObjectStore('extractionCurves', {
            keyPath: config.extractionCurves.keyPath,
          });
          config.extractionCurves.indexes.forEach(idx =>
            curveStore.createIndex(idx, idx, { unique: false })
          );
        }
      },
      blocked() {
        console.warn('Database blocked');
      },
      blocking() {
        console.warn('Database blocking, please close all tabs');
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
    }
  );

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB();
  const stores = Object.keys(DATABASE_CONFIG.stores) as StoreName[];
  const tx = db.transaction(stores as any, 'readwrite');
  await Promise.all(stores.map(store => tx.objectStore(store as any).clear()));
  await tx.done;
}

export async function bulkInsert<T extends { id?: string }>(
  storeName: StoreName,
  items: T[]
): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(storeName as any, 'readwrite');
  const store = tx.objectStore(storeName as any);
  const now = getCurrentTimestamp();

  const ids: string[] = [];
  for (const item of items) {
    const id = item.id || generateId();
    const enrichedItem = {
      ...item,
      id,
      createdAt: (item as any).createdAt || now,
      updatedAt: now,
    };
    await store.put(enrichedItem);
    ids.push(id);
  }

  await tx.done;
  return ids;
}

export async function getAll<T>(
  storeName: StoreName,
  options?: {
    index?: string;
    query?: IDBValidKey | IDBKeyRange;
    count?: number;
  }
): Promise<T[]> {
  const db = await getDB();
  const tx = db.transaction(storeName as any, 'readonly');
  const store = tx.objectStore(storeName as any);

  let result: T[];
  if (options?.index) {
    const index = (store.index as any)(options.index as any) as any;
    result = await (index.getAll as any)(options.query as any, options.count as any) as T[];
  } else {
    result = await (store.getAll as any)(options?.query as any, options?.count as any) as T[];
  }

  await tx.done;
  return result;
}

export async function getById<T>(
  storeName: StoreName,
  id: string
): Promise<T | undefined> {
  const db = await getDB();
  const value = await db.get(storeName as any, id);
  return value as T | undefined;
}

export async function insert<T extends { id?: string }>(
  storeName: StoreName,
  item: T
): Promise<string> {
  const db = await getDB();
  const now = getCurrentTimestamp();
  const id = item.id || generateId();
  const enrichedItem = {
    ...item,
    id,
    createdAt: (item as any).createdAt || now,
    updatedAt: now,
  };

  if (storeName === 'presets') {
    (enrichedItem as any).syncHash = calculateHash(enrichedItem);
  }

  await db.put(storeName as any, enrichedItem as any);
  return id;
}

export async function update<T extends { id: string }>(
  storeName: StoreName,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get(storeName as any, id);
  if (!existing) throw new Error(`Item ${id} not found in ${storeName}`);

  const updated = {
    ...existing,
    ...updates,
    id,
    updatedAt: getCurrentTimestamp(),
  };

  if (storeName === 'presets') {
    (updated as any).syncHash = calculateHash(updated);
  }

  await db.put(storeName as any, updated as any);
}

export async function remove(storeName: StoreName, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName as any, id);
}

export async function count(
  storeName: StoreName,
  index?: string,
  query?: IDBValidKey | IDBKeyRange
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(storeName as any, 'readonly');
  const store = tx.objectStore(storeName as any);

  let result: number;
  if (index) {
    const idx = (store.index as any)(index as any) as any;
    result = await (idx.count as any)(query as any) as number;
  } else {
    result = await (store.count as any)(query as any) as number;
  }

  await tx.done;
  return result;
}

export async function getPaginated<T>(
  storeName: StoreName,
  options: {
    page: number;
    pageSize: number;
    index?: string;
    query?: IDBValidKey | IDBKeyRange;
    direction?: 'next' | 'prev';
  }
): Promise<{ items: T[]; total: number; hasMore: boolean }> {
  const { page, pageSize, index, query, direction = 'next' } = options;
  const db = await getDB();
  const tx = db.transaction(storeName as any, 'readonly');
  const store = tx.objectStore(storeName as any);
  const target = (index ? (store.index as any)(index as any) : store) as any;

  const total = await (target.count as any)(query as any) as number;
  const offset = (page - 1) * pageSize;

  const items: T[] = [];
  let count = 0;
  let cursor = await target.openCursor(query as any, direction);

  while (cursor && count < offset + pageSize) {
    if (count >= offset) {
      items.push(cursor.value as T);
    }
    count++;
    cursor = await cursor.continue();
  }

  await tx.done;

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}

export async function searchPresets(
  query: string,
  filters?: {
    status?: string;
    region?: string;
    method?: string;
  }
): Promise<BrewingPreset[]> {
  const db = await getDB();
  const tx = db.transaction('presets', 'readonly');
  const store = tx.objectStore('presets');

  const results: BrewingPreset[] = [];
  const lowerQuery = query.toLowerCase();

  let cursor = await store.openCursor();
  while (cursor) {
    const preset = cursor.value;

    const matchesQuery =
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description.toLowerCase().includes(lowerQuery) ||
      preset.bean.name.toLowerCase().includes(lowerQuery);

    const matchesStatus = !filters?.status || preset.status === filters.status;
    const matchesRegion = !filters?.region || preset.region === filters.region;
    const matchesMethod = !filters?.method || preset.method === filters.method;

    if (matchesQuery && matchesStatus && matchesRegion && matchesMethod) {
      results.push(preset);
    }

    cursor = await cursor.continue();
  }

  await tx.done;
  return results;
}

export async function getPresetSyncDelta(
  lastSyncTime: number,
  region?: string
): Promise<{ updated: BrewingPreset[]; deleted: string[] }> {
  const db = await getDB();
  const tx = db.transaction('presets', 'readonly');
  const store = tx.objectStore('presets');
  const timeIndex = store.index('updatedAt');

  const updated: BrewingPreset[] = [];
  const keyRange = IDBKeyRange.lowerBound(lastSyncTime);

  let cursor = await timeIndex.openCursor(keyRange);
  while (cursor) {
    const preset = cursor.value;
    if (!region || preset.region === region || preset.region === 'global') {
      updated.push(preset);
    }
    cursor = await cursor.continue();
  }

  await tx.done;

  return {
    updated,
    deleted: [],
  };
}
