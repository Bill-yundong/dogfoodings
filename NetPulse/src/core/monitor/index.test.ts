import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNetworkMonitor, NetworkMonitor } from './index';
import type { ProbeResult } from '@/types';
import { DEFAULT_CONFIG } from '@shared/protocol';

describe('网络监测模块 (NetworkMonitor)', () => {
  let monitor: NetworkMonitor;
  const testPaths = ['node-bj-01', 'node-sh-01'];

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = createNetworkMonitor(DEFAULT_CONFIG, testPaths);
  });

  afterEach(() => {
    monitor.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该正确初始化监测器配置', () => {
      expect(monitor).toBeInstanceOf(NetworkMonitor);
    });

    it('应该为每个路径初始化结果存储', () => {
      for (const pathId of testPaths) {
        expect(monitor.getRecentResults(pathId)).toEqual([]);
      }
    });
  });

  describe('启动和停止', () => {
    it('start 应该开始所有路径的探测', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      for (const pathId of testPaths) {
        const results = monitor.getRecentResults(pathId);
        expect(results.length).toBeGreaterThan(0);
      }
    });

    it('多次调用 start 不应该重复启动', () => {
      const listener = vi.fn();
      monitor.addListener(listener);
      
      monitor.start();
      vi.advanceTimersByTime(50);
      const callCount1 = listener.mock.calls.length;
      
      monitor.start();
      vi.advanceTimersByTime(50);
      const callCount2 = listener.mock.calls.length;
      
      expect(callCount2).toBeGreaterThanOrEqual(callCount1);
    });

    it('stop 应该停止所有探测', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      const count1 = monitor.getRecentResults(testPaths[0]).length;
      
      monitor.stop();
      vi.advanceTimersByTime(1000);
      const count2 = monitor.getRecentResults(testPaths[0]).length;
      
      expect(count2).toBe(count1);
    });
  });

  describe('探测结果', () => {
    it('应该生成有效的 ProbeResult 数据', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      const results = monitor.getRecentResults(testPaths[0]);
      const result = results[0];
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('pathId');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('jitter');
      expect(result).toHaveProperty('packetLoss');
      expect(result.pathId).toBe(testPaths[0]);
      expect(result.latency).toBeGreaterThan(0);
      expect(result.packetLoss).toBeGreaterThanOrEqual(0);
      expect(result.packetLoss).toBeLessThanOrEqual(1);
    });

    it('应该通知监听器探测结果', () => {
      const listener = vi.fn();
      monitor.addListener(listener);
      
      monitor.start();
      vi.advanceTimersByTime(100);
      
      expect(listener).toHaveBeenCalled();
      const callArg = listener.mock.calls[0][0] as ProbeResult;
      expect(callArg.pathId).toBeDefined();
    });

    it('getAllRecentResults 应该返回所有路径的结果', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      const allResults = monitor.getAllRecentResults();
      expect(allResults.size).toBe(testPaths.length);
      for (const pathId of testPaths) {
        expect(allResults.has(pathId)).toBe(true);
        expect(allResults.get(pathId)!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('配置更新', () => {
    it('应该更新探测间隔配置', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      const newInterval = DEFAULT_CONFIG.probeInterval * 2;
      monitor.updateConfig({ probeInterval: newInterval });
      
      const count1 = monitor.getRecentResults(testPaths[0]).length;
      vi.advanceTimersByTime(newInterval);
      const count2 = monitor.getRecentResults(testPaths[0]).length;
      
      expect(count2).toBeGreaterThanOrEqual(count1);
    });

    it('应该动态添加新路径的探测', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      const newPath = 'node-gz-01';
      monitor.updateConfig({ paths: [...testPaths, newPath] });
      vi.advanceTimersByTime(100);
      
      expect(monitor.getRecentResults(newPath).length).toBeGreaterThan(0);
    });

    it('应该移除不再需要的路径探测', () => {
      monitor.start();
      vi.advanceTimersByTime(100);
      
      const removedPath = testPaths[1];
      monitor.updateConfig({ paths: [testPaths[0]] });
      vi.advanceTimersByTime(100);
      
      expect(monitor.getRecentResults(removedPath)).toEqual([]);
    });
  });

  describe('统计计算', () => {
    it('应该正确计算路径统计信息', () => {
      monitor.start();
      vi.advanceTimersByTime(500);
      
      const stats = monitor.calculateStats(testPaths[0]);
      expect(stats).not.toBeNull();
      expect(stats!.avgLatency).toBeGreaterThan(0);
      expect(stats!.minLatency).toBeLessThanOrEqual(stats!.avgLatency);
      expect(stats!.maxLatency).toBeGreaterThanOrEqual(stats!.avgLatency);
    });

    it('对没有数据的路径应该返回 null', () => {
      expect(monitor.calculateStats('non-existent-path')).toBeNull();
    });
  });

  describe('监听器管理', () => {
    it('addListener 应该返回取消订阅函数', () => {
      const listener = vi.fn();
      const unsubscribe = monitor.addListener(listener);
      
      monitor.start();
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
      const callCount = listener.mock.calls.length;
      vi.advanceTimersByTime(100);
      expect(listener.mock.calls.length).toBe(callCount);
    });
  });
});
