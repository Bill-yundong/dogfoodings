import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WeldPoint, WeldPoolData } from '@/types/welding';

interface WeldDB extends DBSchema {
  weldPoints: {
    key: string;
    value: WeldPoint;
    indexes: { 'by-sequence': number; 'by-quality': number; 'by-time': number };
  };
  weldPoolData: {
    key: string;
    value: WeldPoolData;
    indexes: { 'by-timestamp': number };
  };
  waveformCache: {
    key: string;
    value: { weldPointId: string; data: Float32Array; timestamp: number };
    indexes: { 'by-weldPoint': string };
  };
}

const DB_NAME = 'WeldNexusDB';
const DB_VERSION = 1;

class IndexedDBManager {
  private db: IDBPDatabase<WeldDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<WeldDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const weldPointsStore = db.createObjectStore('weldPoints', { keyPath: 'id' });
        weldPointsStore.createIndex('by-sequence', 'sequence');
        weldPointsStore.createIndex('by-quality', 'qualityScore');
        weldPointsStore.createIndex('by-time', 'startTime');

        const weldPoolStore = db.createObjectStore('weldPoolData', { keyPath: 'id' });
        weldPoolStore.createIndex('by-timestamp', 'timestamp');

        const waveformStore = db.createObjectStore('waveformCache', { keyPath: 'weldPointId' });
        waveformStore.createIndex('by-weldPoint', 'weldPointId');
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<WeldDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async saveWeldPoint(weldPoint: WeldPoint): Promise<void> {
    const db = await this.ensureDB();
    await db.put('weldPoints', weldPoint);
  }

  async saveWeldPointsBatch(weldPoints: WeldPoint[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('weldPoints', 'readwrite');
    await Promise.all([
      ...weldPoints.map(wp => tx.store.put(wp)),
      tx.done,
    ]);
  }

  async getWeldPoint(id: string): Promise<WeldPoint | undefined> {
    const db = await this.ensureDB();
    return db.get('weldPoints', id);
  }

  async getWeldPointsByRange(startTime: number, endTime: number): Promise<WeldPoint[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('weldPoints', 'by-time', IDBKeyRange.bound(startTime, endTime));
  }

  async getRecentWeldPoints(limit: number = 100): Promise<WeldPoint[]> {
    const db = await this.ensureDB();
    const tx = db.transaction('weldPoints', 'readonly');
    const index = tx.store.index('by-time');
    const results: WeldPoint[] = [];
    let cursor = await index.openCursor(null, 'prev');
    
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    await tx.done;
    return results;
  }

  async saveWeldPoolData(data: WeldPoolData): Promise<void> {
    const db = await this.ensureDB();
    await db.put('weldPoolData', data);
  }

  async getWeldPoolDataByTimeRange(start: number, end: number): Promise<WeldPoolData[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('weldPoolData', 'by-timestamp', IDBKeyRange.bound(start, end));
  }

  async saveWaveformCache(weldPointId: string, data: Float32Array): Promise<void> {
    const db = await this.ensureDB();
    await db.put('waveformCache', {
      weldPointId,
      data,
      timestamp: Date.now(),
    });
  }

  async getWaveformCache(weldPointId: string): Promise<Float32Array | undefined> {
    const db = await this.ensureDB();
    const cache = await db.get('waveformCache', weldPointId);
    return cache?.data;
  }

  async getWeldPointCount(): Promise<number> {
    const db = await this.ensureDB();
    return db.count('weldPoints');
  }

  async clearOldData(beforeTime: number): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['weldPoints', 'weldPoolData'], 'readwrite');
    
    const weldPointsIndex = tx.objectStore('weldPoints').index('by-time');
    let wpCursor = await weldPointsIndex.openCursor(IDBKeyRange.upperBound(beforeTime));
    while (wpCursor) {
      await wpCursor.delete();
      wpCursor = await wpCursor.continue();
    }

    const poolDataIndex = tx.objectStore('weldPoolData').index('by-timestamp');
    let pdCursor = await poolDataIndex.openCursor(IDBKeyRange.upperBound(beforeTime));
    while (pdCursor) {
      await pdCursor.delete();
      pdCursor = await pdCursor.continue();
    }

    await tx.done;
  }
}

export const indexedDBManager = new IndexedDBManager();
