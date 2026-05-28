import * as math from 'mathjs';
import type { LiquidationPressure, OrderBook, OrderFlowEntry, KlineData } from '../types';
import { dbStore } from '../storage/IndexedDBStore';

export interface LiquidationEngineOptions {
  leverageLevels: number[];
  liquidationThreshold: number;
  maintenanceMarginRate: number;
  predictionWindow: number;
  decayFactor: number;
}

export interface LiquidationPrediction {
  timestamp: number;
  predictedPrice: number;
  estimatedLongLiq: number;
  estimatedShortLiq: number;
  confidence: number;
  timeHorizon: number;
}

export class LiquidationPressureEngine {
  private options: LiquidationEngineOptions;
  private liqHistory: Map<string, LiquidationPressure[]> = new Map();
  private predictionsCache: Map<string, { prediction: LiquidationPrediction; timestamp: number }> = new Map();
  private openInterestData: Map<string, { value: number; timestamp: number }> = new Map();

  constructor(options: Partial<LiquidationEngineOptions> = {}) {
    this.options = {
      leverageLevels: [1, 2, 3, 5, 10, 20, 50, 100],
      liquidationThreshold: 0.8,
      maintenanceMarginRate: 0.005,
      predictionWindow: 3600000,
      decayFactor: 0.95,
      ...options
    };
  }

  async analyze(
    symbol: string,
    currentPrice: number,
    orderBook: OrderBook,
    recentTrades: OrderFlowEntry[]
  ): Promise<LiquidationPressure> {
    const timestamp = Date.now();
    
    const { totalLongLiq, totalShortLiq } = await this.calculateTotalLiquidations(
      symbol,
      currentPrice,
      orderBook
    );

    const estimatedLiqPrice = this.estimateLiquidationPrices(
      currentPrice,
      orderBook,
      recentTrades
    );

    const pressureIndex = this.calculatePressureIndex(
      totalLongLiq,
      totalShortLiq,
      currentPrice,
      orderBook
    );

    const { fundingRate, openInterest } = await this.getMarketMetrics(symbol);

    const pressure: LiquidationPressure = {
      symbol,
      timestamp,
      totalLongLiq,
      totalShortLiq,
      estimatedLiqPrice,
      pressureIndex,
      fundingRate,
      openInterest
    };

    this.storeLiquidationData(symbol, pressure);
    await dbStore.insertLiquidationPressure(pressure);

    return pressure;
  }

  private async calculateTotalLiquidations(
    symbol: string,
    currentPrice: number,
    orderBook: OrderBook
  ): Promise<{ totalLongLiq: number; totalShortLiq: number }> {
    const oiData = this.openInterestData.get(symbol);
    const openInterest = oiData?.value || 100000000;
    
    const priceChangePercent = this.calculateRecentPriceChange(symbol, currentPrice);
    
    const { leverageLevels, maintenanceMarginRate } = this.options;
    
    let totalLongLiq = 0;
    let totalShortLiq = 0;
    
    const longDistribution = this.estimateLeverageDistribution('long');
    const shortDistribution = this.estimateLeverageDistribution('short');
    
    leverageLevels.forEach((leverage, index) => {
      const liqDistance = maintenanceMarginRate * leverage;
      
      if (priceChangePercent < -liqDistance) {
        const liqAmount = openInterest * 0.5 * longDistribution[index] * 
          Math.min(Math.abs(priceChangePercent) / liqDistance, 1);
        totalLongLiq += liqAmount;
      }
      
      if (priceChangePercent > liqDistance) {
        const liqAmount = openInterest * 0.5 * shortDistribution[index] * 
          Math.min(priceChangePercent / liqDistance, 1);
        totalShortLiq += liqAmount;
      }
    });

    const orderBookImpact = this.calculateOrderBookLiquidityImpact(orderBook, priceChangePercent);
    
    return {
      totalLongLiq: totalLongLiq * orderBookImpact,
      totalShortLiq: totalShortLiq * orderBookImpact
    };
  }

  private estimateLeverageDistribution(side: 'long' | 'short'): number[] {
    const { leverageLevels } = this.options;
    const distribution: number[] = [];
    let totalWeight = 0;
    
    leverageLevels.forEach((leverage) => {
      const weight = 1 / (leverage * Math.sqrt(leverage));
      distribution.push(weight);
      totalWeight += weight;
    });
    
    return distribution.map(w => w / totalWeight);
  }

