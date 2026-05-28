import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.unmock('../../storage/IndexedDBStore');
import { DataSyncHub } from '../../storage/DataSyncHub';
import { IndexedDBStore } from '../../storage/IndexedDBStore';
import { createMockKline, createMockKlineSeries } from '../test-utils';
import type { Timeframe } from '../../types';

vi.doMock('../../storage/IndexedDBStore', () => {
  const mockDbStore = {
    init: vi.fn().mockResolvedValue(undefined),
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getKlines: vi.fn().mockResolvedValue([]),
    updateKlineIncremental: vi.fn().mockResolvedValue(true),
    batchInsertKlines: vi.fn().mockResolvedValue(0),
    getSyncMetadata: vi.fn().mockResolvedValue(null),
    verifyDataConsistency: vi.fn().mockResolvedValue({ consistent: true, gaps: [] }),
  };
  return {
    IndexedDBStore: vi.fn().mockImplementation(() => mockDbStore),
    dbStore: mockDbStore
  };
});

describe('DataSyncHub - 数据同步中枢', () => {
  let syncHub: DataSyncHub;
  let dbStore: IndexedDBStore;

  beforeEach(() => {
    vi.useFakeTimers();
    dbStore = new IndexedDBStore();
    syncHub = new DataSyncHub();
  });

  afterEach(() => {
    syncHub.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('增量同步测试', () => {
    it('should sync kline data incrementally', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const klines = createMockKlineSeries(10);
      
      const fetchFn = vi.fn().mockResolvedValue(klines);
      
      const result = await syncHub.syncKlinesIncremental(symbol, timeframe, fetchFn);
      
      expect(result).toBeDefined();
      expect(result.synced).toBeGreaterThanOrEqual(0);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should track sync gaps through monitoring', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      const key = `${symbol}:${timeframe}`;
      syncHub['syncingSymbols'].set(key, true);
      
      vi.advanceTimersByTime(30000);
      
      expect(dbStore.verifyDataConsistency).toHaveBeenCalled();
    });
  });

  describe('实时更新测试', () => {
    it('should update kline data in realtime', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const kline = createMockKline();
      
      const result = await syncHub.updateKlineRealtime(symbol, timeframe, kline);
      
      expect(result).toBeDefined();
      expect(result.updated).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(dbStore.updateKlineIncremental).toHaveBeenCalled();
    });

    it('should handle multiple realtime updates', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      for (let i = 0; i < 5; i++) {
        const kline = createMockKline({ time: Date.now() + i * 1000 });
        await syncHub.updateKlineRealtime(symbol, timeframe, kline);
      }
      
      expect(dbStore.updateKlineIncremental).toHaveBeenCalledTimes(5);
    });
  });

  describe('数据一致性验证', () => {
    it('should verify data consistency through dbStore', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      const result = await dbStore.verifyDataConsistency(symbol, timeframe);
      
      expect(result).toBeDefined();
      expect(result.consistent).toBe(true);
      expect(Array.isArray(result.gaps)).toBe(true);
    });

    it('should detect missing data when consistency check fails', async () => {
      vi.mocked(dbStore.verifyDataConsistency).mockResolvedValueOnce({
        consistent: false,
        gaps: [1000, 2000, 3000]
      });
      
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      const result = await dbStore.verifyDataConsistency(symbol, timeframe);
      
      expect(result.consistent).toBe(false);
      expect(result.gaps.length).toBe(3);
    });
  });

  describe('同步状态管理', () => {
    it('should track sync status correctly', () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      expect(syncHub.isSyncing(symbol, timeframe)).toBe(false);
      
      const key = `${symbol}:${timeframe}`;
      syncHub['syncingSymbols'].set(key, true);
      
      expect(syncHub.isSyncing(symbol, timeframe)).toBe(true);
    });

    it('should return all sync statuses', () => {
      const symbol1 = 'BTCUSDT';
      const symbol2 = 'ETHUSDT';
      const timeframe: Timeframe = '1s';
      
      syncHub['syncingSymbols'].set(`${symbol1}:${timeframe}`, true);
      syncHub['syncingSymbols'].set(`${symbol2}:${timeframe}`, false);
      
      const statuses = syncHub.getSyncStatus();
      
      expect(statuses.size).toBe(2);
      expect(statuses.get(`${symbol1}:${timeframe}`)).toBe(true);
      expect(statuses.get(`${symbol2}:${timeframe}`)).toBe(false);
    });
  });

  describe('事件监听', () => {
    it('should emit sync events', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const kline = createMockKline();
      
      const mockCallback = vi.fn();
      const unsubscribe = syncHub.on('kline', mockCallback);
      
      await syncHub.updateKlineRealtime(symbol, timeframe, kline);
      
      expect(mockCallback).toHaveBeenCalled();
      
      unsubscribe();
    });
  });
});
