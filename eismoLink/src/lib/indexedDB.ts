import { WaveformSlice, BuildingSafetyStatus, Alert } from '../types/seismic';

const DB_NAME = 'EismoLinkDB';
const DB_VERSION = 1;
const STORES = {
  WAVEFORMS: 'waveforms',
  BUILDING_STATUS: 'buildingStatus',
  ALERTS: 'alerts',
  SYNC_LOG: 'syncLog',
};

class SeismicDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.WAVEFORMS)) {
          const waveformStore = db.createObjectStore(STORES.WAVEFORMS, { keyPath: 'id' });
          waveformStore.createIndex('stationId', 'stationId', { unique: false });
          waveformStore.createIndex('startTime', 'startTime', { unique: false });
          waveformStore.createIndex('stationTime', ['stationId', 'startTime'], { unique: true });
        }

        if (!db.objectStoreNames.contains(STORES.BUILDING_STATUS)) {
          const buildingStore = db.createObjectStore(STORES.BUILDING_STATUS, { keyPath: 'buildingId' });
          buildingStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ALERTS)) {
          const alertStore = db.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
          alertStore.createIndex('timestamp', 'timestamp', { unique: false });
          alertStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const syncStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async ready(): Promise<void> {
    return this.initPromise;
  }

  async saveWaveformSlice(slice: WaveformSlice): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.WAVEFORMS], 'readwrite');
      const store = transaction.objectStore(STORES.WAVEFORMS);
      const request = store.put(slice);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveWaveformSlices(slices: WaveformSlice[]): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.WAVEFORMS], 'readwrite');
      const store = transaction.objectStore(STORES.WAVEFORMS);
      
      slices.forEach(slice => store.put(slice));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getWaveformSlicesByStation(
    stationId: string,
    startTime?: number,
    endTime?: number
  ): Promise<WaveformSlice[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.WAVEFORMS], 'readonly');
      const store = transaction.objectStore(STORES.WAVEFORMS);
      const index = store.index('stationId');
      const request = index.getAll(IDBKeyRange.only(stationId));

      request.onsuccess = () => {
        let results = request.result;
        if (startTime !== undefined) {
          results = results.filter(s => s.startTime >= startTime);
        }
        if (endTime !== undefined) {
          results = results.filter(s => s.endTime <= endTime);
        }
        resolve(results.sort((a, b) => a.startTime - b.startTime));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getWaveformSlicesByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<WaveformSlice[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.WAVEFORMS], 'readonly');
      const store = transaction.objectStore(STORES.WAVEFORMS);
      const index = store.index('startTime');
      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOldWaveforms(beforeTime: number): Promise<number> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.WAVEFORMS], 'readwrite');
      const store = transaction.objectStore(STORES.WAVEFORMS);
      const index = store.index('startTime');
      const range = IDBKeyRange.upperBound(beforeTime);
      const request = index.openCursor(range);
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        } else {
          resolve(count);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveBuildingStatus(status: BuildingSafetyStatus): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.BUILDING_STATUS], 'readwrite');
      const store = transaction.objectStore(STORES.BUILDING_STATUS);
      const request = store.put(status);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBuildingStatus(buildingId?: string): Promise<BuildingSafetyStatus | BuildingSafetyStatus[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.BUILDING_STATUS], 'readonly');
      const store = transaction.objectStore(STORES.BUILDING_STATUS);

      if (buildingId) {
        const request = store.get(buildingId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async saveAlert(alert: Alert): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ALERTS], 'readwrite');
      const store = transaction.objectStore(STORES.ALERTS);
      const request = store.put(alert);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAlerts(limit: number = 100): Promise<Alert[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ALERTS], 'readonly');
      const store = transaction.objectStore(STORES.ALERTS);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const alerts: Alert[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && alerts.length < limit) {
          alerts.push(cursor.value);
          cursor.continue();
        } else {
          resolve(alerts);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async logSync(syncData: { id: string; type: string; success: boolean; timestamp: number }): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_LOG], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_LOG);
      const request = store.put(syncData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.ready();
    const stores = [STORES.WAVEFORMS, STORES.BUILDING_STATUS, STORES.ALERTS, STORES.SYNC_LOG];
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export const seismicDB = new SeismicDatabase();
export default SeismicDatabase;
