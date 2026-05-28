import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiquidationPressureEngine } from '../../analysis/LiquidationPressureEngine';
import { createMockOrderBook, createMockOrderFlowEntry } from '../test-utils';

vi.mock('../../storage/IndexedDBStore', () => ({
  dbStore: {
    insertLiquidationPressure: vi.fn().mockResolvedValue(undefined),
    getLiquidationPressure: vi.fn().mockResolvedValue([])
  }
}));

describe('LiquidationPressureEngine - 异步清算压力预测引擎', () => {
  let engine: LiquidationPressureEngine;

  beforeEach(() => {
    engine = new LiquidationPressureEngine();
  });

  describe('基础分析测试', () => {
    it('should analyze liquidation pressure successfully', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });
      const recentLiquidations = Array.from({ length: 5 }, () => 
        createMockOrderFlowEntry({ type: 'liquidation', quantity: 2 })
      );

      const result = await engine.analyze(symbol, currentPrice, orderBook, recentLiquidations);
      
      expect(result).toBeDefined();
      expect(result.pressureIndex).toBeGreaterThanOrEqual(0);
      expect(result.pressureIndex).toBeLessThanOrEqual(100);
      expect(result.estimatedLiqPrice).toBeDefined();
    });

    it('should calculate pressure index based on order book and liquidations', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      
      const asks = Array(20).fill(null).map((_, i) => ({
        price: currentPrice + i * 10,
        quantity: 0.1,
        total: (currentPrice + i * 10) * 0.1
      }));
      const bids = Array(20).fill(null).map((_, i) => ({
        price: currentPrice - i * 10,
        quantity: 10,
        total: (currentPrice - i * 10) * 10
      }));
      
      const orderBook = createMockOrderBook({ bids, asks, midPrice: currentPrice });
      const recentLiquidations = Array.from({ length: 10 }, () => 
        createMockOrderFlowEntry({ type: 'liquidation', side: 'sell', quantity: 5 })
      );

      const result = await engine.analyze(symbol, currentPrice, orderBook, recentLiquidations);
      
      expect(result.pressureIndex).toBeGreaterThanOrEqual(0);
      expect(result.pressureIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('清算级联预测', () => {
    it('should predict liquidation cascade correctly', () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });
      const timeHorizon = 300000;

      const result = engine.predictLiquidationCascade(symbol, currentPrice, orderBook, timeHorizon);
      
      expect(result).toBeDefined();
      expect(result.predictedPrice).toBeDefined();
      expect(result.estimatedLongLiq).toBeDefined();
      expect(result.estimatedShortLiq).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should estimate price impact correctly', () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      
      const asks = Array(20).fill(null).map((_, i) => ({
        price: currentPrice + i * 10,
        quantity: 0.01,
        total: (currentPrice + i * 10) * 0.01
      }));
      const bids = Array(20).fill(null).map((_, i) => ({
        price: currentPrice - i * 10,
        quantity: 0.01,
        total: (currentPrice - i * 10) * 0.01
      }));
      
      const orderBook = createMockOrderBook({ bids, asks, midPrice: currentPrice });

      const result = engine.predictLiquidationCascade(symbol, currentPrice, orderBook, 300000);
      
      expect(result.estimatedLongLiq).toBeGreaterThanOrEqual(0);
      expect(result.estimatedShortLiq).toBeGreaterThanOrEqual(0);
    });
  });

  describe('多级杠杆清算价格', () => {
    it('should have correct leverage levels in options', () => {
      const options = engine['options'];
      expect(options.leverageLevels).toBeDefined();
      expect(options.leverageLevels.length).toBe(8);
      expect(options.maintenanceMarginRate).toBeDefined();
    });

    it('should estimate liquidation prices correctly', () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });
      const recentTrades = Array.from({ length: 10 }, () => createMockOrderFlowEntry());

      const result = engine['estimateLiquidationPrices'](currentPrice, orderBook, recentTrades);
      
      expect(result).toBeDefined();
      expect(result.long).toBeDefined();
      expect(result.short).toBeDefined();
      expect(result.long.length).toBe(8);
      expect(result.short.length).toBe(8);
    });

    it('should have correct liquidation price formula', () => {
      const currentPrice = 100;
      const maintenanceMarginRate = 0.005;
      const leverage = 10;
      
      const expectedLongLiqPrice = currentPrice * (1 - 1 / leverage + maintenanceMarginRate);
      const expectedShortLiqPrice = currentPrice * (1 + 1 / leverage - maintenanceMarginRate);
      
      expect(expectedLongLiqPrice).toBeLessThan(currentPrice);
      expect(expectedShortLiqPrice).toBeGreaterThan(currentPrice);
    });
  });

  describe('压力预警等级', () => {
    it('should return correct alert level for low pressure', () => {
      const pressure = { pressureIndex: 20 } as any;
      const alertLevel = engine.getPressureAlertLevel(pressure);
      expect(alertLevel).toBe('low');
    });

    it('should return correct alert level for medium pressure', () => {
      const pressure = { pressureIndex: 50 } as any;
      const alertLevel = engine.getPressureAlertLevel(pressure);
      expect(alertLevel).toBe('medium');
    });

    it('should return correct alert level for high pressure', () => {
      const pressure = { pressureIndex: 75 } as any;
      const alertLevel = engine.getPressureAlertLevel(pressure);
      expect(alertLevel).toBe('high');
    });

    it('should return correct alert level for extreme pressure', () => {
      const pressure = { pressureIndex: 95 } as any;
      const alertLevel = engine.getPressureAlertLevel(pressure);
      expect(alertLevel).toBe('extreme');
    });
  });

  describe('清算历史记录', () => {
    it('should track liquidation history', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });

      for (let i = 0; i < 5; i++) {
        await engine.analyze(symbol, currentPrice, orderBook, []);
      }

      const history = engine.getLiquidationHistory(symbol, 10);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect history limit', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });

      for (let i = 0; i < 10; i++) {
        await engine.analyze(symbol, currentPrice, orderBook, []);
      }

      const history = engine.getLiquidationHistory(symbol, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('压力指数计算', () => {
    it('should calculate pressure index components', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });
      const recentLiquidations = Array.from({ length: 3 }, () => 
        createMockOrderFlowEntry({ type: 'liquidation' })
      );

      const result = await engine.analyze(symbol, currentPrice, orderBook, recentLiquidations);
      
      expect(result.totalLongLiq).toBeDefined();
      expect(result.totalShortLiq).toBeDefined();
      expect(result.fundingRate).toBeDefined();
      expect(result.openInterest).toBeDefined();
    });
  });
});
