import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWMSStore } from '../store/useWMSStore';
import type { SKU, Location, Stacker, Task } from '../types';

describe('WMS Store - 状态管理集成测试', () => {
  beforeEach(() => {
    useWMSStore.setState({
      skus: [],
      locations: [],
      stackers: [],
      tasks: [],
      isLoading: true,
      selectedSKUId: null,
      selectedLocationId: null,
      selectedStackerId: null,
      skuAnalysisCache: new Map(),
      categoryStats: [],
      liquidityDistribution: [],
      topSKUs: [],
      skuCountByLiquidity: { high: 0, medium: 0, low: 0 },
    });
  });

  describe('状态初始化', () => {
    it('应该有正确的初始状态', () => {
      const state = useWMSStore.getState();
      
      expect(state.skus).toEqual([]);
      expect(state.locations).toEqual([]);
      expect(state.stackers).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.isLoading).toBe(true);
      expect(state.selectedSKUId).toBeNull();
      expect(state.selectedLocationId).toBeNull();
      expect(state.selectedStackerId).toBeNull();
      expect(state.skuAnalysisCache.size).toBe(0);
      expect(state.categoryStats).toEqual([]);
      expect(state.liquidityDistribution).toEqual([]);
      expect(state.topSKUs).toEqual([]);
      expect(state.skuCountByLiquidity).toEqual({ high: 0, medium: 0, low: 0 });
    });
  });

  describe('initData - 数据初始化', () => {
    it('应该初始化基础数据并设置 isLoading 为 false', async () => {
      const { initData } = useWMSStore.getState();
      
      await initData();
      
      const state = useWMSStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.skus.length).toBeGreaterThan(0);
      expect(state.locations.length).toBe(800);
      expect(state.stackers.length).toBe(6);
      expect(state.tasks.length).toBe(200);
      expect(state.metrics.totalSKUs).toBe(10000);
    }, 30000);

    it('应该初始化货位数据', async () => {
      const { initData } = useWMSStore.getState();
      
      await initData();
      
      const state = useWMSStore.getState();
      const occupiedCount = state.locations.filter(l => l.status === 'occupied').length;
      const emptyCount = state.locations.filter(l => l.status === 'empty').length;
      
      expect(occupiedCount).toBeGreaterThan(0);
      expect(emptyCount).toBeGreaterThan(0);
    }, 30000);

    it('应该计算正确的货位利用率', async () => {
      const { initData } = useWMSStore.getState();
      
      await initData();
      
      const state = useWMSStore.getState();
      const occupiedCount = state.locations.filter(l => l.status === 'occupied').length;
      const expectedUtilization = occupiedCount / state.locations.length;
      
      expect(state.metrics.locationUtilization).toBeCloseTo(expectedUtilization, 2);
    }, 30000);
  });

  describe('SKU 管理', () => {
    beforeEach(async () => {
      const { initData } = useWMSStore.getState();
      await initData();
    }, 30000);

    it('getSKUById 应该根据 ID 返回正确的 SKU', () => {
      const { skus, getSKUById } = useWMSStore.getState();
      const testSKU = skus[0];
      
      const foundSKU = getSKUById(testSKU.id);
      
      expect(foundSKU).toBeDefined();
      expect(foundSKU?.id).toBe(testSKU.id);
      expect(foundSKU?.name).toBe(testSKU.name);
    });

    it('getSKUById 对于不存在的 ID 应该返回 undefined', () => {
      const { getSKUById } = useWMSStore.getState();
      
      const foundSKU = getSKUById('NON_EXISTENT_ID');
      
      expect(foundSKU).toBeUndefined();
    });

    it('getSKUAnalysis 应该返回缓存的分析结果', () => {
      const { skus, getSKUAnalysis } = useWMSStore.getState();
      const testSKU = skus[0];
      
      const analysis1 = getSKUAnalysis(testSKU.id);
      const analysis2 = getSKUAnalysis(testSKU.id);
      
      expect(analysis1).toBeDefined();
      expect(analysis2).toBeDefined();
      expect(analysis1?.overallScore).toBe(analysis2?.overallScore);
    });

    it('filterSKUs 应该按搜索词过滤', () => {
      const { skus, filterSKUs } = useWMSStore.getState();
      const searchTerm = skus[0].name.substring(0, 5);
      
      const filtered = filterSKUs(searchTerm, 'all', 'liquidity', 100);
      
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(sku => {
        expect(sku.name.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    it('filterSKUs 应该按分类过滤', () => {
      const { filterSKUs } = useWMSStore.getState();
      
      const filtered = filterSKUs('', 'electronics', 'liquidity', 100);
      
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(sku => {
        expect(sku.category).toBe('electronics');
      });
    });

    it('filterSKUs 应该按流动性降序排列', () => {
      const { filterSKUs } = useWMSStore.getState();
      
      const filtered = filterSKUs('', 'all', 'liquidity', 50);
      
      for (let i = 0; i < filtered.length - 1; i++) {
        expect(filtered[i].liquidityScore).toBeGreaterThanOrEqual(filtered[i + 1].liquidityScore);
      }
    });

    it('filterSKUs 应该限制返回数量', () => {
      const { filterSKUs } = useWMSStore.getState();
      
      const filtered = filterSKUs('', 'all', 'liquidity', 10);
      
      expect(filtered.length).toBeLessThanOrEqual(10);
    });
  });

  describe('货位管理', () => {
    beforeEach(async () => {
      const { initData } = useWMSStore.getState();
      await initData();
    }, 30000);

    it('getLocationById 应该根据 ID 返回正确的货位', () => {
      const { locations, getLocationById } = useWMSStore.getState();
      const testLocation = locations[0];
      
      const foundLocation = getLocationById(testLocation.id);
      
      expect(foundLocation).toBeDefined();
      expect(foundLocation?.id).toBe(testLocation.id);
      expect(foundLocation?.row).toBe(testLocation.row);
      expect(foundLocation?.col).toBe(testLocation.col);
      expect(foundLocation?.level).toBe(testLocation.level);
    });

    it('allocateLocation 应该返回货位推荐', () => {
      const { skus, allocateLocation } = useWMSStore.getState();
      const testSKU = skus[0];
      
      const recommendations = allocateLocation(testSKU.id);
      
      expect(recommendations).toBeDefined();
      expect(recommendations!.length).toBeGreaterThan(0);
    });

    it('allocateLocation 对于不存在的 SKU 应该返回 null', () => {
      const { allocateLocation } = useWMSStore.getState();
      
      const recommendations = allocateLocation('NON_EXISTENT_ID');
      
      expect(recommendations).toBeNull();
    });
  });

  describe('任务管理', () => {
    beforeEach(async () => {
      const { initData } = useWMSStore.getState();
      await initData();
    }, 30000);

    it('createInboundTask 应该创建入库任务', async () => {
      const { skus, locations, createInboundTask } = useWMSStore.getState();
      const testSKU = skus[0];
      const emptyLocation = locations.find(l => l.status === 'empty')!;
      
      const task = await createInboundTask(testSKU.id, emptyLocation.id);
      
      expect(task).toBeDefined();
      expect(task!.type).toBe('inbound');
      expect(task!.skuId).toBe(testSKU.id);
      expect(task!.toLocation).toBe(emptyLocation.id);
      expect(task!.status).toBe('pending');
    });

    it('createInboundTask 对于占用的货位应该返回 null', async () => {
      const { skus, locations, createInboundTask } = useWMSStore.getState();
      const testSKU = skus[0];
      const occupiedLocation = locations.find(l => l.status === 'occupied')!;
      
      const task = await createInboundTask(testSKU.id, occupiedLocation.id);
      
      expect(task).toBeNull();
    });

    it('updateTaskStatus 应该更新任务状态', () => {
      const { tasks, updateTaskStatus } = useWMSStore.getState();
      const testTask = tasks[0];
      
      updateTaskStatus(testTask.id, 'executing');
      
      const updatedTask = useWMSStore.getState().tasks.find(t => t.id === testTask.id);
      expect(updatedTask!.status).toBe('executing');
      expect(updatedTask!.startedAt).toBeDefined();
    });

    it('updateTaskStatus 完成任务应该更新货位状态', () => {
      const { tasks, locations, updateTaskStatus } = useWMSStore.getState();
      const pendingTask = tasks.find(t => t.status === 'pending')!;
      const targetLocation = locations.find(l => l.id === pendingTask.toLocation)!;
      
      updateTaskStatus(pendingTask.id, 'completed');
      
      const updatedLocation = useWMSStore.getState().locations.find(l => l.id === targetLocation.id);
      expect(updatedLocation!.status).toBe('occupied');
      expect(updatedLocation!.skuId).toBe(pendingTask.skuId);
    });

    it('getTasksByStatus 应该按状态过滤任务', () => {
      const { getTasksByStatus } = useWMSStore.getState();
      
      const pendingTasks = getTasksByStatus('pending');
      const completedTasks = getTasksByStatus('completed');
      
      expect(pendingTasks.length).toBeGreaterThan(0);
      pendingTasks.forEach(task => expect(task.status).toBe('pending'));
      completedTasks.forEach(task => expect(task.status).toBe('completed'));
    });

    it('assignTaskToStacker 应该将任务分配给堆垛机', () => {
      const { tasks, stackers, assignTaskToStacker } = useWMSStore.getState();
      const pendingTask = tasks.find(t => t.status === 'pending');
      const idleStacker = stackers.find(s => s.status === 'idle');
      
      if (pendingTask && idleStacker) {
        assignTaskToStacker(pendingTask.id, idleStacker.id);
        
        const updatedState = useWMSStore.getState();
        const updatedTask = updatedState.tasks.find(t => t.id === pendingTask.id);
        const updatedStacker = updatedState.stackers.find(s => s.id === idleStacker.id);
        
        expect(updatedTask!.status).toBe('executing');
        expect(updatedTask!.stackerId).toBe(idleStacker.id);
        expect(updatedStacker!.status).toBe('running');
      }
    });
  });

  describe('碎片整理', () => {
    beforeEach(async () => {
      const { initData } = useWMSStore.getState();
      await initData();
    }, 30000);

    it('startDefrag 应该启动碎片整理', () => {
      const { startDefrag, defragProgress } = useWMSStore.getState();
      
      startDefrag();
      
      const updatedProgress = useWMSStore.getState().defragProgress;
      expect(updatedProgress.isRunning).toBe(true);
      expect(updatedProgress.currentStep).toBe(0);
    });

    it('pauseDefrag 应该暂停碎片整理', () => {
      const { startDefrag, pauseDefrag } = useWMSStore.getState();
      
      startDefrag();
      pauseDefrag();
      
      const updatedProgress = useWMSStore.getState().defragProgress;
      expect(updatedProgress.isRunning).toBe(false);
    });

    it('runDefragStep 应该执行单步整理', () => {
      const { startDefrag, runDefragStep, defragProgress } = useWMSStore.getState();
      
      startDefrag();
      const initialStep = useWMSStore.getState().defragProgress.currentStep;
      
      runDefragStep();
      
      const updatedProgress = useWMSStore.getState().defragProgress;
      expect(updatedProgress.currentStep).toBeGreaterThan(initialStep);
    });
  });

  describe('状态选择器', () => {
    beforeEach(async () => {
      const { initData } = useWMSStore.getState();
      await initData();
    }, 30000);

    it('setCurrentPage 应该更新当前页面', () => {
      const { setCurrentPage } = useWMSStore.getState();
      
      setCurrentPage('sku');
      
      expect(useWMSStore.getState().currentPage).toBe('sku');
    });

    it('setSelectedSKUId 应该更新选中的 SKU', () => {
      const { skus, setSelectedSKUId } = useWMSStore.getState();
      
      setSelectedSKUId(skus[0].id);
      
      expect(useWMSStore.getState().selectedSKUId).toBe(skus[0].id);
    });

    it('refreshMetrics 应该更新指标数据', () => {
      const { refreshMetrics, metrics } = useWMSStore.getState();
      const oldTimestamp = metrics.timestamp;
      
      refreshMetrics();
      
      const newMetrics = useWMSStore.getState().metrics;
      expect(newMetrics.timestamp).toBeGreaterThan(oldTimestamp);
    });

    it('addRealtimeUpdate 应该添加实时更新', () => {
      const { addRealtimeUpdate, realtimeUpdates } = useWMSStore.getState();
      const initialCount = realtimeUpdates.length;
      
      addRealtimeUpdate({
        type: 'task',
        id: 'test-update',
        data: { status: 'completed' }
      });
      
      const newUpdates = useWMSStore.getState().realtimeUpdates;
      expect(newUpdates.length).toBe(initialCount + 1);
      expect(newUpdates[0].id).toBe('test-update');
    });
  });
});
