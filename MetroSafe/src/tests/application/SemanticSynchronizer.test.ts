import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SemanticSynchronizer } from '../../application';
import {
  createFaultSignal,
  FaultType,
  SemanticLevel
} from '../../domain';

describe('SemanticSynchronizer - 语义同步服务', () => {
  let synchronizer: SemanticSynchronizer;

  beforeEach(() => {
    synchronizer = new SemanticSynchronizer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('should initialize successfully', () => {
      expect(synchronizer).toBeDefined();
    });
  });

  describe('状态变更订阅', () => {
    it('should allow subscribing to status changes', () => {
      const callback = vi.fn();
      const unsubscribe = synchronizer.onStatusChange(callback);
      expect(unsubscribe).toBeInstanceOf(Function);
    });
  });

  describe('模块订阅', () => {
    it('should allow subscribing maintenance module', () => {
      const callback = vi.fn();
      const unsubscribe = synchronizer.subscribe('maintenance', callback);
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should allow subscribing operation_control module', () => {
      const callback = vi.fn();
      const unsubscribe = synchronizer.subscribe('operation_control', callback);
      expect(unsubscribe).toBeInstanceOf(Function);
    });
  });

  describe('故障信号发布', () => {
    it('should have publish method', () => {
      expect(typeof synchronizer.publish).toBe('function');
    });
  });
});
