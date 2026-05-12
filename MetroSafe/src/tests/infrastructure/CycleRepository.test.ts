import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CycleRepository } from '../../infrastructure';
import { DOOR_IDS, DoorState } from '../../domain';

describe('CycleRepository - IndexedDB 循环数据仓储', () => {
  let repository: CycleRepository;

  beforeEach(() => {
    repository = new CycleRepository();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('should create repository instance', () => {
      expect(repository).toBeInstanceOf(CycleRepository);
    });

    it('should not be ready initially', () => {
      expect(repository.isReady()).toBe(false);
    });
  });

  describe('方法检查', () => {
    it('should have addCycle method', () => {
      expect(typeof repository.addCycle).toBe('function');
    });

    it('should have addCycles method', () => {
      expect(typeof repository.addCycles).toBe('function');
    });

    it('should have getCycle method', () => {
      expect(typeof repository.getCycle).toBe('function');
    });

    it('should have getCyclesByDoorId method', () => {
      expect(typeof repository.getCyclesByDoorId).toBe('function');
    });

    it('should have getRecentCycles method', () => {
      expect(typeof repository.getRecentCycles).toBe('function');
    });

    it('should have getFailedCycles method', () => {
      expect(typeof repository.getFailedCycles).toBe('function');
    });

    it('should have getStats method', () => {
      expect(typeof repository.getStats).toBe('function');
    });

    it('should have deleteCycle method', () => {
      expect(typeof repository.deleteCycle).toBe('function');
    });

    it('should have clearAll method', () => {
      expect(typeof repository.clearAll).toBe('function');
    });

    it('should have generateSampleData method', () => {
      expect(typeof repository.generateSampleData).toBe('function');
    });
  });
});
