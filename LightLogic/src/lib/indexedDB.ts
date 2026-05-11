import { Building, FacadeMaterial, AlignmentData } from './types';

const DB_NAME = 'LightLogicDB';
const DB_VERSION = 1;
const STORES = {
  BUILDINGS: 'buildings',
  MATERIALS: 'materials',
  ALIGNMENT: 'alignment',
} as const;

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.MATERIALS)) {
          const materialStore = db.createObjectStore(STORES.MATERIALS, {
            keyPath: 'id',
          });
          materialStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.BUILDINGS)) {
          const buildingStore = db.createObjectStore(STORES.BUILDINGS, {
            keyPath: 'id',
          });
          buildingStore.createIndex('materialId', 'facadeMaterial.id', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORES.ALIGNMENT)) {
          const alignmentStore = db.createObjectStore(STORES.ALIGNMENT, {
            keyPath: 'id',
          });
          alignmentStore.createIndex('buildingId', 'buildingId', {
            unique: false,
          });
          alignmentStore.createIndex('status', 'status', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveMaterial(material: FacadeMaterial): Promise<void> {
    const store = await this.getStore(STORES.MATERIALS, 'readwrite');
    store.put(material);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async getMaterial(id: string): Promise<FacadeMaterial | undefined> {
    const store = await this.getStore(STORES.MATERIALS);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMaterials(): Promise<FacadeMaterial[]> {
    const store = await this.getStore(STORES.MATERIALS);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMaterial(id: string): Promise<void> {
    const store = await this.getStore(STORES.MATERIALS, 'readwrite');
    store.delete(id);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async saveBuilding(building: Building): Promise<void> {
    const store = await this.getStore(STORES.BUILDINGS, 'readwrite');
    store.put(building);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const store = await this.getStore(STORES.BUILDINGS);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllBuildings(): Promise<Building[]> {
    const store = await this.getStore(STORES.BUILDINGS);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBuilding(id: string): Promise<void> {
    const store = await this.getStore(STORES.BUILDINGS, 'readwrite');
    store.delete(id);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async saveAlignment(alignment: AlignmentData): Promise<void> {
    const store = await this.getStore(STORES.ALIGNMENT, 'readwrite');
    store.put(alignment);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async getAlignment(id: string): Promise<AlignmentData | undefined> {
    const store = await this.getStore(STORES.ALIGNMENT);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAlignments(): Promise<AlignmentData[]> {
    const store = await this.getStore(STORES.ALIGNMENT);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAlignmentsByBuilding(buildingId: string): Promise<AlignmentData[]> {
    const store = await this.getStore(STORES.ALIGNMENT);
    const index = store.index('buildingId');
    const request = index.getAll(buildingId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbManager = new IndexedDBManager();
