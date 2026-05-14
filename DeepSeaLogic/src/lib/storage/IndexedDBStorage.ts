import type { SimulationState } from '$lib/types';

export class IndexedDBStorage {
  private dbName: string = 'DeepSeaLogicDB';
  private storeName: string = 'simulationStates';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;

  constructor() {}

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('elapsedTime', 'elapsedTime', { unique: false });
        }
      };
    });
  }

  async saveState(state: SimulationState): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save state'));
    });
  }

  async getState(id: string): Promise<SimulationState | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get state'));
    });
  }

  async getAllStates(): Promise<SimulationState[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all states'));
    });
  }

  async getStatesByTimeRange(startTime: number, endTime: number): Promise<SimulationState[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get states by time range'));
    });
  }

  async deleteState(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete state'));
    });
  }

  async clearAllStates(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear all states'));
    });
  }

  async getLatestState(): Promise<SimulationState | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error('Failed to get latest state'));
    });
  }

  async getStateCount(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get state count'));
    });
  }

  async cleanupOldStates(maxStates: number = 100): Promise<void> {
    const states = await this.getAllStates();
    if (states.length <= maxStates) return;

    const sortedStates = states.sort((a, b) => a.timestamp - b.timestamp);
    const statesToDelete = sortedStates.slice(0, states.length - maxStates);
    
    for (const state of statesToDelete) {
      await this.deleteState(state.id);
    }
  }

  async createSnapshot(
    particles: any[],
    pumps: any[],
    current: any,
    parameters: any,
    semanticParams: any[],
    elapsedTime: number
  ): Promise<SimulationState> {
    const state: SimulationState = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      particles: JSON.parse(JSON.stringify(particles)),
      pumps: JSON.parse(JSON.stringify(pumps)),
      current: JSON.parse(JSON.stringify(current)),
      parameters: JSON.parse(JSON.stringify(parameters)),
      semanticParams: JSON.parse(JSON.stringify(semanticParams)),
      elapsedTime
    };

    await this.saveState(state);
    return state;
  }

  isSupported(): boolean {
    return 'indexedDB' in window;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
