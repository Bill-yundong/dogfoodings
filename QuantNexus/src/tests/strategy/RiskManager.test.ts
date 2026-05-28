import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskManager } from '../../strategy/RiskManager';
import { createMockKlineSeries, createMockOrderFlowEntry, createMockOrderBook } from '../test-utils';
import type { TradingSignal, Position } from '../../types';

describe('RiskManager - 风险管理系统', () => {
  let riskManager: RiskManager;

  beforeEach(() => {
    riskManager = new RiskManager(100000);
  });

  describe('基础功能测试', () => {
    it('should initialize with correct configuration', () => {
      const params = riskManager.getGlobalRiskParams();
      expect(params).toBeDefined();
      expect(params.maxPositionSize).toBeDefined();
      expect(params.maxDailyLoss).toBeDefined();
      expect(params.maxLeverage).toBeDefined();
    });

    it('should update global risk parameters', () => {
      const newParams = { maxPositionSize: 20, maxDailyLoss: 2000 };
      riskManager.setGlobalRiskParams(newParams);
      
      const params = riskManager.getGlobalRiskParams();
      expect(params.maxPositionSize).toBe(20);
      expect(params.maxDailyLoss).toBe(2000);
    });
  });

  describe('风险检查', () => {
    it('should validate trading signal with risk checks', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 1,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const orderBook = createMockOrderBook();
      const result = await riskManager.validateSignal(signal, orderBook, null);
      
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should reject oversized positions', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 1000,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const orderBook = createMockOrderBook();
      const result = await riskManager.validateSignal(signal, orderBook, null);
      
      expect(result.passed).toBe(false);
    });

    it('should reject signals when daily loss limit reached', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 1,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const params = riskManager.getGlobalRiskParams();
      riskManager.setGlobalRiskParams({ maxDailyLoss: 100 });
      
      for (let i = 0; i < 5; i++) {
        const testPosition: Position = {
          id: `pos-${i}`,
          symbol: 'BTCUSDT',
          side: 'long',
          entryPrice: 67500,
          quantity: 0.1,
          leverage: 10,
          marginUsed: 675,
          unrealizedPnL: -50,
          openTime: Date.now()
        };
        riskManager['positions'].set(testPosition.id, testPosition);
      }
      
      riskManager['portfolio'].dailyPnL = -500;
      riskManager['portfolio'].maxDailyLossReached = true;

      const orderBook = createMockOrderBook();
      const result = await riskManager.validateSignal(signal, orderBook, null);
      
      expect(result.passed).toBe(false);
      
      riskManager.setGlobalRiskParams(params);
    });

    it('should reject high leverage signals', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 10,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const orderBook = createMockOrderBook();
      const result = await riskManager.validateSignal(signal, orderBook, null);
      
      expect(result.passed).toBe(false);
    });
  });

  describe('持仓管理', () => {
    it('should open and retrieve positions', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'test',
        side: 'long',
        price: 67500,
        quantity: 0.1,
        confidence: 0.8,
        timestamp: Date.now(),
        stopLoss: 67000,
        takeProfit: 68000
      };

      const orderBook = createMockOrderBook();
      const riskCheck = await riskManager.validateSignal(signal, orderBook, null);
      const position = riskManager.openPosition(signal, riskCheck);
      
      expect(position).not.toBeNull();
      
      const positions = riskManager.getPositions();
      expect(positions.length).toBeGreaterThan(0);
    });

    it('should close position and calculate PnL', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 0.1,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const orderBook = createMockOrderBook();
      const riskCheck = await riskManager.validateSignal(signal, orderBook, null);
      const position = riskManager.openPosition(signal, riskCheck);
      
      expect(position).not.toBeNull();
      
      const closedPosition = riskManager.closePosition(position!.id, 68000);
      
      expect(closedPosition).not.toBeNull();
      expect(closedPosition!.realizedPnL).toBeGreaterThan(0);
      
      const positions = riskManager.getPositions();
      expect(positions.length).toBe(0);
    });

    it('should update position prices', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 0.1,
        confidence: 0.8,
        timestamp: Date.now()
      };

      const orderBook = createMockOrderBook();
      const riskCheck = await riskManager.validateSignal(signal, orderBook, null);
      const position = riskManager.openPosition(signal, riskCheck);
      
      expect(position).not.toBeNull();
      
      riskManager.updatePositionPrices('BTCUSDT', 68000);
      
      const positions = riskManager.getPositions();
      expect(positions[0].unrealizedPnL).toBeGreaterThan(0);
    });
  });

  describe('风险指标', () => {
    it('should calculate risk metrics', () => {
      const metrics = riskManager.getRiskMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalExposure).toBeDefined();
      expect(metrics.marginRatio).toBeDefined();
      expect(metrics.dailyPnL).toBeDefined();
      expect(metrics.riskLevel).toBeDefined();
    });

    it('should calculate correct risk level', () => {
      const level1 = riskManager.calculateRiskLevel();
      expect(level1).toBe('low');

      const portfolio = riskManager.getPortfolioState();
      riskManager['portfolio'].dailyPnL = -portfolio.equity * 0.05;
      
      const level2 = riskManager.calculateRiskLevel();
      expect(level2).toBe('high');
    });
  });

  describe('投资组合状态', () => {
    it('should return portfolio state with correct structure', () => {
      const state = riskManager.getPortfolioState();
      
      expect(state).toMatchObject({
        equity: expect.any(Number),
        availableBalance: expect.any(Number),
        usedMargin: expect.any(Number),
        unrealizedPnL: expect.any(Number),
        dailyPnL: expect.any(Number),
        marginRatio: expect.any(Number),
        maxDailyLossReached: expect.any(Boolean)
      });
    });
  });

  describe('止损止盈检查', () => {
    it('should detect stop loss trigger', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 0.1,
        confidence: 0.8,
        timestamp: Date.now(),
        stopLoss: 67000,
        takeProfit: 68000
      };

      const orderBook = createMockOrderBook();
      const riskCheck = await riskManager.validateSignal(signal, orderBook, null);
      riskManager.openPosition(signal, riskCheck);
      
      const triggers = riskManager.checkStopLossTakeProfit('BTCUSDT', 66900);
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers[0].type).toBe('stop_loss');
    });

    it('should detect take profit trigger', async () => {
      const signal: TradingSignal = {
        id: 'test-1',
        strategy: 'test',
        symbol: 'BTCUSDT',
        side: 'long',
        price: 67500,
        quantity: 0.1,
        confidence: 0.8,
        timestamp: Date.now(),
        stopLoss: 67000,
        takeProfit: 68000
      };

      const orderBook = createMockOrderBook();
      const riskCheck = await riskManager.validateSignal(signal, orderBook, null);
      riskManager.openPosition(signal, riskCheck);
      
      const triggers = riskManager.checkStopLossTakeProfit('BTCUSDT', 68100);
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers[0].type).toBe('take_profit');
    });
  });

  describe('整体验证', () => {
    it('should return risk metrics with all required fields', () => {
      const metrics = riskManager.getRiskMetrics();
      
      expect(metrics).toMatchObject({
        totalExposure: expect.any(Number),
        marginRatio: expect.any(Number),
        dailyPnL: expect.any(Number),
        positionCount: expect.any(Number),
        maxLeverage: expect.any(Number),
        riskLevel: expect.any(String)
      });
    });
  });
});
