import * as math from 'mathjs';
import type {
  TradingSignal,
  StrategyConfig,
  KlineData,
  OrderBook,
  AggregatedOrderFlow,
  LiquidationPressure,
  MarketDepthAnalysis
} from '../types';
import { dbStore } from '../storage/IndexedDBStore';

export interface StrategyContext {
  symbol: string;
  klines: KlineData[];
  orderBook: OrderBook | null;
  orderFlow: AggregatedOrderFlow | null;
  liquidationPressure: LiquidationPressure | null;
  marketDepth: MarketDepthAnalysis | null;
  currentPrice: number;
}

export type SignalCallback = (signal: TradingSignal) => void;

export abstract class BaseStrategy {
  protected config: StrategyConfig;
  protected lastSignalTime: number = 0;
  protected signalCooldown: number = 60000;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: StrategyConfig['type'],
    config: Partial<StrategyConfig> = {}
  ) {
    this.config = {
      id,
      name,
      type,
      enabled: true,
      parameters: {},
      riskParams: {
        maxPositionSize: 1.0,
        maxDailyLoss: 0.05,
        maxLeverage: 5,
        positionMarginRatio: 0.1,
        stopLossDistance: 0.02,
        takeProfitRatio: 0.04
      },
      ...config
    };
  }

  abstract analyze(context: StrategyContext): TradingSignal | null;

  protected canGenerateSignal(): boolean {
    return Date.now() - this.lastSignalTime >= this.signalCooldown;
  }

  protected createSignal(
    context: StrategyContext,
    type: TradingSignal['type'],
    strength: number,
    confidence: number,
    reason: string
  ): TradingSignal {
    const { currentPrice } = context;
    const { riskParams } = this.config;

    const entryPrice = currentPrice;
    const stopLoss = type === 'long'
      ? entryPrice * (1 - riskParams.stopLossDistance)
      : entryPrice * (1 + riskParams.stopLossDistance);
    const takeProfit = type === 'long'
      ? entryPrice * (1 + riskParams.takeProfitRatio)
      : entryPrice * (1 - riskParams.takeProfitRatio);

    this.lastSignalTime = Date.now();

    return {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      symbol: context.symbol,
      type,
      strength,
      confidence,
      reason,
      entryPrice,
      stopLoss,
      takeProfit
    };
  }

  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

export class OrderFlowStrategy extends BaseStrategy {
  constructor() {
    super('order_flow', '订单流策略', 'order_flow', {
      parameters: {
        deltaThreshold: 2.0,
        imbalanceThreshold: 1.5,
        absorptionLookback: 10,
        minConfidence: 0.6
      }
    });
  }

  analyze(context: StrategyContext): TradingSignal | null {
    if (!this.isEnabled() || !this.canGenerateSignal()) return null;
    if (!context.orderFlow || !context.orderBook) return null;

    const { deltaThreshold, imbalanceThreshold, minConfidence } = this.config.parameters;
    const { orderFlow, orderBook, currentPrice, symbol } = context;

    const deltaStrength = Math.abs(orderFlow.delta) /
      Math.max(orderFlow.buyVolume + orderFlow.sellVolume, 0.0001);
    const imbalance = orderFlow.buyVolume / Math.max(orderFlow.sellVolume, 0.0001);

    let confidence = 0;
    let signalType: TradingSignal['type'] | null = null;
    let strength = 0;
    const reasons: string[] = [];

    if (orderFlow.delta > deltaThreshold && imbalance > imbalanceThreshold) {
      signalType = 'long';
      confidence = Math.min(deltaStrength * 0.4 + (imbalance / 3) * 0.3 +
        (orderBook.imbalance > 0 ? orderBook.imbalance : 0) * 0.3, 1);
      strength = Math.min(deltaStrength * 100, 100);
      reasons.push(`强正向Delta: ${orderFlow.delta.toFixed(2)}`);
      reasons.push(`买盘失衡: ${imbalance.toFixed(2)}x`);
    } else if (orderFlow.delta < -deltaThreshold && imbalance < 1 / imbalanceThreshold) {
      signalType = 'short';
      confidence = Math.min(deltaStrength * 0.4 + (1 / imbalance / 3) * 0.3 +
        (orderBook.imbalance < 0 ? Math.abs(orderBook.imbalance) : 0) * 0.3, 1);
      strength = Math.min(deltaStrength * 100, 100);
      reasons.push(`强负向Delta: ${orderFlow.delta.toFixed(2)}`);
      reasons.push(`卖盘失衡: ${(1 / imbalance).toFixed(2)}x`);
    }

    if (context.liquidationPressure) {
      const liqPressure = context.liquidationPressure.pressureIndex;
      if (liqPressure > 70 && signalType === 'short') {
        confidence += 0.1;
        reasons.push(`高清算压力: ${liqPressure.toFixed(1)}`);
      } else if (liqPressure < 30 && signalType === 'long') {
        confidence += 0.1;
        reasons.push(`低清算压力: ${liqPressure.toFixed(1)}`);
      }
    }

    if (signalType && confidence >= minConfidence) {
      return this.createSignal(
        context,
        signalType,
        strength,
        confidence,
        reasons.join(' | ')
      );
    }

    return null;
  }
}

