import type { FaultSignal, CycleData } from '../types';
import { SemanticLevel } from '../types';

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

interface SemanticMapping {
  level: SemanticLevel;
  priority: number;
  maintenanceAction: string;
  operationAction: string;
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

  private semanticMappings: Map<SemanticLevel, SemanticMapping> = new Map([
    [SemanticLevel.INFORMATIONAL, {
      level: SemanticLevel.INFORMATIONAL,
      priority: 4,
      maintenanceAction: '记录日志',
      operationAction: '正常监控'
    }],
    [SemanticLevel.WARNING, {
      level: SemanticLevel.WARNING,
      priority: 3,
      maintenanceAction: '安排检查',
      operationAction: '密切关注'
    }],
    [SemanticLevel.CRITICAL, {
      level: SemanticLevel.CRITICAL,
      priority: 2,
      maintenanceAction: '立即检修',
      operationAction: '限制运行'
    }],
    [SemanticLevel.EMERGENCY, {
      level: SemanticLevel.EMERGENCY,
      priority: 1,
      maintenanceAction: '紧急响应',
      operationAction: '立即停运'
    }]
  ]);

  private subscribers: Map<ModuleType, Set<(signal: FaultSignal, mapping: SemanticMapping) => void>> = new Map([
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

  async syncSignal(signal: FaultSignal): Promise<void> {
    this.maintenanceQueue.push({ signal, timestamp: Date.now(), retryCount: 0 });
    this.operationQueue.push({ signal, timestamp: Date.now(), retryCount: 0 });
    
    this.updatePendingCounts();
    
    await this.processQueue('maintenance');
    await this.processQueue('operation_control');
  }

  private async processQueue(module: ModuleType): Promise<void> {
    const queue = module === 'maintenance' ? this.maintenanceQueue : this.operationQueue;
    const status = module === 'maintenance' ? this.maintenanceStatus : this.operationStatus;
    
    while (queue.length > 0) {
      const item = queue.shift()!;
      const success = await this.sendToModule(module, item.signal);
      
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

  private async sendToModule(module: ModuleType, signal: FaultSignal): Promise<boolean> {
    const baseDelay = module === 'maintenance' ? 80 : 50;
    const mapping = this.semanticMappings.get(signal.semanticLevel)!;
    const priorityFactor = mapping.priority * 10;
    
    await new Promise(resolve => setTimeout(resolve, baseDelay - priorityFactor + Math.random() * 30));
    
    return Math.random() > 0.05;
  }

  private updatePendingCounts(): void {
    this.maintenanceStatus.pendingCount = this.maintenanceQueue.length;
    this.operationStatus.pendingCount = this.operationQueue.length;
  }

  subscribe(module: ModuleType, callback: (signal: FaultSignal, mapping: SemanticMapping) => void): () => void {
    this.subscribers.get(module)!.add(callback);
    return () => this.subscribers.get(module)!.delete(callback);
  }

  private notifySubscribers(module: ModuleType, signal: FaultSignal): void {
    const mapping = this.semanticMappings.get(signal.semanticLevel)!;
    this.subscribers.get(module)!.forEach(callback => callback(signal, mapping));
  }

  getSyncStatus(module: ModuleType): SyncStatus {
    return { ...(module === 'maintenance' ? this.maintenanceStatus : this.operationStatus) };
  }

  isSignalSynced(signalId: string, module: ModuleType): boolean {
    return this.syncedSignals.get(signalId)?.has(module) || false;
  }

  getSemanticMapping(level: SemanticLevel): SemanticMapping | undefined {
    return this.semanticMappings.get(level);
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
}

export const semanticSynchronizer = new SemanticSynchronizer();
