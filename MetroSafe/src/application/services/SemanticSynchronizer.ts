import {
  IFaultPublisher,
  ModuleType,
  FaultSignal,
  SemanticLevel,
  SemanticSyncDelay
} from '../../domain';

type SyncCallback = (signal: FaultSignal, module: ModuleType) => void;

interface SyncStatus {
  total: number;
  synced: number;
  syncing: number;
}

interface SyncEntry {
  signalId: string;
  modules: Map<ModuleType, { status: 'pending' | 'syncing' | 'synced'; syncedAt?: number; }>;
}

export class SemanticSynchronizer implements IFaultPublisher {
  private subscribers: Map<ModuleType, Set<SyncCallback>> = new Map();
  private syncEntries: Map<string, SyncEntry> = new Map();
  private statusChangeCallbacks: Set<() => void> = new Set();

  constructor() {
    this.subscribers.set('maintenance', new Set());
    this.subscribers.set('operation_control', new Set());
  }

  onStatusChange(callback: () => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  subscribe(module: ModuleType, callback: SyncCallback): () => void {
    const callbacks = this.subscribers.get(module);
    if (callbacks) {
      callbacks.add(callback);
    }
    return () => {
      callbacks?.delete(callback);
    };
  }

  private notifyStatusChange(): void {
    this.statusChangeCallbacks.forEach(cb => cb());
  }

  private async syncToModule(signal: FaultSignal, module: ModuleType): Promise<void> {
    const delay = SemanticSyncDelay[signal.semanticLevel];

    let entry = this.syncEntries.get(signal.id);
    if (!entry) {
      entry = {
        signalId: signal.id,
        modules: new Map()
      };
      this.syncEntries.set(signal.id, entry);
    }

    entry.modules.set(module, { status: 'syncing' });
    this.notifyStatusChange();

    await new Promise(resolve => setTimeout(resolve, delay));

    const callbacks = this.subscribers.get(module);
    if (callbacks) {
      callbacks.forEach(cb => cb(signal, module));
    }

    entry.modules.set(module, { status: 'synced', syncedAt: Date.now() });
    this.notifyStatusChange();
  }

  async publish(signal: FaultSignal): Promise<void> {
    await Promise.all([
      this.syncToModule(signal, 'maintenance'),
      this.syncToModule(signal, 'operation_control')
    ]);
  }

  isSynced(signalId: string, module: ModuleType): boolean {
    const entry = this.syncEntries.get(signalId);
    if (!entry) return false;

    const moduleStatus = entry.modules.get(module);
    return moduleStatus?.status === 'synced';
  }

  getSyncStatus(module: ModuleType): SyncStatus {
    let total = 0;
    let synced = 0;
    let syncing = 0;

    this.syncEntries.forEach(entry => {
      const moduleStatus = entry.modules.get(module);
      if (moduleStatus) {
        total++;
        if (moduleStatus.status === 'synced') {
          synced++;
        } else if (moduleStatus.status === 'syncing') {
          syncing++;
        }
      }
    });

    return { total, synced, syncing };
  }
}
