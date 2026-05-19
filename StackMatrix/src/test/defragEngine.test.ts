import { describe, it, expect } from 'vitest';
import { defragEngine } from '../engines/defragEngine';
import { generateLocations } from '../db/mockData';
import type { Location, Fragment } from '../types';

describe('DefragEngine - 空间碎片整理引擎', () => {
  const locations: Location[] = generateLocations(8, 20, 5);

  describe('detectFragments - 检测空间碎片', () => {
    it('应该返回碎片列表', () => {
      const fragments = defragEngine.detectFragments(locations);
      
      expect(fragments).toBeDefined();
      expect(Array.isArray(fragments)).toBe(true);
    });

    it('每个碎片应该包含完整信息', () => {
      const fragments = defragEngine.detectFragments(locations);
      
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
        expect(fragment.potentialGain).toBeGreaterThanOrEqual(0);
        expect(['merge', 'relocate', 'keep']).toContain(fragment.recommendation);
      });
    });

    it('碎片应该按浪费分数降序排列', () => {
      const fragments = defragEngine.detectFragments(locations);
      
      for (let i = 0; i < Math.min(fragments.length, 10); i++) {
        if (i < fragments.length - 1) {
          expect(fragments[i].wasteScore).toBeGreaterThanOrEqual(fragments[i + 1].wasteScore);
        }
      }
    });
  });

  describe('calculateFragmentRate - 计算碎片率', () => {
    it('应该返回 0-100 之间的数值', () => {
      const rate = defragEngine.calculateFragmentRate(locations);
      
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('全空仓库的碎片率应该为 1', () => {
      const emptyLocations = locations.map(loc => ({
        ...loc,
        status: 'empty' as const,
        usedCapacity: 0
      }));
      
      const rate = defragEngine.calculateFragmentRate(emptyLocations);
      expect(rate).toBe(1);
    });

    it('全满仓库的碎片率应该为 0', () => {
      const fullLocations = locations.map(loc => ({
        ...loc,
        status: 'occupied' as const,
        usedCapacity: 100
      }));
      
      const rate = defragEngine.calculateFragmentRate(fullLocations);
      expect(rate).toBe(0);
    });
  });

  describe('executeDefragStep - 执行碎片整理步骤', () => {
    it('应该返回更新后的货位和新的索引', () => {
      const fragments = defragEngine.detectFragments(locations);
      
      if (fragments.length > 0) {
        const result = defragEngine.executeDefragStep(fragments, locations, 0);
        
        expect(result).toHaveProperty('updatedLocations');
        expect(result).toHaveProperty('newIndex');
        expect(Array.isArray(result.updatedLocations)).toBe(true);
        expect(result.updatedLocations.length).toBe(locations.length);
        expect(result.newIndex).toBeGreaterThan(0);
      }
    });

    it('整理后碎片应该被合并或消除', () => {
      const fragments = defragEngine.detectFragments(locations);
      
      if (fragments.length > 0) {
        const result = defragEngine.executeDefragStep(fragments, locations, 0);
        const newFragments = defragEngine.detectFragments(result.updatedLocations);
        
        expect(newFragments.length).toBeLessThanOrEqual(fragments.length);
      }
    });

    it('应该跳过无效的碎片索引', () => {
      const fragments = defragEngine.detectFragments(locations);
      const invalidIndex = fragments.length + 100;
      
      const result = defragEngine.executeDefragStep(fragments, locations, invalidIndex);
      
      expect(result.newIndex).toBe(invalidIndex);
    });
  });

  describe('碎片整理策略', () => {
    it('应该优先处理浪费分数高的碎片', () => {
      const fragments = defragEngine.detectFragments(locations);
      
      if (fragments.length > 0) {
        const topFragment = fragments[0];
        expect(topFragment.wasteScore).toBeGreaterThanOrEqual(50);
        expect(['merge', 'relocate']).toContain(topFragment.recommendation);
      }
    });

    it('小碎片应该被标记为合并或重定位', () => {
      const fragments = defragEngine.detectFragments(locations);
      const smallFragments = fragments.filter(f => f.size <= 2);
      
      smallFragments.forEach(f => {
        if (f.wasteScore > 60) {
          expect(['merge', 'relocate']).toContain(f.recommendation);
        }
      });
    });
  });

  describe('边界条件', () => {
    it('空货位列表应该返回空碎片列表', () => {
      const fragments = defragEngine.detectFragments([]);
      expect(fragments.length).toBe(0);
    });

    it('空碎片列表执行整理应该返回原数据', () => {
      const result = defragEngine.executeDefragStep([], locations, 0);
      expect(result.updatedLocations).toEqual(locations);
      expect(result.newIndex).toBe(0);
    });
  });

  describe('性能测试', () => {
    it('碎片检测应该在 100ms 内完成', () => {
      const startTime = Date.now();
      
      defragEngine.detectFragments(locations);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('单次碎片整理应该在 50ms 内完成', () => {
      const fragments = defragEngine.detectFragments(locations);
      const startTime = Date.now();
      
      defragEngine.executeDefragStep(fragments, locations, 0);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });
  });
});
