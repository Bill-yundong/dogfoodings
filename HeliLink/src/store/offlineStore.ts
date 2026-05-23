import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db';
import type { OfflineQueueItem, DataType } from '@/types';

interface OfflineState {
  isOnline: boolean;
  isOfflineMode: boolean;
  emergencyMode: boolean;
  storageStats: {
    platformMetadata: number;
    submarineCables: number;
    weatherHistory: number;
    landingHistory: number;
    offlineQueue: number;
    total: number;
  } | null;
  queueItems: OfflineQueueItem[];
  dataVersions: Record<string, number>;
  lastSyncAttempt: number | null;

  init: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
  enterEmergencyMode: () => void;
  exitEmergencyMode: () => void;
  loadStorageStats: () => Promise<void>;
  loadQueueItems: () => Promise<void>;
  addToQueue: <T>(dataType: DataType, payload: T) => Promise<void>;
  processQueue: () => Promise<number>;
  clearOldData: (days: number) => Promise<void>;
  getEmergencyGuidance: () => { steps: string[]; fallbackLanding: string[] };
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      isOfflineMode: false,
      emergencyMode: false,
      storageStats: null,
      queueItems: [],
      dataVersions: {},
      lastSyncAttempt: null,

      init: async () => {
        await Promise.all([get().loadStorageStats(), get().loadQueueItems()]);
      },

      setOnline: (online: boolean) => {
        set({ isOnline: online });
      },

      setOfflineMode: (enabled: boolean) => {
        set({ isOfflineMode: enabled });
        if (!enabled) {
          get().processQueue();
        }
      },

      enterEmergencyMode: () => {
        set({ emergencyMode: true });
      },

      exitEmergencyMode: () => {
        set({ emergencyMode: false });
      },

      loadStorageStats: async () => {
        try {
          const stats = await db.getStorageStats();
          set({ storageStats: stats });
        } catch (e) {
          console.error('Failed to load storage stats:', e);
        }
      },

      loadQueueItems: async () => {
        try {
          const items = await db.getPendingOfflineItems();
          set({ queueItems: items });
        } catch (e) {
          console.error('Failed to load queue items:', e);
        }
      },

      addToQueue: async <T,>(dataType: DataType, payload: T) => {
        try {
          const item = await db.addToOfflineQueue({ dataType, payload });
          set(state => ({
            queueItems: [...state.queueItems, item],
          }));
          await get().loadStorageStats();
        } catch (e) {
          console.error('Failed to add to queue:', e);
        }
      },

      processQueue: async () => {
        set({ lastSyncAttempt: Date.now() });
        const items = await db.getPendingOfflineItems();
        let successCount = 0;

        for (const item of items) {
          try {
            await db.offlineQueue.update(item.id, {
              status: 'processing',
              lastAttempt: Date.now(),
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            await db.offlineQueue.update(item.id, { status: 'synced' });
            successCount++;
          } catch (e) {
            await db.offlineQueue.update(item.id, {
              status: 'failed',
              retryCount: item.retryCount + 1,
              lastAttempt: Date.now(),
            });
          }
        }

        await Promise.all([get().loadStorageStats(), get().loadQueueItems()]);
        return successCount;
      },

      clearOldData: async (days: number) => {
        const cutoff = Date.now() - days * 24 * 3600000;
        try {
          const platforms = await db.platformMetadata.toArray();
          for (const platform of platforms) {
            await db.clearOldWeatherData(platform.id, cutoff);
          }
          await get().loadStorageStats();
        } catch (e) {
          console.error('Failed to clear old data:', e);
        }
      },

      getEmergencyGuidance: () => ({
        steps: [
          '立即切换至离线应急模式',
          '查看本地缓存的最近气象数据',
          '确认备用着陆点坐标',
          '建立高频无线电通信',
          '执行紧急着陆程序',
        ],
        fallbackLanding: [
          '东海一号钻井平台 (DH-01)',
          '陆地指挥中心 (CC-00)',
          '南海二号钻井平台 (NH-02)',
          '黄海四号钻井平台 (HH-04)',
        ],
      }),
    }),
    {
      name: 'helilink-offline',
      partialize: state => ({
        isOfflineMode: state.isOfflineMode,
        emergencyMode: state.emergencyMode,
        dataVersions: state.dataVersions,
      }),
    }
  )
);
