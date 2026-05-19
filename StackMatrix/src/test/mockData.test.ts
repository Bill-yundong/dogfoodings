import { describe, it, expect } from 'vitest';
import { 
  generateSKUs, 
  generateSKU, 
  generateSKUBatch,
  generateAssociatedSKUs,
  generateLocations, 
  generateStackers, 
  generateTasks, 
  generateMetrics, 
  generateFragments,
  generateHistoricalMetrics,
  generateSKUSnapshots
} from '../db/mockData';
import type { SKU, Location, Stacker, Task, Metrics, Fragment, SKUCategory } from '../types';

describe('MockData - 模拟数据生成', () => {
  const CATEGORIES: SKUCategory[] = ['electronics', 'clothing', 'food', 'cosmetics', 'household', 'industrial'];

  describe('SKU 生成', () => {
    it('generateSKUs 应该生成指定数量的 SKU', () => {
      const count = 100;
      const skus = generateSKUs(count);
      
      expect(skus.length).toBe(count);
    });

    it('每个 SKU 应该包含完整的字段', () => {
      const skus = generateSKUs(10);
      
      skus.forEach(sku => {
        expect(sku).toHaveProperty('id');
        expect(sku).toHaveProperty('name');
        expect(sku).toHaveProperty('category');
        expect(sku).toHaveProperty('liquidityScore');
        expect(sku).toHaveProperty('inCount');
        expect(sku).toHaveProperty('outCount');
        expect(sku).toHaveProperty('lastMoveTime');
        expect(sku).toHaveProperty('associatedSKUs');
        expect(sku).toHaveProperty('heatLevel');
        expect(sku).toHaveProperty('weight');
        expect(sku).toHaveProperty('volume');
        
        expect(sku.id).toMatch(/^SKU-\d{6}$/);
        expect(CATEGORIES).toContain(sku.category);
        expect(sku.liquidityScore).toBeGreaterThanOrEqual(0);
        expect(sku.liquidityScore).toBeLessThanOrEqual(100);
        expect(sku.inCount).toBeGreaterThanOrEqual(10);
        expect(sku.outCount).toBeGreaterThanOrEqual(5);
        expect(sku.heatLevel).toBeGreaterThanOrEqual(0);
        expect(sku.heatLevel).toBeLessThanOrEqual(5);
        expect(sku.weight).toBeGreaterThan(0);
        expect(sku.volume).toBeGreaterThan(0);
      });
    });

    it('应该为每个 SKU 生成关联 SKU', () => {
      const skus = generateSKUs(100);
      
      skus.forEach(sku => {
        expect(sku.associatedSKUs.length).toBeGreaterThan(0);
        expect(sku.associatedSKUs.length).toBeLessThanOrEqual(5);
        
        sku.associatedSKUs.forEach(assocId => {
          expect(assocId).not.toBe(sku.id);
          const exists = skus.some(s => s.id === assocId);
          expect(exists).toBe(true);
        });
      });
    });

    it('generateSKU 应该生成单个 SKU', () => {
      const now = Date.now();
      const categoryIdMap = new Map<SKUCategory, string[]>();
      CATEGORIES.forEach(cat => categoryIdMap.set(cat, []));
      
      const sku = generateSKU(0, now, categoryIdMap);
      
      expect(sku).toBeDefined();
      expect(sku.id).toBe('SKU-000001');
      expect(categoryIdMap.get(sku.category)!.length).toBe(1);
    });

    it('generateSKUBatch 应该生成一批 SKU', () => {
      const now = Date.now();
      const categoryIdMap = new Map<SKUCategory, string[]>();
      CATEGORIES.forEach(cat => categoryIdMap.set(cat, []));
      
      const batch = generateSKUBatch(10, 5, now, categoryIdMap);
      
      expect(batch.length).toBe(5);
      expect(batch[0].id).toBe('SKU-000011');
      expect(batch[4].id).toBe('SKU-000015');
    });

    it('generateAssociatedSKUs 应该为 SKU 生成关联关系', () => {
      const now = Date.now();
      const categoryIdMap = new Map<SKUCategory, string[]>();
      CATEGORIES.forEach(cat => categoryIdMap.set(cat, []));
      
      const skus: SKU[] = [];
      for (let i = 0; i < 50; i++) {
        skus.push(generateSKU(i, now, categoryIdMap));
      }
      
      generateAssociatedSKUs(skus, categoryIdMap);
      
      skus.forEach(sku => {
        expect(sku.associatedSKUs.length).toBeGreaterThan(0);
        expect(sku.associatedSKUs.length).toBeLessThanOrEqual(5);
      });
    });

    it('SKU 分类应该均匀分布', () => {
      const skus = generateSKUs(600);
      const categoryCounts: Record<string, number> = {};
      
      skus.forEach(sku => {
        categoryCounts[sku.category] = (categoryCounts[sku.category] || 0) + 1;
      });
      
      Object.values(categoryCounts).forEach(count => {
        expect(count).toBeGreaterThan(70);
        expect(count).toBeLessThan(130);
      });
    });

    it('生成大量 SKU 应该在合理时间内完成', () => {
      const startTime = Date.now();
      
      generateSKUs(10000);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('货位生成', () => {
    it('generateLocations 应该生成正确数量的货位', () => {
      const rows = 8;
      const cols = 20;
      const levels = 5;
      const locations = generateLocations(rows, cols, levels);
      
      expect(locations.length).toBe(rows * cols * levels);
    });

    it('每个货位应该包含完整的字段', () => {
      const locations = generateLocations(2, 2, 2);
      
      locations.forEach(location => {
        expect(location).toHaveProperty('id');
        expect(location).toHaveProperty('row');
        expect(location).toHaveProperty('col');
        expect(location).toHaveProperty('level');
        expect(location).toHaveProperty('status');
        expect(location).toHaveProperty('heatLevel');
        expect(location).toHaveProperty('lastAccessTime');
        expect(location).toHaveProperty('capacity');
        expect(location).toHaveProperty('usedCapacity');
        
        expect(location.id).toMatch(/^LOC-\d+-\d+-\d+$/);
        expect(['empty', 'occupied', 'reserved', 'defective']).toContain(location.status);
        expect(location.heatLevel).toBeGreaterThanOrEqual(0);
        expect(location.heatLevel).toBeLessThanOrEqual(5);
        expect(location.capacity).toBe(100);
        expect(location.usedCapacity).toBeGreaterThanOrEqual(0);
        expect(location.usedCapacity).toBeLessThanOrEqual(100);
      });
    });

    it('货位坐标应该正确', () => {
      const locations = generateLocations(2, 3, 2);
      
      expect(locations[0].row).toBe(1);
      expect(locations[0].col).toBe(1);
      expect(locations[0].level).toBe(1);
      
      expect(locations[5].row).toBe(1);
      expect(locations[5].col).toBe(3);
      expect(locations[5].level).toBe(2);
      
      expect(locations[11].row).toBe(2);
      expect(locations[11].col).toBe(3);
      expect(locations[11].level).toBe(2);
    });

    it('货位状态应该有合理的分布', () => {
      const locations = generateLocations(8, 20, 5);
      const occupiedCount = locations.filter(l => l.status === 'occupied').length;
      const emptyCount = locations.filter(l => l.status === 'empty').length;
      
      expect(occupiedCount).toBeGreaterThan(locations.length * 0.5);
      expect(emptyCount).toBeGreaterThan(locations.length * 0.05);
    });
  });

  describe('堆垛机生成', () => {
    it('generateStackers 应该生成指定数量的堆垛机', () => {
      const count = 6;
      const stackers = generateStackers(count);
      
      expect(stackers.length).toBe(count);
    });

    it('每个堆垛机应该包含完整的字段', () => {
      const stackers = generateStackers(3);
      
      stackers.forEach(stacker => {
        expect(stacker).toHaveProperty('id');
        expect(stacker).toHaveProperty('name');
        expect(stacker).toHaveProperty('status');
        expect(stacker).toHaveProperty('efficiency');
        expect(stacker).toHaveProperty('totalTasks');
        expect(stacker).toHaveProperty('currentPosition');
        
        expect(stacker.id).toMatch(/^STK-\d+$/);
        expect(['idle', 'running', 'paused', 'error']).toContain(stacker.status);
        expect(stacker.efficiency).toBeGreaterThanOrEqual(0.7);
        expect(stacker.efficiency).toBeLessThanOrEqual(1);
        expect(stacker.totalTasks).toBeGreaterThanOrEqual(0);
        expect(stacker.currentPosition.row).toBeGreaterThanOrEqual(1);
        expect(stacker.currentPosition.col).toBeGreaterThanOrEqual(1);
        expect(stacker.currentPosition.level).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('任务生成', () => {
    it('generateTasks 应该生成指定数量的任务', () => {
      const skus = generateSKUs(100);
      const locations = generateLocations(2, 5, 2);
      const stackers = generateStackers(3);
      const count = 50;
      
      const tasks = generateTasks(count, skus, locations, stackers);
      
      expect(tasks.length).toBe(count);
    });

    it('每个任务应该包含完整的字段', () => {
      const skus = generateSKUs(100);
      const locations = generateLocations(2, 5, 2);
      const stackers = generateStackers(3);
      const tasks = generateTasks(10, skus, locations, stackers);
      
      tasks.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('skuId');
        expect(task).toHaveProperty('skuName');
        expect(task).toHaveProperty('toLocation');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('createdAt');
        expect(task).toHaveProperty('progress');
        
        expect(task.id).toMatch(/^TSK-\d+$/);
        expect(['inbound', 'outbound', 'transfer', 'defrag']).toContain(task.type);
        expect(['pending', 'executing', 'completed', 'failed']).toContain(task.status);
        expect(task.priority).toBeGreaterThanOrEqual(1);
        expect(task.priority).toBeLessThanOrEqual(5);
        expect(task.progress).toBeGreaterThanOrEqual(0);
        expect(task.progress).toBeLessThanOrEqual(100);
      });
    });

    it('任务应该引用有效的 SKU 和货位', () => {
      const skus = generateSKUs(100);
      const locations = generateLocations(2, 5, 2);
      const stackers = generateStackers(3);
      const tasks = generateTasks(10, skus, locations, stackers);
      
      tasks.forEach(task => {
        const skuExists = skus.some(s => s.id === task.skuId);
        const locationExists = locations.some(l => l.id === task.toLocation);
        
        expect(skuExists).toBe(true);
        expect(locationExists).toBe(true);
      });
    });
  });

  describe('其他数据生成', () => {
    it('generateMetrics 应该生成指标数据', () => {
      const metrics = generateMetrics();
      
      expect(metrics).toHaveProperty('locationUtilization');
      expect(metrics).toHaveProperty('inboundEfficiency');
      expect(metrics).toHaveProperty('outboundEfficiency');
      expect(metrics).toHaveProperty('avgTaskDuration');
      expect(metrics).toHaveProperty('fragmentRate');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('totalSKUs');
      expect(metrics).toHaveProperty('activeTasks');
      expect(metrics).toHaveProperty('completedTasksToday');
      
      expect(metrics.locationUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.locationUtilization).toBeLessThanOrEqual(1);
      expect(metrics.inboundEfficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.outboundEfficiency).toBeGreaterThanOrEqual(0);
    });

    it('generateHistoricalMetrics 应该生成历史指标', () => {
      const hours = 24;
      const metrics = generateHistoricalMetrics(hours);
      
      expect(metrics.length).toBe(hours + 1);
      
      metrics.forEach((m, index) => {
        expect(m.timestamp).toBeLessThanOrEqual(Date.now());
        if (index > 0) {
          expect(m.timestamp).toBeGreaterThan(metrics[index - 1].timestamp);
        }
      });
    });

    it('generateFragments 应该生成碎片数据', () => {
      const locations = generateLocations(8, 20, 5);
      const fragments = generateFragments(locations);
      
      expect(Array.isArray(fragments)).toBe(true);
      
      fragments.forEach(fragment => {
        expect(fragment).toHaveProperty('id');
        expect(fragment).toHaveProperty('locationIds');
        expect(fragment).toHaveProperty('size');
        expect(fragment).toHaveProperty('wasteScore');
        expect(fragment).toHaveProperty('recommendation');
        expect(fragment).toHaveProperty('potentialGain');
        
        expect(fragment.locationIds.length).toBeGreaterThan(0);
        expect(fragment.size).toBeGreaterThan(0);
        expect(fragment.wasteScore).toBeGreaterThanOrEqual(0);
        expect(fragment.wasteScore).toBeLessThanOrEqual(100);
        expect(['merge', 'relocate', 'keep']).toContain(fragment.recommendation);
        expect(fragment.potentialGain).toBeGreaterThanOrEqual(0);
      });
    });

    it('generateSKUSnapshots 应该生成 SKU 快照', () => {
      const skus = generateSKUs(100);
      const count = 10;
      const snapshots = generateSKUSnapshots(skus, count);
      
      expect(snapshots.length).toBe(skus.length * count);
      
      snapshots.forEach(snapshot => {
        expect(snapshot).toHaveProperty('skuId');
        expect(snapshot).toHaveProperty('timestamp');
        expect(snapshot).toHaveProperty('liquidityScore');
        expect(snapshot).toHaveProperty('inCount');
        expect(snapshot).toHaveProperty('outCount');
        
        const skuExists = skus.some(s => s.id === snapshot.skuId);
        expect(skuExists).toBe(true);
      });
    });
  });

  describe('数据一致性', () => {
    it('生成的数据应该保持一致性', () => {
      const skus = generateSKUs(100);
      const locations = generateLocations(2, 5, 2);
      const stackers = generateStackers(3);
      const tasks = generateTasks(20, skus, locations, stackers);
      
      const taskSKUIds = new Set(tasks.map(t => t.skuId));
      taskSKUIds.forEach(id => {
        const exists = skus.some(s => s.id === id);
        expect(exists).toBe(true);
      });
      
      const taskLocationIds = new Set(tasks.map(t => t.toLocation));
      taskLocationIds.forEach(id => {
        const exists = locations.some(l => l.id === id);
        expect(exists).toBe(true);
      });
    });
  });
});
