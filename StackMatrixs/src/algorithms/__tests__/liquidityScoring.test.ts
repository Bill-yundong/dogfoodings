import { describe, it, expect } from 'vitest';
import {
  calculateRecencyScore,
  calculateFrequencyScore,
  calculateVelocityScore,
  calculateLiquidityScore,
  classifyLiquidity,
  calculateTrend,
  createSkuSnapshot,
} from '../liquidityScoring';
import type { SKU, SkuSnapshot } from '@/types';

const createMockSKU = (partial: Partial<SKU> = {}): SKU => ({
  id: 'SKU-001',
  name: '测试商品',
  category: '电子产品',
  dimensions: { length: 10, width: 10, height: 10 },
  weight: 1,
  turnoverRate: 6,
  lastInbound: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  lastOutbound: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  liquidityScore: 65,
  totalStock: 100,
  unit: '件',
  ...partial,
});

describe('流动性评分算法', () => {
  describe('calculateRecencyScore', () => {
    it('最近出库的商品应获得高分', () => {
      const sku = createMockSKU({
        lastOutbound: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const score = calculateRecencyScore(sku);
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('很久未出库的商品应获得低分', () => {
      const sku = createMockSKU({
        lastOutbound: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      const score = calculateRecencyScore(sku);
      expect(score).toBeLessThan(20);
    });

    it('分数应在 0-100 范围内', () => {
      const sku = createMockSKU();
      const score = calculateRecencyScore(sku);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateFrequencyScore', () => {
    it('高周转率商品应获得高分', () => {
      const sku = createMockSKU({
        turnoverRate: 12,
        totalStock: 1000,
        lastInbound: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      const score = calculateFrequencyScore(sku);
      expect(score).toBeGreaterThan(50);
    });

    it('低周转率商品应获得低分', () => {
      const sku = createMockSKU({
        turnoverRate: 0.5,
        totalStock: 100,
        lastInbound: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      const score = calculateFrequencyScore(sku);
      expect(score).toBeLessThan(30);
    });
  });

  describe('calculateVelocityScore', () => {
    it('高周转率应获得高分', () => {
      const sku = createMockSKU({ turnoverRate: 12 });
      const score = calculateVelocityScore(sku);
      expect(score).toBe(100);
    });

    it('零周转率应得零分', () => {
      const sku = createMockSKU({ turnoverRate: 0 });
      const score = calculateVelocityScore(sku);
      expect(score).toBe(0);
    });

    it('分数随周转率线性增长', () => {
      const sku1 = createMockSKU({ turnoverRate: 3 });
      const sku2 = createMockSKU({ turnoverRate: 6 });
      const score1 = calculateVelocityScore(sku1);
      const score2 = calculateVelocityScore(sku2);
      expect(score2).toBeGreaterThan(score1);
    });
  });

  describe('calculateLiquidityScore', () => {
    it('高流动性 SKU 应获得高分', () => {
      const sku = createMockSKU({
        turnoverRate: 10,
        lastOutbound: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const score = calculateLiquidityScore(sku);
      expect(score).toBeGreaterThan(70);
    });

    it('低流动性 SKU 应获得低分', () => {
      const sku = createMockSKU({
        turnoverRate: 1,
        lastOutbound: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      const score = calculateLiquidityScore(sku);
      expect(score).toBeLessThan(40);
    });

    it('分数应在 0-100 范围内', () => {
      const sku = createMockSKU();
      const score = calculateLiquidityScore(sku);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('classifyLiquidity', () => {
    it('正确分类热品', () => {
      expect(classifyLiquidity(90)).toBe('hot');
      expect(classifyLiquidity(75)).toBe('hot');
    });

    it('正确分类温品', () => {
      expect(classifyLiquidity(60)).toBe('warm');
      expect(classifyLiquidity(50)).toBe('warm');
    });

    it('正确分类凉品', () => {
      expect(classifyLiquidity(35)).toBe('cool');
      expect(classifyLiquidity(25)).toBe('cool');
    });

    it('正确分类冷品', () => {
      expect(classifyLiquidity(20)).toBe('cold');
      expect(classifyLiquidity(0)).toBe('cold');
    });
  });

  describe('calculateTrend', () => {
    it('不足两个快照时返回稳定', () => {
      const snapshots: SkuSnapshot[] = [
        createSkuSnapshot(createMockSKU(), 60),
      ];
      const result = calculateTrend(snapshots);
      expect(result.trend).toBe('stable');
      expect(result.change).toBe(0);
    });

    it('正确识别上升趋势', () => {
      const now = Date.now();
      const snapshots: SkuSnapshot[] = [
        {
          id: '1',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 7 * 24 * 60 * 60 * 1000),
          liquidityScore: 50,
          turnoverRate: 5,
          stockLevel: 100,
          inboundCount: 0,
          outboundCount: 0,
        },
        {
          id: '2',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
          liquidityScore: 70,
          turnoverRate: 7,
          stockLevel: 80,
          inboundCount: 0,
          outboundCount: 0,
        },
      ];
      const result = calculateTrend(snapshots);
      expect(result.trend).toBe('up');
      expect(result.change).toBe(20);
    });

    it('正确识别下降趋势', () => {
      const now = Date.now();
      const snapshots: SkuSnapshot[] = [
        {
          id: '1',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 7 * 24 * 60 * 60 * 1000),
          liquidityScore: 80,
          turnoverRate: 8,
          stockLevel: 100,
          inboundCount: 0,
          outboundCount: 0,
        },
        {
          id: '2',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
          liquidityScore: 60,
          turnoverRate: 6,
          stockLevel: 100,
          inboundCount: 0,
          outboundCount: 0,
        },
      ];
      const result = calculateTrend(snapshots);
      expect(result.trend).toBe('down');
      expect(result.change).toBe(-20);
    });

    it('小幅波动时返回稳定', () => {
      const now = Date.now();
      const snapshots: SkuSnapshot[] = [
        {
          id: '1',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 7 * 24 * 60 * 60 * 1000),
          liquidityScore: 60,
          turnoverRate: 6,
          stockLevel: 100,
          inboundCount: 0,
          outboundCount: 0,
        },
        {
          id: '2',
          skuId: 'SKU-001',
          snapshotDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
          liquidityScore: 62,
          turnoverRate: 6,
          stockLevel: 100,
          inboundCount: 0,
          outboundCount: 0,
        },
      ];
      const result = calculateTrend(snapshots);
      expect(result.trend).toBe('stable');
    });
  });
});
