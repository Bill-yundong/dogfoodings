import { create } from 'zustand';
import type {
  Location,
  SKU,
  Stacker,
  InboundTask,
  Alert,
  FragmentationInfo,
  AssociationResult,
  WarehouseStats,
  AllocationResult,
  DefragTask,
} from '@/types';
import {
  generateLocations,
  generateSKUs,
  generateStackers,
  generateInboundTasks,
  generateAlerts,
  generateFragmentationInfos,
  generateAssociationRules,
} from '@/db/mockData';
import { allocateLocation, batchAllocate } from '@/algorithms/locationAllocation';
import { analyzeWarehouseFragmentation } from '@/algorithms/fragmentationEngine';
import { calculateLiquidityScore, batchCalculateLiquidity } from '@/algorithms/liquidityScoring';

interface WarehouseState {
  locations: Location[];
  skus: SKU[];
  stackers: Stacker[];
  inboundTasks: InboundTask[];
  alerts: Alert[];
  fragmentationInfos: FragmentationInfo[];
  associationRules: AssociationResult[];
  defragTasks: DefragTask[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date;

  initData: () => Promise<void>;
  getStats: () => WarehouseStats;
  getSkuById: (id: string) => SKU | undefined;
  getLocationById: (id: string) => Location | undefined;

  updateLocationStatus: (
    locationId: string,
    status: Location['status'],
    skuId?: string
  ) => void;
  addInboundTask: (task: Omit<InboundTask, 'id' | 'createdAt'>) => void;
  updateInboundTaskStatus: (
    taskId: string,
    status: InboundTask['status'],
    updates?: Partial<InboundTask>
  ) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;

  runAllocation: (
    taskId: string
  ) => Promise<AllocationResult | null>;
  runBatchAllocation: (
    taskIds: string[]
  ) => Promise<Array<{ taskId: string; result: AllocationResult | null }>>;
  refreshFragmentationAnalysis: () => void;
  refreshSkuLiquidity: () => void;

  startDefragTask: (taskId: string) => void;
  pauseDefragTask: (taskId: string) => void;
  completeDefragTask: (taskId: string) => void;

  updateStackerStatus: (
    stackerId: string,
    status: Stacker['status'],
    updates?: Partial<Stacker>
  ) => void;

  simulateRealTimeUpdate: () => void;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  locations: [],
  skus: [],
  stackers: [],
  inboundTasks: [],
  alerts: [],
  fragmentationInfos: [],
  associationRules: [],
  defragTasks: [],
  loading: false,
  error: null,
  lastUpdate: new Date(),

  initData: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const locations = generateLocations(2000);
      const skus = generateSKUs(1000);
      const stackers = generateStackers(6);
      const inboundTasks = generateInboundTasks(20);
      const alerts = generateAlerts(10);
      const fragmentationInfos = generateFragmentationInfos(locations);
      const associationRules = generateAssociationRules(skus, 200);

      set({
        locations,
        skus,
        stackers,
        inboundTasks,
        alerts,
        fragmentationInfos,
        associationRules,
        loading: false,
        lastUpdate: new Date(),
      });
    } catch (error) {
      set({ error: '数据初始化失败', loading: false });
    }
  },

  getStats: () => {
    const { locations, skus, stackers, inboundTasks } = get();
    const totalLocations = locations.length;
    const occupiedLocations = locations.filter((l) => l.status === 'occupied').length;
    const emptyLocations = locations.filter((l) => l.status === 'empty').length;
    const reservedLocations = locations.filter((l) => l.status === 'reserved').length;
    const maintenanceLocations = locations.filter((l) => l.status === 'maintenance').length;
    const totalCapacity = locations.reduce((sum, l) => sum + l.capacity, 0);
    const usedCapacity = locations.reduce((sum, l) => sum + l.usedCapacity, 0);
    const utilizationRate = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    const fragResult = analyzeWarehouseFragmentation(locations);
    const totalSKUs = skus.length;
    const activeSKUs = skus.filter((s) => s.liquidityScore > 30).length;
    const pendingTasks = inboundTasks.filter((t) => t.status === 'pending' || t.status === 'allocating' || t.status === 'allocated' || t.status === 'executing').length;
    const avgEfficiency = stackers.length > 0
      ? stackers.reduce((sum, s) => sum + s.efficiency, 0) / stackers.length
      : 0;

    return {
      totalLocations,
      occupiedLocations,
      emptyLocations,
      reservedLocations,
      maintenanceLocations,
      totalCapacity,
      usedCapacity,
      utilizationRate,
      fragmentationIndex: fragResult.overallFragmentationIndex * 100,
      totalSKUs,
      activeSKUs,
      pendingInboundTasks: pendingTasks,
      pendingOutboundTasks: Math.floor(Math.random() * 50),
      avgStackerEfficiency: avgEfficiency,
      todayThroughput: Math.floor(500 + Math.random() * 500),
    };
  },

  getSkuById: (id) => get().skus.find((s) => s.id === id),
  getLocationById: (id) => get().locations.find((l) => l.id === id),

  updateLocationStatus: (locationId, status, skuId) => {
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === locationId
          ? { ...l, status, skuId, lastUpdated: new Date() }
          : l
      ),
      lastUpdate: new Date(),
    }));
  },

  addInboundTask: (task) => {
    const newTask: InboundTask = {
      ...task,
      id: `INB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date(),
    };
    set((state) => ({
      inboundTasks: [newTask, ...state.inboundTasks],
      lastUpdate: new Date(),
    }));
  },

  updateInboundTaskStatus: (taskId, status, updates) => {
    set((state) => ({
      inboundTasks: state.inboundTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              ...updates,
              completedAt: status === 'completed' ? new Date() : t.completedAt,
              startedAt: status === 'executing' && !t.startedAt ? new Date() : t.startedAt,
            }
          : t
      ),
      lastUpdate: new Date(),
    }));
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(),
      read: false,
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts].slice(0, 100),
      lastUpdate: new Date(),
    }));
  },

  markAlertRead: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      ),
    }));
  },

  markAllAlertsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
    }));
  },

  runAllocation: async (taskId) => {
    const { inboundTasks, locations, associationRules, skus, updateInboundTaskStatus, updateLocationStatus, addAlert } = get();
    const task = inboundTasks.find((t) => t.id === taskId);
    if (!task) return null;

    updateInboundTaskStatus(taskId, 'allocating');

    const sku = skus.find((s) => s.id === task.skuId);
    if (!sku) {
      updateInboundTaskStatus(taskId, 'failed');
      return null;
    }

    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const result = allocateLocation(
      sku,
      task.quantity,
      locations,
      associationRules,
      skuMap,
      { strategy: task.strategy }
    );

    if (result) {
      updateInboundTaskStatus(taskId, 'allocated', {
        allocatedLocation: result.locationId,
      });
      updateLocationStatus(result.locationId, 'reserved', sku.id);
      addAlert({
        type: 'success',
        title: '货位分配成功',
        message: `SKU ${sku.name} 已分配至 ${result.locationId}`,
        source: 'allocation',
        relatedId: taskId,
      });
    } else {
      updateInboundTaskStatus(taskId, 'failed');
      addAlert({
        type: 'danger',
        title: '货位分配失败',
        message: `SKU ${sku.name} 暂无合适货位`,
        source: 'allocation',
        relatedId: taskId,
      });
    }

    return result;
  },

  runBatchAllocation: async (taskIds) => {
    const { inboundTasks, locations, associationRules, skus, updateInboundTaskStatus, updateLocationStatus, addAlert } = get();
    const tasks = inboundTasks.filter((t) => taskIds.includes(t.id));
    const skuMap = new Map(skus.map((s) => [s.id, s]));

    const allocationTasks = tasks.map((t) => {
      const sku = skus.find((s) => s.id === t.skuId);
      return { sku: sku!, quantity: t.quantity, priority: t.priority };
    });

    const results = batchAllocate(
      allocationTasks,
      locations,
      associationRules,
      skuMap
    );

    const finalResults: Array<{ taskId: string; result: AllocationResult | null }> = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const result = results[i].result;
      finalResults.push({ taskId: task.id, result });

      if (result) {
        updateInboundTaskStatus(task.id, 'allocated', {
          allocatedLocation: result.locationId,
        });
        updateLocationStatus(result.locationId, 'reserved', task.skuId);
      } else {
        updateInboundTaskStatus(task.id, 'failed');
      }
    }

    addAlert({
      type: 'info',
      title: '批量分配完成',
      message: `成功分配 ${results.filter((r) => r.result).length}/${tasks.length} 个任务`,
      source: 'allocation',
    });

    return finalResults;
  },

  refreshFragmentationAnalysis: () => {
    const { locations } = get();
    const result = analyzeWarehouseFragmentation(locations);
    const newFragments = result.aisles.flatMap((a) => a.fragments);
    set({
      fragmentationInfos: newFragments,
      lastUpdate: new Date(),
    });
  },

  refreshSkuLiquidity: () => {
    const { skus } = get();
    const scores = batchCalculateLiquidity(skus);
    set((state) => ({
      skus: state.skus.map((s) => ({
        ...s,
        liquidityScore: scores.get(s.id) ?? s.liquidityScore,
      })),
      lastUpdate: new Date(),
    }));
  },

  startDefragTask: (taskId) => {
    set((state) => ({
      defragTasks: state.defragTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'running', startedAt: new Date() } : t
      ),
      lastUpdate: new Date(),
    }));
  },

  pauseDefragTask: (taskId) => {
    set((state) => ({
      defragTasks: state.defragTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'paused' } : t
      ),
      lastUpdate: new Date(),
    }));
  },

  completeDefragTask: (taskId) => {
    set((state) => ({
      defragTasks: state.defragTasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'completed', completedAt: new Date(), completedMoves: t.totalMoves }
          : t
      ),
      lastUpdate: new Date(),
    }));
  },

  updateStackerStatus: (stackerId, status, updates) => {
    set((state) => ({
      stackers: state.stackers.map((s) =>
        s.id === stackerId ? { ...s, status, ...updates } : s
      ),
      lastUpdate: new Date(),
    }));
  },

  simulateRealTimeUpdate: () => {
    set((state) => {
      const updatedStackers = state.stackers.map((s) => {
        if (s.status === 'running' && Math.random() > 0.9) {
          return {
            ...s,
            efficiency: Math.max(50, Math.min(100, s.efficiency + (Math.random() - 0.5) * 10)),
            completedTasks: Math.random() > 0.95 ? s.completedTasks + 1 : s.completedTasks,
          };
        }
        return s;
      });

      return {
        stackers: updatedStackers,
        lastUpdate: new Date(),
      };
    });
  },
}));
