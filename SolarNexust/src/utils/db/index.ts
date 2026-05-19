import { openDB, type IDBPDatabase } from 'idb';
import type { SolarDBSchema, SolarDB, StoreName, DBStats, SyncState } from '@/types/database';
import type {
  Region,
  SolarPanel,
  Building,
  ShadowRecord,
  PowerGeneration,
  MPPTRecord,
  MaintenanceTask,
} from '@/types/solar';

const DB_NAME = 'SolarNexustDB';
const DB_VERSION = 1;

let dbInstance: SolarDB | null = null;

export async function initDB(): Promise<SolarDB> {
  if (dbInstance) return dbInstance;

  const db = await openDB<SolarDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('regions')) {
        const regionsStore = db.createObjectStore('regions', { keyPath: 'id' });
        regionsStore.createIndex('by-name', 'name');
        regionsStore.createIndex('by-lat', 'latCenter');
        regionsStore.createIndex('by-lng', 'lngCenter');
      }

      if (!db.objectStoreNames.contains('solarPanels')) {
        const panelsStore = db.createObjectStore('solarPanels', { keyPath: 'id' });
        panelsStore.createIndex('by-region', 'regionId');
        panelsStore.createIndex('by-status', 'status');
      }

      if (!db.objectStoreNames.contains('buildings')) {
        const buildingsStore = db.createObjectStore('buildings', { keyPath: 'id' });
        buildingsStore.createIndex('by-region', 'regionId');
      }

      if (!db.objectStoreNames.contains('shadowRecords')) {
        const shadowStore = db.createObjectStore('shadowRecords', { keyPath: 'id' });
        shadowStore.createIndex('by-panel', 'panelId');
        shadowStore.createIndex('by-timestamp', 'timestamp');
        shadowStore.createIndex('by-panel-time', ['panelId', 'timestamp']);
      }

      if (!db.objectStoreNames.contains('powerGeneration')) {
        const powerStore = db.createObjectStore('powerGeneration', { keyPath: 'id' });
        powerStore.createIndex('by-panel', 'panelId');
        powerStore.createIndex('by-timestamp', 'timestamp');
        powerStore.createIndex('by-panel-time', ['panelId', 'timestamp']);
      }

      if (!db.objectStoreNames.contains('mpptRecords')) {
        const mpptStore = db.createObjectStore('mpptRecords', { keyPath: 'id' });
        mpptStore.createIndex('by-generation', 'generationId');
      }

      if (!db.objectStoreNames.contains('maintenanceTasks')) {
        const taskStore = db.createObjectStore('maintenanceTasks', { keyPath: 'id' });
        taskStore.createIndex('by-panel', 'panelId');
        taskStore.createIndex('by-status', 'status');
        taskStore.createIndex('by-priority', 'priority');
      }

      if (!db.objectStoreNames.contains('syncState')) {
        const syncStore = db.createObjectStore('syncState', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'lastSync');
      }
    },
  });

  dbInstance = db;
  return db;
}

export function getDB(): SolarDB | null {
  return dbInstance;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(db.objectStoreNames as unknown as StoreName[], 'readwrite');
  await Promise.all(
    Array.from(db.objectStoreNames).map((name) => tx.objectStore(name as StoreName).clear())
  );
  await tx.done;
}

export async function getDBStats(): Promise<DBStats> {
  const db = await initDB();
  const storeNames = Array.from(db.objectStoreNames) as StoreName[];
  
  const storeStats: Record<string, { count: number; size: number }> = {};
  let totalRecords = 0;
  let totalSize = 0;

  for (const storeName of storeNames) {
    const count = await db.count(storeName);
    const items = await db.getAll(storeName);
    const size = new Blob([JSON.stringify(items)]).size;
    storeStats[storeName as string] = { count, size };
    totalRecords += count;
    totalSize += size;
  }

  const totalPanels = storeStats['solarPanels']?.count || 0;
  const totalBuildings = storeStats['buildings']?.count || 0;

  let storageUsed = 0;
  let storageQuota = 0;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    storageUsed = estimate.usage || 0;
    storageQuota = estimate.quota || 0;
  }

  return {
    totalPanels,
    totalBuildings,
    totalRecords,
    totalSize,
    storageUsed,
    storageQuota,
    storeStats,
  };
}

