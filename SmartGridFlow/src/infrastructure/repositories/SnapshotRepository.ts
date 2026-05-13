import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OperationalSnapshot, WeatherType } from '../../domain/types/energy';
import { TYPICAL_WEATHER_DATA } from '../../domain/constants/energy';

interface EnergyDB extends DBSchema {
  snapshots: {
    key: string;
    value: OperationalSnapshot;
    indexes: {
      'by-weatherType': WeatherType;
      'by-timestamp': number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      data: unknown;
      timestamp: number;
      retryCount: number;
    };
    indexes: {
      'by-timestamp': number;
    };
  };
}

const DB_NAME = 'SmartGridFlowDB';
const DB_VERSION = 1;

export class SnapshotRepository {
  private db: IDBPDatabase<EnergyDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<EnergyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const snapshotStore = db.createObjectStore('snapshots', {
          keyPath: 'id',
          autoIncrement: true,
        });
        snapshotStore.createIndex('by-weatherType', 'weatherType');
        snapshotStore.createIndex('by-timestamp', 'timestamp');

        const syncQueueStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
        });
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  async save(snapshot: Omit<OperationalSnapshot, 'id'>): Promise<string> {
    await this.ensureInitialized();
    const id = await this.db!.add('snapshots', snapshot as OperationalSnapshot);
    return id as string;
  }

  async getById(id: string): Promise<OperationalSnapshot | undefined> {
    await this.ensureInitialized();
    return this.db!.get('snapshots', id);
  }

  async getByWeatherType(weatherType: WeatherType): Promise<OperationalSnapshot[]> {
    await this.ensureInitialized();
    return this.db!.getAllFromIndex('snapshots', 'by-weatherType', weatherType);
  }

  async getLatest(limit: number = 10): Promise<OperationalSnapshot[]> {
    await this.ensureInitialized();
    const allSnapshots = await this.db!.getAll('snapshots');
    return allSnapshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('snapshots', id);
  }

  async clearBefore(timestamp: number): Promise<void> {
    await this.ensureInitialized();
    const allSnapshots = await this.db!.getAll('snapshots');
    const oldSnapshots = allSnapshots.filter(s => s.timestamp < timestamp);
    for (const snapshot of oldSnapshots) {
      if (snapshot.id) {
        await this.db!.delete('snapshots', snapshot.id);
      }
    }
  }

  async enqueueSync(data: unknown): Promise<void> {
    await this.ensureInitialized();
    const item = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await this.db!.add('syncQueue', item);
  }

  async getSyncQueue(): Promise<Array<{ id: string; data: unknown; timestamp: number; retryCount: number }>> {
    await this.ensureInitialized();
    return this.db!.getAll('syncQueue');
  }

  async dequeueSync(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('syncQueue', id);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const snapshotRepository = new SnapshotRepository();
