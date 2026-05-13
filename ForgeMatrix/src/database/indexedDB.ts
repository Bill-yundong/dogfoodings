import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ForgingBatch, CoolingSnapshot, QualityData, DataLinkEvent } from '../types';

interface ForgeMatrixDB extends DBSchema {
  batches: {
    key: string;
    value: ForgingBatch;
    indexes: { 'by-status': string; 'by-startTime': number };
  };
  snapshots: {
    key: string;
    value: CoolingSnapshot;
    indexes: { 'by-batchId': string; 'by-timestamp': number };
  };
  qualityData: {
    key: string;
    value: QualityData;
    indexes: { 'by-batchId': string; 'by-passed': boolean };
  };
  events: {
    key: string;
    value: DataLinkEvent;
    indexes: { 'by-batchId': string; 'by-source': string };
  };
}

const DB_NAME = 'ForgeMatrixDB';
const DB_VERSION = 1;

export class ForgeMatrixDatabase {
  private db: IDBPDatabase<ForgeMatrixDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<ForgeMatrixDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const batchesStore = db.createObjectStore('batches', { keyPath: 'id' });
        batchesStore.createIndex('by-status', 'status');
        batchesStore.createIndex('by-startTime', 'startTime');

        const snapshotsStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotsStore.createIndex('by-batchId', 'batchId');
        snapshotsStore.createIndex('by-timestamp', 'timestamp');

        const qualityStore = db.createObjectStore('qualityData', { keyPath: 'batchId' });
        qualityStore.createIndex('by-batchId', 'batchId');
        qualityStore.createIndex('by-passed', 'passed');

        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('by-batchId', 'batchId');
        eventsStore.createIndex('by-source', 'source');
      }
    });
  }

  private ensureDB(): IDBPDatabase<ForgeMatrixDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async createBatch(batch: Omit<ForgingBatch, 'id'>): Promise<string> {
    const db = this.ensureDB();
    const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.put('batches', { ...batch, id } as ForgingBatch);
    return id;
  }

  async getBatch(id: string): Promise<ForgingBatch | undefined> {
    const db = this.ensureDB();
    return db.get('batches', id);
  }

  async getAllBatches(): Promise<ForgingBatch[]> {
    const db = this.ensureDB();
    return db.getAll('batches');
  }

  async updateBatch(batch: ForgingBatch): Promise<void> {
    const db = this.ensureDB();
    await db.put('batches', batch);
  }

  async deleteBatch(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('batches', id);
  }

  async createSnapshot(snapshot: Omit<CoolingSnapshot, 'id'>): Promise<string> {
    const db = this.ensureDB();
    const id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.put('snapshots', { ...snapshot, id } as CoolingSnapshot);
    return id;
  }

  async getSnapshot(id: string): Promise<CoolingSnapshot | undefined> {
    const db = this.ensureDB();
    return db.get('snapshots', id);
  }

  async getSnapshotsByBatch(batchId: string): Promise<CoolingSnapshot[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('snapshots', 'by-batchId', batchId);
  }

  async createQualityData(quality: QualityData): Promise<void> {
    const db = this.ensureDB();
    await db.put('qualityData', quality);
  }

  async getQualityData(batchId: string): Promise<QualityData | undefined> {
    const db = this.ensureDB();
    return db.get('qualityData', batchId);
  }

  async createEvent(event: Omit<DataLinkEvent, 'id' | 'timestamp'>): Promise<string> {
    const db = this.ensureDB();
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.put('events', { 
      ...event, 
      id, 
      timestamp: Date.now() 
    } as DataLinkEvent);
    return id;
  }

  async getEventsByBatch(batchId: string): Promise<DataLinkEvent[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('events', 'by-batchId', batchId);
  }

  async getOfflineDataSummary(): Promise<{
    totalBatches: number;
    totalSnapshots: number;
    offlineBatches: number;
  }> {
    const db = this.ensureDB();
    const batches = await db.getAll('batches');
    const snapshots = await db.getAll('snapshots');
    
    return {
      totalBatches: batches.length,
      totalSnapshots: snapshots.length,
      offlineBatches: batches.filter(b => b.status === 'completed').length
    };
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    await db.clear('batches');
    await db.clear('snapshots');
    await db.clear('qualityData');
    await db.clear('events');
  }
}

export const db = new ForgeMatrixDatabase();
