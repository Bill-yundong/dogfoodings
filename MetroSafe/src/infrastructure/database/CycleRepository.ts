import {
  ICycleRepository,
  CycleData,
  CycleStats,
  DOOR_IDS,
  DoorState,
  DB_NAME,
  DB_VERSION,
  STORE_NAME
} from '../../domain';

export class CycleRepository implements ICycleRepository {
  private db: IDBDatabase | null = null;
  private dbReady: boolean = false;

  async init(): Promise<void> {
    if (this.dbReady) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.dbReady = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('doorId', 'doorId', { unique: false });
          store.createIndex('startTime', 'startTime', { unique: false });
        }
      };
    });
  }

  isReady(): boolean {
    return this.dbReady && this.db !== null;
  }

  async addCycle(cycle: Omit<CycleData, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(cycle);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new Error('Failed to add cycle'));
    });
  }

  async addCycles(cycles: Array<Omit<CycleData, 'id'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      cycles.forEach(cycle => store.add(cycle));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to add cycles'));
    });
  }

  async getCycle(id: number): Promise<CycleData | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get cycle'));
    });
  }

  async getCyclesByDoorId(doorId: string, limit: number = 100): Promise<CycleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('doorId');
      const request = index.getAll(doorId, limit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get cycles by doorId'));
    });
  }

  async getRecentCycles(limit: number = 100): Promise<CycleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll(null, limit);

      request.onsuccess = () => {
        const cycles = request.result as CycleData[];
        resolve(cycles.sort((a, b) => b.startTime - a.startTime).slice(0, limit));
      };
      request.onerror = () => reject(new Error('Failed to get recent cycles'));
    });
  }

  async getFailedCycles(limit: number = 100): Promise<CycleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allCycles = await this.getRecentCycles(limit * 10);
    return allCycles.filter(c => c.hasObstacle || c.endState === DoorState.FAULT).slice(0, limit);
  }

  async getStats(): Promise<CycleStats> {
    if (!this.db) throw new Error('Database not initialized');

    const allCycles = await this.getRecentCycles(10000);

    if (allCycles.length === 0) {
      return {
        totalCycles: 0,
        successfulCycles: 0,
        failedCycles: 0,
        avgDuration: 0,
        avgMotorCurrent: 0,
        obstacleRate: 0
      };
    }

    const successfulCycles = allCycles.filter(c => !c.hasObstacle && c.endState !== DoorState.FAULT);
    const failedCycles = allCycles.filter(c => c.hasObstacle || c.endState === DoorState.FAULT);
    const totalDuration = allCycles.reduce((sum, c) => sum + c.duration, 0);
    const totalMotorCurrent = allCycles.reduce((sum, c) => sum + c.avgMotorCurrent, 0);
    const obstacleCycles = allCycles.filter(c => c.hasObstacle);
    const lastCycleTime = allCycles.length > 0 ? allCycles[0].startTime : undefined;

    return {
      totalCycles: allCycles.length,
      successfulCycles: successfulCycles.length,
      failedCycles: failedCycles.length,
      avgDuration: totalDuration / allCycles.length,
      avgMotorCurrent: totalMotorCurrent / allCycles.length,
      obstacleRate: obstacleCycles.length / allCycles.length,
      lastCycleTime
    };
  }

  async deleteCycle(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete cycle'));
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear all cycles'));
    });
  }

  async generateSampleData(count: number = 1000): Promise<void> {
    const doorStates = [DoorState.OPEN, DoorState.CLOSED, DoorState.FAULT];
    const cycles: Array<Omit<CycleData, 'id'>> = [];

    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const doorId = DOOR_IDS[Math.floor(Math.random() * DOOR_IDS.length)];
      const startTime = now - (count - i) * 5000 - Math.random() * 1000;
      const duration = 3000 + Math.random() * 2000;
      const endTime = startTime + duration;
      const startState = Math.random() > 0.5 ? DoorState.CLOSED : DoorState.OPEN;
      const endStateIndex = Math.random() > 0.05 ? (startState === DoorState.CLOSED ? 0 : 1) : 2;
      const endState = doorStates[endStateIndex];
      const hasObstacle = Math.random() > 0.95;
      const obstacleCount = hasObstacle ? Math.floor(Math.random() * 3) + 1 : 0;

      cycles.push({
        doorId,
        startTime,
        endTime,
        startState,
        endState,
        maxPosition: 100,
        avgSpeed: 40 + Math.random() * 20,
        maxSpeed: 60 + Math.random() * 20,
        avgMotorCurrent: 150 + Math.random() * 100,
        maxMotorCurrent: 200 + Math.random() * 150,
        hasObstacle,
        obstacleCount,
        duration
      });
    }

    await this.addCycles(cycles);
  }
}

export const cycleRepository = new CycleRepository();
