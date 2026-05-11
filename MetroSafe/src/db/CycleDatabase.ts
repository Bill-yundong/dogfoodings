import type { CycleData, FaultType } from '../types';

class CycleDatabase {
  private dbName: string = 'MetroSafeCycleDB';
  private storeName: string = 'cycles';
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
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('doorId', 'doorId', { unique: false });
          store.createIndex('cycleNumber', 'cycleNumber', { unique: false });
          store.createIndex('startTime', 'startTime', { unique: false });
          store.createIndex('success', 'success', { unique: false });
          store.createIndex('faultType', 'faultType', { unique: false });
        }
      };
    });
  }

  async addCycle(cycle: Omit<CycleData, 'id'>): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(cycle);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async addCycles(cycles: Array<Omit<CycleData, 'id'>>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      cycles.forEach(cycle => store.add(cycle));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCycle(id: number): Promise<CycleData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getCyclesByDoorId(doorId: string, limit: number = 100): Promise<CycleData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('doorId');
      const request = index.openCursor(IDBKeyRange.only(doorId), 'prev');
      const cycles: CycleData[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && cycles.length < limit) {
          cycles.push(cursor.value);
          cursor.continue();
        } else {
          resolve(cycles);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getRecentCycles(limit: number = 100): Promise<CycleData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor(null, 'prev');
      const cycles: CycleData[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && cycles.length < limit) {
          cycles.push(cursor.value);
          cursor.continue();
        } else {
          resolve(cycles);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getFailedCycles(limit: number = 100): Promise<CycleData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('success');
      const request = index.openCursor(IDBKeyRange.only(false), 'prev');
      const cycles: CycleData[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && cycles.length < limit) {
          cycles.push(cursor.value);
          cursor.continue();
        } else {
          resolve(cycles);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStats(): Promise<{
    totalCycles: number;
    successfulCycles: number;
    failedCycles: number;
    avgDuration: number;
    avgMotorCurrent: number;
    faultDistribution: Map<FaultType, number>;
  }> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      let totalCycles = 0;
      let successfulCycles = 0;
      let failedCycles = 0;
      let totalDuration = 0;
      let totalMotorCurrent = 0;
      const faultDistribution = new Map<FaultType, number>();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const cycle: CycleData = cursor.value;
          totalCycles++;
          if (cycle.success) successfulCycles++;
          else failedCycles++;
          totalDuration += cycle.duration;
          totalMotorCurrent += cycle.maxMotorCurrent;
          
          if (cycle.faultType) {
            const count = faultDistribution.get(cycle.faultType) || 0;
            faultDistribution.set(cycle.faultType, count + 1);
          }
          
          cursor.continue();
        } else {
          resolve({
            totalCycles,
            successfulCycles,
            failedCycles,
            avgDuration: totalCycles > 0 ? totalDuration / totalCycles : 0,
            avgMotorCurrent: totalCycles > 0 ? totalMotorCurrent / totalCycles : 0,
            faultDistribution
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteCycle(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
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

  async generateSampleData(count: number = 1000): Promise<void> {
    if (!this.db) await this.init();

    const doorIds = ['PSD-01', 'PSD-02', 'PSD-03', 'PSD-04', 'PSD-05', 'PSD-06'];
    const cycles: Array<Omit<CycleData, 'id'>> = [];

    for (let i = 0; i < count; i++) {
      const doorId = doorIds[Math.floor(Math.random() * doorIds.length)];
      const success = Math.random() > 0.05;
      const startTime = Date.now() - (count - i) * 30000;
      const duration = 1500 + Math.random() * 2000;
      
      cycles.push({
        doorId,
        cycleNumber: i + 1,
        startTime,
        endTime: startTime + duration,
        duration,
        maxMotorCurrent: 2.5 + Math.random() * 3 + (success ? 0 : 2),
        avgSpeed: 0.4 + Math.random() * 0.2,
        vibrationLevel: 10 + Math.random() * 20 + (success ? 0 : 15),
        obstaclesDetected: success ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1,
        success,
        faultType: success ? undefined : (['obstacle_detected', 'motor_failure', 'sensor_error', 'door_misalignment'] as FaultType[])[Math.floor(Math.random() * 4)]
      });
    }

    await this.addCycles(cycles);
  }

  isReady(): boolean {
    return this.db !== null;
  }
}

export const cycleDB = new CycleDatabase();
