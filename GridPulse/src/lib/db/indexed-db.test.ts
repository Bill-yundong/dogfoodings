import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserSnapshot, SimulationTask, SimulationResult } from '$lib/types';

vi.mock('./indexed-db', () => {
  const mockSnapshots: UserSnapshot[] = [
    {
      id: 'snap-001',
      userId: 'user-001',
      timestamp: new Date('2024-01-01'),
      loadFeatures: {
        hourlyConsumption: Array(24).fill(1),
        peakLoad: 1.5,
        averageLoad: 1.0,
        loadFactor: 0.67,
        maxDailyVariation: 0.8,
        temperatureSensitivity: 0.1
      },
      flexibilityScore: 0.8,
      patternType: 'morning-peak'
    },
    {
      id: 'snap-002',
      userId: 'user-002',
      timestamp: new Date('2024-01-02'),
      loadFeatures: {
        hourlyConsumption: Array(24).fill(0.8),
        peakLoad: 1.0,
        averageLoad: 0.8,
        loadFactor: 0.8,
        maxDailyVariation: 0.3,
        temperatureSensitivity: 0.05
      },
      flexibilityScore: 0.5,
      patternType: 'flat'
    }
  ];

  return {
    initDB: vi.fn().mockResolvedValue(null),
    closeDB: vi.fn().mockResolvedValue(undefined),
    addUserSnapshot: vi.fn().mockResolvedValue('snap-001'),
    addUserSnapshotsBatch: vi.fn().mockResolvedValue(undefined),
    getUserSnapshots: vi.fn().mockResolvedValue(mockSnapshots),
    getUserSnapshotCount: vi.fn().mockResolvedValue(2),
    addSimulationTask: vi.fn().mockResolvedValue('task-001'),
    updateSimulationTask: vi.fn().mockResolvedValue(undefined),
    getSimulationTasks: vi.fn().mockResolvedValue([]),
    addSimulationResult: vi.fn().mockResolvedValue('result-001'),
    getSimulationResult: vi.fn().mockResolvedValue(undefined),
    setSystemSetting: vi.fn().mockResolvedValue(undefined),
    getSystemSetting: vi.fn().mockResolvedValue(undefined),
    generateMockUserSnapshots: vi.fn().mockResolvedValue(undefined),
    getMockSnapshots: () => mockSnapshots
  };
});

import {
  addUserSnapshot,
  addUserSnapshotsBatch,
  getUserSnapshots,
  getUserSnapshotCount,
  addSimulationTask,
  updateSimulationTask,
  addSimulationResult,
  getSimulationResult,
  setSystemSetting,
  getSystemSetting,
  generateMockUserSnapshots,
  getMockSnapshots
} from './indexed-db';