export class TrendFollowingStrategy extends BaseStrategy {
  constructor() {
    super('trend_following', '趋势跟踪策略', 'trend_following', {
      parameters: {
        fastMA: 20,
        slowMA: 50,
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        trendStrength: 0.01
      }
    });
  }

  analyze(context: StrategyContext): TradingSignal | null {
    if (!this.isEnabled() || !this.canGenerateSignal()) return null;
    if (context.klines.length < 100) return null;

    const { fastMA, slowMA, rsiPeriod, rsiOverbought, rsiOversold, trendStrength } = this.config.parameters;
    const { klines, currentPrice, symbol } = context;

    const closes = klines.map(k => k.close);
    
    const fastMaValue = this.sma(closes, fastMA);
    const slowMaValue = this.sma(closes, slowMA);
    const rsiValue = this.rsi(closes, rsiPeriod);

    const momentum = (currentPrice - klines[klines.length - slowMA].close) / klines[klines.length - slowMA].close;

    let confidence = 0;
    let signalType: TradingSignal['type'] | null = null;
    let strength = 0;
    const reasons: string[] = [];

    if (fastMaValue > slowMaValue && rsiValue < rsiOversold && momentum > trendStrength) {
      signalType = 'long';
      const maStrength = (fastMaValue - slowMaValue) / slowMaValue * 100;
      const rsiStrength = (rsiOversold - rsiValue) / rsiOversold;
      confidence = Math.min(0.3 + maStrength * 0.3 + rsiStrength * 0.4, 1);
      strength = Math.min(Math.abs(momentum) * 1000, 100);
      reasons.push(`金叉: MA${fastMA}(${fastMaValue.toFixed(2)}) > MA${slowMA}(${slowMaValue.toFixed(2)})`);
      reasons.push(`超卖RSI: ${rsiValue.toFixed(1)}`);
    } else if (fastMaValue < slowMaValue && rsiValue > rsiOverbought && momentum < -trendStrength) {
      signalType = 'short';
      const maStrength = (slowMaValue - fastMaValue) / slowMaValue * 100;
      const rsiStrength = (rsiValue - rsiOverbought) / (100 - rsiOverbought);
      confidence = Math.min(0.3 + maStrength * 0.3 + rsiStrength * 0.4, 1);
      strength = Math.min(Math.abs(momentum) * 1000, 100);
      reasons.push(`死叉: MA${fastMA}(${fastMaValue.toFixed(2)}) < MA${slowMA}(${slowMaValue.toFixed(2)})`);
      reasons.push(`超买RSI: ${rsiValue.toFixed(1)}`);
    }

    if (signalType && confidence >= 0.5) {
      return this.createSignal(
        context,
        signalType,
        strength,
        confidence,
        reasons.join(' | ')
      );
    }

    return null;
  }

  private sma(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return math.mean(slice) as unknown as number;
  }

