import * as math from 'mathjs';
import type { OrderFlowEntry, AggregatedOrderFlow } from '../types';
import { dbStore } from '../storage/IndexedDBStore';

export interface AggregatorOptions {
  bucketSize: number;
  maxBuckets: number;
  flushInterval: number;
  vwapWeighted: boolean;
}

export type AggregationCallback = (data: AggregatedOrderFlow) => void;

export class OrderFlowAggregator {
  private options: AggregatorOptions;
  private currentBuckets: Map<number, {
    buyVolume: number;
    sellVolume: number;
    buyOrders: number;
    sellOrders: number;
    liquidations: number;
    buyPriceSum: number;
    sellPriceSum: number;
    vwapNumerator: number;
    vwapDenominator: number;
  }> = new Map();

  private callbacks: Set<AggregationCallback> = new Set();
  private flushTimer: number | null = null;
  private historicalData: Map<string, AggregatedOrderFlow[]> = new Map();
  private pendingEntries: OrderFlowEntry[] = [];
  private batchSize: number = 100;

  constructor(options: Partial<AggregatorOptions> = {}) {
    this.options = {
      bucketSize: 1000,
      maxBuckets: 1000,
      flushInterval: 100,
      vwapWeighted: true,
      ...options
    };

    this.startAutoFlush();
  }

  addEntry(entry: OrderFlowEntry): void {
    this.pendingEntries.push(entry);
    
    if (this.pendingEntries.length >= this.batchSize) {
      this.processPendingEntries();
    }
  }

  addEntries(entries: OrderFlowEntry[]): void {
    this.pendingEntries.push(...entries);
    
    if (this.pendingEntries.length >= this.batchSize) {
      this.processPendingEntries();
    }
  }

  private processPendingEntries(): void {
    if (this.pendingEntries.length === 0) return;

    const startTime = performance.now();
    
    for (const entry of this.pendingEntries) {
      this.processSingleEntry(entry);
    }

    const duration = performance.now() - startTime;
    if (this.pendingEntries.length > 50) {
      console.log(`[OrderFlow] 聚合 ${this.pendingEntries.length} 条订单流，耗时 ${duration.toFixed(2)}ms`);
    }

    this.pendingEntries = [];
  }

  private processSingleEntry(entry: OrderFlowEntry): void {
    const bucketTime = this.getBucketTime(entry.timestamp);
    let bucket = this.currentBuckets.get(bucketTime);

    if (!bucket) {
      bucket = {
        buyVolume: 0,
        sellVolume: 0,
        buyOrders: 0,
        sellOrders: 0,
        liquidations: 0,
        buyPriceSum: 0,
        sellPriceSum: 0,
        vwapNumerator: 0,
        vwapDenominator: 0
      };
      this.currentBuckets.set(bucketTime, bucket);
    }

    const isBuy = entry.side === 'buy';
    const volume = entry.quantity;
    const notional = entry.price * volume;

    if (entry.type === 'liquidation') {
      bucket.liquidations++;
    }

    if (isBuy) {
      bucket.buyVolume += volume;
      bucket.buyOrders++;
      bucket.buyPriceSum += entry.price * volume;
    } else {
      bucket.sellVolume += volume;
      bucket.sellOrders++;
      bucket.sellPriceSum += entry.price * volume;
    }

    bucket.vwapNumerator += notional;
    bucket.vwapDenominator += volume;
  }

  private getBucketTime(timestamp: number): number {
    return Math.floor(timestamp / this.options.bucketSize) * this.options.bucketSize;
  }

  flush(): AggregatedOrderFlow[] {
    this.processPendingEntries();
    
    const now = Date.now();
    const completedBuckets: AggregatedOrderFlow[] = [];
    const activeBucketTime = this.getBucketTime(now);

    for (const [bucketTime, bucket] of this.currentBuckets) {
      if (bucketTime < activeBucketTime) {
        const aggregated = this.createAggregatedData(bucketTime, bucket);
        completedBuckets.push(aggregated);
        this.storeHistoricalData(aggregated);
        this.emit(aggregated);
        this.currentBuckets.delete(bucketTime);
      }
    }

    this.trimOldBuckets();
    return completedBuckets;
  }

  private createAggregatedData(
    bucketTime: number,
    bucket: typeof this.currentBuckets extends Map<any, infer V> ? V : never
  ): AggregatedOrderFlow {
    const delta = bucket.buyVolume - bucket.sellVolume;
    
    return {
      timeBucket: bucketTime,
      buyVolume: bucket.buyVolume,
      sellVolume: bucket.sellVolume,
      delta,
      buyOrders: bucket.buyOrders,
      sellOrders: bucket.sellOrders,
      liquidations: bucket.liquidations,
      averageBuyPrice: bucket.buyVolume > 0 ? bucket.buyPriceSum / bucket.buyVolume : 0,
      averageSellPrice: bucket.sellVolume > 0 ? bucket.sellPriceSum / bucket.sellVolume : 0,
      vwap: bucket.vwapDenominator > 0 ? bucket.vwapNumerator / bucket.vwapDenominator : 0
    };
  }

