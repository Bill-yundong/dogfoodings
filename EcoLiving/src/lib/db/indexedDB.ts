import { openDB, type IDBPDatabase } from 'idb';
import type { EnergySnapshot, LoadFeature, Device, SyncLog } from '@/lib/types/energy';
import { generateId } from '@/lib/utils/formatters';

interface EcoLivingDB {
  devices: {
    key: string;
    value: Device;
    indexes: { 'by-category': string; 'by-location': string };
  };
  energy_snapshots: {
    key: string;
    value: EnergySnapshot;
    indexes: { 'by-timestamp': number; 'by-date': string };
  };
  load_features: {
    key: string;
    value: LoadFeature;
    indexes: { 'by-timestamp': number; 'by-device': string; 'by-waste-level': string };
  };
  sync_logs: {
    key: string;
    value: SyncLog;
    indexes: { 'by-timestamp': number; 'by-source': string };
  };
  metadata: {
    key: string;
    value: { key: string; value: unknown; timestamp: number };
  };
}

const DB_NAME = 'ecoliving-db';
const DB_VERSION = 1;

class DatabaseService {
  private db: IDBPDatabase<EcoLivingDB> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      this.db = await openDB<EcoLivingDB>(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion) => {
          if (oldVersion < 1) {
            const deviceStore = db.createObjectStore('devices', { keyPath: 'id' });
            deviceStore.createIndex('by-category', 'category');
            deviceStore.createIndex('by-location', 'location');

            const snapshotStore = db.createObjectStore('energy_snapshots', { keyPath: 'id' });
            snapshotStore.createIndex('by-timestamp', 'timestamp');
            snapshotStore.createIndex('by-date', 'date');

            const featureStore = db.createObjectStore('load_features', { keyPath: 'id' });
            featureStore.createIndex('by-timestamp', 'timestamp');
            featureStore.createIndex('by-device', 'deviceId');
            featureStore.createIndex('by-waste-level', 'wasteLevel');

            const logStore = db.createObjectStore('sync_logs', { keyPath: 'id' });
            logStore.createIndex('by-timestamp', 'timestamp');
            logStore.createIndex('by-source', 'sourceModule');

            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });
      console.log('[IndexedDB] Database initialized successfully');
    } catch (error) {
      console.error('[IndexedDB] Failed to initialize:', error);
      throw error;
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<EcoLivingDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async addSnapshot(snapshot: Omit<EnergySnapshot, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = generateId();
    const snapshotWithId = { ...snapshot, id };
    await db.add('energy_snapshots', snapshotWithId as EnergySnapshot);
    return id;
  }

  async getSnapshots(limit: number = 100, offset: number = 0): Promise<EnergySnapshot[]> {
    const db = await this.ensureDB();
    const tx = db.transaction('energy_snapshots', 'readonly');
    const index = tx.store.index('by-timestamp');
    const allSnapshots = await index.getAll(null, limit + offset);
    return allSnapshots.slice(offset).reverse();
  }

  async getSnapshotsByDateRange(start: number, end: number): Promise<EnergySnapshot[]> {
    const db = await this.ensureDB();
    const tx = db.transaction('energy_snapshots', 'readonly');
    const index = tx.store.index('by-timestamp');
    const range = IDBKeyRange.bound(start, end);
    const snapshots = await index.getAll(range);
    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getLatestSnapshot(): Promise<EnergySnapshot | null> {
    const db = await this.ensureDB();
    const tx = db.transaction('energy_snapshots', 'readonly');
    const index = tx.store.index('by-timestamp');
    const cursor = await index.openCursor(null, 'prev');
    return cursor ? cursor.value : null;
  }

  async addDevice(device: Omit<Device, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = generateId();
    const deviceWithId = { ...device, id };
    await db.add('devices', deviceWithId as Device);
    return id;
  }

  async getDevices(): Promise<Device[]> {
    const db = await this.ensureDB();
    return db.getAll('devices');
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('devices', 'readwrite');
    const device = await tx.store.get(id);
    if (device) {
      const updated = { ...device, ...updates };
      await tx.store.put(updated);
    }
    await tx.done;
  }

  async addLoadFeature(feature: Omit<LoadFeature, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = generateId();
    const featureWithId = { ...feature, id } as LoadFeature;
    await db.add('load_features', featureWithId);
    return id;
  }

  async getLoadFeatures(
    options: { 
      limit?: number; 
      deviceId?: string; 
      wasteLevel?: string;
      isWaste?: boolean;
    } = {}
  ): Promise<LoadFeature[]> {
    const db = await this.ensureDB();
    const { limit = 100, deviceId, wasteLevel, isWaste } = options;
    
    let features: LoadFeature[];
    
    if (deviceId) {
      const tx = db.transaction('load_features', 'readonly');
      const index = tx.store.index('by-device');
      features = await index.getAll(deviceId, limit);
    } else if (wasteLevel) {
      const tx = db.transaction('load_features', 'readonly');
      const index = tx.store.index('by-waste-level');
      features = await index.getAll(wasteLevel, limit);
    } else {
      const tx = db.transaction('load_features', 'readonly');
      const index = tx.store.index('by-timestamp');
      features = await index.getAll(null, limit);
    }

    if (isWaste !== undefined) {
      features = features.filter(f => f.isWaste === isWaste);
    }

    return features.sort((a, b) => b.timestamp - a.timestamp);
  }

  async updateLoadFeature(id: string, updates: Partial<LoadFeature>): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('load_features', 'readwrite');
    const feature = await tx.store.get(id);
    if (feature) {
      const updated = { ...feature, ...updates };
      await tx.store.put(updated);
    }
    await tx.done;
  }

  async addSyncLog(log: Omit<SyncLog, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = generateId();
    const logWithId = { ...log, id } as SyncLog;
    await db.add('sync_logs', logWithId);
    return id;
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.ensureDB();
    await db.put('metadata', { key, value, timestamp: Date.now() });
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const result = await db.get('metadata', key);
    return result ? result.value as T : null;
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(
      ['devices', 'energy_snapshots', 'load_features', 'sync_logs'],
      'readwrite'
    );
    await Promise.all([
      tx.objectStore('devices').clear(),
      tx.objectStore('energy_snapshots').clear(),
      tx.objectStore('load_features').clear(),
      tx.objectStore('sync_logs').clear(),
    ]);
    await tx.done;
  }

  async getStats(): Promise<{
    deviceCount: number;
    snapshotCount: number;
    featureCount: number;
    logCount: number;
    totalConsumption: number;
  }> {
    const db = await this.ensureDB();
    
    const [deviceCount, snapshotCount, featureCount, logCount, snapshots] = await Promise.all([
      db.count('devices'),
      db.count('energy_snapshots'),
      db.count('load_features'),
      db.count('sync_logs'),
      this.getSnapshots(1000),
    ]);

    const totalConsumption = snapshots.reduce((sum, s) => sum + s.totalConsumption, 0);

    return {
      deviceCount,
      snapshotCount,
      featureCount,
      logCount,
      totalConsumption,
    };
  }

  async exportData(): Promise<string> {
    const db = await this.ensureDB();
    const [devices, snapshots, features, logs] = await Promise.all([
      db.getAll('devices'),
      db.getAll('energy_snapshots'),
      db.getAll('load_features'),
      db.getAll('sync_logs'),
    ]);

    return JSON.stringify({
      exportTime: new Date().toISOString(),
      version: DB_VERSION,
      data: { devices, snapshots, features, logs },
    }, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    if (!data.data) throw new Error('Invalid export format');

    const db = await this.ensureDB();
    const tx = db.transaction(
      ['devices', 'energy_snapshots', 'load_features', 'sync_logs'],
      'readwrite'
    );

    const { devices, snapshots, features, logs } = data.data;

    await Promise.all([
      ...devices.map((d: Device) => tx.objectStore('devices').put(d)),
      ...snapshots.map((s: EnergySnapshot) => tx.objectStore('energy_snapshots').put(s)),
      ...features.map((f: LoadFeature) => tx.objectStore('load_features').put(f)),
      ...logs.map((l: SyncLog) => tx.objectStore('sync_logs').put(l)),
    ]);

    await tx.done;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const dbService = new DatabaseService();

export function useDatabase() {
  return dbService;
}
