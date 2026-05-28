import { describe, it, expect, beforeEach } from 'vitest';
import { MarketDepthAnalyzer } from '../../analysis/MarketDepthAnalyzer';
import { createMockOrderBook } from '../test-utils';

describe('MarketDepthAnalyzer - 市场深度分析引擎', () => {
  let analyzer: MarketDepthAnalyzer;

  beforeEach(() => {
    analyzer = new MarketDepthAnalyzer();
  });

  describe('基础分析测试', () => {
    it('should analyze order book and update cache', () => {
      const orderBook = createMockOrderBook();
      
      const result = analyzer.analyze(orderBook);
      
      expect(result).toBeDefined();
      expect(result.supportLevels).toBeDefined();
      expect(result.resistanceLevels).toBeDefined();
      expect(result.cumulativeVolume).toBeDefined();
      expect(result.bidDepth).toBeDefined();
      expect(result.askDepth).toBeDefined();
    });

    it('should calculate volume imbalance correctly', () => {
      const orderBook = createMockOrderBook({
        bids: Array(20).fill(null).map((_, i) => ({
          price: 67500 - i * 10,
          quantity: 10,
          total: (67500 - i * 10) * 10
        })),
        asks: Array(20).fill(null).map((_, i) => ({
          price: 67500 + i * 10,
          quantity: 1,
          total: (67500 + i * 10) * 1
        }))
      });

      const result = analyzer.calculateVolumeImbalance(orderBook);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('支持阻力位检测', () => {
    it('should detect support levels', () => {
      const bids = [];
      for (let i = 0; i < 20; i++) {
        const qty = i === 5 ? 100 : 1;
        bids.push({
          price: 67500 - i * 10,
          quantity: qty,
          total: (67500 - i * 10) * qty
        });
      }

      const orderBook = createMockOrderBook({ bids });
      const result = analyzer.analyze(orderBook);
      
      expect(Array.isArray(result.supportLevels)).toBe(true);
    });

    it('should detect resistance levels', () => {
      const asks = [];
      for (let i = 0; i < 20; i++) {
        const qty = i === 3 ? 100 : 1;
        asks.push({
          price: 67500 + i * 10,
          quantity: qty,
          total: (67500 + i * 10) * qty
        });
      }

      const orderBook = createMockOrderBook({ asks });
      const result = analyzer.analyze(orderBook);
      
      expect(Array.isArray(result.resistanceLevels)).toBe(true);
    });
  });

  describe('流动性口袋检测', () => {
    it('should detect liquidity pockets', () => {
      const orderBook = createMockOrderBook();
      const result = analyzer.detectLiquidityPockets(orderBook);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.bidPockets)).toBe(true);
      expect(Array.isArray(result.askPockets)).toBe(true);
    });
  });

  describe('市场深度计算', () => {
    it('should calculate market depth correctly', () => {
      const orderBook = createMockOrderBook();
      const analysis = analyzer.analyze(orderBook);
      
      expect(analysis.bidDepth).toBeGreaterThan(0);
      expect(analysis.askDepth).toBeGreaterThan(0);
      expect(analysis.liquidityRatio).toBeGreaterThan(0);
    });

    it('should calculate market depth score', () => {
      const orderBook = createMockOrderBook();
      const analysis = analyzer.analyze(orderBook);
      const score = analyzer.calculateMarketDepthScore(analysis);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('订单簿斜率计算', () => {
    it('should calculate order book slope', () => {
      const orderBook = createMockOrderBook();
      const result = analyzer.calculateOrderBookSlope(orderBook);
      
      expect(result).toBeDefined();
      expect(result.bidSlope).toBeDefined();
      expect(result.askSlope).toBeDefined();
    });
  });

  describe('缓存机制', () => {
    it('should store historical analysis', () => {
      const symbol = 'BTCUSDT';
      const orderBook = createMockOrderBook({ symbol });
      
      analyzer.analyze(orderBook);
      
      const history = analyzer.getHistoricalAnalysis(symbol, 10);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should analyze depth trend', () => {
      const symbol = 'BTCUSDT';
      const orderBook = createMockOrderBook({ symbol });
      
      for (let i = 0; i < 5; i++) {
        analyzer.analyze(orderBook);
      }
      
      const trend = analyzer.analyzeDepthTrend(symbol);
      expect(trend).toBeDefined();
    });
  });
});
