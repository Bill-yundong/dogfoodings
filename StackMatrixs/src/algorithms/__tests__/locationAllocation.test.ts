import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateSpaceUtilization,
  findAssociationScore,
  scoreLocation,
  allocateLocation,
  batchAllocate,
} from '../locationAllocation';
import type { Location, SKU, AssociationResult } from '@/types';

const createMockLocation = (partial: Partial<Location> = {}): Location => ({
  id: 'LOC-001',
  aisle: 1,
  rack: 1,
  level: 1,
  slot: 1,
  status: 'empty',
  capacity: 100000,
  usedCapacity: 0,
  heatLevel: 50,
  lastUpdated: new Date(),
  ...partial,
});

const createMockSKU = (partial: Partial<SKU> = {}): SKU => ({
  id: 'SKU-001',
  name: '测试商品',
  category: '电子产品',
  dimensions: { length: 10, width: 10, height: 10 },
  weight: 1,
  turnoverRate: 6,
  lastInbound: new Date(),
  lastOutbound: new Date(),
  liquidityScore: 65,
  totalStock: 100,
  unit: '件',
  ...partial,
});

describe('货位分配算法', () => {
  describe('calculateDistance', () => {
    it('应正确计算到货位的距离', () => {
      const loc = createMockLocation({ aisle: 3, rack: 5, level: 2 });
      const entrance = { aisle: 1, rack: 1 };
      const distance = calculateDistance(loc, entrance);
      expect(distance).toBe(4 + 4 + 1);
    });

    it('入口位置距离应为0', () => {
      const loc = createMockLocation({ aisle: 1, rack: 1, level: 0 });
      const entrance = { aisle: 1, rack: 1 };
      const distance = calculateDistance(loc, entrance);
      expect(distance).toBe(0);
    });
  });

  describe('calculateSpaceUtilization', () => {
    it('应正确计算空间利用率', () => {
      const loc = createMockLocation({ capacity: 1000, usedCapacity: 0 });
      const sku = createMockSKU({ dimensions: { length: 5, width: 5, height: 5 } });
      const utilization = calculateSpaceUtilization(loc, sku, 4);
      expect(utilization).toBe(500 / 1000);
    });

    it('满载时利用率应为1', () => {
      const loc = createMockLocation({ capacity: 100, usedCapacity: 0 });
      const sku = createMockSKU({ dimensions: { length: 10, width: 10, height: 10 } });
      const utilization = calculateSpaceUtilization(loc, sku, 100);
      expect(utilization).toBe(1);
    });
  });

  describe('findAssociationScore', () => {
    it('空货位应返回0', () => {
      const loc = createMockLocation({ skuId: undefined });
      const score = findAssociationScore('SKU-001', loc, [], new Map());
      expect(score).toBe(0);
    });

    it('存在关联时返回置信度', () => {
      const loc = createMockLocation({ skuId: 'SKU-002' });
      const associations: AssociationResult[] = [
        {
          skuId1: 'SKU-001',
          skuId2: 'SKU-002',
          confidence: 0.8,
          support: 0.1,
          lift: 2.0,
          orderCount: 100,
        },
      ];
      const skuMap = new Map([['SKU-002', createMockSKU({ id: 'SKU-002' })]]);
      const score = findAssociationScore('SKU-001', loc, associations, skuMap);
      expect(score).toBe(0.8);
    });
  });

  describe('scoreLocation', () => {
    it('应返回0-1之间的评分', () => {
      const loc = createMockLocation();
      const sku = createMockSKU();
      const config = {
        strategy: 'balanced' as const,
        weights: { liquidity: 0.3, association: 0.25, space: 0.25, distance: 0.2 },
        entrancePosition: { aisle: 1, rack: 1 },
      };
      const result = scoreLocation(loc, sku, 10, config, [], new Map());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('流动性优先策略应提高流动性权重', () => {
      const loc = createMockLocation({ heatLevel: 80 });
      const sku = createMockSKU({ liquidityScore: 80 });
      const config = {
        strategy: 'liquidity' as const,
        weights: { liquidity: 0.3, association: 0.25, space: 0.25, distance: 0.2 },
        entrancePosition: { aisle: 1, rack: 1 },
      };
      const result = scoreLocation(loc, sku, 10, config, [], new Map());
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('allocateLocation', () => {
    it('有可用货位时应返回分配结果', () => {
      const locations = [
        createMockLocation({ id: 'LOC-001', aisle: 1, rack: 1, level: 1 }),
        createMockLocation({ id: 'LOC-002', aisle: 2, rack: 1, level: 1 }),
      ];
      const sku = createMockSKU();
      const result = allocateLocation(sku, 10, locations, [], new Map());
      expect(result).not.toBeNull();
      expect(result?.skuId).toBe('SKU-001');
    });

    it('无可用货位时应返回null', () => {
      const locations = [
        createMockLocation({ id: 'LOC-001', status: 'occupied' }),
      ];
      const sku = createMockSKU();
      const result = allocateLocation(sku, 10, locations, [], new Map());
      expect(result).toBeNull();
    });

    it('容量不足时应返回null', () => {
      const locations = [
        createMockLocation({ id: 'LOC-001', capacity: 100, usedCapacity: 0 }),
      ];
      const sku = createMockSKU({ dimensions: { length: 10, width: 10, height: 10 } });
      const result = allocateLocation(sku, 100, locations, [], new Map());
      expect(result).toBeNull();
    });
  });

  describe('batchAllocate', () => {
    it('应按优先级分配货位', () => {
      const locations = [
        createMockLocation({ id: 'LOC-001', aisle: 1, rack: 1 }),
        createMockLocation({ id: 'LOC-002', aisle: 1, rack: 2 }),
        createMockLocation({ id: 'LOC-003', aisle: 2, rack: 1 }),
      ];
      const tasks = [
        { sku: createMockSKU({ id: 'SKU-001', liquidityScore: 50 }), quantity: 10, priority: 'normal' },
        { sku: createMockSKU({ id: 'SKU-002', liquidityScore: 80 }), quantity: 10, priority: 'urgent' },
      ];
      const results = batchAllocate(tasks, locations, [], new Map());
      expect(results).toHaveLength(2);
      expect(results[0].result).not.toBeNull();
      expect(results[1].result).not.toBeNull();
      expect(results[0].result?.locationId).not.toBe(results[1].result?.locationId);
    });

    it('货位不足时部分任务分配失败', () => {
      const locations = [
        createMockLocation({ id: 'LOC-001' }),
      ];
      const tasks = [
        { sku: createMockSKU({ id: 'SKU-001' }), quantity: 10 },
        { sku: createMockSKU({ id: 'SKU-002' }), quantity: 10 },
      ];
      const results = batchAllocate(tasks, locations, [], new Map());
      expect(results).toHaveLength(2);
      const successCount = results.filter((r) => r.result !== null).length;
      expect(successCount).toBe(1);
    });
  });
});