  private estimateLiquidationPrices(
    currentPrice: number,
    orderBook: OrderBook,
    recentTrades: OrderFlowEntry[]
  ): { long: number[]; short: number[] } {
    const { leverageLevels, maintenanceMarginRate } = this.options;
    const longLiqPrices: number[] = [];
    const shortLiqPrices: number[] = [];

    const volatility = this.calculateRecentVolatility(recentTrades);
    
    leverageLevels.forEach(leverage => {
      const liqDistance = maintenanceMarginRate * leverage * (1 + volatility * 0.1);
      
      const longLiqPrice = currentPrice * (1 - liqDistance);
      const shortLiqPrice = currentPrice * (1 + liqDistance);
      
      const longLiquidity = this.estimateLiquidityAtPrice(orderBook, longLiqPrice, 'ask');
      const shortLiquidity = this.estimateLiquidityAtPrice(orderBook, shortLiqPrice, 'bid');
      
      const longAdjustment = Math.max(0.8, Math.min(1.2, 1 / Math.sqrt(longLiquidity + 1)));
      const shortAdjustment = Math.max(0.8, Math.min(1.2, 1 / Math.sqrt(shortLiquidity + 1)));
      
      longLiqPrices.push(longLiqPrice * longAdjustment);
      shortLiqPrices.push(shortLiqPrice * shortAdjustment);
    });

    return {
      long: longLiqPrices,
      short: shortLiqPrices
    };
  }

  private calculatePressureIndex(
    totalLongLiq: number,
    totalShortLiq: number,
    currentPrice: number,
    orderBook: OrderBook
  ): number {
    const netLiqPressure = totalShortLiq - totalLongLiq;
    const totalLiq = totalLongLiq + totalShortLiq;
    
    if (totalLiq === 0) return 50;

    const { bidDepth, askDepth } = this.calculateOrderBookDepth(orderBook);
    const depthRatio = bidDepth / (askDepth || 1);
    
    const imbalance = netLiqPressure / totalLiq;
    const depthAdjustment = (depthRatio - 1) * 0.3;
    
    let pressureIndex = 50 + imbalance * 50 + depthAdjustment * 50;
    pressureIndex = Math.max(0, Math.min(100, pressureIndex));
    
    return pressureIndex;
  }

  private calculateOrderBookDepth(orderBook: OrderBook): { bidDepth: number; askDepth: number } {
    return {
      bidDepth: orderBook.bids.slice(0, 10).reduce((sum, b) => sum + b.total, 0),
      askDepth: orderBook.asks.slice(0, 10).reduce((sum, a) => sum + a.total, 0)
    };
  }

  private calculateRecentPriceChange(symbol: string, currentPrice: number): number {
    const history = this.liqHistory.get(symbol) || [];
    if (history.length < 2) return 0;
    
    const lookbackIndex = Math.min(60, history.length - 1);
    const previousPrice = this.estimatePriceFromPressure(history[history.length - 1 - lookbackIndex]);
    
    return (currentPrice - previousPrice) / previousPrice;
  }

  private estimatePriceFromPressure(pressure: LiquidationPressure): number {
    const midPrice = (pressure.estimatedLiqPrice.long[0] + pressure.estimatedLiqPrice.short[0]) / 2;
    const adjustment = 1 / (1 + this.options.maintenanceMarginRate * this.options.leverageLevels[0]);
    return midPrice * adjustment;
  }

  private calculateRecentVolatility(trades: OrderFlowEntry[]): number {
    if (trades.length < 2) return 0.02;
    
    const prices = trades.map(t => t.price);
    const returns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const std = math.std(returns) as unknown as number;
    const annualizedVol = std * Math.sqrt(365 * 24 * 60 * 60 / 5);
    
    return annualizedVol;
  }

  private estimateLiquidityAtPrice(
    orderBook: OrderBook,
    targetPrice: number,
    side: 'bid' | 'ask'
  ): number {
    const entries = side === 'bid' ? orderBook.bids : orderBook.asks;
    
    for (let i = 0; i < entries.length; i++) {
      if (side === 'bid' && entries[i].price <= targetPrice) {
        return entries[i].total;
      }
      if (side === 'ask' && entries[i].price >= targetPrice) {
        return entries[i].total;
      }
    }
    
    return entries.length > 0 ? entries[entries.length - 1].total : 0;
  }

