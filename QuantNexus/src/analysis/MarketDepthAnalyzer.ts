import * as math from 'mathjs';
import type { OrderBook, OrderBookEntry, MarketDepthAnalysis, KlineData } from '../types';

export interface DepthAnalysisOptions {
  depthLevels: number;
  supportResistanceWindow: number;
  volumeImbalanceThreshold: number;
}

export class MarketDepthAnalyzer {
  private options: DepthAnalysisOptions;
  private historicalDepths: Map<string, MarketDepthAnalysis[]> = new Map();
  private priceLevelsCache: Map<string, { supportLevels: number[]; resistanceLevels: number[] }> = new Map();

  constructor(options: Partial<DepthAnalysisOptions> = {}) {
    this.options = {
      depthLevels: 20,
      supportResistanceWindow: 100,
      volumeImbalanceThreshold: 0.3,
      ...options
    };
  }

  analyze(orderBook: OrderBook): MarketDepthAnalysis {
    const { bids, asks, symbol, timestamp } = orderBook;
    const { depthLevels } = this.options;

    const trimmedBids = bids.slice(0, depthLevels);
    const trimmedAsks = asks.slice(0, depthLevels);

    const bidDepth = this.calculateTotalDepth(trimmedBids);
    const askDepth = this.calculateTotalDepth(trimmedAsks);

    const cumulativeVolume = {
      bid: this.calculateCumulativeVolume(trimmedBids),
      ask: this.calculateCumulativeVolume(trimmedAsks)
    };

    const { supportLevels, resistanceLevels } = this.detectSupportResistance(
      trimmedBids,
      trimmedAsks,
      symbol
    );

    const liquidityRatio = bidDepth / (askDepth || 1);

    const analysis: MarketDepthAnalysis = {
      symbol,
      timestamp,
      bidDepth,
      askDepth,
      cumulativeVolume,
      supportLevels,
      resistanceLevels,
      liquidityRatio
    };

    this.storeHistoricalAnalysis(symbol, analysis);
    return analysis;
  }

  private calculateTotalDepth(entries: OrderBookEntry[]): number {
    return entries.reduce((sum, entry) => sum + entry.total, 0);
  }

  private calculateCumulativeVolume(entries: OrderBookEntry[]): { [key: number]: number } {
    const result: { [key: number]: number } = {};
    let cumulative = 0;

    for (const entry of entries) {
      cumulative += entry.total;
      result[entry.price] = cumulative;
    }

    return result;
  }

  private detectSupportResistance(
    bids: OrderBookEntry[],
    asks: OrderBookEntry[],
    symbol: string
  ): { supportLevels: number[]; resistanceLevels: number[] } {
    const cacheKey = `${symbol}_${Date.now()}`;
    const cached = this.priceLevelsCache.get(cacheKey);
    if (cached) return { supportLevels: cached.supportLevels, resistanceLevels: cached.resistanceLevels };

    const bidVolumeProfile = this.buildVolumeProfile(bids);
    const askVolumeProfile = this.buildVolumeProfile(asks);

    const bidThreshold = this.calculateVolumeThreshold(Object.values(bidVolumeProfile));
    const askThreshold = this.calculateVolumeThreshold(Object.values(askVolumeProfile));

    const supportLevels = Object.entries(bidVolumeProfile)
      .filter(([_, volume]) => volume > bidThreshold)
      .map(([price]) => parseFloat(price))
      .sort((a, b) => b - a)
      .slice(0, 5);

    const resistanceLevels = Object.entries(askVolumeProfile)
      .filter(([_, volume]) => volume > askThreshold)
      .map(([price]) => parseFloat(price))
      .sort((a, b) => a - b)
      .slice(0, 5);

    const result = { supportLevels, resistanceLevels };
    this.priceLevelsCache.set(cacheKey, result);

    setTimeout(() => this.priceLevelsCache.delete(cacheKey), 1000);
    return result;
  }

  private buildVolumeProfile(entries: OrderBookEntry[]): { [price: number]: number } {
    const profile: { [price: number]: number } = {};

    for (const entry of entries) {
      const roundedPrice = Math.round(entry.price * 100) / 100;
      profile[roundedPrice] = (profile[roundedPrice] || 0) + entry.total;
    }

    return profile;
  }

