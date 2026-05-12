import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BiomassComposition, SnapshotMetadata } from '../types';

interface BiomassDB extends DBSchema {
  snapshots: {
    key: string;
    value: BiomassComposition;
    indexes: {
      'by-source': string;
      'by-timestamp': number;
      'by-batch': string;
    };
  };
  metadata: {
    key: string;
    value: SnapshotMetadata;
    indexes: {
      'by-source': string;
      'by-storedAt': number;
    };
  };
}

export class SnapshotStore {
  private db: IDBPDatabase<BiomassDB> | null = null;
  private readonly DB_NAME = 'BioNexusDB';
  private readonly STORE_NAME = 'snapshots';
  private readonly VERSION = 1;

  public async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<BiomassDB>(this.DB_NAME, this.VERSION, {
      upgrade: (db) => {
        const snapshotStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        snapshotStore.createIndex('by-source', 'source');
        snapshotStore.createIndex('by-timestamp', 'timestamp');
        snapshotStore.createIndex('by-batch', 'batchId');

        const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
        metadataStore.createIndex('by-source', 'source');
        metadataStore.createIndex('by-storedAt', 'storedAt');
      }
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<BiomassDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  public async saveSnapshot(composition: BiomassComposition, batchId: string): Promise<void> {
    const db = await this.ensureDB();
    
    const tx = db.transaction([this.STORE_NAME, 'metadata'], 'readwrite');
    const snapshotStore = tx.objectStore(this.STORE_NAME);
    const metadataStore = tx.objectStore('metadata');

    const snapshotWithBatch = { ...composition, batchId };
    await snapshotStore.put(snapshotWithBatch);

    const metadata: SnapshotMetadata = {
      id: `meta-${composition.id}`,
      source: composition.source,
      batchId,
      collectedAt: composition.timestamp,
      storedAt: Date.now(),
      version: 1
    };
    await metadataStore.put(metadata);

    await tx.done;
  }

  public async getSnapshot(id: string): Promise<BiomassComposition | undefined> {
    const db = await this.ensureDB();
    return db.get(this.STORE_NAME, id);
  }

  public async getSnapshotsBySource(source: string): Promise<BiomassComposition[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex(this.STORE_NAME, 'by-source', source);
  }

  public async getSnapshotsByTimeRange(startTime: number, endTime: number): Promise<BiomassComposition[]> {
    const db = await this.ensureDB();
    const range = IDBKeyRange.bound(startTime, endTime);
    return db.getAllFromIndex(this.STORE_NAME, 'by-timestamp', range);
  }

  public async getSnapshotsByBatch(batchId: string): Promise<BiomassComposition[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex(this.STORE_NAME, 'by-batch', batchId);
  }

  public async getAllSnapshots(): Promise<BiomassComposition[]> {
    const db = await this.ensureDB();
    return db.getAll(this.STORE_NAME);
  }

  public async deleteSnapshot(id: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction([this.STORE_NAME, 'metadata'], 'readwrite');
    await tx.objectStore(this.STORE_NAME).delete(id);
    await tx.objectStore('metadata').delete(`meta-${id}`);
    await tx.done;
  }

  public async clearAllSnapshots(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction([this.STORE_NAME, 'metadata'], 'readwrite');
    await tx.objectStore(this.STORE_NAME).clear();
    await tx.objectStore('metadata').clear();
    await tx.done;
  }

  public async getSnapshotCount(): Promise<number> {
    const db = await this.ensureDB();
    return db.count(this.STORE_NAME);
  }

  public async getMetadata(id: string): Promise<SnapshotMetadata | undefined> {
    const db = await this.ensureDB();
    return db.get('metadata', id);
  }

  public async getMetadataBySource(source: string): Promise<SnapshotMetadata[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('metadata', 'by-source', source);
  }

  public async getSourceStats(): Promise<Map<string, { count: number; avgCV: number; latestCV: number }>> {
    const db = await this.ensureDB();
    const snapshots = await db.getAll(this.STORE_NAME);
    
    const stats = new Map<string, { count: number; avgCV: number; latestCV: number }>();
    
    snapshots.forEach(snapshot => {
      const existing = stats.get(snapshot.source) || { count: 0, avgCV: 0, latestCV: 0 };
      existing.count++;
      existing.avgCV += snapshot.calorificValue;
      if (snapshot.timestamp > (existing.latestCV ? existing.latestCV : 0)) {
        existing.latestCV = snapshot.calorificValue;
      }
      stats.set(snapshot.source, existing);
    });

    stats.forEach((value, key) => {
      value.avgCV = value.avgCV / value.count;
    });

    return stats;
  }

  public async compareSources(source1: string, source2: string): Promise<{
    source1: { count: number; avgCV: number; avgMoisture: number };
    source2: { count: number; avgCV: number; avgMoisture: number };
    comparison: { cvDifference: number; moistureDifference: number };
  }> {
    const [snapshots1, snapshots2] = await Promise.all([
      this.getSnapshotsBySource(source1),
      this.getSnapshotsBySource(source2)
    ]);

    const calcStats = (snapshots: BiomassComposition[]) => ({
      count: snapshots.length,
      avgCV: snapshots.length > 0 
        ? snapshots.reduce((a, b) => a + b.calorificValue, 0) / snapshots.length 
        : 0,
      avgMoisture: snapshots.length > 0 
        ? snapshots.reduce((a, b) => a + b.moisture, 0) / snapshots.length 
        : 0
    });

    const stats1 = calcStats(snapshots1);
    const stats2 = calcStats(snapshots2);

    return {
      source1: stats1,
      source2: stats2,
      comparison: {
        cvDifference: stats1.avgCV - stats2.avgCV,
        moistureDifference: stats1.avgMoisture - stats2.avgMoisture
      }
    };
  }

  public async exportAll(): Promise<{
    snapshots: BiomassComposition[];
    metadata: SnapshotMetadata[];
    exportTime: number;
  }> {
    const db = await this.ensureDB();
    const tx = db.transaction([this.STORE_NAME, 'metadata'], 'readonly');
    
    const [snapshots, metadata] = await Promise.all([
      tx.objectStore(this.STORE_NAME).getAll(),
      tx.objectStore('metadata').getAll()
    ]);

    await tx.done;

    return {
      snapshots,
      metadata,
      exportTime: Date.now()
    };
  }

  public async importData(data: {
    snapshots: BiomassComposition[];
    metadata: SnapshotMetadata[];
  }): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction([this.STORE_NAME, 'metadata'], 'readwrite');

    await Promise.all([
      ...data.snapshots.map(s => tx.objectStore(this.STORE_NAME).put(s)),
      ...data.metadata.map(m => tx.objectStore('metadata').put(m))
    ]);

    await tx.done;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const snapshotStore = new SnapshotStore();
