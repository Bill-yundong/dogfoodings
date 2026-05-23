import { generateId } from '@/lib/utils/helpers';
import { getDB } from './db';
import { SyncQueueItem, OperationLog } from '@/lib/types';

export class OperationQueue {
  private db: ReturnType<typeof getDB>;

  constructor() {
    this.db = getDB();
  }

  async enqueue(
    type: SyncQueueItem['type'],
    payload: Record<string, unknown>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const item: SyncQueueItem = {
      id: generateId(),
      type,
      status: 'pending',
      payload,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    await this.db.syncQueue.add(item);
    return item.id;
  }

  async dequeue(): Promise<SyncQueueItem | undefined> {
    const item = await this.db.syncQueue
      .where('status')
      .equals('pending')
      .reverse()
      .sortBy('createdAt')
      .then(items => items[0]);

    if (item) {
      await this.db.syncQueue.update(item.id, {
        status: 'processing',
        lastAttempt: new Date().toISOString(),
      });
    }

    return item;
  }

  async markSuccess(id: string): Promise<void> {
    await this.db.syncQueue.update(id, {
      status: 'pending',
      retryCount: 0,
      lastAttempt: new Date().toISOString(),
    });
    await this.db.syncQueue.delete(id);
  }

  async markFailed(id: string, error: string, maxRetries: number = 3): Promise<void> {
    const item = await this.db.syncQueue.get(id);
    if (!item) return;

    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= maxRetries) {
      await this.db.syncQueue.update(id, {
        status: 'failed',
        error,
        retryCount: newRetryCount,
        lastAttempt: new Date().toISOString(),
      });
    } else {
      await this.db.syncQueue.update(id, {
        status: 'pending',
        error,
        retryCount: newRetryCount,
        lastAttempt: new Date().toISOString(),
      });
    }
  }

  async getPendingItems(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .where('status')
      .equals('pending')
      .reverse()
      .sortBy('createdAt');
  }

  async getFailedItems(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .where('status')
      .equals('failed')
      .reverse()
      .sortBy('createdAt');
  }

  async retryFailedItem(id: string): Promise<void> {
    await this.db.syncQueue.update(id, {
      status: 'pending',
      error: undefined,
      retryCount: 0,
      lastAttempt: undefined,
    });
  }

  async retryAllFailed(): Promise<number> {
    const failedItems = await this.getFailedItems();
    for (const item of failedItems) {
      await this.retryFailedItem(item.id);
    }
    return failedItems.length;
  }

  async removeItem(id: string): Promise<void> {
    await this.db.syncQueue.delete(id);
  }

  async clearAll(): Promise<void> {
    await this.db.syncQueue.clear();
  }

  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, failed] = await Promise.all([
      this.db.syncQueue.where('status').equals('pending').count(),
      this.db.syncQueue.where('status').equals('processing').count(),
      this.db.syncQueue.where('status').equals('failed').count(),
    ]);

    return {
      pending,
      processing,
      failed,
      total: pending + processing + failed,
    };
  }

  async createOperationLog(
    tripId: string,
    type: OperationLog['type'],
    entityType: OperationLog['entityType'],
    entityId: string,
    payload: Record<string, unknown>,
    offline: boolean
  ): Promise<OperationLog> {
    const log: OperationLog = {
      id: generateId(),
      tripId,
      entityId,
      type,
      entityType,
      payload,
      timestamp: new Date().toISOString(),
      offline,
      status: offline ? 'pending' : 'synced',
    };

    await this.db.operationLogs.add(log);
    return log;
  }

  async getOperationLogs(tripId?: string): Promise<OperationLog[]> {
    if (tripId) {
      return this.db.operationLogs
        .where('tripId')
        .equals(tripId)
        .reverse()
        .sortBy('timestamp');
    }
    return this.db.operationLogs.reverse().sortBy('timestamp');
  }

  async getOfflineOperations(): Promise<OperationLog[]> {
    const logs = await this.db.operationLogs
      .reverse()
      .sortBy('timestamp');
    return logs.filter(log => log.offline === true);
  }

  async clearOperationLogs(tripId?: string): Promise<void> {
    if (tripId) {
      await this.db.operationLogs.where('tripId').equals(tripId).delete();
    } else {
      await this.db.operationLogs.clear();
    }
  }

  static getInstance(): OperationQueue {
    return getOperationQueue();
  }
}

let operationQueueInstance: OperationQueue | null = null;

export const getOperationQueue = (): OperationQueue => {
  if (!operationQueueInstance) {
    operationQueueInstance = new OperationQueue();
  }
  return operationQueueInstance;
};
