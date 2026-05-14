import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PowerSnapshot } from '../types/datacenter';

interface CoolNexusDB extends DBSchema {
  powerSnapshots: {
    key: string;
    value: PowerSnapshot;
    indexes: { 'by-timestamp': number };
  };
  heatLoadHistory: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      totalHeatLoad: number;
      maxTemperature: number;
    };
    indexes: { 'by-timestamp': number };
  };
  riskAlerts: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: string;
      severity: string;
      description: string;
    };
    indexes: { 'by-timestamp': number };
  };
}

export class IndexedDBStore {
  private dbName = 'CoolNexusDB';
  private dbVersion = 1;
  private db: IDBPDatabase<CoolNexusDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<CoolNexusDB>(this.dbName, this.dbVersion, {
      upgrade: (db) => {
        const powerStore = db.createObjectStore('powerSnapshots', { keyPath: 'id' });
        powerStore.createIndex('by-timestamp', 'timestamp');

        const heatStore = db.createObjectStore('heatLoadHistory', { keyPath: 'id' });
        heatStore.createIndex('by-timestamp', 'timestamp');

        const riskStore = db.createObjectStore('riskAlerts', { keyPath: 'id' });
        riskStore.createIndex('by-timestamp', 'timestamp');
      }
    });
  }

  async addPowerSnapshot(snapshot: PowerSnapshot): Promise<void> {
    await this.ensureDB();
    await this.db!.add('powerSnapshots', snapshot);
    await this.cleanupOldSnapshots();
  }

  async getPowerSnapshots(limit: number = 100): Promise<PowerSnapshot[]> {
    await this.ensureDB();
    return await this.db!.getAllFromIndex('powerSnapshots', 'by-timestamp', undefined, limit);
  }

  async getPowerSnapshotsByTimeRange(startTime: number, endTime: number): Promise<PowerSnapshot[]> {
    await this.ensureDB();
    const range = IDBKeyRange.bound(startTime, endTime);
    return await this.db!.getAllFromIndex('powerSnapshots', 'by-timestamp', range);
  }

  async addHeatLoadRecord(record: {
    id: string;
    timestamp: number;
    totalHeatLoad: number;
    maxTemperature: number;
  }): Promise<void> {
    await this.ensureDB();
    await this.db!.add('heatLoadHistory', record);
  }

  async getHeatLoadHistory(limit: number = 50): Promise<{
    id: string;
    timestamp: number;
    totalHeatLoad: number;
    maxTemperature: number;
  }[]> {
    await this.ensureDB();
    return await this.db!.getAllFromIndex('heatLoadHistory', 'by-timestamp', undefined, limit);
  }

  async addRiskAlert(alert: {
    id: string;
    timestamp: number;
    type: string;
    severity: string;
    description: string;
  }): Promise<void> {
    await this.ensureDB();
    await this.db!.add('riskAlerts', alert);
  }

  async getRiskAlerts(limit: number = 20): Promise<{
    id: string;
    timestamp: number;
    type: string;
    severity: string;
    description: string;
  }[]> {
    await this.ensureDB();
    return await this.db!.getAllFromIndex('riskAlerts', 'by-timestamp', undefined, limit);
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.getPowerSnapshots();
    if (snapshots.length > 500) {
      const toDelete = snapshots.slice(0, snapshots.length - 500);
      for (const snapshot of toDelete) {
        await this.db!.delete('powerSnapshots', snapshot.id);
      }
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureDB();
    await this.db!.clear('powerSnapshots');
    await this.db!.clear('heatLoadHistory');
    await this.db!.clear('riskAlerts');
  }
}

export const indexedDBStore = new IndexedDBStore();
