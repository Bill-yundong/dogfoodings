'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TripSnapshot, OperationLog, SyncStatus, Trip } from '@/lib/types';
import { getDB } from '@/lib/offline/db';
import { SyncEngine } from '@/lib/offline/sync-engine';
import { NetworkMonitor } from '@/lib/offline/network-monitor';
import { OperationQueue } from '@/lib/offline/operation-queue';

interface OfflineState {
  isOnline: boolean;
  networkLatency: number;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  pendingOperations: number;
  snapshots: TripSnapshot[];
  operationLogs: OperationLog[];
  syncEngine: SyncEngine | null;
  networkMonitor: NetworkMonitor | null;
  operationQueue: OperationQueue | null;
  error: string | null;
  
  initOfflineServices: () => void;
  cleanupOfflineServices: () => void;
  
  createSnapshot: (tripId: string, name?: string) => Promise<TripSnapshot>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  loadSnapshots: (tripId?: string) => Promise<void>;
  
  syncNow: () => Promise<void>;
  setAutoSync: (enabled: boolean, interval?: number) => void;
  
  loadOperationLogs: (limit?: number) => Promise<void>;
  clearOperationLogs: () => Promise<void>;
  
  forceOnline: () => void;
  forceOffline: () => void;
  
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  networkLatency: 0,
  syncStatus: 'idle' as SyncStatus,
  lastSyncTime: null,
  pendingOperations: 0,
  snapshots: [],
  operationLogs: [],
  syncEngine: null,
  networkMonitor: null,
  operationQueue: null,
  error: null,
};

let unsubscribeNetwork: (() => void) | null = null;
let unsubscribeSync: (() => void) | null = null;

export const useOfflineStore = create<OfflineState>((set, get) => ({
  ...initialState,

  initOfflineServices: () => {
    const networkMonitor = NetworkMonitor.getInstance();
    const operationQueue = OperationQueue.getInstance();
    const syncEngine = SyncEngine.getInstance();

    unsubscribeNetwork = networkMonitor.subscribe((state) => {
      set({ 
        isOnline: state.online, 
        networkLatency: state.latency 
      });
      if (state.online) {
        syncEngine.setAutoSync(true);
      } else {
        syncEngine.stopAutoSync();
      }
    });

    unsubscribeSync = syncEngine.subscribe((status) => {
      set({ syncStatus: status as SyncStatus });
      if (status === 'idle') {
        set({ lastSyncTime: new Date() });
      }
    });

    operationQueue.getStats().then(stats => {
      set({ pendingOperations: stats.pending });
    });

    set({
      networkMonitor,
      operationQueue,
      syncEngine,
    });
  },

  cleanupOfflineServices: () => {
    const { networkMonitor, syncEngine } = get();
    if (unsubscribeNetwork) {
      unsubscribeNetwork();
      unsubscribeNetwork = null;
    }
    if (unsubscribeSync) {
      unsubscribeSync();
      unsubscribeSync = null;
    }
    networkMonitor?.stop();
    syncEngine?.stopAutoSync();
  },

  createSnapshot: async (tripId, name) => {
    const db = await getDB();
    const syncEngine = SyncEngine.getInstance();
    
    const trip = await db.trips.get(tripId);
    if (!trip) {
      throw new Error('行程不存在');
    }
    
    const snapshot = await syncEngine.createSnapshot(tripId, trip.tspResult, name);
    
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots],
    }));

    return snapshot;
  },

  restoreSnapshot: async (snapshotId) => {
    const syncEngine = SyncEngine.getInstance();
    await syncEngine.restoreSnapshot(snapshotId);
  },

  deleteSnapshot: async (snapshotId) => {
    const db = await getDB();
    await db.snapshots.delete(snapshotId);
    
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== snapshotId),
    }));
  },

  loadSnapshots: async (tripId) => {
    const db = await getDB();
    let snapshots: TripSnapshot[];
    
    if (tripId) {
      const allSnapshots = await db.snapshots.toArray();
      snapshots = allSnapshots
        .filter(s => s.tripId === tripId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      snapshots = await db.snapshots
        .toArray()
        .then(arr => arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
    
    set({ snapshots });
  },

  syncNow: async () => {
    const { syncEngine } = get();
    if (!syncEngine) throw new Error('同步引擎未初始化');
    
    try {
      set({ syncStatus: 'syncing' });
      await syncEngine.syncAll();
      set({ lastSyncTime: new Date(), syncStatus: 'idle' });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '同步失败', syncStatus: 'error' });
      throw error;
    }
  },

  setAutoSync: (enabled, interval = 30000) => {
    const { syncEngine } = get();
    if (!syncEngine) return;
    
    syncEngine.setAutoSync(enabled);
  },

  loadOperationLogs: async (limit = 100) => {
    const { operationQueue } = get();
    if (!operationQueue) return;
    
    const logs = await operationQueue.getOperationLogs();
    set({ operationLogs: logs.slice(0, limit) });
  },

  clearOperationLogs: async () => {
    const { operationQueue } = get();
    if (!operationQueue) return;
    
    await operationQueue.clearOperationLogs();
    set({ operationLogs: [] });
  },

  forceOnline: () => {
    set({ isOnline: true });
  },

  forceOffline: () => {
    set({ isOnline: false });
  },

  exportData: async () => {
    const db = await getDB();
    const [trips, locations, snapshots, logs] = await Promise.all([
      db.trips.toArray(),
      db.locations.toArray(),
      db.snapshots.toArray(),
      db.operationLogs.toArray(),
    ]);
    
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: { trips, locations, snapshots, operationLogs: logs },
    };
    
    return JSON.stringify(exportData, null, 2);
  },

  importData: async (dataStr) => {
    const db = await getDB();
    const data = JSON.parse(dataStr);
    
    if (data.version !== '1.0.0') {
      throw new Error('不支持的数据版本');
    }
    
    const { trips, locations, snapshots, operationLogs } = data.data;
    
    await db.transaction('rw', [db.trips, db.locations, db.snapshots, db.operationLogs], async () => {
      await db.trips.bulkPut(trips);
      await db.locations.bulkPut(locations);
      await db.snapshots.bulkPut(snapshots);
      await db.operationLogs.bulkPut(operationLogs);
    });
  },

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
