import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { SkuSnapshot, Location, EfficiencyMetric } from '@/types';

interface WMSSchema extends DBSchema {
  sku_snapshots: {
    key: string;
    value: SkuSnapshot;
    indexes: {
      'by-skuId': string;
      'by-date': Date;
      'by-liquidity': number;
    };
  };
  location_states: {
    key: string;
    value: Location;
    indexes: {
      'by-aisle': number;
      'by-rack': number;
      'by-status': string;
      'by-heat': number;
    };
  };
  operation_logs: {
    key: string;
    value: {
      id: string;
      timestamp: Date;
      type: string;
      skuId?: string;
      locationId?: string;
      message: string;
      success: boolean;
    };
    indexes: {
      'by-timestamp': Date;
      'by-type': string;
      'by-skuId': string;
    };
  };
  efficiency_metrics: {
    key: string;
    value: EfficiencyMetric;
    indexes: {
      'by-timestamp': Date;
      'by-type': string;
      'by-aisle': number;
    };
  };
}

const DB_NAME = 'wms-intelligent-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<WMSSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<WMSSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WMSSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sku_snapshots')) {
        const skuStore = db.createObjectStore('sku_snapshots', {
          keyPath: 'id',
        });
        skuStore.createIndex('by-skuId', 'skuId');
        skuStore.createIndex('by-date', 'snapshotDate');
        skuStore.createIndex('by-liquidity', 'liquidityScore');
      }

      if (!db.objectStoreNames.contains('location_states')) {
        const locStore = db.createObjectStore('location_states', {
          keyPath: 'id',
        });
        locStore.createIndex('by-aisle', 'aisle');
        locStore.createIndex('by-rack', 'rack');
        locStore.createIndex('by-status', 'status');
        locStore.createIndex('by-heat', 'heatLevel');
      }

      if (!db.objectStoreNames.contains('operation_logs')) {
        const logStore = db.createObjectStore('operation_logs', {
          keyPath: 'id',
        });
        logStore.createIndex('by-timestamp', 'timestamp');
        logStore.createIndex('by-type', 'type');
        logStore.createIndex('by-skuId', 'skuId');
      }

      if (!db.objectStoreNames.contains('efficiency_metrics')) {
        const metricStore = db.createObjectStore('efficiency_metrics', {
          keyPath: 'id',
        });
        metricStore.createIndex('by-timestamp', 'timestamp');
        metricStore.createIndex('by-type', 'metricType');
        metricStore.createIndex('by-aisle', 'aisle');
      }
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function saveSkuSnapshots(
  snapshots: SkuSnapshot[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sku_snapshots', 'readwrite');
  await Promise.all(snapshots.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function getSkuSnapshotsBySkuId(
  skuId: string,
  limit: number = 30
): Promise<SkuSnapshot[]> {
  const db = await getDB();
  const index = db.transaction('sku_snapshots').store.index('by-skuId');
  const all = await index.getAll(skuId);
  return all
    .sort(
      (a, b) =>
        new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )
    .slice(0, limit);
}

export async function getRecentSkuSnapshots(
  limit: number = 100
): Promise<SkuSnapshot[]> {
  const db = await getDB();
  const index = db.transaction('sku_snapshots').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  const results: SkuSnapshot[] = [];

  let current = cursor;
  while (current && results.length < limit) {
    results.push(current.value);
    current = await current.continue();
  }

  return results;
}

export async function saveLocationStates(
  locations: Location[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('location_states', 'readwrite');
  await Promise.all(locations.map((l) => tx.store.put(l)));
  await tx.done;
}

export async function saveEfficiencyMetrics(
  metrics: EfficiencyMetric[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('efficiency_metrics', 'readwrite');
  await Promise.all(metrics.map((m) => tx.store.put(m)));
  await tx.done;
}

export async function getEfficiencyMetricsByType(
  metricType: string,
  startTime: Date,
  endTime: Date
): Promise<EfficiencyMetric[]> {
  const db = await getDB();
  const index = db.transaction('efficiency_metrics').store.index('by-type');
  const all = await index.getAll(metricType);
  return all.filter(
    (m) =>
      new Date(m.timestamp) >= startTime && new Date(m.timestamp) <= endTime
  );
}

export async function addOperationLog(
  log: Omit<
    {
      id: string;
      timestamp: Date;
      type: string;
      skuId?: string;
      locationId?: string;
      message: string;
      success: boolean;
    },
    'id' | 'timestamp'
  >
): Promise<void> {
  const db = await getDB();
  await db.add('operation_logs', {
    ...log,
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  });
}

export async function clearOldData(daysOld: number = 30): Promise<void> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const db = await getDB();

  const tx = db.transaction(
    ['sku_snapshots', 'operation_logs', 'efficiency_metrics'],
    'readwrite'
  );

  const skuIndex = tx.objectStore('sku_snapshots').index('by-date');
  let skuCursor = await skuIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));
  while (skuCursor) {
    await skuCursor.delete();
    skuCursor = await skuCursor.continue();
  }

  const logIndex = tx.objectStore('operation_logs').index('by-timestamp');
  let logCursor = await logIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));
  while (logCursor) {
    await logCursor.delete();
    logCursor = await logCursor.continue();
  }

  const metricIndex = tx.objectStore('efficiency_metrics').index('by-timestamp');
  let metricCursor = await metricIndex.openCursor(
    IDBKeyRange.upperBound(cutoffDate)
  );
  while (metricCursor) {
    await metricCursor.delete();
    metricCursor = await metricCursor.continue();
  }

  await tx.done;
}
