import { describe, it, expect } from 'vitest';
import {
  generateId,
  calculateDistance,
  determineHydrantStatus,
  formatTimestamp,
  calculatePressureTrend,
  calculateAnomalyScore,
  mergePressureReadings,
} from '../src/utils';
import { HydrantStatus, DataSource } from '../src/types';
import { PRESSURE_THRESHOLDS } from '../src/constants';

describe('工具函数 - 核心业务场景', () => {
  describe('ID 生成', () => {
    it('SC-301: 应能生成唯一的 ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id1).toMatch(/^HYD-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('SC-302: 连续生成的 ID 应具有时间顺序', () => {
      const id1 = generateId();
      const id2 = generateId();

      const parts1 = id1.split('-');
      const parts2 = id2.split('-');

      expect(parseInt(parts2[1])).toBeGreaterThanOrEqual(parseInt(parts1[1]));
    });
  });

  describe('距离计算', () => {
    it('SC-303: 应能计算两点之间的距离', () => {
      const p1 = { lng: 116.4, lat: 39.9 };
      const p2 = { lng: 116.5, lat: 40.0 };

      const distance = calculateDistance(p1, p2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20000);
    });

    it('SC-304: 同一点的距离应为 0', () => {
      const p1 = { lng: 116.4, lat: 39.9 };
      const p2 = { lng: 116.4, lat: 39.9 };

      const distance = calculateDistance(p1, p2);
      expect(distance).toBeCloseTo(0, 6);
    });

    it('SC-305: 距离计算应具有对称性', () => {
      const p1 = { lng: 116.4, lat: 39.9 };
      const p2 = { lng: 116.5, lat: 40.0 };

      const d1 = calculateDistance(p1, p2);
      const d2 = calculateDistance(p2, p1);

      expect(d1).toBeCloseTo(d2, 6);
    });
  });

  describe('消火栓状态判定', () => {
    it('SC-306: 临界压力应返回 CRITICAL 状态', () => {
      const status = determineHydrantStatus(PRESSURE_THRESHOLDS.CRITICAL - 0.01);
      expect(status).toBe(HydrantStatus.CRITICAL);
    });

    it('SC-307: 低压应返回 LOW_PRESSURE 状态', () => {
      const status = determineHydrantStatus(
        (PRESSURE_THRESHOLDS.CRITICAL + PRESSURE_THRESHOLDS.LOW) / 2
      );
      expect(status).toBe(HydrantStatus.LOW_PRESSURE);
    });

    it('SC-308: 正常压力应返回 NORMAL 状态', () => {
      const status = determineHydrantStatus(PRESSURE_THRESHOLDS.NORMAL);
      expect(status).toBe(HydrantStatus.NORMAL);
    });

    it('SC-309: 高压也应返回 NORMAL 状态', () => {
      const status = determineHydrantStatus(0.8);
      expect(status).toBe(HydrantStatus.NORMAL);
    });
  });

  describe('时间戳格式化', () => {
    it('SC-310: 应能正确格式化时间戳', () => {
      const timestamp = 1700000000000;
      const formatted = formatTimestamp(timestamp);

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('SC-311: 不同时间戳应生成不同格式', () => {
      const t1 = 1700000000000;
      const t2 = 1700000001000;

      const f1 = formatTimestamp(t1);
      const f2 = formatTimestamp(t2);

      expect(f1).not.toBe(f2);
    });
  });

  describe('压力趋势计算', () => {
    it('SC-312: 数据不足时应返回稳定趋势', () => {
      const trend = calculatePressureTrend([0.3]);
      expect(trend).toBe('stable');
    });

    it('SC-313: 上升趋势应被正确检测', () => {
      const readings = [0.3, 0.3, 0.3, 0.3, 0.35, 0.38];
      const trend = calculatePressureTrend(readings);
      expect(trend).toBe('rising');
    });

    it('SC-314: 下降趋势应被正确检测', () => {
      const readings = [0.35, 0.35, 0.35, 0.35, 0.32, 0.3];
      const trend = calculatePressureTrend(readings);
      expect(trend).toBe('falling');
    });

    it('SC-315: 稳定趋势应被正确检测', () => {
      const readings = [0.3, 0.305, 0.295, 0.3, 0.302, 0.298];
      const trend = calculatePressureTrend(readings);
      expect(trend).toBe('stable');
    });
  });

  describe('异常分数计算', () => {
    it('SC-316: 数据不足时异常分数应为 0', () => {
      const score = calculateAnomalyScore([0.3], 0.3);
      expect(score).toBe(0);
    });

    it('SC-317: 正常值应具有较低的异常分数', () => {
      const readings = [0.3, 0.31, 0.29, 0.305, 0.295];
      const score = calculateAnomalyScore(readings, 0.3);
      expect(score).toBeLessThan(1);
    });

    it('SC-318: 异常值应具有较高的异常分数', () => {
      const readings = [0.3, 0.31, 0.29, 0.305, 0.295];
      const score = calculateAnomalyScore(readings, 0.5);
      expect(score).toBeGreaterThan(1);
    });

    it('SC-319: 方差为 0 时异常分数应为 0', () => {
      const readings = [0.3, 0.3, 0.3, 0.3, 0.3];
      const score = calculateAnomalyScore(readings, 0.3);
      expect(score).toBe(0);
    });
  });

  describe('压力读数合并', () => {
    it('SC-320: 应能正确合并两个读数', () => {
      const reading1 = {
        hydrantId: 'test-001',
        pressure: 0.4,
        timestamp: Date.now(),
        source: DataSource.FIRE_DEPARTMENT,
        confidence: 0.8,
      };
      const reading2 = {
        hydrantId: 'test-001',
        pressure: 0.36,
        timestamp: Date.now(),
        source: DataSource.WATER_COMPANY,
        confidence: 0.9,
      };

      const merged = mergePressureReadings(reading1, reading2);

      expect(merged.hydrantId).toBe('test-001');
      expect(merged.pressure).toBeGreaterThan(0.36);
      expect(merged.pressure).toBeLessThan(0.4);
      expect(merged.confidence).toBeGreaterThan(0);
    });

    it('SC-321: 合并应使用置信度加权', () => {
      const reading1 = {
        hydrantId: 'test-001',
        pressure: 0.5,
        timestamp: Date.now(),
        source: DataSource.FIRE_DEPARTMENT,
        confidence: 0.9,
      };
      const reading2 = {
        hydrantId: 'test-001',
        pressure: 0.3,
        timestamp: Date.now(),
        source: DataSource.WATER_COMPANY,
        confidence: 0.1,
      };

      const merged = mergePressureReadings(reading1, reading2);

      expect(merged.pressure).toBeCloseTo(0.48, 1);
    });

    it('SC-322: 可选字段应能正确合并', () => {
      const reading1 = {
        hydrantId: 'test-001',
        pressure: 0.4,
        timestamp: Date.now() - 1000,
        source: DataSource.FIRE_DEPARTMENT,
        confidence: 0.8,
        flowRate: 10,
        temperature: 15,
      };
      const reading2 = {
        hydrantId: 'test-001',
        pressure: 0.36,
        timestamp: Date.now(),
        source: DataSource.WATER_COMPANY,
        confidence: 0.9,
        flowRate: 12,
        temperature: 16,
      };

      const merged = mergePressureReadings(reading1, reading2);

      expect(merged.flowRate).toBeCloseTo(11, 1);
      expect(merged.temperature).toBeCloseTo(15.5, 1);
      expect(merged.timestamp).toBe(reading2.timestamp);
    });

    it('SC-323: 单边可选字段应被保留', () => {
      const reading1 = {
        hydrantId: 'test-001',
        pressure: 0.4,
        timestamp: Date.now(),
        source: DataSource.FIRE_DEPARTMENT,
        confidence: 0.8,
        flowRate: 10,
      };
      const reading2 = {
        hydrantId: 'test-001',
        pressure: 0.36,
        timestamp: Date.now(),
        source: DataSource.WATER_COMPANY,
        confidence: 0.9,
      };

      const merged = mergePressureReadings(reading1, reading2);

      expect(merged.flowRate).toBe(10);
      expect(merged.temperature).toBeUndefined();
    });
  });
});
