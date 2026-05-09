import type { GridState } from '../types';

const DB_NAME = 'GridNexusDB';
const DB_VERSION = 1;
const STORE_NAME = 'stateSnapshots';

export class StateSnapshotService {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'timestamp',
            autoIncrement: false
          });
          
          // 创建索引
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('totalLoad', 'keyMetrics.totalLoad');
        }
      };
    });
  }

  // 存储状态快照
  async storeSnapshot(snapshot: GridState): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(snapshot);

      request.onerror = () => {
        reject(new Error('Failed to store snapshot'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // 获取最新的状态快照
  async getLatestSnapshot(): Promise<GridState | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // 倒序获取第一个

      request.onerror = () => {
        reject(new Error('Failed to get latest snapshot'));
      };

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
    });
  }

  // 获取指定时间范围内的快照
  async getSnapshotsByTimeRange(startTime: string, endTime: string): Promise<GridState[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.bound(startTime, endTime));

      const snapshots: GridState[] = [];

      request.onerror = () => {
        reject(new Error('Failed to get snapshots'));
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          snapshots.push(cursor.value);
          cursor.continue();
        } else {
          resolve(snapshots);
        }
      };
    });
  }

  // 获取所有快照
  async getAllSnapshots(): Promise<GridState[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to get all snapshots'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // 删除指定时间之前的快照
  async deleteSnapshotsBefore(timestamp: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(timestamp, true));

      request.onerror = () => {
        reject(new Error('Failed to delete snapshots'));
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // 清除所有快照
  async clearAllSnapshots(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear snapshots'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // 统计快照数量
  async getSnapshotCount(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onerror = () => {
        reject(new Error('Failed to count snapshots'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }
}
