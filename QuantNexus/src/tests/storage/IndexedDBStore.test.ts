import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.unmock('../../storage/IndexedDBStore');
import { IndexedDBStore } from '../../storage/IndexedDBStore';
import { createMockKline, createMockOrderBook, createMockOrderFlowEntry, createMockKlineSeries } from '../test-utils';
import type { Timeframe } from '../../types';

describe('IndexedDBStore - K线增量同步中枢', () => {
  let dbStore: IndexedDBStore;

  beforeEach(async () => {
    dbStore = new IndexedDBStore();
    await dbStore.init();
  });

  afterEach(async () => {
    await dbStore.close();
  });

  describe('基础功能测试', () => {
    it('should initialize database successfully', () => {
      expect(dbStore).toBeDefined();
      expect(dbStore['db']).toBeDefined();
    });

    it('should have correct object stores', () => {
      const db = dbStore['db'];
      const storeNames = Array.from(db.objectStoreNames);
      expect(storeNames).toContain('klines');
      expect(storeNames).toContain('orderflow');
      expect(storeNames).toContain('orderbook');
      expect(storeNames).toContain('liquidation');
      expect(storeNames).toContain('system_status');
      expect(storeNames).toContain('sync_metadata');
    });
  });

  describe('K线数据操作', () => {
    it('should insert and retrieve kline data', async () => {
      const kline = createMockKline();
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';

      await dbStore.updateKlineIncremental(symbol, timeframe, kline);
      
      const now = Date.now();
      const result = await dbStore.getKlines(symbol, timeframe, now - 60000, now, 100);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].time).toBe(kline.time);
      expect(result[0].close).toBe(kline.close);
    });

    it('should handle incremental kline updates correctly', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const now = Date.now();
      
      const kline1 = createMockKline({ time: Math.floor(now / 1000) * 1000, close: 67500 });
      const kline2 = createMockKline({ time: Math.floor(now / 1000) * 1000, close: 67550 });

      await dbStore.updateKlineIncremental(symbol, timeframe, kline1);
      await dbStore.updateKlineIncremental(symbol, timeframe, kline2);
      
      const result = await dbStore.getKlines(symbol, timeframe, now - 60000, now + 1000, 100);
      expect(result.length).toBe(1);
      expect(result[0].close).toBe(67550);
    });

    it('should query klines with time range', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const klines = createMockKlineSeries(10);

      for (const kline of klines) {
        await dbStore.updateKlineIncremental(symbol, timeframe, kline);
      }

      const startTime = klines[0].time;
      const endTime = klines[klines.length - 1].time;
      
      const result = await dbStore.getKlines(symbol, timeframe, startTime, endTime, 100);
      expect(result.length).toBe(10);
      expect(result[0].time).toBe(startTime);
      expect(result[result.length - 1].time).toBe(endTime);
    });

    it('should respect limit parameter', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const klines = createMockKlineSeries(20);

      for (const kline of klines) {
        await dbStore.updateKlineIncremental(symbol, timeframe, kline);
      }

      const result = await dbStore.getKlines(symbol, timeframe, 0, Date.now(), 5);
      expect(result.length).toBe(5);
    });
  });

  describe('订单簿数据操作', () => {
    it('should insert and retrieve orderbook data', async () => {
      const orderBook = createMockOrderBook();
      
      await dbStore.insertOrderBook(orderBook);
      
      const result = await dbStore.getLatestOrderBook(orderBook.symbol);
      expect(result).toBeDefined();
      expect(result!.symbol).toBe(orderBook.symbol);
      expect(result!.bids.length).toBe(20);
      expect(result!.asks.length).toBe(20);
    });

    it('should return null for non-existent symbol', async () => {
      const result = await dbStore.getLatestOrderBook('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('订单流数据操作', () => {
    it('should insert and query order flow entries', async () => {
      const symbol = 'BTCUSDT';
      const entries = Array.from({ length: 10 }, () => createMockOrderFlowEntry({ symbol }));

      for (const entry of entries) {
        await dbStore.insertOrderFlow(entry);
      }

      const now = Date.now();
      const result = await dbStore.getOrderFlow(symbol, now - 60000, now, 100);
      expect(result.length).toBe(10);
    });

    it('should insert order flow in batch', async () => {
      const entries = Array.from({ length: 50 }, () => createMockOrderFlowEntry());
      
      await dbStore.insertOrderFlowBatch(entries);
      
      const now = Date.now();
      const result = await dbStore.getOrderFlow('BTCUSDT', now - 60000, now, 100);
      expect(result.length).toBe(50);
    });
  });

  describe('清算数据操作', () => {
    it('should insert and query liquidation data', async () => {
      const symbol = 'BTCUSDT';
      const liquidation = createMockOrderFlowEntry({
        symbol,
        type: 'liquidation',
        quantity: 5
      });

      await dbStore.insertLiquidation(liquidation);
      
      const now = Date.now();
      const result = await dbStore.getLiquidations(symbol, now - 60000, now, 100);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('liquidation');
    });
  });

  describe('并发控制测试', () => {
    it('should handle concurrent writes with sync lock', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const klines = createMockKlineSeries(10);

      const writePromises = klines.map(kline => 
        dbStore.updateKlineIncremental(symbol, timeframe, kline)
      );

      await expect(Promise.all(writePromises)).resolves.not.toThrow();
    });
  });

  describe('系统状态操作', () => {
    it('should update and get system status', async () => {
      const status = {
        timestamp: Date.now(),
        latency: 50,
        dataConsistency: 99.9,
        syncStatus: 'synced' as const,
        lastSyncTime: Date.now(),
        pendingOperations: 0,
        databaseSize: 1024
      };

      await dbStore.updateSystemStatus(status);
      
      const result = await dbStore.getSystemStatus();
      expect(result).toBeDefined();
      expect(result!.latency).toBe(50);
      expect(result!.syncStatus).toBe('synced');
    });
  });

  describe('数据库统计', () => {
    it('should calculate database size', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      for (let i = 0; i < 100; i++) {
        await dbStore.updateKlineIncremental(symbol, timeframe, createMockKline({
          time: Date.now() - i * 1000
        }));
      }

      const size = await dbStore.getDatabaseSize();
      expect(size).toMatch(/\d+(.\d+)?\s*(B|KB|MB)/);
    });

    it('should track pending operations', () => {
      const pending = dbStore.getPendingOperations();
      expect(typeof pending).toBe('number');
      expect(pending).toBeGreaterThanOrEqual(0);
    });
  });
});