  private storeHistoricalData(data: AggregatedOrderFlow): void {
    const key = 'default';
    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }
    
    const history = this.historicalData.get(key)!;
    history.push(data);
    
    if (history.length > this.options.maxBuckets) {
      history.shift();
    }
  }

  private trimOldBuckets(): void {
    if (this.currentBuckets.size > this.options.maxBuckets) {
      const sortedTimes = Array.from(this.currentBuckets.keys()).sort((a, b) => a - b);
      const toRemove = sortedTimes.slice(0, sortedTimes.length - this.options.maxBuckets);
      toRemove.forEach(time => this.currentBuckets.delete(time));
    }
  }

  getCurrentBucket(symbol?: string): AggregatedOrderFlow | null {
    this.processPendingEntries();
    
    const now = Date.now();
    const bucketTime = this.getBucketTime(now);
    const bucket = this.currentBuckets.get(bucketTime);
    
    if (!bucket) return null;
    
    return this.createAggregatedData(bucketTime, bucket);
  }

  getHistoricalData(limit: number = 100, symbol?: string): AggregatedOrderFlow[] {
    const key = symbol || 'default';
    const history = this.historicalData.get(key) || [];
    return history.slice(-limit);
  }

  calculateDeltaIndicator(
    symbol?: string,
    lookback: number = 20
  ): {
    cumulativeDelta: number;
    deltaDivergence: number;
    volumeDeltaRatio: number;
    smoothedDelta: number;
  } {
    const history = this.getHistoricalData(lookback + 1, symbol);
    if (history.length < 2) {
      return {
        cumulativeDelta: 0,
        deltaDivergence: 0,
        volumeDeltaRatio: 0,
        smoothedDelta: 0
      };
    }

    const recent = history.slice(-lookback);
    
    const cumulativeDelta = recent.reduce((sum, d) => sum + d.delta, 0);
    
    const totalVolume = recent.reduce((sum, d) => sum + d.buyVolume + d.sellVolume, 0);
    const volumeDeltaRatio = totalVolume > 0 ? cumulativeDelta / totalVolume : 0;
    
    const firstHalf = recent.slice(0, Math.floor(lookback / 2));
    const secondHalf = recent.slice(Math.floor(lookback / 2));
    const firstHalfDelta = firstHalf.reduce((sum, d) => sum + d.delta, 0);
    const secondHalfDelta = secondHalf.reduce((sum, d) => sum + d.delta, 0);
    const deltaDivergence = secondHalfDelta - firstHalfDelta;
    
    const deltas = recent.map(d => d.delta);
    const weights = deltas.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const smoothedDelta = deltas.reduce((sum, d, i) => sum + d * weights[i], 0) / weightSum;

    return {
      cumulativeDelta,
      deltaDivergence,
      volumeDeltaRatio,
      smoothedDelta
    };
  }

  calculateVolumeProfile(
    symbol?: string,
    lookback: number = 100,
    priceBins: number = 50
  ): {
    priceLevels: number[];
    buyVolume: number[];
    sellVolume: number[];
    pocPrice: number;
    valueAreaHigh: number;
    valueAreaLow: number;
  } {
    const history = this.getHistoricalData(lookback, symbol);
    if (history.length === 0) {
      return {
        priceLevels: [],
        buyVolume: [],
        sellVolume: [],
        pocPrice: 0,
        valueAreaHigh: 0,
        valueAreaLow: 0
      };
    }

    const allPrices: number[] = [];
    const allVolumes: { price: number; buy: number; sell: number }[] = [];

    history.forEach(d => {
      if (d.averageBuyPrice > 0) {
        allPrices.push(d.averageBuyPrice);
        allVolumes.push({ price: d.averageBuyPrice, buy: d.buyVolume, sell: 0 });
      }
      if (d.averageSellPrice > 0) {
        allPrices.push(d.averageSellPrice);
        allVolumes.push({ price: d.averageSellPrice, buy: 0, sell: d.sellVolume });
      }
    });

    if (allPrices.length === 0) {
      return {
        priceLevels: [],
        buyVolume: [],
        sellVolume: [],
        pocPrice: 0,
        valueAreaHigh: 0,
        valueAreaLow: 0
      };
    }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const binSize = (maxPrice - minPrice) / priceBins;

    const priceLevels: number[] = [];
    const buyVolume: number[] = [];
    const sellVolume: number[] = [];

    for (let i = 0; i < priceBins; i++) {
      const binStart = minPrice + i * binSize;
      const binEnd = binStart + binSize;
      const binMid = (binStart + binEnd) / 2;
      
      let buyVol = 0;
      let sellVol = 0;
      
      allVolumes.forEach(v => {
        if (v.price >= binStart && v.price < binEnd) {
          buyVol += v.buy;
          sellVol += v.sell;
        }
      });
      
      priceLevels.push(binMid);
      buyVolume.push(buyVol);
      sellVolume.push(sellVol);
    }

    const totalVolumes = buyVolume.map((b, i) => b + sellVolume[i]);
    const maxVolumeIndex = totalVolumes.indexOf(Math.max(...totalVolumes));
    const pocPrice = priceLevels[maxVolumeIndex];

    const totalVolume = totalVolumes.reduce((a, b) => a + b, 0);
    const valueAreaTarget = totalVolume * 0.7;
    
    let valueAreaSum = 0;
    let valueAreaStart = maxVolumeIndex;
    let valueAreaEnd = maxVolumeIndex;
    
    const sortedIndices = totalVolumes
      .map((_, i) => i)
      .sort((a, b) => totalVolumes[b] - totalVolumes[a]);
    
    for (const idx of sortedIndices) {
      if (valueAreaSum >= valueAreaTarget) break;
      valueAreaSum += totalVolumes[idx];
      valueAreaStart = Math.min(valueAreaStart, idx);
      valueAreaEnd = Math.max(valueAreaEnd, idx);
    }

    return {
      priceLevels,
      buyVolume,
      sellVolume,
      pocPrice,
      valueAreaHigh: priceLevels[valueAreaEnd],
      valueAreaLow: priceLevels[valueAreaStart]
    };
  }

  detectOrderFlowImbalance(
    symbol?: string,
    lookback: number = 10,
    threshold: number = 2.0
  ): {
    imbalance: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    absorptionDetected: boolean;
  } {
    const history = this.getHistoricalData(lookback, symbol);
    if (history.length < 2) {
      return {
        imbalance: 0,
        direction: 'neutral',
        strength: 0,
        absorptionDetected: false
      };
    }

    const recent = history.slice(-lookback);
    
    const totalBuy = recent.reduce((sum, d) => sum + d.buyVolume, 0);
    const totalSell = recent.reduce((sum, d) => sum + d.sellVolume, 0);
    
    const imbalance = totalSell > 0 ? totalBuy / totalSell : totalBuy > 0 ? Infinity : 1;
    
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (imbalance > threshold) direction = 'bullish';
    else if (imbalance < 1 / threshold) direction = 'bearish';

    const strength = Math.min(Math.abs(Math.log10(imbalance)) * 50, 100);

    const deltas = recent.map(d => d.delta);
    const absDeltas = deltas.map(Math.abs);
    const maxAbsDelta = Math.max(...absDeltas);
    const maxDeltaIndex = absDeltas.indexOf(maxAbsDelta);
    const absorptionDetected = maxDeltaIndex < lookback * 0.3 && 
      Math.sign(deltas[maxDeltaIndex]) !== Math.sign(deltas[deltas.length - 1]);

    return {
      imbalance,
      direction,
      strength,
      absorptionDetected
    };
  }

  on(callback: AggregationCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private emit(data: AggregatedOrderFlow): void {
    this.callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('[OrderFlow] 回调错误:', e);
      }
    });
  }

  private startAutoFlush(): void {
    this.stopAutoFlush();
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async loadHistoricalFromDB(
    symbol: string,
    startTime: number,
    endTime?: number
  ): Promise<AggregatedOrderFlow[]> {
    const entries = await dbStore.getOrderFlow(symbol, startTime, endTime, 50000);
    
    entries.forEach(entry => this.addEntry(entry));
    this.flush();
    
    return this.getHistoricalData();
  }

  getStats(symbol?: string): {
    totalTrades: number;
    totalVolume: number;
    avgTradeSize: number;
    buySellRatio: number;
    liquidationCount: number;
  } {
    const history = this.getHistoricalData(undefined, symbol);
    
    let totalTrades = 0;
    let totalVolume = 0;
    let liquidationCount = 0;
    let totalBuyVolume = 0;
    let totalSellVolume = 0;

    history.forEach(d => {
      totalTrades += d.buyOrders + d.sellOrders;
      totalVolume += d.buyVolume + d.sellVolume;
      totalBuyVolume += d.buyVolume;
      totalSellVolume += d.sellVolume;
      liquidationCount += d.liquidations;
    });

    return {
      totalTrades,
      totalVolume,
      avgTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
      buySellRatio: totalSellVolume > 0 ? totalBuyVolume / totalSellVolume : totalBuyVolume > 0 ? Infinity : 1,
      liquidationCount
    };
  }

  destroy(): void {
    this.stopAutoFlush();
    this.callbacks.clear();
    this.currentBuckets.clear();
    this.historicalData.clear();
    this.pendingEntries = [];
  }
}

export const orderFlowAggregator = new OrderFlowAggregator();