  private rsi(data: number[], period: number): number {
    if (data.length < period + 1) return 50;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    
    const avgGain = gains.length > 0 ? (math.mean(gains) as unknown as number) : 0;
    const avgLoss = losses.length > 0 ? (math.mean(losses) as unknown as number) : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

export class MeanReversionStrategy extends BaseStrategy {
  constructor() {
    super('mean_reversion', '均值回归策略', 'mean_reversion', {
      parameters: {
        bollingerPeriod: 20,
        stdDev: 2.0,
        minDeviation: 0.01,
        rsiPeriod: 14
      }
    });
  }

  analyze(context: StrategyContext): TradingSignal | null {
    if (!this.isEnabled() || !this.canGenerateSignal()) return null;
    if (context.klines.length < 50) return null;

    const { bollingerPeriod, stdDev, minDeviation, rsiPeriod } = this.config.parameters;
    const { klines, currentPrice } = context;

    const closes = klines.map(k => k.close);
    const { upperBand, middleBand, lowerBand } = this.bollingerBands(closes, bollingerPeriod, stdDev);
    const rsiValue = this.rsi(closes, rsiPeriod);

    const priceDeviation = (currentPrice - middleBand) / middleBand;

    let confidence = 0;
    let signalType: TradingSignal['type'] | null = null;
    let strength = 0;
    const reasons: string[] = [];

    if (currentPrice <= lowerBand && rsiValue < 30 && priceDeviation < -minDeviation) {
      signalType = 'long';
      const deviationStrength = Math.abs(priceDeviation) / minDeviation;
      const rsiStrength = (30 - rsiValue) / 30;
      confidence = Math.min(0.4 + deviationStrength * 0.3 + rsiStrength * 0.3, 1);
      strength = Math.min(deviationStrength * 50, 100);
      reasons.push(`触及下轨: ${currentPrice.toFixed(2)} <= ${lowerBand.toFixed(2)}`);
      reasons.push(`偏离度: ${(priceDeviation * 100).toFixed(2)}%`);
      reasons.push(`RSI: ${rsiValue.toFixed(1)}`);
    } else if (currentPrice >= upperBand && rsiValue > 70 && priceDeviation > minDeviation) {
      signalType = 'short';
      const deviationStrength = priceDeviation / minDeviation;
      const rsiStrength = (rsiValue - 70) / 30;
      confidence = Math.min(0.4 + deviationStrength * 0.3 + rsiStrength * 0.3, 1);
      strength = Math.min(deviationStrength * 50, 100);
      reasons.push(`触及上轨: ${currentPrice.toFixed(2)} >= ${upperBand.toFixed(2)}`);
      reasons.push(`偏离度: ${(priceDeviation * 100).toFixed(2)}%`);
      reasons.push(`RSI: ${rsiValue.toFixed(1)}`);
    }

    if (signalType && confidence >= 0.5) {
      return this.createSignal(
        context,
        signalType,
        strength,
        confidence,
        reasons.join(' | ')
      );
    }

    return null;
  }

  private bollingerBands(data: number[], period: number, std: number): {
    upperBand: number;
    middleBand: number;
    lowerBand: number;
  } {
    if (data.length < period) {
      const last = data[data.length - 1];
      return { upperBand: last, middleBand: last, lowerBand: last };
    }
    
    const slice = data.slice(-period);
    const middleBand = math.mean(slice) as unknown as number;
    const standardDev = math.std(slice) as unknown as number;
    
    return {
      upperBand: middleBand + standardDev * std,
      middleBand,
      lowerBand: middleBand - standardDev * std
    };
  }

  private rsi(data: number[], period: number): number {
    if (data.length < period + 1) return 50;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    
    const avgGain = gains.length > 0 ? math.mean(gains) as number : 0;
    const avgLoss = losses.length > 0 ? math.mean(losses) as number : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

export class StrategyEngine {
  private strategies: Map<string, BaseStrategy> = new Map();
  private signals: TradingSignal[] = [];
  private callbacks: Set<SignalCallback> = new Set();
  private maxSignalHistory: number = 100;

  constructor() {
    this.registerStrategy(new OrderFlowStrategy());
    this.registerStrategy(new TrendFollowingStrategy());
    this.registerStrategy(new MeanReversionStrategy());
  }

  registerStrategy(strategy: BaseStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  unregisterStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  getStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values()).map(s => s.getConfig());
  }

  getStrategy(strategyId: string): BaseStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  async analyze(context: StrategyContext): Promise<TradingSignal[]> {
    const generatedSignals: TradingSignal[] = [];

    for (const strategy of this.strategies.values()) {
      if (!strategy.isEnabled()) continue;

      try {
        const signal = strategy.analyze(context);
        if (signal) {
          generatedSignals.push(signal);
          this.addSignal(signal);
        }
      } catch (e) {
        console.error(`[Strategy] 策略 ${strategy.id} 执行错误:`, e);
      }
    }

    return generatedSignals;
  }

  private addSignal(signal: TradingSignal): void {
    this.signals.unshift(signal);
    if (this.signals.length > this.maxSignalHistory) {
      this.signals.pop();
    }
    this.emit(signal);
  }

  getSignals(limit: number = 20): TradingSignal[] {
    return this.signals.slice(0, limit);
  }

  on(callback: SignalCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private emit(signal: TradingSignal): void {
    this.callbacks.forEach(cb => {
      try {
        cb(signal);
      } catch (e) {
        console.error('[Strategy] 信号回调错误:', e);
      }
    });
  }

  toggleStrategy(strategyId: string, enabled: boolean): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.setEnabled(enabled);
    }
  }

  updateStrategyConfig(strategyId: string, config: Partial<StrategyConfig>): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.setConfig(config);
    }
  }

  async buildContext(
    symbol: string,
    orderBook: OrderBook | null,
    orderFlow: AggregatedOrderFlow | null,
    liquidationPressure: LiquidationPressure | null,
    marketDepth: MarketDepthAnalysis | null
  ): Promise<StrategyContext> {
    const klines = await dbStore.getKlines(symbol, '1m', Date.now() - 86400000, undefined, 500);
    const currentPrice = orderBook?.midPrice || klines[klines.length - 1]?.close || 0;

    return {
      symbol,
      klines,
      orderBook,
      orderFlow,
      liquidationPressure,
      marketDepth,
      currentPrice
    };
  }
}

export const strategyEngine = new StrategyEngine();