  private calculateVolumeThreshold(volumes: number[]): number {
    if (volumes.length === 0) return 0;
    const mean = math.mean(volumes) as unknown as number;
    const std = math.std(volumes) as unknown as number;
    return mean + std * this.options.volumeImbalanceThreshold;
  }

  calculateVolumeImbalance(orderBook: OrderBook): number {
    const { bids, asks } = orderBook;
    const bidVolume = bids.slice(0, 10).reduce((sum, b) => sum + b.total, 0);
    const askVolume = asks.slice(0, 10).reduce((sum, a) => sum + a.total, 0);
    const totalVolume = bidVolume + askVolume;

    if (totalVolume === 0) return 0;
    return (bidVolume - askVolume) / totalVolume;
  }

  calculateOrderBookSlope(orderBook: OrderBook): { bidSlope: number; askSlope: number } {
    const { bids, asks } = orderBook;
    
    const calculateSlope = (entries: OrderBookEntry[]): number => {
      if (entries.length < 2) return 0;
      
      const xs = entries.map((_, i) => i);
      const ys = entries.map(e => Math.log10(e.total + 1));
      
      const n = xs.length;
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
      const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return isFinite(slope) ? slope : 0;
    };

    return {
      bidSlope: calculateSlope(bids.slice(0, 10)),
      askSlope: calculateSlope(asks.slice(0, 10))
    };
  }

  detectLiquidityPockets(orderBook: OrderBook): {
    bidPockets: Array<{ price: number; volume: number; depth: number }>;
    askPockets: Array<{ price: number; volume: number; depth: number }>;
  } {
    const detectPockets = (entries: OrderBookEntry[]): Array<{ price: number; volume: number; depth: number }> => {
      const pockets: Array<{ price: number; volume: number; depth: number }> = [];
      const volumes = entries.map(e => e.total);
      const mean = math.mean(volumes) as unknown as number;
      const std = math.std(volumes) as unknown as number;
      const threshold = mean + std * 2;

      entries.forEach((entry, index) => {
        if (entry.total > threshold) {
          pockets.push({
            price: entry.price,
            volume: entry.total,
            depth: index + 1
          });
        }
      });

      return pockets;
    };

    return {
      bidPockets: detectPockets(orderBook.bids.slice(0, 20)),
      askPockets: detectPockets(orderBook.asks.slice(0, 20))
    };
  }

  calculateMarketDepthScore(analysis: MarketDepthAnalysis): number {
    const { bidDepth, askDepth, liquidityRatio } = analysis;
    const totalDepth = bidDepth + askDepth;
    
    const depthScore = Math.min(totalDepth / 1000000, 1);
    const balanceScore = 1 - Math.abs(liquidityRatio - 1) / 2;
    
    return (depthScore * 0.6 + balanceScore * 0.4) * 100;
  }

  private storeHistoricalAnalysis(symbol: string, analysis: MarketDepthAnalysis): void {
    if (!this.historicalDepths.has(symbol)) {
      this.historicalDepths.set(symbol, []);
    }
    
    const history = this.historicalDepths.get(symbol)!;
    history.push(analysis);
    
    if (history.length > this.options.supportResistanceWindow) {
      history.shift();
    }
  }

  getHistoricalAnalysis(symbol: string, limit: number = 100): MarketDepthAnalysis[] {
    const history = this.historicalDepths.get(symbol) || [];
    return history.slice(-limit);
  }

  analyzeDepthTrend(symbol: string): {
    bidDepthTrend: number;
    askDepthTrend: number;
    liquidityTrend: number;
  } {
    const history = this.getHistoricalAnalysis(symbol, 50);
    if (history.length < 2) {
      return { bidDepthTrend: 0, askDepthTrend: 0, liquidityTrend: 0 };
    }

    const calculateTrend = (values: number[]): number => {
      if (values.length < 2) return 0;
      const n = values.length;
      const xs = Array.from({ length: n }, (_, i) => i);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
      const sumX2 = xs.reduce((s, x) => s + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return isFinite(slope) ? slope : 0;
    };

    return {
      bidDepthTrend: calculateTrend(history.map(h => h.bidDepth)),
      askDepthTrend: calculateTrend(history.map(h => h.askDepth)),
      liquidityTrend: calculateTrend(history.map(h => h.liquidityRatio))
    };
  }
}

export const marketDepthAnalyzer = new MarketDepthAnalyzer();
