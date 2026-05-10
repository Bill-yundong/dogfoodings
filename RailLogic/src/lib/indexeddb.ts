import type { TrackGeometryParameter, TrajectoryPoint, PantographContactState } from '../types';

const DB_NAME = 'RailLogicDB';
const DB_VERSION = 1;

const STORES = {
  TRACK_PARAMS: 'trackGeometryParams',
  TRAJECTORY: 'trajectoryPoints',
  PANTOGRAPH: 'pantographStates',
  ALERTS: 'alerts'
} as const;

class IndexedDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.TRACK_PARAMS)) {
          const trackStore = db.createObjectStore(STORES.TRACK_PARAMS, { keyPath: 'id' });
          trackStore.createIndex('timestamp', 'timestamp');
          trackStore.createIndex('mileage', 'mileage');
          trackStore.createIndex('trackSegmentId', 'trackSegmentId');
          trackStore.createIndex('mileage_timestamp', ['mileage', 'timestamp']);
        }

        if (!db.objectStoreNames.contains(STORES.TRAJECTORY)) {
          const trajectoryStore = db.createObjectStore(STORES.TRAJECTORY, { keyPath: 'id' });
          trajectoryStore.createIndex('timestamp', 'timestamp');
          trajectoryStore.createIndex('mileage', 'mileage');
        }

        if (!db.objectStoreNames.contains(STORES.PANTOGRAPH)) {
          const pantographStore = db.createObjectStore(STORES.PANTOGRAPH, { keyPath: 'id' });
          pantographStore.createIndex('timestamp', 'timestamp');
          pantographStore.createIndex('trainId', 'trainId');
        }

        if (!db.objectStoreNames.contains(STORES.ALERTS)) {
          const alertStore = db.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
          alertStore.createIndex('timestamp', 'timestamp');
          alertStore.createIndex('level', 'level');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => void
  ): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      let result: T;
      callback(store);

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async addTrackParameter(param: TrackGeometryParameter): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRACK_PARAMS, 'readwrite');
      const store = transaction.objectStore(STORES.TRACK_PARAMS);
      const request = store.put(param);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addTrackParameters(params: TrackGeometryParameter[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRACK_PARAMS, 'readwrite');
      const store = transaction.objectStore(STORES.TRACK_PARAMS);

      for (const param of params) {
        store.put(param);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTrackParametersByRange(
    startMileage: number,
    endMileage: number
  ): Promise<TrackGeometryParameter[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRACK_PARAMS, 'readonly');
      const store = transaction.objectStore(STORES.TRACK_PARAMS);
      const index = store.index('mileage');
      const range = IDBKeyRange.bound(startMileage, endMileage);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result as TrackGeometryParameter[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrackParametersByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<TrackGeometryParameter[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRACK_PARAMS, 'readonly');
      const store = transaction.objectStore(STORES.TRACK_PARAMS);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result as TrackGeometryParameter[]);
      request.onerror = () => reject(request.error);
    });
  }

  async addTrajectoryPoint(point: TrajectoryPoint): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORY, 'readwrite');
      const store = transaction.objectStore(STORES.TRAJECTORY);
      const request = store.put(point);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addTrajectoryPoints(points: TrajectoryPoint[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORY, 'readwrite');
      const store = transaction.objectStore(STORES.TRAJECTORY);

      for (const point of points) {
        store.put(point);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTrajectoryPointsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<TrajectoryPoint[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORY, 'readonly');
      const store = transaction.objectStore(STORES.TRAJECTORY);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result as TrajectoryPoint[]);
      request.onerror = () => reject(request.error);
    });
  }

  async addPantographState(state: PantographContactState): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PANTOGRAPH, 'readwrite');
      const store = transaction.objectStore(STORES.PANTOGRAPH);
      const request = store.put(state);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPantographStatesByTrain(
    trainId: string,
    limit: number = 1000
  ): Promise<PantographContactState[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PANTOGRAPH, 'readonly');
      const store = transaction.objectStore(STORES.PANTOGRAPH);
      const index = store.index('trainId');
      const request = index.getAll(trainId, limit);

      request.onsuccess = () => resolve(request.result as PantographContactState[]);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupOldData(maxAgeHours: number = 24): Promise<number> {
    const db = await this.init();
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    const stores = [STORES.TRACK_PARAMS, STORES.TRAJECTORY, STORES.PANTOGRAPH];

    for (const storeName of stores) {
      const count = await this.deleteOldRecords(db, storeName, cutoffTime);
      deletedCount += count;
    }

    return deletedCount;
  }

  private async deleteOldRecords(
    db: IDBDatabase,
    storeName: string,
    cutoffTime: number
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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

  async getDatabaseUsage(): Promise<number> {
    try {
      const estimate = await navigator.storage.estimate();
      return (estimate.usage || 0) / (estimate.quota || 1) * 100;
    } catch {
      return 0;
    }
  }
}

export const indexeddb = new IndexedDBManager();
