import { openDB, IDBPDatabase } from 'idb';
import type { StandardizedWasteData, PeakPrediction, CarbonFootprintLog, RoadNetworkLoad } from '../types';

const DB_NAME = 'WasteFlowDB';
const DB_VERSION = 1;

export interface WasteFlowDB {
  standardizedData: StandardizedWasteData;
  peakPredictions: PeakPrediction;
  carbonLogs: CarbonFootprintLog;
  roadLoads: RoadNetworkLoad;
}

let dbInstance: IDBPDatabase<WasteFlowDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WasteFlowDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WasteFlowDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('standardizedData')) {
        const store = db.createObjectStore('standardizedData', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('source', 'source');
        store.createIndex('transferStatus', 'transferStatus');
      }

      if (!db.objectStoreNames.contains('peakPredictions')) {
        const store = db.createObjectStore('peakPredictions', { keyPath: 'id' });
        store.createIndex('roadId', 'roadId');
        store.createIndex('predictedAt', 'predictedAt');
      }

      if (!db.objectStoreNames.contains('carbonLogs')) {
        const store = db.createObjectStore('carbonLogs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('actionType', 'actionType');
      }

      if (!db.objectStoreNames.contains('roadLoads')) {
        const store = db.createObjectStore('roadLoads', { keyPath: 'id' });
        store.createIndex('roadId', 'roadId');
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

export const standardizedDataStore = {
  async add(data: StandardizedWasteData): Promise<void> {
    const db = await getDB();
    await db.put('standardizedData', data);
  },
  async getById(id: string): Promise<StandardizedWasteData | undefined> {
    const db = await getDB();
    return db.get('standardizedData', id);
  },
  async getAllByStatus(status: StandardizedWasteData['transferStatus']): Promise<StandardizedWasteData[]> {
    const db = await getDB();
    return db.getAllFromIndex('standardizedData', 'transferStatus', status);
  },
  async update(data: StandardizedWasteData): Promise<void> {
    const db = await getDB();
    await db.put('standardizedData', data);
  },
  async getAll(since?: number): Promise<StandardizedWasteData[]> {
    const db = await getDB();
    const all = await db.getAll('standardizedData');
    if (since) {
      return all.filter(d => d.timestamp >= since);
    }
    return all;
  },
};

export const peakPredictionsStore = {
  async add(prediction: PeakPrediction): Promise<void> {
    const db = await getDB();
    await db.put('peakPredictions', prediction);
  },
  async getByRoadId(roadId: string): Promise<PeakPrediction[]> {
    const db = await getDB();
    return db.getAllFromIndex('peakPredictions', 'roadId', roadId);
  },
  async getRecent(hours: number = 24): Promise<PeakPrediction[]> {
    const db = await getDB();
    const threshold = Date.now() - hours * 60 * 60 * 1000;
    const all = await db.getAll('peakPredictions');
    return all.filter(p => p.predictedAt >= threshold);
  },
  async getAll(): Promise<PeakPrediction[]> {
    const db = await getDB();
    return db.getAll('peakPredictions');
  },
};

export const carbonLogsStore = {
  async add(log: CarbonFootprintLog): Promise<void> {
    const db = await getDB();
    await db.put('carbonLogs', log);
  },
  async getByActionType(actionType: CarbonFootprintLog['actionType']): Promise<CarbonFootprintLog[]> {
    const db = await getDB();
    return db.getAllFromIndex('carbonLogs', 'actionType', actionType);
  },
  async getAll(since?: number): Promise<CarbonFootprintLog[]> {
    const db = await getDB();
    const all = await db.getAll('carbonLogs');
    if (since) {
      return all.filter(l => l.timestamp >= since);
    }
    return all;
  },
  async getStatistics(since?: number): Promise<{
    totalCO2Saved: number;
    totalCO2Emitted: number;
    totalWeight: number;
    byType: Record<string, number>;
  }> {
    const logs = await this.getAll(since);
    const stats = {
      totalCO2Saved: 0,
      totalCO2Emitted: 0,
      totalWeight: 0,
      byType: {} as Record<string, number>,
    };

    for (const log of logs) {
      stats.totalCO2Saved += log.co2Saved;
      stats.totalCO2Emitted += log.co2Emitted;
      stats.totalWeight += log.weight;
      stats.byType[log.actionType] = (stats.byType[log.actionType] || 0) + log.netReduction;
    }

    return stats;
  },
};

export const roadLoadsStore = {
  async add(load: RoadNetworkLoad): Promise<void> {
    const db = await getDB();
    await db.put('roadLoads', load);
  },
  async getByRoadId(roadId: string, limit: number = 100): Promise<RoadNetworkLoad[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('roadLoads', 'roadId', roadId);
    return all.slice(-limit);
  },
  async getAll(since?: number): Promise<RoadNetworkLoad[]> {
    const db = await getDB();
    const all = await db.getAll('roadLoads');
    if (since) {
      return all.filter(l => l.timestamp >= since);
    }
    return all;
  },
};
