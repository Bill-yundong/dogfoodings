import { SoilSample, FertilizationPlan, RootUptakeSimulation, SupplyChainItem, Farm } from '@/types';

const DB_NAME = 'SoilPulseDB';
const DB_VERSION = 1;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: Array<{ name: string; keyPath: string; unique?: boolean }>;
}

const STORES: StoreConfig[] = [
  {
    name: 'soilSamples',
    keyPath: 'id',
    indexes: [
      { name: 'farmId', keyPath: 'farmId', unique: false },
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'location_lat', keyPath: 'location.lat', unique: false },
    ],
  },
  {
    name: 'fertilizationPlans',
    keyPath: 'id',
    indexes: [
      { name: 'farmId', keyPath: 'farmId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'cropType', keyPath: 'cropType', unique: false },
    ],
  },
  {
    name: 'simulations',
    keyPath: 'id',
    indexes: [
      { name: 'farmId', keyPath: 'farmId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'supplyChain',
    keyPath: 'id',
    indexes: [
      { name: 'farmId', keyPath: 'farmId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'farms',
    keyPath: 'id',
  },
  {
    name: 'syncQueue',
    keyPath: 'id',
    indexes: [
      { name: 'entityType', keyPath: 'entityType', unique: false },
      { name: 'operation', keyPath: 'operation', unique: false },
    ],
  },
];

class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        STORES.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
            });

            storeConfig.indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique || false,
              });
            });
          }
        });
      };
    });

    return this.initPromise;
  }

  private async getStore(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async add<T extends { id: string }>(storeName: string, data: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.promisifyRequest(store.add(data));
    await this.addToSyncQueue(storeName, 'create', data);
  }

  async bulkAdd<T extends { id: string }>(storeName: string, dataList: T[]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');

    for (const data of dataList) {
      await this.promisifyRequest(store.add(data));
      await this.addToSyncQueue(storeName, 'create', data);
    }
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    const store = await this.getStore(storeName, 'readonly');
    const result = await this.promisifyRequest(store.get(id));
    return (result as T) || null;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    const result = await this.promisifyRequest(store.getAll());
    return result as T[];
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: string | number
  ): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    const index = store.index(indexName);
    const result = await this.promisifyRequest(index.getAll(value));
    return result as T[];
  }

  async update<T extends { id: string }>(storeName: string, data: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.promisifyRequest(store.put(data));
    await this.addToSyncQueue(storeName, 'update', data);
  }

  async bulkUpdate<T extends { id: string }>(storeName: string, dataList: T[]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');

    for (const data of dataList) {
      await this.promisifyRequest(store.put(data));
      await this.addToSyncQueue(storeName, 'update', data);
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.promisifyRequest(store.delete(id));
    await this.addToSyncQueue(storeName, 'delete', { id });
  }

  async count(storeName: string): Promise<number> {
    const store = await this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.count());
  }

  async clear(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.promisifyRequest(store.clear());
  }

  async getPaginated<T>(
    storeName: string,
    page: number,
    pageSize: number
  ): Promise<{ data: T[]; total: number }> {
    const store = await this.getStore(storeName, 'readonly');
    const allData = (await this.promisifyRequest(store.getAll())) as T[];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: allData.slice(start, end),
      total: allData.length,
    };
  }

  private async addToSyncQueue(
    entityType: string,
    operation: string,
    data: unknown
  ): Promise<void> {
    const syncItem = {
      id: `${entityType}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    const store = await this.getStore('syncQueue', 'readwrite');
    await this.promisifyRequest(store.add(syncItem));
  }

  async getSyncQueue(): Promise<Array<{
    id: string;
    entityType: string;
    operation: string;
    data: unknown;
    timestamp: string;
    retryCount: number;
  }>> {
    return this.getAll('syncQueue');
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    await this.promisifyRequest(store.delete(id));
  }

  async clearSyncQueue(): Promise<void> {
    await this.clear('syncQueue');
  }

  async createSnapshot(storeName: string): Promise<{
    timestamp: string;
    count: number;
    data: unknown[];
  }> {
    const data = await this.getAll(storeName);
    return {
      timestamp: new Date().toISOString(),
      count: data.length,
      data,
    };
  }

  async restoreSnapshot(storeName: string, data: unknown[]): Promise<void> {
    await this.clear(storeName);
    const store = await this.getStore(storeName, 'readwrite');

    for (const item of data) {
      await this.promisifyRequest(store.put(item));
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const db = new IndexedDBStore();

export const soilSampleStore = {
  add: (data: SoilSample) => db.add('soilSamples', data),
  bulkAdd: (dataList: SoilSample[]) => db.bulkAdd('soilSamples', dataList),
  get: (id: string) => db.get<SoilSample>('soilSamples', id),
  getAll: () => db.getAll<SoilSample>('soilSamples'),
  getByFarmId: (farmId: string) => db.getByIndex<SoilSample>('soilSamples', 'farmId', farmId),
  update: (data: SoilSample) => db.update('soilSamples', data),
  delete: (id: string) => db.delete('soilSamples', id),
  count: () => db.count('soilSamples'),
  getPaginated: (page: number, pageSize: number) => db.getPaginated<SoilSample>('soilSamples', page, pageSize),
};

export const fertilizationPlanStore = {
  add: (data: FertilizationPlan) => db.add('fertilizationPlans', data),
  bulkAdd: (dataList: FertilizationPlan[]) => db.bulkAdd('fertilizationPlans', dataList),
  get: (id: string) => db.get<FertilizationPlan>('fertilizationPlans', id),
  getAll: () => db.getAll<FertilizationPlan>('fertilizationPlans'),
  getByFarmId: (farmId: string) => db.getByIndex<FertilizationPlan>('fertilizationPlans', 'farmId', farmId),
  getByStatus: (status: string) => db.getByIndex<FertilizationPlan>('fertilizationPlans', 'status', status),
  update: (data: FertilizationPlan) => db.update('fertilizationPlans', data),
  delete: (id: string) => db.delete('fertilizationPlans', id),
  count: () => db.count('fertilizationPlans'),
};

export const simulationStore = {
  add: (data: RootUptakeSimulation) => db.add('simulations', data),
  get: (id: string) => db.get<RootUptakeSimulation>('simulations', id),
  getAll: () => db.getAll<RootUptakeSimulation>('simulations'),
  getByFarmId: (farmId: string) => db.getByIndex<RootUptakeSimulation>('simulations', 'farmId', farmId),
  update: (data: RootUptakeSimulation) => db.update('simulations', data),
  delete: (id: string) => db.delete('simulations', id),
  count: () => db.count('simulations'),
};

export const supplyChainStore = {
  add: (data: SupplyChainItem) => db.add('supplyChain', data),
  get: (id: string) => db.get<SupplyChainItem>('supplyChain', id),
  getAll: () => db.getAll<SupplyChainItem>('supplyChain'),
  getByFarmId: (farmId: string) => db.getByIndex<SupplyChainItem>('supplyChain', 'farmId', farmId),
  getByStatus: (status: string) => db.getByIndex<SupplyChainItem>('supplyChain', 'status', status),
  update: (data: SupplyChainItem) => db.update('supplyChain', data),
  delete: (id: string) => db.delete('supplyChain', id),
  count: () => db.count('supplyChain'),
};

export const farmStore = {
  add: (data: Farm) => db.add('farms', data),
  get: (id: string) => db.get<Farm>('farms', id),
  getAll: () => db.getAll<Farm>('farms'),
  update: (data: Farm) => db.update('farms', data),
  delete: (id: string) => db.delete('farms', id),
  count: () => db.count('farms'),
};

export default db;
