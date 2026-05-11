import type { CycleData, CycleStats, CycleFilter, FaultType } from '../../core/types';
import { DATABASE_CONFIG, DOOR_IDS } from '../../core/constants';

class CycleDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (this.db) return;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_CONFIG.name, DATABASE_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const cycleConfig = DATABASE_CONFIG.stores.cycles;
        
        if (!db.objectStoreNames.contains(cycleConfig.name)) {
          const store = db.createObjectStore(cycleConfig.name, {
            keyPath: cycleConfig.keyPath,
            autoIncrement: cycleConfig.autoIncrement
          });
          
          cycleConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.name, { unique: index.unique });
          });
        }
      };
    });

    return this.initPromise;
  }

  async addCycle(cycle: Omit<CycleData, 'id'>): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readwrite');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
      const request = store.add(cycle);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async addCycles(cycles: Array<Omit<CycleData, 'id'>>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readwrite');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);

      cycles.forEach(cycle => store.add(cycle));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCycle(id: number): Promise<CycleData | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readonly');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getCyclesByDoorId(doorId: string, limit: number = 100): Promise<CycleData[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readonly');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
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
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readonly');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
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
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readonly');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
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

  async getStats(): Promise<CycleStats> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readonly');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
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
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readwrite');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DATABASE_CONFIG.stores.cycles.name], 'readwrite');
      const store = transaction.objectStore(DATABASE_CONFIG.stores.cycles.name);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async generateSampleData(count: number = 1000): Promise<void> {
    await this.init();
    const doorIds = Array.from(DOOR_IDS);
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

export const cycleDatabase = new CycleDatabase();
