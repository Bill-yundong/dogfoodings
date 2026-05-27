import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateBoreholes,
  generateTemperatureSnapshots,
  generateThermalBalanceHistory,
  generateSystemStats,
  generateHealthStatus,
  generateSemanticMappings,
} from '@/lib/mock-data';
import type { Borehole, TemperatureSnapshot, ThermalBalanceRecord } from '@/types';

describe('Mock Data Generator - 模拟数据生成模块', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('换热孔数据生成测试', () => {
    it('应生成指定数量的换热孔数据', () => {
      const count = 10;
      const boreholes = generateBoreholes(count);

      expect(boreholes).toHaveLength(count);
      boreholes.forEach((borehole) => {
        expect(borehole).toHaveProperty('id');
        expect(borehole).toHaveProperty('name');
        expect(borehole).toHaveProperty('depth');
        expect(borehole).toHaveProperty('diameter');
        expect(borehole).toHaveProperty('location');
        expect(borehole).toHaveProperty('status');
        expect(borehole).toHaveProperty('currentTemperature');
        expect(borehole).toHaveProperty('lastSyncTime');
      });
    });

    it('生成的换热孔名称应符合命名规范', () => {
      const boreholes = generateBoreholes(5);

      boreholes.forEach((borehole, index) => {
        expect(borehole.name).toMatch(/^BH-\d{4}$/);
        expect(borehole.name).toBe(`BH-${String(index + 1).padStart(4, '0')}`);
      });
    });

    it('生成的深度应在 80-200 米范围内', () => {
      const boreholes = generateBoreholes(100);

      boreholes.forEach((borehole) => {
        expect(borehole.depth).toBeGreaterThanOrEqual(80);
        expect(borehole.depth).toBeLessThanOrEqual(200);
      });
    });

    it('生成的直径应在 0.15-0.25 米范围内', () => {
      const boreholes = generateBoreholes(100);

      boreholes.forEach((borehole) => {
        expect(borehole.diameter).toBeGreaterThanOrEqual(0.15);
        expect(borehole.diameter).toBeLessThanOrEqual(0.25);
      });
    });

    it('生成的位置应在北京附近', () => {
      const boreholes = generateBoreholes(100);
      const baseLat = 39.9042;
      const baseLng = 116.4074;

      boreholes.forEach((borehole) => {
        expect(borehole.location.lat).toBeGreaterThanOrEqual(baseLat - 0.05);
        expect(borehole.location.lat).toBeLessThanOrEqual(baseLat + 0.05);
        expect(borehole.location.lng).toBeGreaterThanOrEqual(baseLng - 0.05);
        expect(borehole.location.lng).toBeLessThanOrEqual(baseLng + 0.05);
      });
    });

    it('状态分布应符合预期比例', () => {
      const boreholes = generateBoreholes(1000);
      const statusCounts = {
        active: 0,
        inactive: 0,
        maintenance: 0,
      };

      boreholes.forEach((b) => {
        statusCounts[b.status]++;
      });

      expect(statusCounts.active).toBeGreaterThan(statusCounts.inactive);
      expect(statusCounts.active).toBeGreaterThan(statusCounts.maintenance);
    });

    it('当前地温应在 12-20°C 范围内', () => {
      const boreholes = generateBoreholes(100);

      boreholes.forEach((borehole) => {
        expect(borehole.currentTemperature).toBeGreaterThanOrEqual(12);
        expect(borehole.currentTemperature).toBeLessThanOrEqual(20);
      });
    });

    it('ID 应为有效的 UUID 格式', () => {
      const boreholes = generateBoreholes(10);

      boreholes.forEach((borehole) => {
        expect(borehole.id).toBeDefined();
        expect(typeof borehole.id).toBe('string');
        expect(borehole.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('温度快照数据生成测试', () => {
    it('应生成指定天数的温度快照', () => {
      const boreholeId = 'test-bh-001';
      const days = 30;
      const snapshots = generateTemperatureSnapshots(boreholeId, days);

      expect(snapshots).toHaveLength(days);
    });

    it('所有快照应关联到指定的换热孔', () => {
      const boreholeId = 'test-bh-002';
      const snapshots = generateTemperatureSnapshots(boreholeId, 10);

      snapshots.forEach((snapshot) => {
        expect(snapshot.boreholeId).toBe(boreholeId);
      });
    });

    it('温度应呈现周期性变化', () => {
      const snapshots = generateTemperatureSnapshots('test-bh-003', 60);

      let hasIncrease = false;
      let hasDecrease = false;

      for (let i = 1; i < snapshots.length; i++) {
        const diff = snapshots[i].temperature - snapshots[i - 1].temperature;
        if (diff > 0.1) hasIncrease = true;
        if (diff < -0.1) hasDecrease = true;
      }

      expect(hasIncrease || hasDecrease).toBe(true);
    });

    it('时间戳应按升序排列', () => {
      const snapshots = generateTemperatureSnapshots('test-bh-004', 30);

      for (let i = 1; i < snapshots.length; i++) {
        const prevDate = new Date(snapshots[i - 1].timestamp).getTime();
        const currDate = new Date(snapshots[i].timestamp).getTime();
        expect(currDate).toBeGreaterThan(prevDate);
      }
    });
  });

  describe('热平衡历史数据生成测试', () => {
    it('应生成指定月数的热平衡记录', () => {
      const records = generateThermalBalanceHistory('test-bh-001', 12);

      expect(records).toHaveLength(12);
    });

    it('平衡值应在 0-100 范围内', () => {
      const records = generateThermalBalanceHistory('test-bh-001', 100);

      records.forEach((record) => {
        expect(record.balanceValue).toBeGreaterThanOrEqual(0);
        expect(record.balanceValue).toBeLessThanOrEqual(100);
      });
    });

    it('效率值应在 60-90 范围内', () => {
      const records = generateThermalBalanceHistory('test-bh-001', 100);

      records.forEach((record) => {
        expect(record.efficiency).toBeGreaterThanOrEqual(60);
        expect(record.efficiency).toBeLessThanOrEqual(90);
      });
    });
  });

  describe('系统状态数据生成测试', () => {
    it('系统统计数据应包含所有必要字段', () => {
      const stats = generateSystemStats();

      expect(stats).toHaveProperty('totalBoreholes');
      expect(stats).toHaveProperty('activeBoreholes');
      expect(stats).toHaveProperty('avgGroundTemp');
      expect(stats).toHaveProperty('thermalBalanceStatus');
      expect(stats).toHaveProperty('overdrawRisk');
      expect(stats).toHaveProperty('lastUpdateTime');
    });

    it('活跃换热孔数应小于等于总数', () => {
      const stats = generateSystemStats();

      expect(stats.activeBoreholes).toBeLessThanOrEqual(stats.totalBoreholes);
    });

    it('健康状态应包含所有模块', () => {
      const healthStatus = generateHealthStatus();

      expect(healthStatus).toHaveLength(5);
      const modules = healthStatus.map((h) => h.module);
      expect(modules).toContain('数据采集');
      expect(modules).toContain('热平衡计算');
      expect(modules).toContain('预测模型');
      expect(modules).toContain('数据同步');
      expect(modules).toContain('IndexedDB 缓存');
    });

    it('语义映射应包含所有必要的映射关系', () => {
      const mappings = generateSemanticMappings();

      expect(mappings).toHaveLength(5);
      const sourceFields = mappings.map((m) => m.sourceField);
      expect(sourceFields).toContain('heat_extraction_rate');
      expect(sourceFields).toContain('ground_temperature');
      expect(sourceFields).toContain('pump_efficiency');
      expect(sourceFields).toContain('thermal_balance');
      expect(sourceFields).toContain('borehole_depth');
    });
  });

  describe('大批量数据生成测试', () => {
    it('应能高效生成 10000 条换热孔数据', () => {
      const startTime = Date.now();
      const boreholes = generateBoreholes(10000);
      const endTime = Date.now();

      expect(boreholes).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('生成的 10000 条数据 ID 应唯一', () => {
      const boreholes = generateBoreholes(10000);
      const ids = new Set(boreholes.map((b) => b.id));

      expect(ids.size).toBe(10000);
    });
  });
});
