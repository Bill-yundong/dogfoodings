import { describe, it, expect } from 'vitest';
import {
  mean,
  stdDev,
  ewma,
  predictNext,
  clamp,
  generateId,
  formatDateKey,
} from './math';

describe('数学工具函数', () => {
  describe('mean', () => {
    it('应该正确计算数组平均值', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([10, 20, 30])).toBe(20);
    });

    it('对空数组应该返回 0', () => {
      expect(mean([])).toBe(0);
    });
  });

  describe('stdDev', () => {
    it('应该正确计算标准差', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(stdDev(data)).toBeCloseTo(2.138, 2);
    });

    it('对单个元素数组应该返回 0', () => {
      expect(stdDev([5])).toBe(0);
    });
  });

  describe('ewma', () => {
    it('应该正确计算指数加权移动平均', () => {
      const data = [10, 12, 11, 13, 12, 14, 13];
      const result = ewma(data, 0.3);
      expect(result).toBeGreaterThan(10);
      expect(result).toBeLessThan(14);
    });

    it('对空数组应该返回 0', () => {
      expect(ewma([], 0.3)).toBe(0);
    });
  });

  describe('predictNext', () => {
    it('应该返回预测结果对象', () => {
      const data = Array(20).fill(null).map((_, i) => 50 + i * 0.5);
      const result = predictNext(data, 5, 0.3);
      
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('confidence');
      expect(result.predictions.length).toBe(5);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('对数据不足的情况应该返回合理的默认值', () => {
      const result = predictNext([50], 5, 0.3);
      expect(result.predictions.length).toBe(5);
    });
  });

  describe('clamp', () => {
    it('应该将值限制在范围内', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('generateId', () => {
    it('应该生成唯一的 ID', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('应该生成字符串 ID', () => {
      expect(typeof generateId()).toBe('string');
      expect(generateId().length).toBeGreaterThan(0);
    });
  });

  describe('formatDateKey', () => {
    it('应该格式化日期为 YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:30:00');
      expect(formatDateKey(date)).toBe('2024-01-15');
    });

    it('应该对月份和日期补零', () => {
      const date = new Date('2024-03-05T08:00:00');
      expect(formatDateKey(date)).toBe('2024-03-05');
    });
  });
});
