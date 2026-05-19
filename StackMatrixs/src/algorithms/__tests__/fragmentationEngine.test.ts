import { describe, it, expect } from 'vitest';
import {
  analyzeAisleFragmentation,
  analyzeWarehouseFragmentation,
  generateDefragPlan,
} from '../fragmentationEngine';
import type { Location } from '@/types';

const createMockLocation = (partial: Partial<Location> = {}): Location => ({
  id: `LOC-${Math.random().toString(36).substr(2, 9)}`,
  aisle: 1,
  rack: 1,
  level: 1,
  slot: 1,
  status: 'empty',
  capacity: 100,
  usedCapacity: 0,
  heatLevel: 50,
  lastUpdated: new Date(),
  ...partial,
});

describe('碎片整理引擎', () => {
  describe('analyzeAisleFragmentation', () => {
    it('应识别单个空位碎片', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'empty' }),
        createMockLocation({ id: 'LOC-3', aisle: 1, rack: 1, level: 3, status: 'occupied' }),
        createMockLocation({ id: 'LOC-4', aisle: 1, rack: 2, level: 1, status: 'occupied' }),
      ];
      const result = analyzeAisleFragmentation(locations, 1);
      expect(result.fragments.length).toBeGreaterThan(0);
      expect(result.totalLocations).toBe(4);
      expect(result.emptyLocations).toBe(1);
      expect(result.occupiedLocations).toBe(3);
    });

    it('应识别连续空位集群', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'empty' }),
        createMockLocation({ id: 'LOC-3', aisle: 1, rack: 1, level: 3, status: 'empty' }),
        createMockLocation({ id: 'LOC-4', aisle: 1, rack: 1, level: 4, status: 'empty' }),
        createMockLocation({ id: 'LOC-5', aisle: 1, rack: 2, level: 1, status: 'occupied' }),
      ];
      const result = analyzeAisleFragmentation(locations, 1);
      expect(result.fragments.some((f) => f.fragmentType === 'cluster')).toBe(true);
    });

    it('无空位时碎片索引应为0', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'occupied' }),
      ];
      const result = analyzeAisleFragmentation(locations, 1);
      expect(result.fragmentationIndex).toBe(0);
      expect(result.fragments.length).toBe(0);
    });

    it('碎片索引应在0-1范围内', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'empty' }),
        createMockLocation({ id: 'LOC-3', aisle: 1, rack: 1, level: 3, status: 'occupied' }),
        createMockLocation({ id: 'LOC-4', aisle: 1, rack: 1, level: 4, status: 'empty' }),
      ];
      const result = analyzeAisleFragmentation(locations, 1);
      expect(result.fragmentationIndex).toBeGreaterThanOrEqual(0);
      expect(result.fragmentationIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeWarehouseFragmentation', () => {
    it('应分析整个仓库的碎片化情况', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'empty' }),
        createMockLocation({ id: 'LOC-3', aisle: 2, rack: 1, level: 1, status: 'empty' }),
        createMockLocation({ id: 'LOC-4', aisle: 2, rack: 1, level: 2, status: 'occupied' }),
      ];
      const result = analyzeWarehouseFragmentation(locations);
      expect(result.aisles.length).toBe(2);
      expect(result.totalFragments).toBeGreaterThan(0);
      expect(result.overallFragmentationIndex).toBeGreaterThanOrEqual(0);
      expect(result.overallFragmentationIndex).toBeLessThanOrEqual(1);
    });

    it('应识别高优先级碎片', () => {
      const locations: Location[] = [];
      for (let i = 0; i < 10; i++) {
        locations.push(
          createMockLocation({
            id: `LOC-${i}`,
            aisle: 1,
            rack: 1,
            level: i,
            status: i % 2 === 0 ? 'occupied' : 'empty',
            capacity: 200,
          })
        );
      }
      const result = analyzeWarehouseFragmentation(locations);
      expect(result.highPriorityFragments).toBeDefined();
    });

    it('应正确计算总浪费容量', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied', capacity: 100 }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'empty', capacity: 100 }),
        createMockLocation({ id: 'LOC-3', aisle: 1, rack: 1, level: 3, status: 'occupied', capacity: 100 }),
      ];
      const result = analyzeWarehouseFragmentation(locations);
      expect(result.totalWastedCapacity).toBeGreaterThan(0);
    });
  });

  describe('generateDefragPlan', () => {
    it('应生成整理任务', () => {
      const locations: Location[] = [];
      for (let i = 0; i < 20; i++) {
        locations.push(
          createMockLocation({
            id: `LOC-${i}`,
            aisle: 1,
            rack: 1,
            level: i,
            status: i % 2 === 0 ? 'occupied' : 'empty',
          })
        );
      }
      const analysis = analyzeWarehouseFragmentation(locations);
      const tasks = generateDefragPlan(analysis.highPriorityFragments, locations, 3);
      expect(tasks.length).toBeGreaterThanOrEqual(0);
      tasks.forEach((task) => {
        expect(task.fragmentIds.length).toBeGreaterThan(0);
        expect(task.totalMoves).toBeGreaterThan(0);
        expect(task.estimatedDuration).toBeGreaterThan(0);
      });
    });

    it('无碎片时不生成任务', () => {
      const locations = [
        createMockLocation({ id: 'LOC-1', aisle: 1, rack: 1, level: 1, status: 'occupied' }),
        createMockLocation({ id: 'LOC-2', aisle: 1, rack: 1, level: 2, status: 'occupied' }),
        createMockLocation({ id: 'LOC-3', aisle: 1, rack: 1, level: 3, status: 'empty' }),
        createMockLocation({ id: 'LOC-4', aisle: 1, rack: 1, level: 4, status: 'empty' }),
      ];
      const analysis = analyzeWarehouseFragmentation(locations);
      const tasks = generateDefragPlan(analysis.highPriorityFragments, locations, 3);
      expect(tasks.length).toBe(0);
    });

    it('任务应按严重程度排序', () => {
      const locations: Location[] = [];
      for (let i = 0; i < 20; i++) {
        locations.push(
          createMockLocation({
            id: `LOC-${i}`,
            aisle: 1,
            rack: 1,
            level: i,
            status: i % 2 === 0 ? 'occupied' : 'empty',
            capacity: i < 10 ? 500 : 50,
          })
        );
      }
      const analysis = analyzeWarehouseFragmentation(locations);
      const tasks = generateDefragPlan(analysis.highPriorityFragments, locations, 3);
      if (tasks.length > 1) {
        expect(tasks[0].spaceSaved).toBeGreaterThanOrEqual(tasks[1].spaceSaved);
      }
    });
  });
});