export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const db = await initDB();
  const data: Record<string, unknown[]> = {};

  for (const storeName of db.objectStoreNames) {
    const items = await db.getAll(storeName as StoreName);
    data[storeName as string] = items;
  }

  return data;
}

export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  const db = await initDB();

  const tx = db.transaction(db.objectStoreNames as unknown as StoreName[], 'readwrite');

  for (const [storeName, items] of Object.entries(data)) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    const store = tx.objectStore(storeName as StoreName);
    for (const item of items) {
      await store.put(item);
    }
  }

  await tx.done;
}

export const regionDB = {
  async getAll(): Promise<Region[]> {
    const db = await initDB();
    return db.getAll('regions');
  },

  async getById(id: string): Promise<Region | undefined> {
    const db = await initDB();
    return db.get('regions', id);
  },

  async put(region: Region): Promise<string> {
    const db = await initDB();
    return db.put('regions', region) as Promise<string>;
  },

  async bulkPut(regions: Region[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('regions', 'readwrite');
    await Promise.all(regions.map((r) => tx.store.put(r)));
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('regions', id);
  },
};

export const solarPanelDB = {
  async getAll(): Promise<SolarPanel[]> {
    const db = await initDB();
    return db.getAll('solarPanels');
  },

  async getByRegion(regionId: string): Promise<SolarPanel[]> {
    const db = await initDB();
    return db.getAllFromIndex('solarPanels', 'by-region', regionId);
  },

  async getById(id: string): Promise<SolarPanel | undefined> {
    const db = await initDB();
    return db.get('solarPanels', id);
  },

  async put(panel: SolarPanel): Promise<string> {
    const db = await initDB();
    return db.put('solarPanels', panel) as Promise<string>;
  },

  async bulkPut(panels: SolarPanel[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('solarPanels', 'readwrite');
    await Promise.all(panels.map((p) => tx.store.put(p)));
    await tx.done;
  },

  async updateStatus(id: string, status: SolarPanel['status']): Promise<void> {
    const db = await initDB();
    const panel = await db.get('solarPanels', id);
    if (panel) {
      panel.status = status;
      await db.put('solarPanels', panel);
    }
  },
};

export const buildingDB = {
  async getAll(): Promise<Building[]> {
    const db = await initDB();
    return db.getAll('buildings');
  },

  async getByRegion(regionId: string): Promise<Building[]> {
    const db = await initDB();
    return db.getAllFromIndex('buildings', 'by-region', regionId);
  },

  async getById(id: string): Promise<Building | undefined> {
    const db = await initDB();
    return db.get('buildings', id);
  },

  async put(building: Building): Promise<string> {
    const db = await initDB();
    return db.put('buildings', building) as Promise<string>;
  },

  async bulkPut(buildings: Building[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('buildings', 'readwrite');
    await Promise.all(buildings.map((b) => tx.store.put(b)));
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('buildings', id);
  },
};

export const shadowRecordDB = {
  async getAll(): Promise<ShadowRecord[]> {
    const db = await initDB();
    return db.getAll('shadowRecords');
  },

  async getByPanel(panelId: string, limit?: number): Promise<ShadowRecord[]> {
    const db = await initDB();
    const records = await db.getAllFromIndex('shadowRecords', 'by-panel', panelId);
    return limit ? records.slice(-limit) : records;
  },

  async getByTimeRange(panelId: string, startTime: number, endTime: number): Promise<ShadowRecord[]> {
    const db = await initDB();
    const records = await db.getAllFromIndex('shadowRecords', 'by-panel', panelId);
    return records.filter((r) => r.timestamp >= startTime && r.timestamp <= endTime);
  },

  async put(record: ShadowRecord): Promise<string> {
    const db = await initDB();
    return db.put('shadowRecords', record) as Promise<string>;
  },

  async bulkPut(records: ShadowRecord[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('shadowRecords', 'readwrite');
    await Promise.all(records.map((r) => tx.store.put(r)));
    await tx.done;
  },

  async clearOld(beforeTimestamp: number): Promise<number> {
    const db = await initDB();
    const tx = db.transaction('shadowRecords', 'readwrite');
    const records = await tx.store.getAll();
    let count = 0;
    for (const record of records) {
      if (record.timestamp < beforeTimestamp) {
        await tx.store.delete(record.id);
        count++;
      }
    }
    await tx.done;
    return count;
  },
};

export const powerGenerationDB = {
  async getByPanel(panelId: string, limit?: number): Promise<PowerGeneration[]> {
    const db = await initDB();
    const records = await db.getAllFromIndex('powerGeneration', 'by-panel', panelId);
    return limit ? records.slice(-limit) : records;
  },

  async getByTimeRange(panelId: string, startTime: number, endTime: number): Promise<PowerGeneration[]> {
    const db = await initDB();
    const records = await db.getAllFromIndex('powerGeneration', 'by-panel', panelId);
    return records.filter((r) => r.timestamp >= startTime && r.timestamp <= endTime);
  },

  async put(record: PowerGeneration): Promise<string> {
    const db = await initDB();
    return db.put('powerGeneration', record) as Promise<string>;
  },

  async bulkPut(records: PowerGeneration[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('powerGeneration', 'readwrite');
    await Promise.all(records.map((r) => tx.store.put(r)));
    await tx.done;
  },

  async getAggregatedByRegion(regionId: string, startTime: number, endTime: number): Promise<PowerGeneration[]> {
    const db = await initDB();
    const panels = await db.getAllFromIndex('solarPanels', 'by-region', regionId);
    const allRecords: PowerGeneration[] = [];

    for (const panel of panels) {
      const records = await db.getAllFromIndex('powerGeneration', 'by-panel', panel.id);
      allRecords.push(...records.filter((r) => r.timestamp >= startTime && r.timestamp <= endTime));
    }

    return allRecords;
  },
};

export const mpptRecordDB = {
  async getByGeneration(generationId: string): Promise<MPPTRecord | undefined> {
    const db = await initDB();
    const records = await db.getAllFromIndex('mpptRecords', 'by-generation', generationId);
    return records[0];
  },

  async put(record: MPPTRecord): Promise<string> {
    const db = await initDB();
    return db.put('mpptRecords', record) as Promise<string>;
  },

  async bulkPut(records: MPPTRecord[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('mpptRecords', 'readwrite');
    await Promise.all(records.map((r) => tx.store.put(r)));
    await tx.done;
  },
};

export const maintenanceTaskDB = {
  async getAll(): Promise<MaintenanceTask[]> {
    const db = await initDB();
    return db.getAll('maintenanceTasks');
  },

  async getByStatus(status: MaintenanceTask['status']): Promise<MaintenanceTask[]> {
    const db = await initDB();
    return db.getAllFromIndex('maintenanceTasks', 'by-status', status);
  },

  async getByPanel(panelId: string): Promise<MaintenanceTask[]> {
    const db = await initDB();
    return db.getAllFromIndex('maintenanceTasks', 'by-panel', panelId);
  },

  async put(task: MaintenanceTask): Promise<string> {
    const db = await initDB();
    return db.put('maintenanceTasks', task) as Promise<string>;
  },

  async updateStatus(id: string, status: MaintenanceTask['status']): Promise<void> {
    const db = await initDB();
    const task = await db.get('maintenanceTasks', id);
    if (task) {
      task.status = status;
      await db.put('maintenanceTasks', task);
    }
  },
};

export const syncStateDB = {
  async getAll(): Promise<SyncState[]> {
    const db = await initDB();
    return db.getAll('syncState');
  },

  async put(state: SyncState): Promise<string> {
    const db = await initDB();
    return db.put('syncState', state) as Promise<string>;
  },

  async updateLastSync(storeName: string, timestamp: number): Promise<void> {
    const db = await initDB();
    let state = await db.get('syncState', storeName);
    if (!state) {
      state = {
        id: storeName,
        storeName,
        lastSync: timestamp,
        pendingChanges: 0,
        status: 'idle',
      };
    }
    state.lastSync = timestamp;
    state.status = 'idle';
    await db.put('syncState', state);
  },
};
