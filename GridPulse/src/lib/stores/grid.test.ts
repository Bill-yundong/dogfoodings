import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createGridStore } from './grid';

describe('电网状态管理 Store', () => {
  let gridStore: ReturnType<typeof createGridStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    gridStore = createGridStore();
  });

  afterEach(() => {
    gridStore.stopSimulation();
    vi.useRealTimers();
  });

  describe('初始状态', () => {
    it('系统状态应有正确的默认值', () => {
      const status = get(gridStore.systemStatus);
      expect(status.currentFrequency).toBe(50.0);
      expect(status.frequencyDeviation).toBe(0.0);
      expect(status.systemState).toBe('normal');
    });

    it('发电机应正确初始化', () => {
      const grid = get(gridStore.gridSystem);
      expect(grid.generators.length).toBe(4);
      expect(grid.generators.every(g => g.status === 'online')).toBe(true);
    });

    it('告警列表应包含初始告警', () => {
      const alerts = get(gridStore.alerts);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('系统模拟', () => {
    it('应能启动和停止模拟', () => {
      const status1 = get(gridStore.systemStatus);
      vi.advanceTimersByTime(200);
      const status2 = get(gridStore.systemStatus);
      expect(status2.lastUpdate.getTime()).toBeGreaterThan(status1.lastUpdate.getTime());
    });

    it('频率应在合理范围内波动', () => {
      vi.advanceTimersByTime(1000);
      const status = get(gridStore.systemStatus);
      expect(status.currentFrequency).toBeGreaterThan(49.5);
      expect(status.currentFrequency).toBeLessThan(50.5);
    });

    it('应根据频率偏差更新系统状态', () => {
      vi.advanceTimersByTime(500);
      const status = get(gridStore.systemStatus);
      const dev = Math.abs(status.frequencyDeviation);
      
      if (dev > 0.2) {
        expect(status.systemState).toBe('emergency');
      } else if (dev > 0.1) {
        expect(status.systemState).toBe('alert');
      } else {
        expect(status.systemState).toBe('normal');
      }
    });
  });

  describe('告警管理', () => {
    it('应能添加新告警', () => {
      const initialCount = get(gridStore.alerts).length;
      gridStore.addAlert({
        type: 'frequency',
        severity: 'warning',
        message: '测试告警'
      });
      const newCount = get(gridStore.alerts).length;
      expect(newCount).toBe(initialCount + 1);
    });

    it('应能确认告警', () => {
      const alerts = get(gridStore.alerts);
      const unacknowledged = alerts.filter(a => !a.acknowledged);
      if (unacknowledged.length > 0) {
        const alertToAck = unacknowledged[0];
        gridStore.acknowledgeAlert(alertToAck.id);
        const updatedAlerts = get(gridStore.alerts);
        const updated = updatedAlerts.find(a => a.id === alertToAck.id);
        expect(updated?.acknowledged).toBe(true);
      }
    });

    it('未确认告警计数应正确', () => {
      const unackedCount = get(gridStore.unacknowledgedCount);
      const alerts = get(gridStore.alerts);
      const actualUnacked = alerts.filter(a => !a.acknowledged).length;
      expect(unackedCount).toBe(actualUnacked);
    });
  });

  describe('派生状态', () => {
    it('总惯量应正确计算', () => {
      const totalInertia = get(gridStore.totalInertia);
      const grid = get(gridStore.gridSystem);
      const expected = grid.generators
        .filter(g => g.status === 'online')
        .reduce((sum, g) => sum + g.inertia * (g.ratedPower / grid.totalCapacity), 0);
      expect(totalInertia).toBeCloseTo(expected, 5);
    });

    it('在线发电容量应正确计算', () => {
      const onlineGen = get(gridStore.onlineGeneration);
      const grid = get(gridStore.gridSystem);
      const expected = grid.generators
        .filter(g => g.status === 'online')
        .reduce((sum, g) => sum + g.ratedPower, 0);
      expect(onlineGen).toBe(expected);
    });
  });

  describe('边界条件', () => {
    it('频率偏差计算应正确', () => {
      vi.advanceTimersByTime(200);
      const status = get(gridStore.systemStatus);
      const expectedDev = status.currentFrequency - 50;
      expect(status.frequencyDeviation).toBeCloseTo(expectedDev, 3);
    });

    it('稳定裕度应在合理范围内', () => {
      vi.advanceTimersByTime(500);
      const status = get(gridStore.systemStatus);
      expect(status.stabilityMargin).toBeGreaterThanOrEqual(0.1);
      expect(status.stabilityMargin).toBeLessThanOrEqual(1);
    });
  });
});
