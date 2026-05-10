import { openDB, IDBPDatabase, IDBPIndex } from 'idb';
import { HistoricalRecord, TrafficIndex } from '../types/traffic';

const DB_NAME = 'TrafficMonitoringDB';
const DB_VERSION = 1;
const STORE_NAME = 'historical_records';

interface DBSchema {
  historical_records: {
    key: string;
    value: HistoricalRecord;
    indexes: {
      timestamp: number;
      hour: number;
      weekday: number;
      peakStatus: string;
    };
  };
}

export class TrafficDatabase {
  private db: IDBPDatabase<DBSchema> | null = null;
  private lastSyncTimestamp: number = 0;

  async init(): Promise<void> {
    this.db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('hour', 'hour');
          store.createIndex('weekday', 'weekday');
          store.createIndex('peakStatus', 'peakStatus');
        }
      },
    });
  }

  private ensureDB(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  async addRecord(trafficIndex: TrafficIndex): Promise<string> {
    this.ensureDB();
    
    const now = new Date();
    const hour = now.getHours();
    const weekday = now.getDay();
    const peakStatus = this.detectPeakStatus(hour, weekday);
    
    const record: HistoricalRecord = {
      id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: trafficIndex.timestamp,
      hour,
      weekday,
      trafficIndex,
      peakStatus,
    };

    await this.db!.add(STORE_NAME, record);
    this.lastSyncTimestamp = trafficIndex.timestamp;
    
    return record.id;
  }

  private detectPeakStatus(hour: number, weekday: number): 'morning' | 'evening' | 'none' {
    if (weekday >= 1 && weekday <= 5) {
      if (hour >= 7 && hour < 9) {
        return 'morning';
      }
      if (hour >= 17 && hour < 19) {
        return 'evening';
      }
    }
    return 'none';
  }

  async getRecordsSince(sinceTimestamp: number): Promise<HistoricalRecord[]> {
    this.ensureDB();
    
    const transaction = this.db!.transaction(STORE_NAME, 'readonly');
    const store = transaction.store;
    const index = store.index('timestamp');
    const range = IDBKeyRange.lowerBound(sinceTimestamp);
    
    const records: HistoricalRecord[] = [];
    let cursor = await index.openCursor(range);
    
    while (cursor) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return records;
  }

  async getRecordsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<HistoricalRecord[]> {
    this.ensureDB();
    
    const transaction = this.db!.transaction(STORE_NAME, 'readonly');
    const store = transaction.store;
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    
    const records: HistoricalRecord[] = [];
    let cursor = await index.openCursor(range);
    
    while (cursor) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getIncrementalRecords(
    fromTimestamp: number,
    batchSize: number = 100
  ): Promise<{ records: HistoricalRecord[]; hasMore: boolean; nextTimestamp: number }> {
    this.ensureDB();
    
    const allRecords = await this.getRecordsSince(fromTimestamp);
    const sortedRecords = allRecords.sort((a, b) => a.timestamp - b.timestamp);
    
    const records = sortedRecords.slice(0, batchSize);
    const hasMore = sortedRecords.length > batchSize;
    const nextTimestamp = hasMore 
      ? records[records.length - 1].timestamp 
      : fromTimestamp;
    
    return { records, hasMore, nextTimestamp };
  }

  async getPeakTrafficRecords(peakType: 'morning' | 'evening' | 'both'): Promise<HistoricalRecord[]> {
    this.ensureDB();
    
    const allRecords = await this.getAllRecords();
    let filtered: HistoricalRecord[] = [];
    
    if (peakType === 'both') {
      filtered = allRecords.filter(r => r.peakStatus === 'morning' || r.peakStatus === 'evening');
    } else {
      filtered = allRecords.filter(r => r.peakStatus === peakType);
    }
    
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async getAllRecords(): Promise<HistoricalRecord[]> {
    this.ensureDB();
    const transaction = this.db!.transaction(STORE_NAME, 'readonly');
    const store = transaction.store;
    const records: HistoricalRecord[] = [];
    let cursor = await store.openCursor();
    
    while (cursor) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return records;
  }

  async getRecordsByHour(hour: number): Promise<HistoricalRecord[]> {
    this.ensureDB();
    
    const transaction = this.db!.transaction(STORE_NAME, 'readonly');
    const store = transaction.store;
    const index = store.index('hour');
    
    const records: HistoricalRecord[] = [];
    let cursor = await index.openCursor(IDBKeyRange.only(hour));
    
    while (cursor) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getHistoricalTrafficIndex(
    startTime: number,
    endTime: number
  ): Promise<TrafficIndex | null> {
    const records = await this.getRecordsByTimeRange(startTime, endTime);
    
    if (records.length === 0) {
      return null;
    }
    
    const latestRecord = records[records.length - 1];
    return latestRecord.trafficIndex;
  }

  async compareWithHistorical(
    currentIndex: TrafficIndex,
    historicalHours: number = 24
  ): Promise<{
    current: TrafficIndex;
    historical: TrafficIndex | null;
    comparison: {
      overallChange: number;
      hotspotChange: number;
    };
  }> {
    const historicalTime = currentIndex.timestamp - historicalHours * 60 * 60 * 1000;
    const startTime = historicalTime - 30 * 60 * 1000;
    const endTime = historicalTime + 30 * 60 * 1000;
    
    const historicalIndex = await this.getHistoricalTrafficIndex(startTime, endTime);
    
    if (!historicalIndex) {
      return {
        current: currentIndex,
        historical: null,
        comparison: {
          overallChange: 0,
          hotspotChange: 0,
        },
      };
    }
    
    return {
      current: currentIndex,
      historical: historicalIndex,
      comparison: {
        overallChange: currentIndex.overall - historicalIndex.overall,
        hotspotChange: currentIndex.hotspots.length - historicalIndex.hotspots.length,
      },
    };
  }

  async cleanupOldRecords(maxAgeDays: number = 30): Promise<number> {
    this.ensureDB();
    
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;
    
    const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
    const store = transaction.store;
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoffTime);
    
    let deleteCount = 0;
    let cursor = await index.openCursor(range);
    
    while (cursor) {
      await cursor.delete();
      deleteCount++;
      cursor = await cursor.continue();
    }
    
    return deleteCount;
  }

  async getRecordCount(): Promise<number> {
    this.ensureDB();
    return await this.db!.count(STORE_NAME);
  }

  async clearAllRecords(): Promise<void> {
    this.ensureDB();
    await this.db!.clear(STORE_NAME);
  }

  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }
}

export const trafficDB = new TrafficDatabase();