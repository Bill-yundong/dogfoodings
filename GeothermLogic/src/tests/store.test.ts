import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/store/use-app-store';

describe('Zustand State Management - 状态管理模块', () => {
  beforeEach(() => {
    useAppStore.setState({
      systemStats: {
        totalBoreholes: 12580,
        activeBoreholes: 12456,
        avgGroundTemp: 15.8,
        thermalBalanceStatus: 'stable',
        overdrawRisk: 'low',
        lastUpdateTime: '2024-01-01T00:00:00.000Z',
      },
      healthStatuses: [],
      semanticMappings: [],
      boreholes: [],
      selectedBorehole: null,
      isLoading: false,
      dbInitialized: false,
    });
  });

  describe('状态初始化测试', () => {
    it('应有正确的初始状态', () => {
      const state = useAppStore.getState();

      expect(state.systemStats.totalBoreholes).toBe(12580);
      expect(state.systemStats.thermalBalanceStatus).toBe('stable');
      expect(state.boreholes).toEqual([]);
      expect(state.selectedBorehole).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.dbInitialized).toBe(false);
    });
  });

  describe('系统状态更新测试', () => {
    it('setSystemStats 应正确更新系统统计', () => {
      const newStats = {
        totalBoreholes: 13000,
        activeBoreholes: 12900,
        avgGroundTemp: 16.2,
        thermalBalanceStatus: 'warning' as const,
        overdrawRisk: 'medium' as const,
        lastUpdateTime: '2024-01-02T00:00:00.000Z',
      };

      useAppStore.getState().setSystemStats(newStats);

      const state = useAppStore.getState();
      expect(state.systemStats).toEqual(newStats);
    });

    it('refreshSystemStats 应生成新的统计数据', () => {
      const oldStats = useAppStore.getState().systemStats;

      useAppStore.getState().refreshSystemStats();

      const newStats = useAppStore.getState().systemStats;
      expect(newStats).toBeDefined();
      expect(newStats.lastUpdateTime).not.toEqual(oldStats.lastUpdateTime);
    });

    it('setHealthStatuses 应正确更新健康状态', () => {
      const newHealthStatuses = [
        { module: '测试模块', status: 'healthy' as const, message: '正常', lastCheck: '2024-01-01T00:00:00.000Z' },
      ];

      useAppStore.getState().setHealthStatuses(newHealthStatuses);

      const state = useAppStore.getState();
      expect(state.healthStatuses).toEqual(newHealthStatuses);
    });
  });

  describe('换热孔数据管理测试', () => {
    it('setBoreholes 应正确更新换热孔列表', () => {
      const mockBoreholes = [
        {
          id: 'test-001',
          name: 'BH-0001',
          depth: 100,
          diameter: 0.2,
          location: { lat: 39.9042, lng: 116.4074 },
          status: 'active' as const,
          currentTemperature: 15.5,
          lastSyncTime: '2024-01-01T00:00:00.000Z',
        },
      ];

      useAppStore.getState().setBoreholes(mockBoreholes);

      const state = useAppStore.getState();
      expect(state.boreholes).toEqual(mockBoreholes);
      expect(state.boreholes).toHaveLength(1);
    });

    it('setSelectedBorehole 应正确选中换热孔', () => {
      const mockBorehole = {
        id: 'test-002',
        name: 'BH-0002',
        depth: 120,
        diameter: 0.22,
        location: { lat: 39.9043, lng: 116.4075 },
        status: 'active' as const,
        currentTemperature: 16.0,
        lastSyncTime: '2024-01-01T00:00:00.000Z',
      };

      useAppStore.getState().setSelectedBorehole(mockBorehole);

      const state = useAppStore.getState();
      expect(state.selectedBorehole).toEqual(mockBorehole);
    });

    it('setSelectedBorehole 应支持 null 取消选中', () => {
      useAppStore.getState().setSelectedBorehole(null);

      const state = useAppStore.getState();
      expect(state.selectedBorehole).toBeNull();
    });
  });

  describe('加载状态测试', () => {
    it('setIsLoading 应正确更新加载状态', () => {
      useAppStore.getState().setIsLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);

      useAppStore.getState().setIsLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    });
  });

  describe('数据库初始化状态测试', () => {
    it('setDbInitialized 应正确更新数据库初始化状态', () => {
      useAppStore.getState().setDbInitialized(true);
      expect(useAppStore.getState().dbInitialized).toBe(true);

      useAppStore.getState().setDbInitialized(false);
      expect(useAppStore.getState().dbInitialized).toBe(false);
    });
  });

  describe('语义映射管理测试', () => {
    it('setSemanticMappings 应正确更新语义映射', () => {
      const mockMappings = [
        {
          id: 'map-001',
          sourceField: 'test_source',
          targetField: 'test_target',
          transformation: 'value * 2',
          description: '测试映射',
        },
      ];

      useAppStore.getState().setSemanticMappings(mockMappings);

      const state = useAppStore.getState();
      expect(state.semanticMappings).toEqual(mockMappings);
    });
  });
});
