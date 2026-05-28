import type { SyncQueueItem } from '@/types';
import { getDB } from './db';

type SyncOperation = 'create' | 'update' | 'delete';

interface SyncConflict<T = any> {
  entityType: string;
  entityId: string;
  localVersion: number;
  remoteVersion: number;
  localData: T;
  remoteData: T;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merged';
}

export class DataSyncManager {
  private vectorClock: Map<string, number> = new Map();
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private sourceId: string = 'web-client';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeOnlineStatus();
    }
  }

  private initializeOnlineStatus() {
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  generateVersion(entityType: string): number {
    const current = this.vectorClock.get(entityType) || 0;
    const next = current + 1;
    this.vectorClock.set(entityType, next);
    return next;
  }

  async queueForSync<T = any>(
    entityType: string,
    entityId: string,
    operation: SyncOperation,
    data: T,
    version: number
  ): Promise<void> {
    const db = getDB();
    if (!db.syncQueue) return;

    const syncItem: SyncQueueItem = {
      entityType,
      entityId,
      operation,
      data,
      version,
      timestamp: Date.now(),
      source: this.sourceId,
      retryCount: 0,
    };

    await db.syncQueue.add(syncItem);

    if (this.isOnline && !this.syncInProgress) {
      await this.processSyncQueue();
    }
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    const db = getDB();

    try {
      if (!db.syncQueue) return;

      const pendingItems = await db.syncQueue
        .orderBy('timestamp')
        .filter((item) => item.retryCount < 5)
        .toArray();

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await db.syncQueue.delete(item.id!);
        } catch (error) {
          await db.syncQueue.update(item.id!, {
            retryCount: item.retryCount + 1,
          });
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          console.log(`Synced ${item.entityType}:${item.entityId}`);
          resolve();
        } else {
          reject(new Error('Sync failed'));
        }
      }, 100);
    });
  }

  detectConflict<T>(
    localData: T & { version: number },
    remoteData: T & { version: number }
  ): boolean {
    return localData.version !== remoteData.version;
  }

  mergeThreeWay<T extends Record<string, any>>(
    local: T,
    remote: T,
    base: T
  ): { merged: T; conflicts: string[] } {
    const merged: any = { ...base };
    const conflicts: string[] = [];

    const allKeys = Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]));

    for (const key of allKeys as (keyof T)[]) {
      const localChanged = local[key] !== base[key];
      const remoteChanged = remote[key] !== base[key];

      if (localChanged && remoteChanged) {
        if (JSON.stringify(local[key]) === JSON.stringify(remote[key])) {
          merged[key] = local[key];
        } else {
          conflicts.push(key as string);
          merged[key] = local[key];
        }
      } else if (localChanged) {
        merged[key] = local[key];
      } else if (remoteChanged) {
        merged[key] = remote[key];
      }
    }

    return { merged, conflicts };
  }

  autoResolveConflict<T>(conflict: SyncConflict<T>): 'local' | 'remote' {
    if (conflict.localVersion > conflict.remoteVersion) {
      return 'local';
    }
    if (conflict.remoteVersion > conflict.localVersion) {
      return 'remote';
    }

    return 'local';
  }

  async syncWithRemote<T extends { id: string; version: number }>(
    entityType: string,
    localData: T[]
  ): Promise<{ updated: T[]; conflicts: SyncConflict[] }> {
    const updated: T[] = [];
    const conflicts: SyncConflict[] = [];

    for (const local of localData) {
      const remoteVersion = this.vectorClock.get(`${entityType}:${local.id}`) || 0;

      if (local.version < remoteVersion) {
        conflicts.push({
          entityType,
          entityId: local.id,
          localVersion: local.version,
          remoteVersion,
          localData: local,
          remoteData: { ...local, version: remoteVersion },
          resolved: false,
        });
      } else {
        updated.push(local);
        this.vectorClock.set(`${entityType}:${local.id}`, local.version);
      }
    }

    return { updated, conflicts };
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async getPendingSyncCount(): Promise<number> {
    const db = getDB();
    if (!db.syncQueue) return 0;
    return db.syncQueue.count();
  }

  async clearSyncQueue(): Promise<void> {
    const db = getDB();
    if (!db.syncQueue) return;
    await db.syncQueue.clear();
  }
}

export const syncManager = new DataSyncManager();
