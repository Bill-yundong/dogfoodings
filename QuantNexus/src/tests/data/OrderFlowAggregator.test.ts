import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderFlowAggregator } from '../../data/OrderFlowAggregator';
import { createMockOrderFlowEntry } from '../test-utils';
import type { OrderFlowEntry } from '../../types';

describe('OrderFlowAggregator - 高频订单流聚合引擎', () => {
  let aggregator: OrderFlowAggregator;

  beforeEach(() => {
    vi.useRealTimers();
    aggregator = new OrderFlowAggregator({
      bucketSize: 1000,
      maxBuckets: 100,
      autoFlush: false
    });
  });

  describe('基础功能测试', () => {
    it('should add order flow entries correctly', () => {
      const entry = createMockOrderFlowEntry();
      
      aggregator.addEntry(entry);
      aggregator.flush();
      
      const current = aggregator.getCurrentBucket('BTCUSDT');
      expect(current).toBeDefined();
    });

    it('should aggregate entries by time bucket', () => {
      const symbol = 'BTCUSDT';
      const now = Date.now();
      
      const entries: OrderFlowEntry[] = [];
      for (let i = 0; i < 50; i++) {
        entries.push(createMockOrderFlowEntry({
          symbol,
          timestamp: now + i * 10,
          side: i % 2 === 0 ? 'buy' : 'sell',
          quantity: 1,
          price: 67500 + i
        }));
      }

      entries.forEach(e => aggregator.addEntry(e));
      aggregator.flush();
      
      const historical = aggregator.getHistoricalData(10, symbol);
      expect(historical.length).toBeGreaterThan(0);
      expect(historical[0].buyVolume).toBeGreaterThan(0);
      expect(historical[0].sellVolume).toBeGreaterThan(0);
    });
  });

  describe('Delta 指标计算', () => {
    it('should calculate delta correctly', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({ 
          symbol, 
          side: 'buy', 
          quantity: 10,
          timestamp: Date.now() + i * 10
        }));
      }
      for (let i = 0; i < 5; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({ 
          symbol, 
          side: 'sell', 
          quantity: 10,
          timestamp: Date.now() + 100 + i * 10
        }));
      }
      
      aggregator.flush();
      const result = aggregator.calculateDeltaIndicator(symbol, 20);
      
      expect(result).toBeDefined();
      expect(result.cumulativeDelta).toBeGreaterThan(0);
    });

    it('should calculate cumulative delta', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({ 
          symbol, 
          side: i % 2 === 0 ? 'buy' : 'sell', 
          quantity: 10,
          timestamp: Date.now() + i * 10
        }));
      }
      
      aggregator.flush();
      const result = aggregator.calculateDeltaIndicator(symbol, 20);
      
      expect(result.cumulativeDelta).toBeDefined();
      expect(typeof result.cumulativeDelta).toBe('number');
    });
  });

  describe('订单流失衡检测', () => {
    it('should detect bullish order flow imbalance', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 40; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'buy',
          quantity: 3,
          timestamp: Date.now() + i * 10
        }));
      }
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'sell',
          quantity: 1,
          timestamp: Date.now() + 400 + i * 10
        }));
      }

      aggregator.flush();
      const result = aggregator.detectOrderFlowImbalance(symbol, 10, 2.0);
      
      expect(result.direction).toBe('bullish');
      expect(result.imbalance).toBeGreaterThan(2);
    });

    it('should detect bearish order flow imbalance', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'buy',
          quantity: 1,
          timestamp: Date.now() + i * 10
        }));
      }
      for (let i = 0; i < 40; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'sell',
          quantity: 3,
          timestamp: Date.now() + 100 + i * 10
        }));
      }

      aggregator.flush();
      const result = aggregator.detectOrderFlowImbalance(symbol, 10, 2.0);
      
      expect(result.direction).toBe('bearish');
      expect(result.imbalance).toBeGreaterThan(2);
    });

    it('should detect absorption pattern', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 15; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'buy',
          quantity: 1,
          timestamp: Date.now() + i * 10
        }));
      }
      for (let i = 0; i < 15; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: 'sell',
          quantity: 10,
          timestamp: Date.now() + 150 + i * 10
        }));
      }

      aggregator.flush();
      const result = aggregator.detectOrderFlowImbalance(symbol, 10, 1.5);
      
      expect(result.absorptionDetected).toBe(true);
    });
  });

  describe('成交量轮廓分析', () => {
    it('should calculate volume profile correctly', () => {
      const symbol = 'BTCUSDT';
      const basePrice = 67500;
      
      for (let i = 0; i < 50; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          price: basePrice + Math.floor(i / 5) * 10,
          quantity: 1,
          timestamp: Date.now() + i * 10
        }));
      }

      aggregator.flush();
      const profile = aggregator.calculateVolumeProfile(symbol, 100, 10);
      
      expect(profile).toBeDefined();
      expect(profile.pocPrice).toBeDefined();
      expect(profile.valueAreaHigh).toBeDefined();
      expect(profile.valueAreaLow).toBeDefined();
      expect(profile.valueAreaHigh).toBeGreaterThan(profile.valueAreaLow);
    });

    it('should identify POC correctly', () => {
      const symbol = 'BTCUSDT';
      const highVolumePrice = 67550;
      
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          price: 67500 + i * 10,
          quantity: 1,
          timestamp: Date.now() + i * 10
        }));
      }
      
      for (let i = 0; i < 20; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          price: highVolumePrice,
          quantity: 1,
          timestamp: Date.now() + 100 + i * 10
        }));
      }

      aggregator.flush();
      const profile = aggregator.calculateVolumeProfile(symbol, 100, 10);
      
      expect(profile.pocPrice).toBe(highVolumePrice);
    });
  });

  describe('统计信息', () => {
    it('should return correct stats', () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 10; i++) {
        aggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          quantity: i + 1,
          timestamp: Date.now() + i * 10
        }));
      }

      aggregator.flush();
      const stats = aggregator.getStats(symbol);
      
      expect(stats).toBeDefined();
      expect(stats.totalTrades).toBe(10);
      expect(stats.buyVolume).toBeGreaterThan(0);
      expect(stats.sellVolume).toBeGreaterThanOrEqual(0);
    });
  });

  describe('批量处理', () => {
    it('should handle batch entries correctly', () => {
      const entries = Array.from({ length: 100 }, () => createMockOrderFlowEntry());
      
      aggregator.addEntries(entries);
      aggregator.flush();
      
      const stats = aggregator.getStats();
      expect(stats.totalTrades).toBe(100);
    });
  });

  describe('事件回调', () => {
    it('should emit aggregated data events', () => {
      const mockCallback = vi.fn();
      const unsubscribe = aggregator.on(mockCallback);
      
      aggregator.addEntry(createMockOrderFlowEntry());
      aggregator.flush();
      
      expect(mockCallback).toHaveBeenCalled();
      
      unsubscribe();
    });
  });
});
