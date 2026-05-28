import { describe, it, expect } from 'vitest';
import {
  calculateLatencyScore,
  calculateJitterScore,
  calculateLossScore,
  calculateStability,
  calculateOverallScore,
  calculatePathQuality,
  getQualityLevel,
  getQualityColor,
  getQualityBgColor,
  shouldTriggerAlert,
  getSensitivityMultiplier,
} from './quality';
import type { ProbeResult } from '@/types';
import { DEFAULT_CONFIG } from '@shared/protocol';

describe('质量计算工具函数', () => {
  describe('calculateLatencyScore', () => {
    it('应该对低时延返回高分', () => {
      expect(calculateLatencyScore(10)).toBe(100);
      expect(calculateLatencyScore(30)).toBeGreaterThan(90);
    });

    it('应该对高时延返回低分', () => {
      const scoreLow = calculateLatencyScore(10);
      const scoreHigh = calculateLatencyScore(400);
      expect(scoreHigh).toBeLessThan(scoreLow);
      expect(calculateLatencyScore(1000)).toBe(0);
    });

    it('应该在阈值范围内线性插值', () => {
      const score50 = calculateLatencyScore(50);
      const score100 = calculateLatencyScore(100);
      expect(score50).toBeGreaterThan(score100);
    });
  });

  describe('calculateJitterScore', () => {
    it('应该对低抖动返回高分', () => {
      expect(calculateJitterScore(3)).toBe(100);
      expect(calculateJitterScore(10)).toBeGreaterThan(85);
    });

    it('应该对高抖动返回低分', () => {
      expect(calculateJitterScore(80)).toBeLessThanOrEqual(20);
      expect(calculateJitterScore(200)).toBe(0);
    });
  });

  describe('calculateLossScore', () => {
    it('应该对低丢包率返回高分', () => {
      expect(calculateLossScore(0.002)).toBe(100);
      expect(calculateLossScore(0.008)).toBeGreaterThan(90);
    });

    it('应该对高丢包率返回低分', () => {
      const scoreLow = calculateLossScore(0.001);
      const scoreHigh = calculateLossScore(0.1);
      expect(scoreHigh).toBeLessThan(scoreLow);
      expect(calculateLossScore(0.3)).toBe(0);
    });
  });

  describe('calculateStability', () => {
    it('应该对数据量不足返回默认值', () => {
      expect(calculateStability([1, 2, 3])).toBe(0.5);
    });

    it('应该对稳定数据返回高稳定性', () => {
      const stable = Array(10).fill(50).map(v => v + (Math.random() - 0.5) * 2);
      expect(calculateStability(stable)).toBeGreaterThan(0.7);
    });

    it('应该对波动数据返回低稳定性', () => {
      const volatile = [10, 100, 20, 80, 30, 90, 40, 70, 50, 60];
      expect(calculateStability(volatile)).toBeLessThan(0.5);
    });
  });

  describe('calculateOverallScore', () => {
    it('应该正确加权各维度得分', () => {
      const score = calculateOverallScore(80, 80, 80, 0.8);
      expect(score).toBeCloseTo(80, 0);
    });

    it('应该在 0-100 范围内', () => {
      expect(calculateOverallScore(0, 0, 0, 0)).toBe(0);
      expect(calculateOverallScore(100, 100, 100, 1)).toBe(100);
    });
  });

  describe('calculatePathQuality', () => {
    it('应该计算完整的路径质量对象', () => {
      const results: ProbeResult[] = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'test-path',
        latency: 30 + Math.random() * 10,
        jitter: 5 + Math.random() * 3,
        packetLoss: 0.005 + Math.random() * 0.005,
        bandwidth: 200,
        hopCount: 10,
      }));

      const quality = calculatePathQuality('test-path', results, {
        trend: 'stable',
        next5sLatency: 35,
        switchRisk: 0.3,
      });

      expect(quality.pathId).toBe('test-path');
      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeLessThanOrEqual(100);
      expect(quality.prediction.trend).toBe('stable');
    });
  });

  describe('getQualityLevel', () => {
    it('应该正确映射分数到质量等级', () => {
      expect(getQualityLevel(90)).toBe('excellent');
      expect(getQualityLevel(75)).toBe('good');
      expect(getQualityLevel(50)).toBe('fair');
      expect(getQualityLevel(30)).toBe('poor');
    });
  });

  describe('getQualityColor & getQualityBgColor', () => {
    it('应该返回对应的颜色类名', () => {
      expect(getQualityColor('excellent')).toContain('green');
      expect(getQualityColor('poor')).toContain('red');
      expect(getQualityBgColor('good')).toContain('cyan');
    });
  });

  describe('shouldTriggerAlert', () => {
    const config = DEFAULT_CONFIG;

    it('应该对正常数据不触发告警', () => {
      const result: ProbeResult = {
        timestamp: Date.now(),
        pathId: 'test',
        latency: 30,
        jitter: 5,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      };
      expect(shouldTriggerAlert(result, config).shouldAlert).toBe(false);
    });

    it('应该对高时延触发 critical 告警', () => {
      const result: ProbeResult = {
        timestamp: Date.now(),
        pathId: 'test',
        latency: 300,
        jitter: 5,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      };
      const alert = shouldTriggerAlert(result, config);
      expect(alert.shouldAlert).toBe(true);
      expect(alert.severity).toBe('critical');
      expect(alert.metric).toBe('latency');
    });

    it('应该对高丢包率触发 warning 告警', () => {
      const result: ProbeResult = {
        timestamp: Date.now(),
        pathId: 'test',
        latency: 30,
        jitter: 5,
        packetLoss: 0.03,
        bandwidth: 200,
        hopCount: 10,
      };
      const alert = shouldTriggerAlert(result, config);
      expect(alert.shouldAlert).toBe(true);
      expect(alert.severity).toBe('warning');
      expect(alert.metric).toBe('packetLoss');
    });
  });

  describe('getSensitivityMultiplier', () => {
    it('应该返回正确的灵敏度乘数', () => {
      expect(getSensitivityMultiplier('low')).toBe(1.5);
      expect(getSensitivityMultiplier('medium')).toBe(1.0);
      expect(getSensitivityMultiplier('high')).toBe(0.6);
    });
  });
});
