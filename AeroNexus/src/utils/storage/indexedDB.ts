import type { EquipmentState, DispatchCommand, ConflictAlert, SystemSnapshot } from '@/types';

const DB_NAME = 'AeroNexusDB';
const DB_VERSION = 1;

const STORES = {
  EQUIPMENT_STATES: 'equipment_states',
  DISPATCH_COMMANDS: 'dispatch_commands',
  CONFLICT_ALERTS: 'conflict_alerts',
  SYSTEM_SNAPSHOTS: 'system_snapshots',
} as const;

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.EQUIPMENT_STATES)) {
          const equipmentStore = db.createObjectStore(STORES.EQUIPMENT_STATES, { keyPath: 'id' });
          equipmentStore.createIndex('type', 'type', { unique: false });
          equipmentStore.createIndex('status', 'status', { unique: false });
          equipmentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DISPATCH_COMMANDS)) {
          const commandsStore = db.createObjectStore(STORES.DISPATCH_COMMANDS, { keyPath: 'id' });
          commandsStore.createIndex('equipmentId', 'equipmentId', { unique: false });
          commandsStore.createIndex('status', 'status', { unique: false });
          commandsStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          commandsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CONFLICT_ALERTS)) {
          const alertsStore = db.createObjectStore(STORES.CONFLICT_ALERTS, { keyPath: 'id' });
          alertsStore.createIndex('level', 'level', { unique: false });
          alertsStore.createIndex('timestamp', 'timestamp', { unique: false });
          alertsStore.createIndex('resolved', 'resolved', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYSTEM_SNAPSHOTS)) {
          db.createObjectStore(STORES.SYSTEM_SNAPSHOTS, { keyPath: 'timestamp' });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  private async executeRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveEquipmentState(state: EquipmentState): Promise<void> {
    const store = await this.getStore(STORES.EQUIPMENT_STATES, 'readwrite');
    await this.executeRequest(store.put(state));
  }

  async saveEquipmentStates(states: EquipmentState[]): Promise<void> {
    const store = await this.getStore(STORES.EQUIPMENT_STATES, 'readwrite');
    const transaction = store.transaction;
    
    for (const state of states) {
      store.put(state);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getEquipmentState(id: string): Promise<EquipmentState | undefined> {
    const store = await this.getStore(STORES.EQUIPMENT_STATES);
    return this.executeRequest(store.get(id));
  }

  async getAllEquipmentStates(): Promise<EquipmentState[]> {
    const store = await this.getStore(STORES.EQUIPMENT_STATES);
    return this.executeRequest(store.getAll());
  }

  async saveCommand(command: DispatchCommand): Promise<void> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS, 'readwrite');
    await this.executeRequest(store.put(command));
  }

  async saveCommands(commands: DispatchCommand[]): Promise<void> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS, 'readwrite');
    const transaction = store.transaction;
    
    for (const command of commands) {
      store.put(command);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCommand(id: string): Promise<DispatchCommand | undefined> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS);
    return this.executeRequest(store.get(id));
  }

  async getCommandsByEquipment(equipmentId: string): Promise<DispatchCommand[]> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS);
    const index = store.index('equipmentId');
    return this.executeRequest(index.getAll(equipmentId));
  }

  async getCommandsByStatus(status: string): Promise<DispatchCommand[]> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS);
    const index = store.index('status');
    return this.executeRequest(index.getAll(status));
  }

  async getPendingCommands(limit: number = 100): Promise<DispatchCommand[]> {
    const store = await this.getStore(STORES.DISPATCH_COMMANDS);
    const index = store.index('scheduledTime');
    const request = index.openCursor(null, 'next');
    
    const commands: DispatchCommand[] = [];
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && commands.length < limit) {
          if (cursor.value.status === 'pending' || cursor.value.status === 'scheduled') {
            commands.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(commands);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAlert(alert: ConflictAlert): Promise<void> {
    const store = await this.getStore(STORES.CONFLICT_ALERTS, 'readwrite');
    await this.executeRequest(store.put(alert));
  }

  async getUnresolvedAlerts(): Promise<ConflictAlert[]> {
    const store = await this.getStore(STORES.CONFLICT_ALERTS);
    const index = store.index('resolved');
    return this.executeRequest(index.getAll(0));
  }

  async getAlertsByLevel(level: string): Promise<ConflictAlert[]> {
    const store = await this.getStore(STORES.CONFLICT_ALERTS);
    const index = store.index('level');
    return this.executeRequest(index.getAll(level));
  }

  async saveSnapshot(snapshot: SystemSnapshot): Promise<void> {
    const store = await this.getStore(STORES.SYSTEM_SNAPSHOTS, 'readwrite');
    await this.executeRequest(store.put(snapshot));
  }

  async getLatestSnapshot(): Promise<SystemSnapshot | undefined> {
    const store = await this.getStore(STORES.SYSTEM_SNAPSHOTS);
    const request = store.openCursor(null, 'prev');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSnapshotsInRange(startTime: number, endTime: number): Promise<SystemSnapshot[]> {
    const store = await this.getStore(STORES.SYSTEM_SNAPSHOTS);
    const range = IDBKeyRange.bound(startTime, endTime);
    return this.executeRequest(store.getAll(range));
  }

  async deleteOldSnapshots(beforeTime: number): Promise<number> {
    const store = await this.getStore(STORES.SYSTEM_SNAPSHOTS, 'readwrite');
    const range = IDBKeyRange.upperBound(beforeTime);
    const request = store.delete(range);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(1);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const stores = Object.values(STORES);
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await this.executeRequest(store.clear());
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

export const indexedDBManager = new IndexedDBManager();
