import { openDB, IDBPDatabase } from 'idb';
import type { NetPulseDB } from '@/types';
import type { ProbeResult, SwitchEvent } from '@/types';
import type { DailySummary } from '@shared/protocol';
import { generateId, formatDateKey, mean } from '@/utils/math';
import { getQualityLevel } from '@/utils/quality';

const DB_NAME = 'netpulse-db';
const DB_VERSION = 2;

export class StorageService {
  private db: IDBPDatabase<NetPulseDB> | null = null;
  private retentionDays: number = 30;
  private writeQueue: { type: string; data: unknown }[] = [];
  private isFlushing: boolean = false;
  private flushInterval: number | null = null;

  private initPromise: Promise<void> | null = null;

  async init(retentionDays: number = 30): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.retentionDays = retentionDays;

    this.initPromise = (async () => {
      this.db = await openDB<NetPulseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('probeResults')) {
          const probeStore = db.createObjectStore('probeResults', { keyPath: 'id' });
          probeStore.createIndex('timestamp', 'timestamp');
          probeStore.createIndex('pathId', 'pathId');
          probeStore.createIndex('pathId-timestamp', ['pathId', 'timestamp']);
        }

        if (!db.objectStoreNames.contains('switchEvents')) {
          const switchStore = db.createObjectStore('switchEvents', { keyPath: 'id' });
          switchStore.createIndex('timestamp', 'timestamp');
          switchStore.createIndex('success', 'success');
        }

        if (!db.objectStoreNames.contains('dailySummaries')) {
          const summaryStore = db.createObjectStore('dailySummaries', { keyPath: 'date' });
          summaryStore.createIndex('date', 'date');
        }

        if (!db.objectStoreNames.contains('environmentProfiles')) {
          const profileStore = db.createObjectStore('environmentProfiles', { keyPath: 'id' });
          profileStore.createIndex('createdAt', 'createdAt');
          profileStore.createIndex('period', 'period');
        }
      },
    });

    this.flushInterval = window.setInterval(() => this.flushQueue(), 2000);
    await this.cleanOldData();
    })();
  }

  setRetentionDays(days: number): void {
    this.retentionDays = days;
  }

  async addProbeResult(result: ProbeResult): Promise<void> {
    const record = { ...result, id: generateId() };
    this.queueWrite('probeResults', record);
  }

  async addProbeResults(results: ProbeResult[]): Promise<void> {
    for (const result of results) {
      const record = { ...result, id: generateId() };
      this.queueWrite('probeResults', record);
    }
  }

  async addSwitchEvent(event: Omit<SwitchEvent, 'id'>): Promise<string> {
    const id = generateId();
    const record = { ...event, id };
    this.queueWrite('switchEvents', record);
    return id;
  }

  private queueWrite(type: string, data: unknown): void {
    this.writeQueue.push({ type, data });
    if (this.writeQueue.length >= 100) {
      void this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.isFlushing || !this.db || this.writeQueue.length === 0) return;

    this.isFlushing = true;
    const queue = [...this.writeQueue];
    this.writeQueue = [];

    try {
      const tx = this.db.transaction(
        ['probeResults', 'switchEvents', 'dailySummaries', 'environmentProfiles'],
        'readwrite'
      );

      for (const item of queue) {
        switch (item.type) {
          case 'probeResults':
            await tx.objectStore('probeResults').put(item.data as NetPulseDB['probeResults']);
            break;
          case 'switchEvents':
            await tx.objectStore('switchEvents').put(item.data as SwitchEvent);
            break;
          case 'dailySummaries':
            await tx.objectStore('dailySummaries').put(item.data as DailySummary);
            break;
          case 'environmentProfiles':
            await tx.objectStore('environmentProfiles').put(item.data as NetPulseDB['environmentProfiles']);
            break;
        }
      }

      await tx.done;
    } catch (e) {
      console.error('Flush queue error:', e);
      this.writeQueue.unshift(...queue);
    } finally {
      this.isFlushing = false;
    }
  }

  async getProbeResults(
    pathId?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<ProbeResult[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) return [];
    }

    let results: ProbeResult[] = [];

    try {
      if (pathId && startTime && endTime) {
        const index = this.db.transaction('probeResults').store.index('pathId-timestamp');
        const range = IDBKeyRange.bound([pathId, startTime], [pathId, endTime]);
        results = (await index.getAll(range)) as ProbeResult[];
      } else if (pathId) {
        const index = this.db.transaction('probeResults').store.index('pathId');
        results = (await index.getAll(pathId)) as ProbeResult[];
      } else if (startTime && endTime) {
        const index = this.db.transaction('probeResults').store.index('timestamp');
        const range = IDBKeyRange.bound(startTime, endTime);
        results = (await index.getAll(range)) as ProbeResult[];
      } else {
        results = (await this.db.getAll('probeResults')) as ProbeResult[];
      }
    } catch {
      results = (await this.db.getAll('probeResults')) as ProbeResult[];
      if (pathId) results = results.filter(r => r.pathId === pathId);
      if (startTime && endTime) results = results.filter(r => r.timestamp >= startTime! && r.timestamp <= endTime!);
    }

    return limit ? results.slice(-limit) : results;
  }

  async getSwitchEvents(
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<SwitchEvent[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) return [];
    }

    let events: SwitchEvent[];

    try {
      if (startTime && endTime) {
        const index = this.db.transaction('switchEvents').store.index('timestamp');
        const range = IDBKeyRange.bound(startTime, endTime);
        events = (await index.getAll(range)) as SwitchEvent[];
      } else {
        events = (await this.db.getAll('switchEvents')) as SwitchEvent[];
      }
    } catch {
      events = (await this.db.getAll('switchEvents')) as SwitchEvent[];
      if (startTime && endTime) events = events.filter(e => e.timestamp >= startTime! && e.timestamp <= endTime!);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  async getDailySummaries(startDate?: string, endDate?: string): Promise<DailySummary[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) return [];
    }

    let summaries: DailySummary[];

    if (startDate && endDate) {
      try {
        const range = IDBKeyRange.bound(startDate, endDate);
        summaries = await this.db.getAllFromIndex('dailySummaries', 'date', range);
      } catch {
        summaries = await this.db.getAll('dailySummaries');
        summaries = summaries.filter(s => s.date >= startDate! && s.date <= endDate!);
      }
    } else {
      summaries = await this.db.getAll('dailySummaries');
    }

    return summaries.sort((a, b) => a.date.localeCompare(b.date));
  }

  async generateDailySummary(date: Date): Promise<DailySummary | null> {
    if (!this.db) return null;

    const dateKey = formatDateKey(date);
    const startOfDay = new Date(date).setHours(0, 0, 0, 0);
    const endOfDay = new Date(date).setHours(23, 59, 59, 999);

    const results = await this.getProbeResults(undefined, startOfDay, endOfDay);
    const events = await this.getSwitchEvents(startOfDay, endOfDay);

    if (results.length === 0) return null;

    const avgLatency = mean(results.map(r => r.latency));
    const avgJitter = mean(results.map(r => r.jitter));
    const avgPacketLoss = mean(results.map(r => r.packetLoss));

    const qualityCounts = { excellent: 0, good: 0, fair: 0, poor: 0 };
    for (const result of results) {
      const quality = getQualityLevel(
        100 - (result.latency / 5) - (result.jitter * 2) - (result.packetLoss * 500)
      );
      qualityCounts[quality]++;
    }

    const totalResults = results.length;
    const distribution = {
      excellent: qualityCounts.excellent / totalResults,
      good: qualityCounts.good / totalResults,
      fair: qualityCounts.fair / totalResults,
      poor: qualityCounts.poor / totalResults,
    };

    const summary: DailySummary = {
      date: dateKey,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgJitter: Math.round(avgJitter * 100) / 100,
      avgPacketLoss: Math.round(avgPacketLoss * 10000) / 10000,
      totalSwitches: events.length,
      uptime: Math.min(86400, results.length),
      qualityDistribution: distribution,
    };

    await this.db.put('dailySummaries', summary);
    return summary;
  }

  async generateEnvironmentProfile(
    period: 'peak' | 'off-peak' | 'weekend' | 'holiday'
  ): Promise<NetPulseDB['environmentProfiles'] | null> {
    if (!this.db) return null;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const results = await this.getProbeResults(undefined, thirtyDaysAgo, now);

    if (results.length < 100) return null;

    const filteredResults = this.filterResultsByPeriod(results, period);
    if (filteredResults.length < 50) return null;

    const profile: NetPulseDB['environmentProfiles'] = {
      id: generateId(),
      createdAt: now,
      period,
      typicalLatency: Math.round(mean(filteredResults.map(r => r.latency)) * 100) / 100,
      typicalJitter: Math.round(mean(filteredResults.map(r => r.jitter)) * 100) / 100,
      typicalLoss: Math.round(mean(filteredResults.map(r => r.packetLoss)) * 10000) / 10000,
      recommendedPaths: [],
    };

    await this.db.add('environmentProfiles', profile);
    return profile;
  }

  private filterResultsByPeriod(
    results: ProbeResult[],
    period: string
  ): ProbeResult[] {
    return results.filter(r => {
      const date = new Date(r.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;

      switch (period) {
        case 'peak':
          return !isWeekend && hour >= 19 && hour <= 23;
        case 'off-peak':
          return !isWeekend && (hour >= 2 && hour <= 8);
        case 'weekend':
          return isWeekend;
        default:
          return true;
      }
    });
  }

  async getEnvironmentProfiles(): Promise<NetPulseDB['environmentProfiles'][]> {
    if (!this.db) return [];
    const profiles = await this.db.getAll('environmentProfiles');
    return profiles.sort((a, b) => b.createdAt - a.createdAt);
  }

  private async cleanOldData(): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    try {
      const tx = this.db.transaction(['probeResults', 'switchEvents'], 'readwrite');

      const probeIndex = tx.objectStore('probeResults').index('timestamp');
      const probeRange = IDBKeyRange.upperBound(cutoffTime);
      let probeCursor = await probeIndex.openCursor(probeRange);
      while (probeCursor) {
        await probeCursor.delete();
        probeCursor = await probeCursor.continue();
      }

      const switchIndex = tx.objectStore('switchEvents').index('timestamp');
      const switchRange = IDBKeyRange.upperBound(cutoffTime);
      let switchCursor = await switchIndex.openCursor(switchRange);
      while (switchCursor) {
        await switchCursor.delete();
        switchCursor = await switchCursor.continue();
      }

      await tx.done;
    } catch (e) {
      console.error('Clean old data error:', e);
    }
  }

  async exportData(format: 'json' | 'csv'): Promise<string> {
    const probes = await this.getProbeResults();
    const switches = await this.getSwitchEvents();
    const summaries = await this.getDailySummaries();

    const data = {
      exportDate: new Date().toISOString(),
      retentionDays: this.retentionDays,
      probeResults: probes,
      switchEvents: switches,
      dailySummaries: summaries,
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    const csvLines = ['timestamp,pathId,latency,jitter,packetLoss'];
    for (const p of probes) {
      csvLines.push(
        `${new Date(p.timestamp).toISOString()},${p.pathId},${p.latency},${p.jitter},${p.packetLoss}`
      );
    }
    return csvLines.join('\n');
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(
      ['probeResults', 'switchEvents', 'dailySummaries', 'environmentProfiles'],
      'readwrite'
    );

    await Promise.all([
      tx.objectStore('probeResults').clear(),
      tx.objectStore('switchEvents').clear(),
      tx.objectStore('dailySummaries').clear(),
      tx.objectStore('environmentProfiles').clear(),
    ]);

    await tx.done;
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flushQueue();

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const storageService = new StorageService();
