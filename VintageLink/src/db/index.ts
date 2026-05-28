import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type {
  WineLabel,
  SensorReading,
  CellarZone,
  WineBottle,
  MaturationModel,
  DrinkingWindow,
  Alert,
} from '@/types';

// @ts-ignore - DBSchema 类型兼容性问题
interface VintageLinkDB extends DBSchema {
  wineLabels: {
    key: string;
    value: WineLabel;
    indexes: {
      'by-chateau': string;
      'by-vintage': number;
      'by-region': string;
      'by-country': string;
    };
  };
  sensorReadings: {
    key: string;
    value: SensorReading;
    indexes: {
      'by-timestamp': number;
      'by-zone': string;
      'by-zone-timestamp': [string, number];
    };
  };
  cellarZones: {
    key: string;
    value: CellarZone;
    indexes: {
      'by-name': string;
    };
  };
  wineBottles: {
    key: string;
    value: WineBottle;
    indexes: {
      'by-label': string;
      'by-zone': string;
      'by-purchase-date': number;
    };
  };
  maturationModels: {
    key: string;
    value: MaturationModel;
    indexes: {
      'by-wine': string;
      'by-maturity-score': number;
    };
  };
  drinkingWindows: {
    key: string;
    value: DrinkingWindow;
    indexes: {
      'by-wine': string;
      'by-peak-date': number;
      'by-window-start': number;
    };
  };
  // @ts-ignore - DBSchema 索引类型兼容性问题
  alerts: {
    key: string;
    value: Alert;
    indexes: {
      'by-timestamp': number;
      'by-severity': string;
      'by-resolved': boolean;
    };
  };
  systemMetadata: {
    key: string;
    value: { key: string; value: unknown; timestamp: number };
  };
}

type StoreName =
  | 'wineLabels'
  | 'sensorReadings'
  | 'cellarZones'
  | 'wineBottles'
  | 'maturationModels'
  | 'drinkingWindows'
  | 'alerts'
  | 'systemMetadata';

class DatabaseManager {
  private db: IDBPDatabase<VintageLinkDB> | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly DB_NAME = 'VintageLinkDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await openDB<VintageLinkDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade: (db) => {
          if (!db.objectStoreNames.contains('wineLabels')) {
            const wineLabelsStore = db.createObjectStore('wineLabels', { keyPath: 'id' });
            wineLabelsStore.createIndex('by-chateau', 'chateau');
            wineLabelsStore.createIndex('by-vintage', 'vintage');
            wineLabelsStore.createIndex('by-region', 'region');
            wineLabelsStore.createIndex('by-country', 'country');
          }

          if (!db.objectStoreNames.contains('sensorReadings')) {
            const sensorStore = db.createObjectStore('sensorReadings', { keyPath: 'id' });
            sensorStore.createIndex('by-timestamp', 'timestamp');
            sensorStore.createIndex('by-zone', 'zoneId');
            sensorStore.createIndex('by-zone-timestamp', ['zoneId', 'timestamp']);
          }

          if (!db.objectStoreNames.contains('cellarZones')) {
            const zoneStore = db.createObjectStore('cellarZones', { keyPath: 'id' });
            zoneStore.createIndex('by-name', 'name');
          }

          if (!db.objectStoreNames.contains('wineBottles')) {
            const bottleStore = db.createObjectStore('wineBottles', { keyPath: 'id' });
            bottleStore.createIndex('by-label', 'labelId');
            bottleStore.createIndex('by-zone', 'location.zoneId');
            bottleStore.createIndex('by-purchase-date', 'purchaseDate');
          }

          if (!db.objectStoreNames.contains('maturationModels')) {
            const maturationStore = db.createObjectStore('maturationModels', { keyPath: 'id' });
            maturationStore.createIndex('by-wine', 'wineId');
            maturationStore.createIndex('by-maturity-score', 'maturityScore');
          }

          if (!db.objectStoreNames.contains('drinkingWindows')) {
            const windowStore = db.createObjectStore('drinkingWindows', { keyPath: 'id' });
            windowStore.createIndex('by-wine', 'wineId');
            windowStore.createIndex('by-peak-date', 'peakDate');
            windowStore.createIndex('by-window-start', 'windowStart');
          }

          if (!db.objectStoreNames.contains('alerts')) {
            const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
            alertStore.createIndex('by-timestamp', 'timestamp');
            alertStore.createIndex('by-severity', 'severity');
            alertStore.createIndex('by-resolved', 'resolved');
          }

