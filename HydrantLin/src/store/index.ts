import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import {
  Hydrant,
  PressureReading,
  PressureDistribution,
  ConflictRecord,
  HydrantStatus,
} from '../types';
import {
  getHydrants,
  getLatestReadings,
  getDBStats,
  getUnresolvedConflicts,
  bulkInsertHydrants,
  bulkInsertReadings,
  saveConflictRecord,
} from '../db';
import {
  calculatePressureTrend,
  calculateAnomalyScore,
  determineHydrantStatus,
  generateId,
} from '../utils';
import { semanticSynchronizer } from '../sync/semanticSync';
import { simulatePressureDistribution } from '../simulation/fluidDynamics';

interface AppState {
  hydrants: Hydrant[];
  pressureDistributions: Map<string, PressureDistribution>;
  conflicts: ConflictRecord[];
  selectedHydrantId: string | null;
  isLoading: boolean;
  isSimulating: boolean;
  dbStats: {
    hydrantCount: number;
    readingCount: number;
    waterMainCount: number;
    conflictCount: number;
  };
  syncStats: {
    totalMessages: number;
    synced: number;
    conflicts: number;
    failures: number;
    lastSyncTime: number;
  };
  onlineStatus: boolean;
}

const initialState: AppState = {
  hydrants: [],
  pressureDistributions: new Map(),
  conflicts: [],
  selectedHydrantId: null,
  isLoading: false,
  isSimulating: false,
  dbStats: {
    hydrantCount: 0,
    readingCount: 0,
    waterMainCount: 0,
    conflictCount: 0,
  },
  syncStats: {
    totalMessages: 0,
    synced: 0,
    conflicts: 0,
    failures: 0,
    lastSyncTime: 0,
  },
  onlineStatus: navigator.onLine,
};

