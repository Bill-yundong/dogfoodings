import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { FlowSnapshot, FlightWave } from '@/types';

interface PortMatrixDB extends DBSchema {
  flight_waves: {
    key: string;
    value: FlightWave;
    indexes: { 'by_created': number };
  };
  snapshots: {
    key: string;
    value: FlowSnapshot;
    indexes: { 'by_wave': [string, number]; 'by_time': number };
  };
}

const DB_NAME = 'port-matrix-db';
const DB_VERSION = 1;

export class SnapshotStorage {
  private db: IDBPDatabase<PortMatrixDB> | null = null;
  private initPromise: Promise<void> | null = null;
  private memoryCache: Map<string, FlowSnapshot[]> = new Map();
  private pendingWrites: FlowSnapshot[] = [];
  private batchInterval: number | null = null;
  private readonly BATCH_INTERVAL = 5000;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    this.db = await openDB<PortMatrixDB>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains('flight_waves')) {
          const waveStore = db.createObjectStore('flight_waves', {
            keyPath: 'id',
          });
          waveStore.createIndex('by_created', 'createdAt');
        }

        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', {
            keyPath: 'id',
          });
          snapStore.createIndex('by_wave', ['waveId', 'timestamp']);
          snapStore.createIndex('by_time', 'timestamp');
        }
      },
    });

    this.startBatchWriter();
  }

  private startBatchWriter(): void {
    if (typeof window === 'undefined') return;

    this.batchInterval = window.setInterval(() => {
      this.flushBatch();
    }, this.BATCH_INTERVAL);
  }

  private async flushBatch(): Promise<void> {
    if (!this.db || this.pendingWrites.length === 0) return;

    const batch = [...this.pendingWrites];
    this.pendingWrites = [];

    try {
      const tx = this.db.transaction('snapshots', 'readwrite');
      await Promise.all([
        ...batch.map((s) => tx.store.put(s)),
        tx.done,
      ]);

      for (const snapshot of batch) {
        const waveSnapshots = this.memoryCache.get(snapshot.waveId) || [];
        waveSnapshots.push(snapshot);
        if (waveSnapshots.length > 1000) {
          waveSnapshots.shift();
        }
        this.memoryCache.set(snapshot.waveId, waveSnapshots);
      }
    } catch (error) {
      console.error('Failed to flush batch:', error);
      this.pendingWrites.unshift(...batch);
    }
  }

  async saveWave(wave: FlightWave): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('flight_waves', wave);
  }

  async getWaves(): Promise<FlightWave[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return this.db.getAllFromIndex('flight_waves', 'by_created');
  }

  async getWave(waveId: string): Promise<FlightWave | undefined> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return this.db.get('flight_waves', waveId);
  }

  async deleteWave(waveId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['flight_waves', 'snapshots'], 'readwrite');

    const snapshots = await tx.objectStore('snapshots')
      .index('by_wave')
      .getAll(IDBKeyRange.bound([waveId, -Infinity], [waveId, Infinity]));

    await Promise.all([
      tx.objectStore('flight_waves').delete(waveId),
      ...snapshots.map((s: FlowSnapshot) => tx.objectStore('snapshots').delete(s.id)),
      tx.done,
    ]);

    this.memoryCache.delete(waveId);
  }

  queueSnapshot(snapshot: FlowSnapshot): void {
    this.pendingWrites.push(snapshot);
  }

  async saveSnapshot(snapshot: FlowSnapshot): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('snapshots', snapshot);

    const waveSnapshots = this.memoryCache.get(snapshot.waveId) || [];
    waveSnapshots.push(snapshot);
    if (waveSnapshots.length > 1000) {
      waveSnapshots.shift();
    }
    this.memoryCache.set(snapshot.waveId, waveSnapshots);
  }

  async getSnapshotsByWave(waveId: string): Promise<FlowSnapshot[]> {
    if (this.memoryCache.has(waveId)) {
      return this.memoryCache.get(waveId)!;
    }

    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const snapshots = await this.db.getAllFromIndex(
      'snapshots',
      'by_wave',
      IDBKeyRange.bound([waveId, -Infinity], [waveId, Infinity])
    );

    snapshots.sort((a, b) => a.timestamp - b.timestamp);
    this.memoryCache.set(waveId, snapshots.slice(-1000));

    return snapshots;
  }

  async getLatestSnapshot(waveId: string): Promise<FlowSnapshot | undefined> {
    const snapshots = await this.getSnapshotsByWave(waveId);
    return snapshots[snapshots.length - 1];
  }

  async getSnapshotsInRange(
    waveId: string,
    startTime: number,
    endTime: number
  ): Promise<FlowSnapshot[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return this.db.getAllFromIndex(
      'snapshots',
      'by_wave',
      IDBKeyRange.bound([waveId, startTime], [waveId, endTime])
    );
  }

  async exportWaveData(waveId: string): Promise<Blob> {
    const wave = await this.getWave(waveId);
    const snapshots = await this.getSnapshotsByWave(waveId);

    const data = {
      wave,
      snapshots,
      exportedAt: Date.now(),
      version: '1.0',
    };

    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
  }

  async importWaveData(blob: Blob): Promise<FlightWave> {
    const text = await blob.text();
    const data = JSON.parse(text);

    if (!data.wave || !data.snapshots) {
      throw new Error('Invalid import format');
    }

    const wave: FlightWave = {
      ...data.wave,
      id: `imported_${Date.now()}_${data.wave.id}`,
      createdAt: Date.now(),
    };

    await this.saveWave(wave);

    for (const snapshot of data.snapshots) {
      await this.saveSnapshot({
        ...snapshot,
        id: `imported_${Date.now()}_${snapshot.id}`,
        waveId: wave.id,
      });
    }

    return wave;
  }

  async getStats(): Promise<{
    waveCount: number;
    snapshotCount: number;
    totalSizeBytes: number;
  }> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const [waveCount, snapshotCount] = await Promise.all([
      this.db.count('flight_waves'),
      this.db.count('snapshots'),
    ]);

    let totalSizeBytes = 0;

    return { waveCount, snapshotCount, totalSizeBytes };
  }

  async clearSnapshots(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction('snapshots', 'readwrite');
    await Promise.all([tx.objectStore('snapshots').clear(), tx.done]);

    this.memoryCache.clear();
    this.pendingWrites = [];
  }

  async clearWaves(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['flight_waves', 'snapshots'], 'readwrite');
    await Promise.all([
      tx.objectStore('flight_waves').clear(),
      tx.objectStore('snapshots').clear(),
      tx.done,
    ]);

    this.memoryCache.clear();
    this.pendingWrites = [];
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['flight_waves', 'snapshots'], 'readwrite');
    await Promise.all([
      tx.objectStore('flight_waves').clear(),
      tx.objectStore('snapshots').clear(),
      tx.done,
    ]);

    this.memoryCache.clear();
    this.pendingWrites = [];
  }

  close(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    this.flushBatch().then(() => {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    });
  }
}

export const snapshotStorage = new SnapshotStorage();
