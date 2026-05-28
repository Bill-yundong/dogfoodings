import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { KlineData, OrderFlowEntry, OrderBook, LiquidationPressure, SystemStatus, Timeframe } from '../types';

const DB_NAME = 'quant_nexus_db';
const DB_VERSION = 3;

interface QuantNexusDBSchema {
  klines: {
    key: [string, string, number];
    value: KlineData;
    indexes: {
      'symbol-timeframe': [string, string];
      'timestamp': number;
    };
  };
  orderflow: {
    key: string;
    value: OrderFlowEntry;
    indexes: {
      'symbol': string;
      'timestamp': number;
      'symbol-timestamp': [string, number];
    };
  };
  orderbook: {
    key: [string, number];
    value: OrderBook;
    indexes: {
      'symbol': string;
      'timestamp': number;
    };
  };
  liquidation: {
    key: [string, number];
    value: LiquidationPressure;
    indexes: {
      'symbol': string;
      'timestamp': number;
    };
  };
  system_status: {
    key: number;
    value: SystemStatus;
  };
  sync_metadata: {
    key: [string, string];
    value: {
      symbol: string;
      timeframe: string;
      lastSyncedTime: number;
      lastSyncHash: string;
      recordCount: number;
    };
  };
}

export class IndexedDBStore {
  private db: IDBPDatabase<QuantNexusDBSchema> | null = null;
  private initPromise: Promise<void> | null = null;
  private pendingOperations: number = 0;
  private syncLock: Map<string, Promise<void>> = new Map();

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    this.db = await openDB<QuantNexusDBSchema>(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion, newVersion, transaction) => {
        if (!db.objectStoreNames.contains('klines')) {
          const klineStore = db.createObjectStore('klines', {
            keyPath: ['symbol', 'timeframe', 'time']
          });
          klineStore.createIndex('symbol-timeframe', ['symbol', 'timeframe']);
          klineStore.createIndex('timestamp', 'time');
        }

        if (!db.objectStoreNames.contains('orderflow')) {
          const ofStore = db.createObjectStore('orderflow', {
            keyPath: 'id'
          });
          ofStore.createIndex('symbol', 'symbol');
          ofStore.createIndex('timestamp', 'timestamp');
          ofStore.createIndex('symbol-timestamp', ['symbol', 'timestamp']);
        }

        if (!db.objectStoreNames.contains('orderbook')) {
          const obStore = db.createObjectStore('orderbook', {
            keyPath: ['symbol', 'timestamp']
          });
          obStore.createIndex('symbol', 'symbol');
          obStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('liquidation')) {
          const liqStore = db.createObjectStore('liquidation', {
            keyPath: ['symbol', 'timestamp']
          });
          liqStore.createIndex('symbol', 'symbol');
          liqStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('system_status')) {
          db.createObjectStore('system_status', {
            keyPath: 'timestamp'
          });
        }

        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', {
            keyPath: ['symbol', 'timeframe']
          });
        }
      }
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  async batchInsertKlines(symbol: string, timeframe: Timeframe, klines: KlineData[]): Promise<number> {
    await this.ensureInitialized();
    if (!this.db || klines.length === 0) return 0;

    const lockKey = `klines_${symbol}_${timeframe}`;
    const existingLock = this.syncLock.get(lockKey);
    if (existingLock) await existingLock;

    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.syncLock.set(lockKey, lockPromise);

    this.pendingOperations++;
    const startTime = performance.now();
    let inserted = 0;

    try {
      const tx = this.db.transaction('klines', 'readwrite');
      const store = tx.store;

      const existingTimes = new Set<number>();
      const index = store.index('symbol-timeframe');
      const cursor = await index.openCursor(IDBKeyRange.only([symbol, timeframe]));
      let cursorIter = cursor;
      while (cursorIter) {
        existingTimes.add(cursorIter.value.time);
        cursorIter = await cursorIter.continue();
      }

      const promises: Promise<void>[] = [];
      for (const kline of klines) {
        if (!existingTimes.has(kline.time)) {
          const enhancedKline = {
            ...kline,
            symbol,
            timeframe
          };
          promises.push(store.put(enhancedKline).then(() => { inserted++; }));
        }
      }

      await Promise.all(promises);
      await tx.done;

      const lastKline = klines[klines.length - 1];
      if (lastKline) {
        await this.updateSyncMetadata(symbol, timeframe, lastKline.time, klines.length);
      }
    } finally {
      this.pendingOperations--;
      resolveLock!();
      this.syncLock.delete(lockKey);
    }

    const duration = performance.now() - startTime;
    console.log(`[IndexedDB] 插入 ${inserted}/${klines.length} K线数据，耗时: ${duration.toFixed(2)}ms`);
    return inserted;
  }

  async getKlines(
    symbol: string,
    timeframe: Timeframe,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<KlineData[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const tx = this.db.transaction('klines', 'readonly');
    const store = tx.store;
    const index = store.index('symbol-timeframe');

    let range: IDBKeyRange | undefined;
    if (startTime && endTime) {
      range = IDBKeyRange.bound([symbol, timeframe, startTime], [symbol, timeframe, endTime]);
    } else if (startTime) {
      range = IDBKeyRange.lowerBound([symbol, timeframe, startTime]);
    } else if (endTime) {
      range = IDBKeyRange.upperBound([symbol, timeframe, endTime]);
    } else {
      range = IDBKeyRange.only([symbol, timeframe]);
    }

    const results: KlineData[] = [];
    let cursor = await index.openCursor(range, 'prev');
    
    while (cursor && results.length < limit) {
      results.unshift({
        time: cursor.value.time,
        open: cursor.value.open,
        high: cursor.value.high,
        low: cursor.value.low,
        close: cursor.value.close,
        volume: cursor.value.volume,
        quoteVolume: cursor.value.quoteVolume
      });
      cursor = await cursor.continue();
    }

    await tx.done;
    return results;
  }

  async getLatestKline(symbol: string, timeframe: Timeframe): Promise<KlineData | null> {
    const klines = await this.getKlines(symbol, timeframe, undefined, undefined, 1);
    return klines.length > 0 ? klines[0] : null;
  }

  async updateKlineIncremental(symbol: string, timeframe: Timeframe, kline: KlineData): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.db) return false;

    const lockKey = `klines_${symbol}_${timeframe}`;
    const existingLock = this.syncLock.get(lockKey);
    if (existingLock) await existingLock;

    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.syncLock.set(lockKey, lockPromise);

    try {
      const tx = this.db.transaction('klines', 'readwrite');
      const store = tx.store;
      
      const key: [string, string, number] = [symbol, timeframe, kline.time];
      const existing = await store.get(key);
      
      if (existing) {
        const updatedKline = {
          ...existing,
          ...kline,
          high: Math.max(existing.high, kline.high),
          low: Math.min(existing.low, kline.low),
          volume: kline.volume,
          quoteVolume: kline.quoteVolume,
          symbol,
          timeframe
        };
        await store.put(updatedKline);
      } else {
        await store.put({ ...kline, symbol, timeframe });
      }
      
      await tx.done;
      await this.updateSyncMetadata(symbol, timeframe, kline.time, 1);
      return true;
    } finally {
      resolveLock!();
      this.syncLock.delete(lockKey);
    }
  }

  async insertOrderFlow(entry: OrderFlowEntry): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.pendingOperations++;
    try {
      const tx = this.db.transaction('orderflow', 'readwrite');
      await tx.store.put(entry);
      await tx.done;
    } finally {
      this.pendingOperations--;
    }
  }

  async batchInsertOrderFlow(entries: OrderFlowEntry[]): Promise<number> {
    await this.ensureInitialized();
    if (!this.db || entries.length === 0) return 0;

    this.pendingOperations++;
    const startTime = performance.now();
    let inserted = 0;

    try {
      const tx = this.db.transaction('orderflow', 'readwrite');
      const store = tx.store;
      
      const promises = entries.map(entry => 
        store.put(entry).then(() => { inserted++; })
      );
      
      await Promise.all(promises);
      await tx.done;
    } finally {
      this.pendingOperations--;
    }

    const duration = performance.now() - startTime;
    console.log(`[IndexedDB] 插入 ${inserted} 订单流数据，耗时: ${duration.toFixed(2)}ms，${(inserted / duration * 1000).toFixed(0)} op/s`);
    return inserted;
  }

  async getOrderFlow(
    symbol: string,
    startTime: number,
    endTime?: number,
    limit: number = 10000
  ): Promise<OrderFlowEntry[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const tx = this.db.transaction('orderflow', 'readonly');
    const index = tx.store.index('symbol-timestamp');

    let range: IDBKeyRange;
    if (endTime) {
      range = IDBKeyRange.bound([symbol, startTime], [symbol, endTime]);
    } else {
      range = IDBKeyRange.lowerBound([symbol, startTime]);
    }

    const results: OrderFlowEntry[] = [];
    let cursor = await index.openCursor(range);
    
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return results;
  }

  async insertOrderBook(orderBook: OrderBook): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const tx = this.db.transaction('orderbook', 'readwrite');
    await tx.store.put(orderBook);
    await tx.done;
  }

  async getLatestOrderBook(symbol: string): Promise<OrderBook | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    const tx = this.db.transaction('orderbook', 'readonly');
    const index = tx.store.index('symbol');
    const cursor = await index.openCursor(IDBKeyRange.only(symbol), 'prev');
    
    const result = cursor ? cursor.value : null;
    await tx.done;
    return result;
  }

  async insertLiquidationPressure(data: LiquidationPressure): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const tx = this.db.transaction('liquidation', 'readwrite');
    await tx.store.put(data);
    await tx.done;
  }

  async getLiquidationHistory(
    symbol: string,
    startTime: number,
    endTime?: number
  ): Promise<LiquidationPressure[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const tx = this.db.transaction('liquidation', 'readonly');
    const index = tx.store.index('symbol');
    
    const results: LiquidationPressure[] = [];
    let cursor = await index.openCursor(IDBKeyRange.only(symbol), 'prev');
    
    while (cursor) {
      if (cursor.value.timestamp >= startTime && (!endTime || cursor.value.timestamp <= endTime)) {
        results.unshift(cursor.value);
      }
      if (cursor.value.timestamp < startTime) break;
      cursor = await cursor.continue();
    }

    await tx.done;
    return results;
  }

  private async updateSyncMetadata(
    symbol: string,
    timeframe: string,
    lastSyncedTime: number,
    newRecords: number
  ): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('sync_metadata', 'readwrite');
    const key: [string, string] = [symbol, timeframe];
    const existing = await tx.store.get(key);
    
    const metadata = {
      symbol,
      timeframe,
      lastSyncedTime,
      lastSyncHash: this.generateHash(`${symbol}${timeframe}${lastSyncedTime}${Date.now()}`),
      recordCount: (existing?.recordCount || 0) + newRecords
    };
    
    await tx.store.put(metadata);
    await tx.done;
  }

  async getSyncMetadata(symbol: string, timeframe: string): Promise<{
    lastSyncedTime: number;
    lastSyncHash: string;
    recordCount: number;
  } | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    const tx = this.db.transaction('sync_metadata', 'readonly');
    const key: [string, string] = [symbol, timeframe];
    const result = await tx.store.get(key);
    await tx.done;
    
    return result ? {
      lastSyncedTime: result.lastSyncedTime,
      lastSyncHash: result.lastSyncHash,
      recordCount: result.recordCount
    } : null;
  }

  async getDatabaseSize(): Promise<number> {
    if (!this.db) return 0;
    
    let totalSize = 0;
    const stores = this.db.objectStoreNames;
    
    for (let i = 0; i < stores.length; i++) {
      const tx = this.db.transaction(stores[i], 'readonly');
      const count = await tx.store.count();
      totalSize += count;
    }
    
    return totalSize;
  }

  getPendingOperations(): number {
    return this.pendingOperations;
  }

  async verifyDataConsistency(symbol: string, timeframe: Timeframe): Promise<{
    consistent: boolean;
    gaps: number[];
    expectedCount: number;
    actualCount: number;
  }> {
    const klines = await this.getKlines(symbol, timeframe);
    if (klines.length < 2) {
      return { consistent: true, gaps: [], expectedCount: klines.length, actualCount: klines.length };
    }

    const timeframeMs = this.timeframeToMs(timeframe);
    const gaps: number[] = [];
    
    for (let i = 1; i < klines.length; i++) {
      const expectedTime = klines[i - 1].time + timeframeMs;
      if (klines[i].time !== expectedTime) {
        gaps.push(expectedTime);
      }
    }

    const firstTime = klines[0].time;
    const lastTime = klines[klines.length - 1].time;
    const expectedCount = Math.floor((lastTime - firstTime) / timeframeMs) + 1;

    return {
      consistent: gaps.length === 0 && expectedCount === klines.length,
      gaps,
      expectedCount,
      actualCount: klines.length
    };
  }

  private timeframeToMs(timeframe: Timeframe): number {
    const units: { [key in Timeframe]: number } = {
      '1s': 1000,
      '5s': 5000,
      '15s': 15000,
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };
    return units[timeframe];
  }

  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const dbStore = new IndexedDBStore();
