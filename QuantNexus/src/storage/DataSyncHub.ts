import { dbStore } from './IndexedDBStore';
import type { KlineData, Timeframe, DataSyncEvent } from '../types';

export interface SyncOptions {
  symbol: string;
  timeframe: Timeframe;
  batchSize: number;
  maxRetries: number;
  backoffMs: number;
}

export class DataSyncHub {
  private syncingSymbols: Map<string, boolean> = new Map();
  private eventCallbacks: Map<string, ((event: DataSyncEvent) => void)[]> = new Map();
  private consistencyCheckInterval: number | null = null;

  constructor() {
    this.startConsistencyMonitoring();
  }

  private startConsistencyMonitoring(): void {
    this.consistencyCheckInterval = window.setInterval(async () => {
      const symbols = Array.from(this.syncingSymbols.keys());
      for (const key of symbols) {
        const [symbol, timeframe] = key.split(':');
        const result = await dbStore.verifyDataConsistency(symbol, timeframe as Timeframe);
        if (!result.consistent) {
          console.warn(`[DataSync] 数据不一致检测: ${symbol} ${timeframe}, 缺失 ${result.gaps.length} 个数据点`);
          this.emitEvent({
            type: 'kline',
            symbol,
            timeframe: timeframe as Timeframe,
            count: result.gaps.length,
            duration: 0,
            timestamp: Date.now()
          });
        }
      }
    }, 30000);
  }

  async syncKlinesIncremental(
    symbol: string,
    timeframe: Timeframe,
    fetchFn: (startTime: number, endTime: number) => Promise<KlineData[]>,
    options: Partial<SyncOptions> = {}
  ): Promise<{ synced: number; total: number; duration: number }> {
    const syncKey = `${symbol}:${timeframe}`;
    if (this.syncingSymbols.get(syncKey)) {
      console.log(`[DataSync] ${syncKey} 正在同步中，跳过重复请求`);
      return { synced: 0, total: 0, duration: 0 };
    }

    this.syncingSymbols.set(syncKey, true);
    const startTime = performance.now();
    let totalSynced = 0;

    try {
      const metadata = await dbStore.getSyncMetadata(symbol, timeframe);
      const now = Date.now();
      const timeframeMs = this.timeframeToMs(timeframe);
      
      let startSyncTime = metadata?.lastSyncedTime 
        ? Math.max(metadata.lastSyncedTime - timeframeMs * 5, now - 86400000 * 30)
        : now - 86400000 * 7;

      const batchSize = options.batchSize || 1000;
      const maxRetries = options.maxRetries || 3;
      
      while (startSyncTime < now) {
        const batchEnd = Math.min(startSyncTime + timeframeMs * batchSize, now);
        
        let klines: KlineData[] = [];
        let retries = 0;
        
        while (retries < maxRetries) {
          try {
            klines = await fetchFn(startSyncTime, batchEnd);
            break;
          } catch (e) {
            retries++;
            if (retries >= maxRetries) throw e;
            await this.sleep((options.backoffMs || 1000) * Math.pow(2, retries));
          }
        }

        if (klines.length > 0) {
          const inserted = await dbStore.batchInsertKlines(symbol, timeframe, klines);
          totalSynced += inserted;
          
          this.emitEvent({
            type: 'kline',
            symbol,
            timeframe,
            count: inserted,
            duration: performance.now() - startTime,
            timestamp: Date.now()
          });
        }

        startSyncTime = batchEnd;
        await this.sleep(10);
      }

      const duration = performance.now() - startTime;
      console.log(`[DataSync] ${symbol} ${timeframe} 增量同步完成，共同步 ${totalSynced} 条，耗时 ${duration.toFixed(2)}ms`);
      
      return {
        synced: totalSynced,
        total: (await dbStore.getSyncMetadata(symbol, timeframe))?.recordCount || 0,
        duration
      };
    } finally {
      this.syncingSymbols.set(syncKey, false);
    }
  }

  async updateKlineRealtime(
    symbol: string,
    timeframe: Timeframe,
    kline: KlineData
  ): Promise<{ updated: boolean; latency: number }> {
    const startTime = performance.now();
    const updated = await dbStore.updateKlineIncremental(symbol, timeframe, kline);
    const latency = performance.now() - startTime;

    this.emitEvent({
      type: 'kline',
      symbol,
      timeframe,
      count: 1,
      duration: latency,
      timestamp: Date.now()
    });

    return { updated, latency };
  }

  async bulkSyncMultipleTimeframes(
    symbol: string,
    timeframes: Timeframe[],
    fetchFn: (symbol: string, timeframe: Timeframe, startTime: number, endTime: number) => Promise<KlineData[]>
  ): Promise<Map<string, { synced: number; total: number }>> {
    const results = new Map<string, { synced: number; total: number }>();
    
    await Promise.all(
      timeframes.map(async (timeframe) => {
        const result = await this.syncKlinesIncremental(
          symbol,
          timeframe,
          (start, end) => fetchFn(symbol, timeframe, start, end)
        );
        results.set(`${symbol}:${timeframe}`, {
          synced: result.synced,
          total: result.total
        });
      })
    );

    return results;
  }

  async ensureDataContinuity(
    symbol: string,
    timeframe: Timeframe,
    fetchFn: (startTime: number, endTime: number) => Promise<KlineData[]>
  ): Promise<{ fixed: number; gaps: number[] }> {
    const consistency = await dbStore.verifyDataConsistency(symbol, timeframe);
    if (consistency.consistent || consistency.gaps.length === 0) {
      return { fixed: 0, gaps: [] };
    }

    const timeframeMs = this.timeframeToMs(timeframe);
    let fixed = 0;
    const fixedGaps: number[] = [];

    for (const gapTime of consistency.gaps) {
      const startTime = gapTime - timeframeMs;
      const endTime = gapTime + timeframeMs * 2;
      
      try {
        const klines = await fetchFn(startTime, endTime);
        const gapKline = klines.find(k => k.time === gapTime);
        
        if (gapKline) {
          await dbStore.updateKlineIncremental(symbol, timeframe, gapKline);
          fixed++;
          fixedGaps.push(gapTime);
        }
      } catch (e) {
        console.error(`[DataSync] 修复数据缺口失败 ${gapTime}:`, e);
      }
      
      await this.sleep(5);
    }

    console.log(`[DataSync] 修复 ${fixed}/${consistency.gaps.length} 个数据缺口`);
    return { fixed, gaps: fixedGaps };
  }

  on(eventType: DataSyncEvent['type'], callback: (event: DataSyncEvent) => void): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
    
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emitEvent(event: DataSyncEvent): void {
    const callbacks = this.eventCallbacks.get(event.type) || [];
    callbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[DataSync] 事件回调错误:', e);
      }
    });
  }

  isSyncing(symbol: string, timeframe: Timeframe): boolean {
    return this.syncingSymbols.get(`${symbol}:${timeframe}`) || false;
  }

  getSyncStatus(): Map<string, boolean> {
    return new Map(this.syncingSymbols);
  }

  private timeframeToMs(timeframe: Timeframe): number {
    const units: { [key in Timeframe]: number } = {
      '1s': 1000,
      '5s': 5000,
      '15s': 15000,
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };
    return units[timeframe];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy(): void {
    if (this.consistencyCheckInterval) {
      clearInterval(this.consistencyCheckInterval);
    }
    this.eventCallbacks.clear();
    this.syncingSymbols.clear();
  }
}

export const dataSyncHub = new DataSyncHub();