  private calculateOrderBookLiquidityImpact(orderBook: OrderBook, priceChange: number): number {
    const totalDepth = orderBook.bids.slice(0, 10).reduce((sum, b) => sum + b.total, 0) +
                      orderBook.asks.slice(0, 10).reduce((sum, a) => sum + a.total, 0);
    
    const baseImpact = Math.abs(priceChange) * 10;
    const depthFactor = Math.min(1, 10000000 / (totalDepth + 1));
    
    return 1 + baseImpact * depthFactor;
  }

  private async getMarketMetrics(symbol: string): Promise<{ fundingRate: number; openInterest: number }> {
    const oiData = this.openInterestData.get(symbol);
    const now = Date.now();
    
    if (!oiData || now - oiData.timestamp > 60000) {
      const simulatedOI = 50000000 + Math.random() * 50000000;
      this.openInterestData.set(symbol, { value: simulatedOI, timestamp: now });
    }
    
    const history = this.liqHistory.get(symbol) || [];
    const pressureTrend = history.length > 10 
      ? this.calculatePressureTrend(symbol)
      : 0;
    
    const baseFundingRate = 0.0001;
    const fundingAdjustment = pressureTrend * 0.0001;
    
    return {
      fundingRate: baseFundingRate + fundingAdjustment,
      openInterest: this.openInterestData.get(symbol)?.value || 100000000
    };
  }

  predictLiquidationCascade(
    symbol: string,
    currentPrice: number,
    orderBook: OrderBook,
    timeHorizon: number = 300000
  ): LiquidationPrediction {
    const cacheKey = `${symbol}_${timeHorizon}`;
    const cached = this.predictionsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < 5000) {
      return cached.prediction;
    }

    const history = this.liqHistory.get(symbol) || [];
    const recentPressure = history.slice(-10);
    
    if (recentPressure.length === 0) {
      return {
        timestamp: now,
        predictedPrice: currentPrice,
        estimatedLongLiq: 0,
        estimatedShortLiq: 0,
        confidence: 0,
        timeHorizon
      };
    }

    const avgPressure = math.mean(recentPressure.map(p => p.pressureIndex)) as unknown as number;
    const pressureVolatility = math.std(recentPressure.map(p => p.pressureIndex)) as unknown as number;
    
    const priceTrend = this.calculatePriceTrend(symbol, currentPrice);
    const volatility = this.calculateHistoricalVolatility(symbol, currentPrice);
    
    const directionBias = (avgPressure - 50) / 50;
    const predictedMove = directionBias * volatility * Math.sqrt(timeHorizon / 3600000);
    
    const predictedPrice = currentPrice * (1 + predictedMove);
    
    const { estimatedLongLiq, estimatedShortLiq } = this.simulateLiquidationCascade(
      currentPrice,
      predictedPrice,
      orderBook
    );
    
    const signalStrength = Math.abs(directionBias);
    const volatilityFactor = Math.max(0, 1 - pressureVolatility / 50);
    const dataQualityFactor = Math.min(1, recentPressure.length / 10);
    const confidence = (signalStrength * 0.5 + volatilityFactor * 0.3 + dataQualityFactor * 0.2) * 100;

    const prediction: LiquidationPrediction = {
      timestamp: now,
      predictedPrice,
      estimatedLongLiq,
      estimatedShortLiq,
      confidence,
      timeHorizon
    };

