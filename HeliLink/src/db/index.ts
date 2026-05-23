import Dexie, { Table } from 'dexie';
import type {
  PlatformMetadata,
  SubmarineCable,
  WeatherData,
  LandingWindow,
  SemanticTag,
  SyncLogEntry,
  OfflineQueueItem,
  Alert,
  HelicopterPosition,
} from '@/types';

export class HeliLinkDB extends Dexie {
  platformMetadata!: Table<PlatformMetadata, string>;
  submarineCables!: Table<SubmarineCable, string>;
  weatherHistory!: Table<WeatherData, string>;
  landingHistory!: Table<LandingWindow, string>;
  semanticTags!: Table<SemanticTag, string>;
  syncLog!: Table<SyncLogEntry, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;
  alerts!: Table<Alert, string>;
  helicopterPositions!: Table<HelicopterPosition, string>;

  constructor() {
    super('HeliLinkDB');

    this.version(1).stores({
      platformMetadata: '&id, code, status, lastSync',
      submarineCables: '&id, status, lastSync',
      weatherHistory: '&id, platformId, timestamp, [platformId+timestamp]',
      landingHistory: '&id, platformId, startTime, feasibilityScore',
      semanticTags: '&id, dataType, metricName, [dataType+metricName]',
      syncLog: '&id, tagId, sourceSystem, timestamp, syncStatus',
      offlineQueue: '&id, dataType, status, createdAt',
      alerts: '&id, type, severity, timestamp, acknowledged',
      helicopterPositions: '&id, flightNumber, timestamp',
    });

    this.platformMetadata = this.table('platformMetadata');
    this.submarineCables = this.table('submarineCables');
    this.weatherHistory = this.table('weatherHistory');
    this.landingHistory = this.table('landingHistory');
    this.semanticTags = this.table('semanticTags');
    this.syncLog = this.table('syncLog');
    this.offlineQueue = this.table('offlineQueue');
    this.alerts = this.table('alerts');
    this.helicopterPositions = this.table('helicopterPositions');
  }

  async getStorageStats() {
    const counts = await Promise.all([
      this.platformMetadata.count(),
      this.submarineCables.count(),
      this.weatherHistory.count(),
      this.landingHistory.count(),
      this.offlineQueue.count(),
    ]);

    return {
      platformMetadata: counts[0],
      submarineCables: counts[1],
      weatherHistory: counts[2],
      landingHistory: counts[3],
      offlineQueue: counts[4],
      total: counts.reduce((a, b) => a + b, 0),
    };
  }

  async clearOldWeatherData(platformId: string, olderThan: number) {
    return this.weatherHistory
      .where('[platformId+timestamp]')
      .between([platformId, 0], [platformId, olderThan])
      .delete();
  }

  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'retryCount' | 'status' | 'createdAt'>) {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      retryCount: 0,
      status: 'pending',
      createdAt: Date.now(),
    };
    await this.offlineQueue.add(queueItem);
    return queueItem;
  }

  async getPendingOfflineItems() {
    return this.offlineQueue
      .where('status')
      .equals('pending')
      .or('status')
      .equals('failed')
      .toArray();
  }
}

export const db = new HeliLinkDB();
