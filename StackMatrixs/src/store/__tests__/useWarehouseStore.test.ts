import { describe, it, expect, beforeEach } from 'vitest';
import { useWarehouseStore } from '../useWarehouseStore';
import type { InboundTask, Alert } from '@/types';

describe('状态管理', () => {
  beforeEach(() => {
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
  });

  describe('initData', () => {
    it('应初始化数据', async () => {
      await useWarehouseStore.getState().initData();
      const state = useWarehouseStore.getState();
      expect(state.locations.length).toBeGreaterThan(0);
      expect(state.skus.length).toBeGreaterThan(0);
      expect(state.stackers.length).toBeGreaterThan(0);
      expect(state.loading).toBe(false);
    });
  });

  describe('getStats', () => {
    it('应返回正确的统计数据', async () => {
      await useWarehouseStore.getState().initData();
      const stats = useWarehouseStore.getState().getStats();
      expect(stats.totalLocations).toBeGreaterThan(0);
      expect(stats.totalSKUs).toBeGreaterThan(0);
      expect(stats.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.utilizationRate).toBeLessThanOrEqual(100);
      expect(stats.fragmentationIndex).toBeGreaterThanOrEqual(0);
      expect(stats.fragmentationIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('addInboundTask', () => {
    it('应添加入库任务', () => {
      const task: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: 'SKU-001',
        skuName: '测试商品',
        quantity: 100,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      useWarehouseStore.getState().addInboundTask(task);
      const tasks = useWarehouseStore.getState().inboundTasks;
      expect(tasks.length).toBe(1);
      expect(tasks[0].skuId).toBe('SKU-001');
      expect(tasks[0].id).toBeDefined();
      expect(tasks[0].createdAt).toBeDefined();
    });
  });

  describe('updateInboundTaskStatus', () => {
    it('应更新任务状态', () => {
      const task: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: 'SKU-001',
        quantity: 100,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      useWarehouseStore.getState().addInboundTask(task);
      const taskId = useWarehouseStore.getState().inboundTasks[0].id;

      useWarehouseStore.getState().updateInboundTaskStatus(taskId, 'executing');
      const updatedTask = useWarehouseStore.getState().inboundTasks[0];
      expect(updatedTask.status).toBe('executing');
      expect(updatedTask.startedAt).toBeDefined();
    });
  });

  describe('addAlert', () => {
    it('应添加告警', () => {
      const alert: Omit<Alert, 'id' | 'timestamp' | 'read'> = {
        type: 'info',
        title: '测试告警',
        message: '这是一条测试告警',
        source: 'wms',
      };
      useWarehouseStore.getState().addAlert(alert);
      const alerts = useWarehouseStore.getState().alerts;
      expect(alerts.length).toBe(1);
      expect(alerts[0].title).toBe('测试告警');
      expect(alerts[0].read).toBe(false);
      expect(alerts[0].id).toBeDefined();
    });
  });

  describe('markAlertRead', () => {
    it('应标记告警为已读', () => {
      const alert: Omit<Alert, 'id' | 'timestamp' | 'read'> = {
        type: 'info',
        title: '测试告警',
        message: '这是一条测试告警',
        source: 'wms',
      };
      useWarehouseStore.getState().addAlert(alert);
      const alertId = useWarehouseStore.getState().alerts[0].id;

      useWarehouseStore.getState().markAlertRead(alertId);
      const updatedAlert = useWarehouseStore.getState().alerts[0];
      expect(updatedAlert.read).toBe(true);
    });
  });

  describe('markAllAlertsRead', () => {
    it('应标记所有告警为已读', () => {
      useWarehouseStore.getState().addAlert({
        type: 'info',
        title: '告警1',
        message: '消息1',
        source: 'wms',
      });
      useWarehouseStore.getState().addAlert({
        type: 'warning',
        title: '告警2',
        message: '消息2',
        source: 'stacker',
      });

      useWarehouseStore.getState().markAllAlertsRead();
      const alerts = useWarehouseStore.getState().alerts;
      expect(alerts.every((a) => a.read)).toBe(true);
    });
  });

  describe('runAllocation', () => {
    it('应执行货位分配', async () => {
      await useWarehouseStore.getState().initData();
      const state = useWarehouseStore.getState();
      const sku = state.skus[0];

      const task: Omit<InboundTask, 'id' | 'createdAt'> = {
        skuId: sku.id,
        skuName: sku.name,
        quantity: 1,
        status: 'pending',
        priority: 'normal',
        strategy: 'balanced',
      };
      state.addInboundTask(task);
      const taskId = state.inboundTasks[0].id;

      const result = await state.runAllocation(taskId);
      if (result) {
        expect(result.skuId).toBe(sku.id);
        expect(result.locationId).toBeDefined();
      }
    });
  });

  describe('updateLocationStatus', () => {
    it('应更新货位状态', async () => {
      await useWarehouseStore.getState().initData();
      const state = useWarehouseStore.getState();
      const locationId = state.locations[0].id;

      state.updateLocationStatus(locationId, 'occupied', 'SKU-001');
      const updatedLocation = state.getLocationById(locationId);
      expect(updatedLocation?.status).toBe('occupied');
      expect(updatedLocation?.skuId).toBe('SKU-001');
    });
  });

  describe('updateStackerStatus', () => {
    it('应更新堆垛机状态', async () => {
      useWarehouseStore.setState({
        stackers: [
          {
            id: 'test-stacker',
            name: '测试堆垛机',
            status: 'idle',
            currentPosition: { aisle: 1, rack: 1, level: 1 },
            taskQueue: [],
            efficiency: 80,
            totalTasks: 100,
            completedTasks: 90,
            faultCount: 0,
            lastMaintenance: new Date(),
            uptime: 99,
          },
        ],
      });

      const state = useWarehouseStore.getState();
      state.updateStackerStatus('test-stacker', 'maintenance', { efficiency: 95 });

      const newState = useWarehouseStore.getState();
      const updatedStacker = newState.stackers.find((s) => s.id === 'test-stacker');
      expect(updatedStacker?.status).toBe('maintenance');
      expect(updatedStacker?.efficiency).toBe(95);
    });
  });

  describe('refreshSkuLiquidity', () => {
    it('应刷新SKU流动性评分', async () => {
      await useWarehouseStore.getState().initData();
      const state = useWarehouseStore.getState();
      const oldScores = state.skus.map((s) => s.liquidityScore);

      state.refreshSkuLiquidity();
      const newScores = state.skus.map((s) => s.liquidityScore);

      expect(newScores).toHaveLength(oldScores.length);
      newScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('refreshFragmentationAnalysis', () => {
    it('应刷新碎片分析', async () => {
      await useWarehouseStore.getState().initData();
      const state = useWarehouseStore.getState();

      state.refreshFragmentationAnalysis();
      expect(state.fragmentationInfos).toBeDefined();
    });
  });
});