    this.predictionsCache.set(cacheKey, { prediction, timestamp: now });
    return prediction;
  }

  private simulateLiquidationCascade(
    currentPrice: number,
    predictedPrice: number,
    orderBook: OrderBook
  ): { estimatedLongLiq: number; estimatedShortLiq: number } {
    const priceChange = (predictedPrice - currentPrice) / currentPrice;
    const steps = 10;
    const stepChange = priceChange / steps;
    
    let runningPrice = currentPrice;
    let totalLongLiq = 0;
    let totalShortLiq = 0;
    
    for (let i = 0; i < steps; i++) {
      runningPrice *= (1 + stepChange);
      
      const stepLongLiq = this.calculateStepLiquidation(runningPrice, currentPrice, 'long', orderBook);
      const stepShortLiq = this.calculateStepLiquidation(runningPrice, currentPrice, 'short', orderBook);
      
      totalLongLiq += stepLongLiq;
      totalShortLiq += stepShortLiq;
      
      const cascadeImpact = this.calculateCascadePriceImpact(stepLongLiq, stepShortLiq, orderBook);
      runningPrice *= (1 + cascadeImpact);
    }
    
    return {
      estimatedLongLiq: totalLongLiq,
      estimatedShortLiq: totalShortLiq
    };
  }

  private calculateStepLiquidation(
    currentPrice: number,
    basePrice: number,
    side: 'long' | 'short',
    orderBook: OrderBook
  ): number {
    const { leverageLevels, maintenanceMarginRate } = this.options;
    const priceChange = (currentPrice - basePrice) / basePrice;
    
    let liqAmount = 0;
    const distribution = this.estimateLeverageDistribution(side);
    const notionalValue = 100000000;
    
    leverageLevels.forEach((leverage, index) => {
      const liqDistance = maintenanceMarginRate * leverage;
      
      if (side === 'long' && priceChange < -liqDistance) {
        const liqPercent = Math.min(Math.abs(priceChange) / liqDistance, 1);
        liqAmount += notionalValue * 0.5 * distribution[index] * liqPercent * this.options.decayFactor;
      }
      
      if (side === 'short' && priceChange > liqDistance) {
        const liqPercent = Math.min(priceChange / liqDistance, 1);
        liqAmount += notionalValue * 0.5 * distribution[index] * liqPercent * this.options.decayFactor;
      }
    });
    
    return liqAmount;
  }

  private calculateCascadePriceImpact(
    longLiq: number,
    shortLiq: number,
    orderBook: OrderBook
  ): number {
    const netLiq = shortLiq - longLiq;
    const { bidDepth, askDepth } = this.calculateOrderBookDepth(orderBook);
    const totalDepth = bidDepth + askDepth;
    
    if (totalDepth === 0) return 0;
    
    const impact = netLiq / totalDepth * 0.1;
    return impact;
  }

  private calculatePriceTrend(symbol: string, currentPrice: number): number {
    const history = this.liqHistory.get(symbol) || [];
    if (history.length < 2) return 0;
    
    const prices = history.map(h => this.estimatePriceFromPressure(h));
    prices.push(currentPrice);
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    return math.mean(returns) as number;
  }

  private calculateHistoricalVolatility(symbol: string, currentPrice: number): number {
    const history = this.liqHistory.get(symbol) || [];
    if (history.length < 5) return 0.02;
    
    const prices = history.map(h => this.estimatePriceFromPressure(h));
    prices.push(currentPrice);
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const std = math.std(returns) as unknown as number;
    return std * Math.sqrt(365 * 24);
  }

  private calculatePressureTrend(symbol: string): number {
    const history = this.liqHistory.get(symbol) || [];
    if (history.length < 2) return 0;
    
    const pressures = history.slice(-20).map(h => h.pressureIndex);
    const n = pressures.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = pressures.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * pressures[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isFinite(slope) ? slope / 50 : 0;
  }

  private storeLiquidationData(symbol: string, data: LiquidationPressure): void {
    if (!this.liqHistory.has(symbol)) {
      this.liqHistory.set(symbol, []);
    }
    
    const history = this.liqHistory.get(symbol)!;
    history.push(data);
    
    const maxHistory = 1000;
    if (history.length > maxHistory) {
      history.shift();
    }
  }

  getLiquidationHistory(symbol: string, limit: number = 100): LiquidationPressure[] {
    const history = this.liqHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  updateOpenInterest(symbol: string, value: number): void {
    this.openInterestData.set(symbol, { value, timestamp: Date.now() });
  }

  getPressureAlertLevel(pressure: LiquidationPressure): 'low' | 'medium' | 'high' | 'extreme' {
    const index = pressure.pressureIndex;
    const distance = Math.abs(index - 50);
    
    if (distance < 15) return 'low';
    if (distance < 30) return 'medium';
    if (distance < 40) return 'high';
    return 'extreme';
  }
}

export const liquidationPressureEngine = new LiquidationPressureEngine();
