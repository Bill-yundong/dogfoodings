import { create } from 'zustand';
import type { SyncStatusItem, SemanticTag, SyncLogEntry, SemanticSyncData } from '@/types';
import { api } from '@/services/api';
import { semanticSyncEngine } from '@/services/semanticSync';

interface SyncState {
  syncStatus: SyncStatusItem[];
  semanticTags: SemanticTag[];
  syncLogs: SyncLogEntry[];
  syncData: Record<string, SemanticSyncData>;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  conflictCount: number;

  init: () => Promise<void>;
  loadSyncStatus: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadSyncLogs: (limit?: number) => Promise<void>;
  updateTag: (tag: SemanticTag) => Promise<void>;
  syncDataItem: <T>(data: T) => Promise<SemanticSyncData | null>;
  validateConsistency: (dataId: string) => Promise<boolean>;
  resolveConflict: (dataId: string) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncStatus: [],
  semanticTags: [],
  syncLogs: [],
  syncData: {},
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,
  conflictCount: 0,

  init: async () => {
    set({ isLoading: true });
    try {
      await semanticSyncEngine.init();
      await Promise.all([
        get().loadSyncStatus(),
        get().loadTags(),
        get().loadSyncLogs(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  loadSyncStatus: async () => {
    try {
      const status = await api.getSyncStatus();
      const conflictCount = status.filter(s => s.status === 'degraded').length;
      set({ syncStatus: status, conflictCount, lastSyncTime: Date.now() });
    } catch (e) {
      console.error('Failed to load sync status:', e);
    }
  },

  loadTags: async () => {
    try {
      const tags = await api.getSemanticTags();
      set({ semanticTags: tags });
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  },

  loadSyncLogs: async (limit = 100) => {
    try {
      const logs = await semanticSyncEngine.getSyncLogs(limit);
      set({ syncLogs: logs });
    } catch (e) {
      console.error('Failed to load sync logs:', e);
    }
  },

  updateTag: async (tag: SemanticTag) => {
    try {
      const updated = await api.updateSemanticTag(tag);
      semanticSyncEngine.updateTagMapping(updated);
      set(state => ({
        semanticTags: state.semanticTags.map(t => (t.id === tag.id ? updated : t)),
      }));
    } catch (e) {
      console.error('Failed to update tag:', e);
    }
  },

  syncDataItem: async <T,>(data: T): Promise<SemanticSyncData | null> => {
    set({ isSyncing: true });
    try {
      const syncData = await semanticSyncEngine.mapToSemantic(data as any);
      set(state => ({
        syncData: { ...state.syncData, [syncData.id]: syncData },
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));
      await get().loadSyncStatus();
      return syncData;
    } catch (e) {
      set({ isSyncing: false });
      console.error('Failed to sync data:', e);
      return null;
    }
  },

  validateConsistency: async (dataId: string): Promise<boolean> => {
    const { syncData } = get();
    const data = syncData[dataId];
    if (!data) return false;

    try {
      const isValid = await semanticSyncEngine.validateConsistency(data, data, data);
      return isValid;
    } catch (e) {
      console.error('Failed to validate consistency:', e);
      return false;
    }
  },

  resolveConflict: async (dataId: string) => {
    const { syncData } = get();
    const data = syncData[dataId];
    if (!data) return;

    try {
      const resolved = await semanticSyncEngine.resolveConflict(data);
      set(state => ({
        syncData: { ...state.syncData, [dataId]: resolved },
        conflictCount: Math.max(0, state.conflictCount - 1),
      }));
      await get().loadSyncLogs();
    } catch (e) {
      console.error('Failed to resolve conflict:', e);
    }
  },
}));
