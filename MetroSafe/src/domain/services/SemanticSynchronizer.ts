import type { FaultSignal, CycleData, SemanticLevel } from '../../core/types';
import { SEMANTIC_MAPPINGS } from '../../core/constants';

export type ModuleType = 'maintenance' | 'operation_control';

export interface SyncStatus {
  lastSyncTime: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
}

interface QueuedSignal {
  signal: FaultSignal;
  timestamp: number;
  retryCount: number;
}

interface SyncCallback {
  (signal: FaultSignal, module: ModuleType): void;
}

class SemanticSynchronizer {
  private maintenanceQueue: QueuedSignal[] = [];
  private operationQueue: QueuedSignal[] = [];
  private syncIntervals: Map<ModuleType, number> = new Map();
  
  private maintenanceStatus: SyncStatus = {
    lastSyncTime: 0,
    syncedCount: 0,
    pendingCount: 0,
    failedCount: 0
  };
  
  private operationStatus: SyncStatus = {
    lastSyncTime: 0,
    syncedCount: 0,
    pendingCount: 0,
    failedCount: 0
  };

  private syncedSignals: Map<string, Set<ModuleType>> = new Map();
  private subscribers: Map<ModuleType, Set<SyncCallback>> = new Map([
    ['maintenance', new Set()],
    ['operation_control', new Set()]
  ]);
  private statusChangeListeners: Set<() => void> = new Set();

  constructor() {
    this.startSync();
  }

  onStatusChange(callback: () => void): () => void {
    this.statusChangeListeners.add(callback);
    return () => this.statusChangeListeners.delete(callback);
  }

  private notifyStatusChange(): void {
    this.statusChangeListeners.forEach(callback => callback());
  }

  subscribe(module: ModuleType, callback: SyncCallback): () => void {
    this.subscribers.get(module)!.add(callback);
    return () => this.subscribers.get(module)!.delete(callback);
  }

  private notifySubscribers(module: ModuleType, signal: FaultSignal): void {
    this.subscribers.get(module)!.forEach(callback => callback(signal, module));
  }

  async syncSignal(signal: FaultSignal): Promise<void> {
    this.maintenanceQueue.push({ signal, timestamp: Date.now(), retryCount: 0 });
    this.operationQueue.push({ signal, timestamp: Date.now(), retryCount: 0 });
    
    this.updatePendingCounts();
    this.notifyStatusChange();
    
    await this.processQueue('maintenance');
    await this.processQueue('operation_control');
  }

  private getSyncDelay(module: ModuleType, level: SemanticLevel): number {
    const baseDelay = module === 'maintenance' ? 80 : 50;
    const priority = SEMANTIC_MAPPINGS[level]?.priority || 4;
    return baseDelay - priority * 10 + Math.random() * 30;
  }

  private async processQueue(module: ModuleType): Promise<void> {
    const queue = module === 'maintenance' ? this.maintenanceQueue : this.operationQueue;
    const status = module === 'maintenance' ? this.maintenanceStatus : this.operationStatus;
    
    while (queue.length > 0) {
      const item = queue.shift()!;
      
      await new Promise(resolve => setTimeout(resolve, this.getSyncDelay(module, item.signal.semanticLevel)));
      
      const success = Math.random() > 0.05;
      
      if (success) {
        status.syncedCount++;
        status.lastSyncTime = Date.now();
        
        if (!this.syncedSignals.has(item.signal.id)) {
          this.syncedSignals.set(item.signal.id, new Set());
        }
        this.syncedSignals.get(item.signal.id)!.add(module);
        
        this.notifySubscribers(module, item.signal);
      } else if (item.retryCount < 3) {
        item.retryCount++;
        queue.push(item);
      } else {
        status.failedCount++;
      }
      
      this.updatePendingCounts();
      this.notifyStatusChange();
    }
  }

  private updatePendingCounts(): void {
    this.maintenanceStatus.pendingCount = this.maintenanceQueue.length;
    this.operationStatus.pendingCount = this.operationQueue.length;
  }

  getSyncStatus(module: ModuleType): SyncStatus {
    return { ...(module === 'maintenance' ? this.maintenanceStatus : this.operationStatus) };
  }

  isSignalSynced(signalId: string, module: ModuleType): boolean {
    return this.syncedSignals.get(signalId)?.has(module) || false;
  }

  getSignalSyncModules(signalId: string): ModuleType[] {
    return Array.from(this.syncedSignals.get(signalId) || []);
  }

  private startSync(): void {
    this.syncIntervals.set('maintenance', window.setInterval(() => {
      if (this.maintenanceQueue.length > 0) {
        this.processQueue('maintenance');
      }
    }, 500));

    this.syncIntervals.set('operation_control', window.setInterval(() => {
      if (this.operationQueue.length > 0) {
        this.processQueue('operation_control');
      }
    }, 300));
  }

  stopSync(): void {
    this.syncIntervals.forEach(id => clearInterval(id));
    this.syncIntervals.clear();
  }

  getStats(): {
    maintenance: SyncStatus;
    operation: SyncStatus;
    totalSynced: number;
  } {
    return {
      maintenance: { ...this.maintenanceStatus },
      operation: { ...this.operationStatus },
      totalSynced: this.maintenanceStatus.syncedCount + this.operationStatus.syncedCount
    };
  }

  async syncCycleData(cycle: CycleData, modules: ModuleType[] = ['maintenance', 'operation_control']): Promise<void> {
    for (const module of modules) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
      
      const status = module === 'maintenance' ? this.maintenanceStatus : this.operationStatus;
      status.syncedCount++;
      status.lastSyncTime = Date.now();
      this.notifyStatusChange();
    }
  }

  resetStats(): void {
    this.maintenanceStatus = {
      lastSyncTime: 0,
      syncedCount: 0,
      pendingCount: 0,
      failedCount: 0
    };
    this.operationStatus = {
      lastSyncTime: 0,
      syncedCount: 0,
      pendingCount: 0,
      failedCount: 0
    };
    this.syncedSignals.clear();
    this.maintenanceQueue = [];
    this.operationQueue = [];
    this.notifyStatusChange();
  }
}

export const semanticSynchronizer = new SemanticSynchronizer();
