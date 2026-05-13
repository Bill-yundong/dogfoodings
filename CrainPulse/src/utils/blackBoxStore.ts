
import type { BlackBoxRecord, CraneState, CraneEnvelope } from '../types/crane';

export class BlackBoxStore {
  private dbName: string = 'CranePulseBlackBox';
  private storeName: string = 'records';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('craneId', 'craneId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
  }

  async addRecord(craneId: string, state: CraneState, envelope: CraneEnvelope, sessionId: string): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const record: BlackBoxRecord = {
        craneId,
        state,
        envelope,
        timestamp: Date.now(),
        sessionId
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsByCrane(craneId: string, limit: number = 100): Promise<BlackBoxRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('craneId');
      const request = index.getAll(IDBKeyRange.only(craneId));

      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsByTimeRange(startTime: number, endTime: number): Promise<BlackBoxRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.getAll(IDBKeyRange.bound(startTime, endTime));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsBySession(sessionId: string): Promise<BlackBoxRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));

      request.onsuccess = () => {
        const results = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSessions(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sessionId');
      const sessions = new Set<string>();

      const request = index.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          sessions.add(cursor.value.sessionId);
          cursor.continue();
        } else {
          resolve(Array.from(sessions));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecordsOlderThan(timestamp: number): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(timestamp));
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

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStats(): Promise<{ totalRecords: number; cranes: string[]; sessions: string[] }> {
    if (!this.db) await this.init();

    const sessions = await this.getSessions();
    const cranes = new Set<string>();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const craneIndex = store.index('craneId');
        const craneCursor = craneIndex.openCursor(null, 'nextunique');

        craneCursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cranes.add(cursor.value.craneId);
            cursor.continue();
          } else {
            resolve({
              totalRecords: countRequest.result,
              cranes: Array.from(cranes),
              sessions
            });
          }
        };
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}

export const blackBoxStore = new BlackBoxStore();