          if (!db.objectStoreNames.contains('systemMetadata')) {
            db.createObjectStore('systemMetadata', { keyPath: 'key' });
          }
        },
      });
    })();

    return this.initPromise;
  }

  private async getDB(): Promise<IDBPDatabase<VintageLinkDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async bulkAddWineLabels(labels: WineLabel[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('wineLabels', 'readwrite');
    await Promise.all([
      ...labels.map(label => tx.store.put(label)),
      tx.done,
    ]);
  }

  async getWineLabel(id: string): Promise<WineLabel | undefined> {
    const db = await this.getDB();
    return db.get('wineLabels', id);
  }

  async getAllWineLabels(): Promise<WineLabel[]> {
    const db = await this.getDB();
    return db.getAll('wineLabels');
  }

  async getWineLabelsByChateau(chateau: string): Promise<WineLabel[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('wineLabels', 'by-chateau', chateau);
  }

  async getWineLabelsByVintage(vintage: number): Promise<WineLabel[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('wineLabels', 'by-vintage', vintage);
  }

  async searchWineLabels(query: string): Promise<WineLabel[]> {
    const db = await this.getDB();
    const labels = await db.getAll('wineLabels');
    const lowerQuery = query.toLowerCase();
    return labels.filter(label =>
      label.chateau.toLowerCase().includes(lowerQuery) ||
      label.region.toLowerCase().includes(lowerQuery) ||
      label.country.toLowerCase().includes(lowerQuery) ||
      label.vintage.toString().includes(query)
    );
  }

  async addSensorReading(reading: SensorReading): Promise<void> {
    const db = await this.getDB();
    await db.put('sensorReadings', reading);
  }

  async bulkAddSensorReadings(readings: SensorReading[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('sensorReadings', 'readwrite');
    await Promise.all([
      ...readings.map(reading => tx.store.put(reading)),
      tx.done,
    ]);
  }

  async getSensorReadingsByZone(zoneId: string, startTime?: number, endTime?: number): Promise<SensorReading[]> {
    const db = await this.getDB();
    try {
      if (startTime && endTime) {
        const range = IDBKeyRange.bound([zoneId, startTime], [zoneId, endTime]);
        return db.getAllFromIndex('sensorReadings', 'by-zone-timestamp', range);
      }
      return db.getAllFromIndex('sensorReadings', 'by-zone', zoneId);
    } catch (error) {
      console.warn('Error getting sensor readings, falling back to full scan:', error);
      const allReadings = await db.getAll('sensorReadings');
      return allReadings.filter(r => r.zoneId === zoneId);
    }
  }

  async getLatestSensorReading(zoneId: string): Promise<SensorReading | undefined> {
    const db = await this.getDB();
    const readings = await db.getAllFromIndex('sensorReadings', 'by-zone', zoneId);
    return readings.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  async addCellarZone(zone: CellarZone): Promise<void> {
    const db = await this.getDB();
    await db.put('cellarZones', zone);
  }

  async getAllCellarZones(): Promise<CellarZone[]> {
    const db = await this.getDB();
    return db.getAll('cellarZones');
  }

  async addWineBottle(bottle: WineBottle): Promise<void> {
    const db = await this.getDB();
    await db.put('wineBottles', bottle);
  }

  async bulkAddWineBottles(bottles: WineBottle[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('wineBottles', 'readwrite');
    await Promise.all([
      ...bottles.map(bottle => tx.store.put(bottle)),
      tx.done,
    ]);
  }

  async getAllWineBottles(): Promise<WineBottle[]> {
    const db = await this.getDB();
    return db.getAll('wineBottles');
  }

  async getWineBottlesByLabel(labelId: string): Promise<WineBottle[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('wineBottles', 'by-label', labelId);
  }

  async addMaturationModel(model: MaturationModel): Promise<void> {
    const db = await this.getDB();
    await db.put('maturationModels', model);
  }

  async getMaturationModel(wineId: string): Promise<MaturationModel | undefined> {
    const db = await this.getDB();
    const models = await db.getAllFromIndex('maturationModels', 'by-wine', wineId);
    return models[0];
  }

  async addDrinkingWindow(window: DrinkingWindow): Promise<void> {
    const db = await this.getDB();
    await db.put('drinkingWindows', window);
  }

  async getDrinkingWindow(wineId: string): Promise<DrinkingWindow | undefined> {
    const db = await this.getDB();
    const windows = await db.getAllFromIndex('drinkingWindows', 'by-wine', wineId);
    return windows[0];
  }

  async getAllDrinkingWindows(): Promise<DrinkingWindow[]> {
    const db = await this.getDB();
    return db.getAll('drinkingWindows');
  }

  async addAlert(alert: Alert): Promise<void> {
    const db = await this.getDB();
    await db.put('alerts', alert);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('alerts', 'by-resolved', false);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const db = await this.getDB();
    const alert = await db.get('alerts', alertId);
    if (alert) {
      alert.resolved = true;
      await db.put('alerts', alert);
    }
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.getDB();
    await db.put('systemMetadata', { key, value, timestamp: Date.now() });
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    const result = await db.get('systemMetadata', key);
    return result?.value as T;
  }

  async getCount(storeName: StoreName): Promise<number> {
    const db = await this.getDB();
    return db.count(storeName as any);
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      ['wineLabels', 'sensorReadings', 'cellarZones', 'wineBottles', 'maturationModels', 'drinkingWindows', 'alerts', 'systemMetadata'],
      'readwrite'
    );
    await Promise.all([
      tx.objectStore('wineLabels').clear(),
      tx.objectStore('sensorReadings').clear(),
      tx.objectStore('cellarZones').clear(),
      tx.objectStore('wineBottles').clear(),
      tx.objectStore('maturationModels').clear(),
      tx.objectStore('drinkingWindows').clear(),
      tx.objectStore('alerts').clear(),
      tx.objectStore('systemMetadata').clear(),
      tx.done,
    ]);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const db = new DatabaseManager();
