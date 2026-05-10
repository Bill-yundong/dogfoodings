import type { SystemCoordinateData, PantographContactState, Alert, SystemStatus } from '../types';
import { indexeddb } from './indexeddb';

type SystemType = 'catenary-detection' | 'operation-guarantee';

interface SyncQueueItem {
  data: SystemCoordinateData;
  retryCount: number;
  addedAt: number;
}

class SystemCoordinationManager {
  private syncQueue: Map<string, SyncQueueItem[]> = new Map();
  private subscribers: Map<SystemType, Set<(data: SystemCoordinateData) => void>> = new Map();
  private lastSyncTimes: Map<SystemType, number> = new Map();
  private dataQuality: Map<SystemType, number> = new Map();
  private correlationCounter = 0;
  private maxRetries = 5;

  constructor() {
    this.syncQueue.set('catenary-detection', []);
    this.syncQueue.set('operation-guarantee', []);
    this.subscribers.set('catenary-detection', new Set());
    this.subscribers.set('operation-guarantee', new Set());
    this.lastSyncTimes.set('catenary-detection', 0);
    this.lastSyncTimes.set('operation-guarantee', 0);
    this.dataQuality.set('catenary-detection', 100);
    this.dataQuality.set('operation-guarantee', 100);
  }

  submitData(data: Omit<SystemCoordinateData, 'correlationId'>): string {
    const correlationId = this.generateCorrelationId();
    const fullData: SystemCoordinateData = {
      ...data,
      correlationId
    };

    const queue = this.syncQueue.get(data.sourceSystem) || [];
    queue.push({
      data: fullData,
      retryCount: 0,
      addedAt: Date.now()
    });

    this.processQueue(data.sourceSystem);

    return correlationId;
  }

  private generateCorrelationId(): string {
    this.correlationCounter++;
    return `corr_${Date.now()}_${this.correlationCounter.toString().padStart(8, '0')}`;
  }

  private processQueue(system: SystemType): void {
    const queue = this.syncQueue.get(system) || [];
    const subscribers = this.subscribers.get(system) || new Set();

    while (queue.length > 0) {
      const item = queue.shift()!;

      let delivered = false;
      for (const subscriber of subscribers) {
        try {
          subscriber(item.data);
          delivered = true;
        } catch (error) {
          console.error(`Error delivering data to subscriber:`, error);
        }
      }

      if (!delivered && item.retryCount < this.maxRetries) {
        item.retryCount++;
        queue.unshift(item);
        setTimeout(() => this.processQueue(system), 100 * item.retryCount);
        return;
      }

      this.lastSyncTimes.set(system, Date.now());
      this.updateDataQuality(system, item);
    }
  }

  private updateDataQuality(system: SystemType, item: SyncQueueItem): void {
    const baseQuality = 100;
    const penaltyPerRetry = 5;
    const maxAge = 60000;

    const age = Date.now() - item.addedAt;
    const agePenalty = age > maxAge ? (age - maxAge) / 1000 : 0;
    const retryPenalty = item.retryCount * penaltyPerRetry;

    const quality = Math.max(0, baseQuality - agePenalty - retryPenalty);
    this.dataQuality.set(system, quality);
  }

  subscribe(
    system: SystemType,
    callback: (data: SystemCoordinateData) => void
  ): () => void {
    const subscribers = this.subscribers.get(system);
    if (subscribers) {
      subscribers.add(callback);
    }

    return () => {
      const subs = this.subscribers.get(system);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  async synchronizeDisplacementData(
    trainId: string,
    sourceData: PantographContactState
  ): Promise<void> {
    const catenaryData: SystemCoordinateData = {
      sourceSystem: 'catenary-detection',
      trainId,
      timestamp: sourceData.timestamp,
      displacementData: {
        vertical: sourceData.verticalDisplacement,
        horizontal: sourceData.horizontalDisplacement,
        longitudinal: sourceData.speed * 0.1
      },
      metadata: {
        contactForce: sourceData.contactForce,
        wearLevel: sourceData.wearLevel,
        status: sourceData.status
      },
      correlationId: this.generateCorrelationId()
    };

    this.submitData(catenaryData);

    const operationData: SystemCoordinateData = {
      sourceSystem: 'operation-guarantee',
      trainId,
      timestamp: Date.now(),
      displacementData: catenaryData.displacementData,
      metadata: {
        source: 'catenary-sync',
        syncedAt: Date.now()
      },
      correlationId: this.generateCorrelationId()
    };

    await this.syncWithOperationSystem(operationData);
  }

  private async syncWithOperationSystem(data: SystemCoordinateData): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.submitData(data);
        resolve();
      }, 50);
    });
  }

  async createAlert(
    level: Alert['level'],
    source: Alert['source'],
    message: string,
    trainId?: string,
    mileage?: number
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      trainId,
      mileage,
      acknowledged: false
    };

    await this.notifyAlertSubscribers(alert);

    return alert;
  }

  private async notifyAlertSubscribers(alert: Alert): Promise<void> {
    this.onAlert?.(alert);
  }

  onAlert?: (alert: Alert) => void;

  getSystemStatus(): SystemStatus {
    return {
      catenarySystem: {
        status: this.getSystemStatusFor('catenary-detection'),
        lastSync: this.lastSyncTimes.get('catenary-detection') || 0,
        dataQuality: this.dataQuality.get('catenary-detection') || 0
      },
      operationSystem: {
        status: this.getSystemStatusFor('operation-guarantee'),
        lastSync: this.lastSyncTimes.get('operation-guarantee') || 0,
        dataQuality: this.dataQuality.get('operation-guarantee') || 0
      },
      trajectoryStatus: {
        isTracking: false,
        frameRate: 0,
        lastUpdate: 0
      },
      databaseStatus: {
        connection: 'connected',
        cacheUsage: 0,
        lastCleanup: 0
      }
    };
  }

  private getSystemStatusFor(system: SystemType): 'active' | 'standby' | 'error' {
    const lastSync = this.lastSyncTimes.get(system) || 0;
    const timeSinceSync = Date.now() - lastSync;
    const quality = this.dataQuality.get(system) || 0;

    if (timeSinceSync > 30000) return 'error';
    if (quality < 50) return 'error';
    if (timeSinceSync > 10000) return 'standby';
    return 'active';
  }

  async getPendingQueueSize(): Promise<Record<SystemType, number>> {
    return {
      'catenary-detection': this.syncQueue.get('catenary-detection')?.length || 0,
      'operation-guarantee': this.syncQueue.get('operation-guarantee')?.length || 0
    };
  }

  clearQueues(): void {
    this.syncQueue.get('catenary-detection')?.splice(0);
    this.syncQueue.get('operation-guarantee')?.splice(0);
  }
}

export const systemCoordination = new SystemCoordinationManager();
