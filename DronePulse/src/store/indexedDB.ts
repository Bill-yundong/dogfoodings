import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Drone, CoverageSnapshot, SupportModule, SemanticSyncData } from '../types';

interface DronePulseDB extends DBSchema {
  drones: {
    key: string;
    value: Drone;
    indexes: { 'by-status': string; 'by-update': number };
  };
  coverageSnapshots: {
    key: string;
    value: CoverageSnapshot;
    indexes: { 'by-drone': string; 'by-timestamp': number };
  };
  supportModules: {
    key: string;
    value: SupportModule;
  };
  syncHistory: {
    key: number;
    value: SemanticSyncData;
    indexes: { 'by-hash': string };
  };
}

export class DronePulseStore {
  private db: IDBPDatabase<DronePulseDB> | null = null;
  private dbName = 'DronePulseDB';
  private version = 1;

  async init(): Promise<void> {
    this.db = await openDB<DronePulseDB>(this.dbName, this.version, {
      upgrade(db) {
        const droneStore = db.createObjectStore('drones', { keyPath: 'id' });
        droneStore.createIndex('by-status', 'status');
        droneStore.createIndex('by-update', 'lastUpdate');

        const coverageStore = db.createObjectStore('coverageSnapshots', { keyPath: 'id' });
        coverageStore.createIndex('by-drone', 'droneId');
        coverageStore.createIndex('by-timestamp', 'timestamp');

        db.createObjectStore('supportModules', { keyPath: 'id' });

        const syncStore = db.createObjectStore('syncHistory', { autoIncrement: true });
        syncStore.createIndex('by-hash', 'hash');
      },
    });
  }

  async saveDrone(drone: Drone): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('drones', drone);
  }

  async saveDrones(drones: Drone[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction('drones', 'readwrite');
    await Promise.all([...drones.map(d => tx.store.put(d)), tx.done]);
  }

  async getDrone(id: string): Promise<Drone | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get('drones', id);
  }

  async getAllDrones(): Promise<Drone[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('drones');
  }

  async saveCoverageSnapshot(snapshot: CoverageSnapshot): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('coverageSnapshots', snapshot);
  }

  async saveCoverageSnapshots(snapshots: CoverageSnapshot[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction('coverageSnapshots', 'readwrite');
    await Promise.all([...snapshots.map(s => tx.store.put(s)), tx.done]);
  }

  async getSnapshotsByDrone(droneId: string): Promise<CoverageSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('coverageSnapshots', 'by-drone', droneId);
  }

  async getLatestSnapshots(limit: number = 100): Promise<CoverageSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    const snapshots = await this.db.getAllFromIndex('coverageSnapshots', 'by-timestamp');
    return snapshots.slice(-limit).reverse();
  }

  async saveSupportModule(module: SupportModule): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('supportModules', module);
  }

  async saveSupportModules(modules: SupportModule[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction('supportModules', 'readwrite');
    await Promise.all([...modules.map(m => tx.store.put(m)), tx.done]);
  }

  async getAllSupportModules(): Promise<SupportModule[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('supportModules');
  }

  async saveSyncRecord(data: SemanticSyncData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.add('syncHistory', data);
  }

  async getLatestSyncRecord(): Promise<SemanticSyncData | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const records = await this.db.getAll('syncHistory');
    return records[records.length - 1];
  }

  async createSnapshot(): Promise<SemanticSyncData> {
    if (!this.db) throw new Error('Database not initialized');

    const [drones, coverage, modules] = await Promise.all([
      this.getAllDrones(),
      this.getLatestSnapshots(50),
      this.getAllSupportModules(),
    ]);

    const timestamp = Date.now();
    const hash = await this.generateHash(JSON.stringify({ drones, coverage, modules, timestamp }));

    return {
      version: 1,
      timestamp,
      drones,
      coverage,
      modules,
      hash,
    };
  }

  async restoreFromSnapshot(snapshot: SemanticSyncData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await Promise.all([
      this.saveDrones(snapshot.drones),
      this.saveCoverageSnapshots(snapshot.coverage),
      this.saveSupportModules(snapshot.modules),
    ]);
  }

  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async clearOldData(beforeTimestamp: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction('coverageSnapshots', 'readwrite');
    const index = tx.store.index('by-timestamp');
    const keys = await index.getAllKeys(IDBKeyRange.upperBound(beforeTimestamp));
    await Promise.all([...keys.map(k => tx.store.delete(k)), tx.done]);
  }
}

export const dbStore = new DronePulseStore();
