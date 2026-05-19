import { describe, it, expect } from 'vitest';
import { allocationEngine } from '../engines/allocationEngine';
import { generateSKUs, generateLocations } from '../db/mockData';
import type { SKU, Location } from '../types';

describe('AllocationEngine - 货位分配引擎', () => {
  const skus: SKU[] = generateSKUs(100);
  const locations: Location[] = generateLocations(8, 20, 5);
  const stackerPosition = { row: 1, col: 1 };

  describe('allocate - 货位分配算法', () => {
    it('应该返回推荐的货位列表', () => {
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('每个推荐应该包含完整的评分信息', () => {
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('locationId');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reasons');
        expect(rec).toHaveProperty('heatMatch');
        expect(rec).toHaveProperty('associationMatch');
        expect(rec).toHaveProperty('spaceEfficiency');
        expect(rec).toHaveProperty('pathCost');
        
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(100);
        expect(rec.heatMatch).toBeGreaterThanOrEqual(0);
        expect(rec.heatMatch).toBeLessThanOrEqual(100);
        expect(rec.associationMatch).toBeGreaterThanOrEqual(0);
        expect(rec.associationMatch).toBeLessThanOrEqual(100);
        expect(rec.spaceEfficiency).toBeGreaterThanOrEqual(0);
        expect(rec.spaceEfficiency).toBeLessThanOrEqual(100);
        expect(rec.pathCost).toBeGreaterThanOrEqual(0);
        expect(rec.pathCost).toBeLessThanOrEqual(100);
        expect(Array.isArray(rec.reasons)).toBe(true);
        expect(rec.reasons.length).toBeGreaterThan(0);
      });
    });

    it('应该优先推荐空货位', () => {
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      const emptyLocationIds = locations
        .filter(l => l.status === 'empty')
        .map(l => l.id);
      
      const topRecommendation = recommendations[0];
      expect(emptyLocationIds).toContain(topRecommendation.locationId);
    });

    it('推荐结果应该按评分降序排列', () => {
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
      }
    });

    it('高流动性 SKU 应该优先推荐低层货位', () => {
      const highLiquiditySKU = { ...skus[0], liquidityScore: 90 };
      const recommendations = allocationEngine.allocate(highLiquiditySKU, locations, skus, stackerPosition);
      
      const topLocationId = recommendations[0].locationId;
      const topLocation = locations.find(l => l.id === topLocationId);
      
      expect(topLocation).toBeDefined();
      expect(topLocation!.level).toBeLessThanOrEqual(3);
    });

    it('低流动性 SKU 可以推荐高层货位', () => {
      const lowLiquiditySKU = { ...skus[0], liquidityScore: 10 };
      const recommendations = allocationEngine.allocate(lowLiquiditySKU, locations, skus, stackerPosition);
      
      const avgLevel = recommendations.slice(0, 10).reduce((sum, rec) => {
        const loc = locations.find(l => l.id === rec.locationId);
        return sum + (loc?.level || 0);
      }, 0) / Math.min(10, recommendations.length);
      
      expect(avgLevel).toBeGreaterThanOrEqual(1);
    });

    it('应该考虑关联 SKU 的位置', () => {
      const skuWithAssociations = {
        ...skus[0],
        associatedSKUs: [skus[1].id, skus[2].id]
      };
      
      const recommendations = allocationEngine.allocate(skuWithAssociations, locations, skus, stackerPosition);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].associationMatch).toBeGreaterThanOrEqual(0);
    });
  });

  describe('算法权重验证', () => {
    it('热度匹配应该占最大权重', () => {
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      const topRec = recommendations[0];
      const weightedScore = 
        topRec.heatMatch * 0.4 +
        topRec.associationMatch * 0.3 +
        topRec.spaceEfficiency * 0.2 +
        topRec.pathCost * 0.1;
      
      expect(Math.abs(topRec.score - weightedScore)).toBeLessThan(1);
    });
  });

  describe('边界条件', () => {
    it('当没有空货位时应该返回空数组', () => {
      const occupiedLocations = locations.map(loc => ({
        ...loc,
        status: 'occupied' as const
      }));
      
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, occupiedLocations, skus, stackerPosition);
      
      expect(recommendations.length).toBe(0);
    });

    it('应该处理只有少量空货位的情况', () => {
      const testLocations = [...locations];
      testLocations.forEach((loc, index) => {
        if (index > 5) {
          loc.status = 'occupied';
        }
      });
      
      const sku = skus[0];
      const recommendations = allocationEngine.allocate(sku, testLocations, skus, stackerPosition);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(6);
    });
  });

  describe('性能测试', () => {
    it('单次货位分配应该在 100ms 内完成', () => {
      const sku = skus[0];
      const startTime = Date.now();
      
      allocationEngine.allocate(sku, locations, skus, stackerPosition);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });
});
