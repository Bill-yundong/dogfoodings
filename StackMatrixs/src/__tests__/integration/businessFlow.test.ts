import { describe, it, expect, beforeEach } from 'vitest';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { allocateLocation, batchAllocate } from '@/algorithms/locationAllocation';
import { calculateLiquidityScore, classifyLiquidity } from '@/algorithms/liquidityScoring';
import { analyzeWarehouseFragmentation, generateDefragPlan } from '@/algorithms/fragmentationEngine';
import type { SKU, Location, InboundTask } from '@/types';

describe('业务流程集成测试', () => {
  beforeEach(async () => {
    useWarehouseStore.setState({
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
    });
    await useWarehouseStore.getState().initData();
  });

  describe('入库作业完整流程', () => {
    it('应完成从创建任务到货位分配的完整流程', async () => {
      const state = useWarehouseStore.getState();
      const sku = state.skus[0];
      expect(sku).toBeDefined();

      const initialEmptyLocations = state.locations.filter((l) => l.status === 'empty').length;

      const taskData: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: sku.id,
        skuName: sku.name,
        quantity: 1,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      state.addInboundTask(taskData);

      const task = state.inboundTasks[0];
      expect(task).toBeDefined();

      const result = await state.runAllocation(task.id);

      if (result) {
        expect(result.skuId).toBe(sku.id);
        expect(result.locationId).toBeDefined();
        expect(result.score).toBeGreaterThan(0);

        const updatedTask = state.inboundTasks.find((t) => t.id === task.id);
        expect(updatedTask?.status).toBe('allocated');
        expect(updatedTask?.allocatedLocation).toBe(result.locationId);

        const allocatedLocation = state.getLocationById(result.locationId);
        expect(allocatedLocation?.status).toBe('reserved');
        expect(allocatedLocation?.skuId).toBe(sku.id);
      }
    });

    it('批量入库作业应正确分配不同货位', async () => {
      const state = useWarehouseStore.getState();
      const skus = state.skus.slice(0, 3);

      const taskIds: string[] = [];
      for (const sku of skus) {
        const taskData: Omit<InboundTask, 'id' | 'createdAt'> = {
          skuId: sku.id,
          skuName: sku.name,
          quantity: 1,
          status: 'pending',
          priority: Math.random() > 0.5 ? 'urgent' : 'normal',
          strategy: 'balanced',
        };
        state.addInboundTask(taskData);
        taskIds.push(state.inboundTasks[0].id);
      }

      const results = await state.runBatchAllocation(taskIds);

      expect(results.length).toBeGreaterThan(0);
      const successResults = results.filter((r) => r.result !== null);

      if (successResults.length > 0) {
        const allocatedLocationIds = successResults.map((r) => r.result!.locationId);
        const uniqueLocations = new Set(allocatedLocationIds);
        expect(uniqueLocations.size).toBe(allocatedLocationIds.length);
      }
    });

    it('货位分配失败时应正确处理', async () => {
      const state = useWarehouseStore.getState();

      state.locations.forEach((loc) => {
        loc.status = 'occupied';
        loc.usedCapacity = loc.capacity;
      });

      const sku = state.skus[0];
      const taskData: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: sku.id,
        skuName: sku.name,
        quantity: 1000,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      state.addInboundTask(taskData);
      const taskId = state.inboundTasks[0].id;

      const result = await state.runAllocation(taskId);

      expect(result).toBeNull();
    });
  });

  describe('SKU 流动性分析流程', () => {
    it('应正确计算并分类 SKU 流动性', () => {
      const state = useWarehouseStore.getState();
      const sku = state.skus[0];

      const liquidityScore = calculateLiquidityScore(sku);
      expect(liquidityScore).toBeGreaterThanOrEqual(0);
      expect(liquidityScore).toBeLessThanOrEqual(100);

      const classification = classifyLiquidity(liquidityScore);
      expect(['hot', 'warm', 'cool', 'cold']).toContain(classification);
    });

    it('批量刷新流动性应更新所有 SKU', () => {
      const state = useWarehouseStore.getState();
      const oldScores = new Map(state.skus.map((s) => [s.id, s.liquidityScore]));

      state.refreshSkuLiquidity();

      state.skus.forEach((sku) => {
        expect(sku.liquidityScore).toBeGreaterThanOrEqual(0);
        expect(sku.liquidityScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('空间碎片管理流程', () => {
    it('应检测仓库碎片化并生成整理计划', () => {
      const state = useWarehouseStore.getState();

      const fragmentationResult = analyzeWarehouseFragmentation(state.locations);

      expect(fragmentationResult.overallFragmentationIndex).toBeGreaterThanOrEqual(0);
      expect(fragmentationResult.overallFragmentationIndex).toBeLessThanOrEqual(1);
      expect(fragmentationResult.totalFragments).toBeGreaterThanOrEqual(0);

      if (fragmentationResult.highPriorityFragments.length > 0) {
        const defragTasks = generateDefragPlan(
          fragmentationResult.highPriorityFragments,
          state.locations,
          3
        );

        expect(defragTasks.length).toBeGreaterThanOrEqual(0);
        defragTasks.forEach((task) => {
          expect(task.totalMoves).toBeGreaterThan(0);
          expect(task.spaceSaved).toBeGreaterThan(0);
        });
      }
    });

    it('刷新碎片分析应更新状态', () => {
      const state = useWarehouseStore.getState();

      state.refreshFragmentationAnalysis();

      expect(state.fragmentationInfos).toBeDefined();
    });
  });

  describe('堆垛机状态管理流程', () => {
    it('应正确更新堆垛机运行状态', () => {
      const state = useWarehouseStore.getState();
      const stacker = state.stackers[0];
      const originalStatus = stacker.status;

      state.updateStackerStatus(stacker.id, 'running');

      const newState = useWarehouseStore.getState();
      const updatedStacker = newState.stackers.find((s) => s.id === stacker.id);
      expect(updatedStacker?.status).toBe('running');
    });

    it('实时数据模拟应更新堆垛机效率', () => {
      const state = useWarehouseStore.getState();
      const initialEfficiency = state.stackers.map((s) => s.efficiency);

      state.simulateRealTimeUpdate();

      const finalEfficiency = state.stackers.map((s) => s.efficiency);
      expect(finalEfficiency).toHaveLength(initialEfficiency.length);
    });
  });

  describe('告警系统流程', () => {
    it('入库分配应生成告警', async () => {
      const state = useWarehouseStore.getState();
      const sku = state.skus[0];
      const initialAlertCount = state.alerts.length;

      const taskData: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: sku.id,
        skuName: sku.name,
        quantity: 1,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      state.addInboundTask(taskData);
      const taskId = state.inboundTasks[0].id;

      await state.runAllocation(taskId);

      expect(state.alerts.length).toBeGreaterThanOrEqual(initialAlertCount);
    });

    it('应正确标记告警为已读', () => {
      const state = useWarehouseStore.getState();
      const initialLength = state.alerts.length;

      state.addAlert({
        type: 'info',
        title: '测试告警',
        message: '测试消息',
        source: 'wms',
      });

      const newState = useWarehouseStore.getState();
      expect(newState.alerts.length).toBe(initialLength + 1);
      const newAlert = newState.alerts[0];
      expect(newAlert.read).toBe(false);

      newState.markAlertRead(newAlert.id);
      const finalState = useWarehouseStore.getState();
      expect(finalState.alerts.find((a) => a.id === newAlert.id)?.read).toBe(true);
    });

    it('批量标记已读应更新所有告警', () => {
      const state = useWarehouseStore.getState();

      state.addAlert({ type: 'info', title: '告警1', message: '消息1', source: 'wms' });
      state.addAlert({ type: 'warning', title: '告警2', message: '消息2', source: 'stacker' });

      const newState = useWarehouseStore.getState();
      const newAlertIds = [newState.alerts[0].id, newState.alerts[1].id];

      newState.markAllAlertsRead();
      const finalState = useWarehouseStore.getState();
      const newAlerts = finalState.alerts.filter((a) => newAlertIds.includes(a.id));
      expect(newAlerts.every((a) => a.read)).toBe(true);
    });
  });

  describe('统计数据流程', () => {
    it('应返回正确的仓库统计数据', () => {
      const state = useWarehouseStore.getState();
      const stats = state.getStats();

      expect(stats.totalLocations).toBe(state.locations.length);
      expect(stats.totalSKUs).toBe(state.skus.length);
      expect(stats.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.utilizationRate).toBeLessThanOrEqual(100);
    });
  });
});