export function createAppStore() {
  const [state, setState] = createStore<AppState>(initialState);
  const [error, setError] = createSignal<string | null>(null);

  const loadHydrants = async () => {
    setState('isLoading', true);
    try {
      const hydrants = await getHydrants();
      setState('hydrants', hydrants);

      for (const hydrant of hydrants) {
        await loadPressureDistribution(hydrant.id);
      }

      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载消火栓数据失败');
    } finally {
      setState('isLoading', false);
    }
  };

  const loadPressureDistribution = async (hydrantId: string) => {
    try {
      const readings = await getLatestReadings(hydrantId, 100);
      if (readings.length === 0) return;

      const pressures = readings.map((r) => r.pressure).reverse();
      const current = pressures[pressures.length - 1] || 0;
      const trend = calculatePressureTrend(pressures);
      const anomalyScore = calculateAnomalyScore(pressures, current);

      const distribution: PressureDistribution = {
        hydrantId,
        currentPressure: current,
        historicalPressure: pressures,
        trend,
        anomalyScore,
        lastUpdate: readings[0]?.timestamp || Date.now(),
      };

      setState(
        produce((s) => {
          s.pressureDistributions.set(hydrantId, distribution);
        })
      );
    } catch (err) {
      console.error(`Failed to load pressure for ${hydrantId}:`, err);
    }
  };

  const refreshStats = async () => {
    try {
      const dbStats = await getDBStats();
      setState('dbStats', dbStats);

      const conflicts = await getUnresolvedConflicts();
      setState('conflicts', conflicts);

      const syncStats = semanticSynchronizer.getStats();
      setState('syncStats', syncStats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  const selectHydrant = (id: string | null) => {
    setState('selectedHydrantId', id);
  };

  const generateMockData = async (count: number = 10000) => {
    setState('isLoading', true);
    try {
      const hydrants: Hydrant[] = [];
      const readings: PressureReading[] = [];

      for (let i = 0; i < count; i++) {
        const lng = 116.2 + Math.random() * 0.6;
        const lat = 39.7 + Math.random() * 0.6;
        const id = generateId();

        hydrants.push({
          id,
          code: `HX-${String(i + 1).padStart(6, '0')}`,
          name: `消火栓-${i + 1}`,
          position: { lng, lat },
          diameter: 100 + Math.floor(Math.random() * 50),
          elevation: Math.random() * 50,
          connectedMainId: `WM-${Math.floor(Math.random() * 100)}`,
          status: HydrantStatus.NORMAL,
          installationDate: `202${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
          region: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'][
            Math.floor(Math.random() * 5)
          ],
          address: `测试街道${i + 1}号`,
        });

        const basePressure = 0.3 + Math.random() * 0.4;
        for (let j = 0; j < 24; j++) {
          readings.push({
            hydrantId: id,
            pressure: Math.max(0.1, basePressure + (Math.random() - 0.5) * 0.1),
            timestamp: Date.now() - j * 3600000,
            source: Math.random() > 0.5
              ? 'fire_department'
              : 'water_company',
            confidence: 0.75 + Math.random() * 0.2,
            flowRate: 5 + Math.random() * 15,
            temperature: 10 + Math.random() * 15,
          });
        }
      }

      const hydrantResult = await bulkInsertHydrants(hydrants);
      const readingResult = await bulkInsertReadings(readings);

      console.log(`Generated ${count} hydrants:`, hydrantResult);
      console.log(`Generated ${readings.length} readings:`, readingResult);

      await loadHydrants();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成模拟数据失败');
    } finally {
      setState('isLoading', false);
    }
  };

  const runPressureSimulation = async () => {
    setState('isSimulating', true);
    try {
      const sourcePressures = new Map<string, number>();
      const connections = new Map<string, string[]>();
      const distances = new Map<string, number>();

      const sourceHydrants = state.hydrants.slice(0, 5);
      sourceHydrants.forEach((h) => {
        sourcePressures.set(h.id, 0.5 + Math.random() * 0.3);
      });

      for (const hydrant of state.hydrants) {
        const neighbors = state.hydrants
          .filter((h) => h.id !== hydrant.id)
          .slice(0, 3)
          .map((h) => {
            const dist = Math.random() * 1000 + 200;
            distances.set(h.id, dist);
            return h.id;
          });
        connections.set(hydrant.id, neighbors);
      }

      const results = await simulatePressureDistribution(
        sourcePressures,
        connections,
        distances,
        0.2,
        130
      );

      for (const [hydrantId, pressure] of results) {
        const existing = state.pressureDistributions.get(hydrantId);
        if (existing) {
          const status = determineHydrantStatus(pressure);
          const hydrantIndex = state.hydrants.findIndex((h) => h.id === hydrantId);
          if (hydrantIndex !== -1) {
            setState('hydrants', hydrantIndex, 'status', status);
          }

          setState(
            produce((s) => {
              const dist = s.pressureDistributions.get(hydrantId);
              if (dist) {
                dist.simulatedPressure = pressure;
              }
            })
          );
        }
      }

      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '压力模拟失败');
    } finally {
      setState('isSimulating', false);
    }
  };

  const triggerSync = async () => {
    try {
      await semanticSynchronizer.processQueue();
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    }
  };

  const updateOnlineStatus = (status: boolean) => {
    setState('onlineStatus', status);
  };

  const resolveConflict = async (
    conflict: ConflictRecord,
    resolution: 'fire_dept' | 'water_company' | 'average'
  ) => {
    try {
      const plainConflict: ConflictRecord = JSON.parse(JSON.stringify(conflict));
      const resolvedConflict: ConflictRecord = {
        ...plainConflict,
        resolved: true,
        resolution,
      };
      await saveConflictRecord(resolvedConflict);

      const index = state.conflicts.findIndex(
        (c) =>
          c.hydrantId === conflict.hydrantId &&
          c.detectedTime === conflict.detectedTime
      );
      if (index !== -1) {
        setState('conflicts', index, resolvedConflict);
      }

      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解决冲突失败');
    }
  };

  onMount(() => {
    loadHydrants();

    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    onCleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      semanticSynchronizer.destroy();
    });
  });

  createEffect(() => {
    if (state.hydrants.length > 0) {
      const interval = setInterval(() => {
        for (const hydrant of state.hydrants.slice(0, 100)) {
          const fireDeptReading = semanticSynchronizer.createFireDeptReading(
            hydrant.id,
            0.3 + Math.random() * 0.3,
            0.75 + Math.random() * 0.2
          );
          const waterCompanyReading =
            semanticSynchronizer.createWaterCompanyReading(
              hydrant.id,
              0.3 + Math.random() * 0.3,
              0.8 + Math.random() * 0.15
            );

          const fireDeptMsg = semanticSynchronizer.createSyncMessage(
            'data_sync',
            fireDeptReading,
            'fire_department'
          );
          const waterCompanyMsg = semanticSynchronizer.createSyncMessage(
            'data_sync',
            waterCompanyReading,
            'water_company'
          );

          semanticSynchronizer.queueMessage(fireDeptMsg);
          semanticSynchronizer.queueMessage(waterCompanyMsg);
        }
      }, 30000);

      onCleanup(() => clearInterval(interval));
    }
  });

  return {
    state,
    error,
    actions: {
      loadHydrants,
      selectHydrant,
      generateMockData,
      runPressureSimulation,
      triggerSync,
      refreshStats,
      resolveConflict,
      loadPressureDistribution,
    },
  };
}

export type AppStore = ReturnType<typeof createAppStore>;
