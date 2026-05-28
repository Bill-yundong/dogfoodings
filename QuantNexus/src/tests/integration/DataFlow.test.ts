import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStore } from '../../storage/IndexedDBStore';
import { DataSyncHub } from '../../storage/DataSyncHub';
import { WebSocketClient } from '../../data/WebSocketClient';
import { OrderFlowAggregator } from '../../data/OrderFlowAggregator';
import { MarketDepthAnalyzer } from '../../analysis/MarketDepthAnalyzer';
import { LiquidationPressureEngine } from '../../analysis/LiquidationPressureEngine';
import { StrategyEngine } from '../../strategy/StrategyEngine';
import { RiskManager } from '../../strategy/RiskManager';
import { createMockKline, createMockOrderBook, createMockOrderFlowEntry, createMockKlineSeries } from '../test-utils';
import type { Timeframe, OrderFlowEntry } from '../../types';

describe('端到端数据流集成测试', () => {
  let dbStore: IndexedDBStore;
  let syncHub: DataSyncHub;
  let wsClient: WebSocketClient;
  let orderFlowAggregator: OrderFlowAggregator;
  let marketDepthAnalyzer: MarketDepthAnalyzer;
  let liquidationEngine: LiquidationPressureEngine;
  let strategyEngine: StrategyEngine;
  let riskManager: RiskManager;

  beforeEach(async () => {
    vi.useRealTimers();
    
    dbStore = new IndexedDBStore();
    await dbStore.init();
    
    syncHub = new DataSyncHub(dbStore);
    wsClient = new WebSocketClient({
      symbol: 'BTCUSDT',
      simulationMode: true,
      pingInterval: 30000
    });
    orderFlowAggregator = new OrderFlowAggregator();
    marketDepthAnalyzer = new MarketDepthAnalyzer();
    liquidationEngine = new LiquidationPressureEngine();
    strategyEngine = new StrategyEngine();
    riskManager = new RiskManager();
  });

  afterEach(async () => {
    wsClient.disconnectAll();
    await dbStore.close();
  });

  describe('完整数据流链路', () => {
    it('should process data from WebSocket to storage to analysis', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';

      await wsClient.connectAll();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const klineData: any[] = [];
      const orderBookData: any[] = [];
      const tradeData: OrderFlowEntry[] = [];

      wsClient.on('kline', (data: any) => klineData.push(data));
      wsClient.on('orderbook', (data: any) => orderBookData.push(data));
      wsClient.on('trades', (data: any) => tradeData.push(data));

      await new Promise(resolve => setTimeout(resolve, 500));

      const isConnected = wsClient.isConnected.get('kline');
      expect(isConnected).toBe(true);

      const latency = wsClient.getLatency('kline');
      expect(latency).toBeGreaterThanOrEqual(0);

      const mockKline = createMockKline({ time: Date.now() });
      await syncHub.syncKlineIncremental(symbol, timeframe, mockKline);

      const storedKlines = await dbStore.getKlines(symbol, timeframe, 0, Date.now(), 100);
      expect(storedKlines.length).toBeGreaterThan(0);

      const orderBook = createMockOrderBook();
      const depthAnalysis = marketDepthAnalyzer.analyze(orderBook);
      expect(depthAnalysis).toBeDefined();
      expect(depthAnalysis.supportLevels).toBeDefined();
      expect(depthAnalysis.resistanceLevels).toBeDefined();

      for (let i = 0; i < 20; i++) {
        orderFlowAggregator.addEntry(createMockOrderFlowEntry({ 
          timestamp: Date.now() + i * 10 
        }));
      }
      orderFlowAggregator.flush();
      
      const delta = orderFlowAggregator.calculateDeltaIndicator(symbol, 20);
      expect(delta).toBeDefined();
      expect(delta.cumulativeDelta).toBeDefined();
    });

    it('should maintain data consistency across modules', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const klines = createMockKlineSeries(100);

      for (const kline of klines) {
        await syncHub.syncKlineIncremental(symbol, timeframe, kline);
      }

      const consistencyResult = await syncHub.verifyDataConsistency(symbol, timeframe);
      expect(consistencyResult.isConsistent).toBe(true);

      const storedKlines = await dbStore.getKlines(symbol, timeframe, klines[0].time, klines[klines.length - 1].time, 100);
      expect(storedKlines.length).toBe(klines.length);

      for (let i = 0; i < storedKlines.length; i++) {
        expect(storedKlines[i].time).toBe(klines[i].time);
        expect(storedKlines[i].close).toBe(klines[i].close);
      }
    });
  });

  describe('策略与风控集成', () => {
    it('should generate trading signals through strategy engine', async () => {
      const klines = createMockKlineSeries(100);
      const orderBook = createMockOrderBook();
      const orderFlow = Array.from({ length: 50 }, () => createMockOrderFlowEntry());

      const signals = await strategyEngine.analyze(klines, orderBook, orderFlow);
      
      expect(Array.isArray(signals)).toBe(true);

      for (const signal of signals) {
        const validation = await riskManager.validateSignal(signal, orderBook, null);
        
        expect(validation).toBeDefined();
        expect(validation.passed).toBeDefined();

        if (validation.passed) {
          const metrics = riskManager.getRiskMetrics();
          expect(metrics).toBeDefined();
          expect(metrics.riskLevel).toBeDefined();
        }
      }
    });

    it('should block high-risk signals', async () => {
      const orderBook = createMockOrderBook();

      const highRiskSignal = {
        id: 'risky-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long' as const,
        price: 67500,
        quantity: 1000,
        confidence: 0.9,
        timestamp: Date.now()
      };

      const validation = await riskManager.validateSignal(highRiskSignal, orderBook, null);
      
      expect(validation.passed).toBe(false);
    });
  });

  describe('清算压力预测集成', () => {
    it('should integrate order book and liquidation data for pressure analysis', async () => {
      const symbol = 'BTCUSDT';
      const currentPrice = 67500;
      const orderBook = createMockOrderBook({ midPrice: currentPrice });
      
      const liquidations = Array.from({ length: 10 }, () => 
        createMockOrderFlowEntry({ type: 'liquidation', side: 'sell', quantity: 3 })
      );

      const pressure = await liquidationEngine.analyze(symbol, currentPrice, orderBook, liquidations);
      
      expect(pressure).toBeDefined();
      expect(pressure.pressureIndex).toBeGreaterThanOrEqual(0);
      expect(pressure.pressureIndex).toBeLessThanOrEqual(100);
      expect(pressure.liquidationLevels).toHaveLength(8);

      const cascadePrediction = liquidationEngine.predictLiquidationCascade(
        symbol,
        currentPrice,
        orderBook,
        300000
      );

      expect(cascadePrediction).toBeDefined();
      expect(cascadePrediction.cascadeProbability).toBeGreaterThanOrEqual(0);
      expect(cascadePrediction.cascadeProbability).toBeLessThanOrEqual(1);
    });
  });

  describe('订单流聚合集成', () => {
    it('should aggregate order flow and generate imbalance signals', async () => {
      const symbol = 'BTCUSDT';
      
      for (let i = 0; i < 100; i++) {
        orderFlowAggregator.addEntry(createMockOrderFlowEntry({
          symbol,
          side: i < 70 ? 'buy' : 'sell',
          quantity: i < 70 ? 3 : 1,
          timestamp: Date.now() + i * 10
        }));
      }

      orderFlowAggregator.flush();
      const imbalance = orderFlowAggregator.detectOrderFlowImbalance(symbol, 100, 1.5);
      
      expect(imbalance).toBeDefined();
      expect(imbalance.direction).toBe('bullish');
      expect(imbalance.imbalance).toBeGreaterThan(1.5);
      expect(imbalance.strength).toBeGreaterThan(0);

      const delta = orderFlowAggregator.calculateDeltaIndicator(symbol, 100);
      
      expect(delta.cumulativeDelta).toBeGreaterThan(0);
      expect(delta.smoothedDelta).toBeDefined();
    });
  });

  describe('并发数据处理', () => {
    it('should handle concurrent data streams without corruption', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      
      const klinePromises: Promise<void>[] = [];
      const orderFlowPromises: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        const kline = createMockKline({ time: Date.now() + i * 1000 });
        klinePromises.push(syncHub.syncKlineIncremental(symbol, timeframe, kline));
        
        const entry = createMockOrderFlowEntry();
        orderFlowAggregator.addEntry(entry);
      }

      await Promise.all([...klinePromises, ...orderFlowPromises]);

      const storedKlines = await dbStore.getKlines(symbol, timeframe, 0, Date.now() + 60000, 100);
      expect(storedKlines.length).toBeGreaterThan(0);

      const consistency = await syncHub.verifyDataConsistency(symbol, timeframe);
      expect(consistency.isConsistent).toBe(true);

      const delta = orderFlowAggregator.calculateDeltaIndicator(symbol, 50);
      expect(delta).toBeDefined();
    });
  });

  describe('增量同步验证', () => {
    it('should handle incremental kline updates correctly', async () => {
      const symbol = 'BTCUSDT';
      const timeframe: Timeframe = '1s';
      const baseTime = Date.now();

      const kline1 = createMockKline({ time: baseTime, close: 67500 });
      const kline2 = createMockKline({ time: baseTime, close: 67550 });
      const kline3 = createMockKline({ time: baseTime + 1000, close: 67600 });

      await syncHub.syncKlineIncremental(symbol, timeframe, kline1);
      await syncHub.syncKlineIncremental(symbol, timeframe, kline2);
      await syncHub.syncKlineIncremental(symbol, timeframe, kline3);

      const stored = await dbStore.getKlines(symbol, timeframe, baseTime - 1000, baseTime + 2000, 10);
      
      expect(stored.length).toBe(2);
      expect(stored[0].time).toBe(baseTime);
      expect(stored[0].close).toBe(67550);
      expect(stored[1].time).toBe(baseTime + 1000);
      expect(stored[1].close).toBe(67600);
    });
  });
});
