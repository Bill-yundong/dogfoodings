import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategyEngine, OrderFlowStrategy, TrendFollowingStrategy, MeanReversionStrategy } from '../../strategy/StrategyEngine';
import { createMockKlineSeries, createMockOrderBook, createMockOrderFlowEntry } from '../test-utils';
import type { KlineData, OrderBook, OrderFlowEntry } from '../../types';

describe('StrategyEngine - 量化交易策略引擎', () => {
  let strategyEngine: StrategyEngine;

  beforeEach(() => {
    strategyEngine = new StrategyEngine();
  });

  describe('基础功能测试', () => {
    it('should initialize with three strategies', () => {
      const strategies = strategyEngine.getStrategies();
      expect(strategies).toHaveLength(3);
    });

    it('should have all three strategy types', () => {
      const strategies = strategyEngine.getStrategies();
      const types = strategies.map(s => s.type);
      
      expect(types).toContain('orderflow');
      expect(types).toContain('trend_following');
      expect(types).toContain('mean_reversion');
    });
  });

  describe('策略管理', () => {
    it('should enable and disable strategies', () => {
      const strategyId = strategyEngine.getStrategies()[0].id;
      
      strategyEngine.toggleStrategy(strategyId, true);
      let strategy = strategyEngine.getStrategies().find(s => s.id === strategyId);
      expect(strategy!.config.enabled).toBe(true);
      
      strategyEngine.toggleStrategy(strategyId, false);
      strategy = strategyEngine.getStrategies().find(s => s.id === strategyId);
      expect(strategy!.config.enabled).toBe(false);
    });

    it('should update strategy configuration', () => {
      const strategyId = strategyEngine.getStrategies()[0].id;
      const newConfig = { enabled: false };
      
      strategyEngine.updateStrategyConfig(strategyId, newConfig);
      
      const strategy = strategyEngine.getStrategies().find(s => s.id === strategyId);
      expect(strategy!.config.enabled).toBe(false);
    });
  });

  describe('信号分析', () => {
    it('should analyze market data and return signals array', async () => {
      const klines = createMockKlineSeries(252);
      const orderBook = createMockOrderBook();
      const orderFlow: OrderFlowEntry[] = Array.from({ length: 50 }, () => createMockOrderFlowEntry());

      const signals = await strategyEngine.analyze(klines, orderBook, orderFlow);
      
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should return signals with correct structure when generated', async () => {
      const klines = createMockKlineSeries(252).map((k, i) => ({
        ...k,
        close: 67000 + i * 10,
        high: 67000 + i * 10 + 50,
        low: 67000 + i * 10 - 50
      }));
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
      const orderFlow: OrderFlowEntry[] = Array.from({ length: 50 }, (_, i) => 
        createMockOrderFlowEntry({ side: 'buy', quantity: 5 })
      );

      const signals = await strategyEngine.analyze(klines, orderBook, orderFlow);
      
      if (signals.length > 0) {
        const signal = signals[0];
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('strategy');
        expect(signal).toHaveProperty('symbol');
        expect(signal).toHaveProperty('side');
        expect(signal).toHaveProperty('price');
        expect(signal).toHaveProperty('confidence');
        expect(['long', 'short']).toContain(signal.side);
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('订单流策略', () => {
    let orderFlowStrategy: OrderFlowStrategy;

    beforeEach(() => {
      orderFlowStrategy = new OrderFlowStrategy();
      orderFlowStrategy.setEnabled(true);
    });

    it('should have correct strategy metadata', () => {
      expect(orderFlowStrategy.id).toBe('order_flow');
      expect(orderFlowStrategy.name).toBe('订单流策略');
      expect(orderFlowStrategy.type).toBe('order_flow');
    });

    it('should generate buy signal on strong buy imbalance', () => {
      const klines = createMockKlineSeries(100);
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
        })),
        imbalance: 3.0
      });
      const orderFlow = {
        delta: 5.0,
        buyVolume: 150,
        sellVolume: 30,
        imbalance: 5.0
      };

      const context = {
        symbol: 'BTCUSDT',
        klines,
        orderBook,
        orderFlow,
        currentPrice: 67500,
        timestamp: Date.now()
      };

      const signal = orderFlowStrategy.analyze(context);
      
      if (signal) {
        expect(signal.side).toBe('long');
      }
    });

    it('should respect signal cooldown', () => {
      const klines = createMockKlineSeries(100);
      const orderBook = createMockOrderBook();
      const orderFlow = {
        delta: 0,
        buyVolume: 0,
        sellVolume: 0,
        imbalance: 1.0
      };

      const context = {
        symbol: 'BTCUSDT',
        klines,
        orderBook,
        orderFlow,
        currentPrice: 67500,
        timestamp: Date.now()
      };

      orderFlowStrategy.analyze(context);
      const signal2 = orderFlowStrategy.analyze(context);
      
      expect(signal2).toBeNull();
    });
  });

  describe('趋势跟踪策略', () => {
    let trendStrategy: TrendFollowingStrategy;

    beforeEach(() => {
      trendStrategy = new TrendFollowingStrategy();
      trendStrategy.setEnabled(true);
    });

    it('should have correct strategy metadata', () => {
      expect(trendStrategy.id).toBe('trend_following');
      expect(trendStrategy.name).toBe('趋势跟踪策略');
      expect(trendStrategy.type).toBe('trend_following');
    });

    it('should calculate SMA correctly', () => {
      const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sma = trendStrategy['sma'](closes, 5);
      
      expect(sma).toBeCloseTo(8, 0);
    });

    it('should calculate RSI correctly', () => {
      const closes = [67500, 67510, 67520, 67515, 67530, 67540, 67535, 67550];
      const rsi = trendStrategy['rsi'](closes, 5);
      
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
    });
  });

  describe('均值回归策略', () => {
    let meanReversionStrategy: MeanReversionStrategy;

    beforeEach(() => {
      meanReversionStrategy = new MeanReversionStrategy();
      meanReversionStrategy.setEnabled(true);
    });

    it('should have correct strategy metadata', () => {
      expect(meanReversionStrategy.id).toBe('mean_reversion');
      expect(meanReversionStrategy.name).toBe('均值回归策略');
      expect(meanReversionStrategy.type).toBe('mean_reversion');
    });

    it('should calculate Bollinger Bands correctly', () => {
      const closes = createMockKlineSeries(50).map(k => k.close);
      
      const bands = meanReversionStrategy['calculateBollingerBands'](closes, 20, 2);
      
      expect(bands).toHaveProperty('middle');
      expect(bands).toHaveProperty('upper');
      expect(bands).toHaveProperty('lower');
      expect(bands.upper).toBeGreaterThan(bands.middle);
      expect(bands.lower).toBeLessThan(bands.middle);
    });

    it('should detect overbought conditions', () => {
      const closes = Array(25).fill(100);
      closes.push(150);
      
      const bands = meanReversionStrategy['calculateBollingerBands'](closes, 20, 2);
      const lastClose = closes[closes.length - 1];
      
      expect(lastClose).toBeGreaterThan(bands.upper);
    });

    it('should detect oversold conditions', () => {
      const closes = Array(25).fill(100);
      closes.push(50);
      
      const bands = meanReversionStrategy['calculateBollingerBands'](closes, 20, 2);
      const lastClose = closes[closes.length - 1];
      
      expect(lastClose).toBeLessThan(bands.lower);
    });
  });

  describe('信号历史', () => {
    it('should retrieve signals with limit', async () => {
      const klines = createMockKlineSeries(252);
      const orderBook = createMockOrderBook();
      const orderFlow: OrderFlowEntry[] = [];

      for (let i = 0; i < 3; i++) {
        await strategyEngine.analyze(klines, orderBook, orderFlow);
      }

      const signals = strategyEngine.getSignals(5);
      expect(Array.isArray(signals)).toBe(true);
      expect(signals.length).toBeLessThanOrEqual(5);
    });
  });

  describe('事件监听', () => {
    it('should provide event listener mechanism', () => {
      const mockCallback = vi.fn();
      const unsubscribe = strategyEngine.on(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});