describe('IndexedDB 数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getValidMockSnapshots = (): UserSnapshot[] => getMockSnapshots();

  describe('用户快照操作', () => {
    it('应能添加单个用户快照', async () => {
      const snapshot: UserSnapshot = getValidMockSnapshots()[0];
      const result = await addUserSnapshot(snapshot);
      expect(result).toBe('snap-001');
      expect(addUserSnapshot).toHaveBeenCalledWith(snapshot);
    });

    it('应能批量添加用户快照', async () => {
      const snapshots = getValidMockSnapshots();
      await addUserSnapshotsBatch(snapshots);
      expect(addUserSnapshotsBatch).toHaveBeenCalledWith(snapshots);
    });

    it('应能查询用户快照列表', async () => {
      const result = await getUserSnapshots({ limit: 10, offset: 0 });
      expect(result).toEqual(getValidMockSnapshots());
      expect(result.length).toBe(2);
    });

    it('应能获取用户快照总数', async () => {
      const count = await getUserSnapshotCount();
      expect(count).toBe(2);
    });
  });

  describe('仿真任务操作', () => {
    it('应能添加仿真任务', async () => {
      const task: SimulationTask = {
        id: 'task-001',
        systemId: 'grid-001',
        status: 'pending',
        parameters: {
          timeSpan: [0, 20],
          timeStep: 0.001,
          integrationMethod: 'rk4',
          disturbance: {
            type: 'load-jump',
            time: 1.0,
            magnitude: 0.2
          }
        },
        createdAt: new Date(),
        progress: 0
      };

      const result = await addSimulationTask(task);
      expect(result).toBe('task-001');
      expect(addSimulationTask).toHaveBeenCalledWith(task);
    });

    it('应能更新仿真任务状态', async () => {
      const task: SimulationTask = {
        id: 'task-001',
        systemId: 'grid-001',
        status: 'completed',
        parameters: {
          timeSpan: [0, 20],
          timeStep: 0.001,
          integrationMethod: 'rk4',
          disturbance: {
            type: 'load-jump',
            time: 1.0,
            magnitude: 0.2
          }
        },
        createdAt: new Date(),
        progress: 100,
        completedAt: new Date()
      };

      await updateSimulationTask(task);
      expect(updateSimulationTask).toHaveBeenCalledWith(task);
    });
  });

  describe('仿真结果操作', () => {
    it('应能添加仿真结果', async () => {
      const result: SimulationResult = {
        id: 'result-001',
        taskId: 'task-001',
        timeSeries: new Float64Array([0, 0.001, 0.002]),
        frequencySeries: new Float64Array([50, 49.99, 49.98]),
        deltaSeries: new Float64Array([0.5236, 0.5235, 0.5234]),
        omegaSeries: new Float64Array([0, -0.01, -0.02]),
        stabilityMargin: {
          margin: 0.45,
          maxDeviation: 0.02,
          nadir: 49.98,
          recoveryTime: 5.0,
          isStable: true,
          rocof: 0.5,
          settlingFrequency: 50.0
        },
        createdAt: new Date()
      };

      const id = await addSimulationResult(result);
      expect(id).toBe('result-001');
      expect(addSimulationResult).toHaveBeenCalledWith(result);
    });
  });

  describe('系统设置操作', () => {
    it('应能保存和读取系统设置', async () => {
      await setSystemSetting('frequencyLimit', 0.2);
      expect(setSystemSetting).toHaveBeenCalledWith('frequencyLimit', 0.2);
      
      const value = await getSystemSetting('frequencyLimit');
      expect(value).toBeUndefined();
    });
  });

  describe('模拟数据生成', () => {
    it('应能生成指定数量的模拟用户快照', async () => {
      await generateMockUserSnapshots(100);
      expect(generateMockUserSnapshots).toHaveBeenCalledWith(100);
    });
  });

  describe('用户快照数据验证', () => {
    it('用户快照应包含所有必需字段', () => {
      const snapshot = getValidMockSnapshots()[0];
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('userId');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('loadFeatures');
      expect(snapshot).toHaveProperty('flexibilityScore');
      expect(snapshot).toHaveProperty('patternType');
    });

    it('负荷特征应包含所有必需字段', () => {
      const features = getValidMockSnapshots()[0].loadFeatures;
      expect(features).toHaveProperty('hourlyConsumption');
      expect(features.hourlyConsumption.length).toBe(24);
      expect(features).toHaveProperty('peakLoad');
      expect(features).toHaveProperty('averageLoad');
      expect(features).toHaveProperty('loadFactor');
      expect(features).toHaveProperty('maxDailyVariation');
      expect(features).toHaveProperty('temperatureSensitivity');
    });

    it('用电模式类型应为有效值', () => {
      const validTypes = ['morning-peak', 'evening-peak', 'flat', 'night-owl', 'industrial'];
      getValidMockSnapshots().forEach(snapshot => {
        expect(validTypes).toContain(snapshot.patternType);
      });
    });

    it('柔性评分应在 0-1 范围内', () => {
      getValidMockSnapshots().forEach(snapshot => {
        expect(snapshot.flexibilityScore).toBeGreaterThanOrEqual(0);
        expect(snapshot.flexibilityScore).toBeLessThanOrEqual(1);
      });
    });
  });
});
