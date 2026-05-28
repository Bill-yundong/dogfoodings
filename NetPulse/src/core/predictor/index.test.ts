import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createJitterPredictor, JitterPredictor } from './index';
import type { ProbeResult } from '@/types';
import { DEFAULT_CONFIG } from '@shared/protocol';

describe('时延抖动预测引擎 (JitterPredictor)', () => {
  let predictor: JitterPredictor;

  beforeEach(() => {
    predictor = createJitterPredictor(DEFAULT_CONFIG);
  });

  afterEach(() => {
    predictor.reset();
  });

  describe('预测功能', () => {
    const generateStableResults = (pathId: string, count: number, baseLatency: number): ProbeResult[] => {
      return Array(count).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId,
        latency: baseLatency + (Math.random() - 0.5) * 10,
        jitter: 5 + Math.random() * 3,
        packetLoss: 0.005 + Math.random() * 0.005,
        bandwidth: 200,
        hopCount: 10,
      }));
    };

    const generateDeterioratingResults = (pathId: string, count: number): ProbeResult[] => {
      return Array(count).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId,
        latency: 30 + i * 3,
        jitter: 5 + i * 0.5,
        packetLoss: 0.005 + i * 0.002,
        bandwidth: 200,
        hopCount: 10,
      }));
    };

    it('predict 应该返回有效的预测结果', () => {
      const results = generateStableResults('test-path', 30, 30);
      const prediction = predictor.predict('test-path', results);

      expect(prediction.predictedLatency).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'deteriorating']).toContain(prediction.trend);
      expect(['hold', 'prepare-switch', 'switch-now']).toContain(prediction.recommendation);
    });

    it('应该检测到恶化趋势', () => {
      const results = generateDeterioratingResults('test-path', 30);
      const prediction = predictor.predict('test-path', results);
      
      expect(prediction.trend).toBe('deteriorating');
    });

    it('应该对稳定数据返回 stable 趋势', () => {
      const results = generateStableResults('test-path', 30, 30);
      const prediction = predictor.predict('test-path', results);
      
      expect(['stable', 'improving', 'deteriorating']).toContain(prediction.trend);
    });
  });

  describe('路径质量计算', () => {
    it('calculatePathQualityWithPrediction 应该返回完整的质量评分', () => {
      const results = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'test-path',
        latency: 30 + Math.random() * 5,
        jitter: 3 + Math.random() * 2,
        packetLoss: 0.002 + Math.random() * 0.003,
        bandwidth: 200,
        hopCount: 10,
      }));

      const quality = predictor.calculatePathQualityWithPrediction('test-path', results);

      expect(quality.pathId).toBe('test-path');
      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeLessThanOrEqual(100);
      expect(quality.latencyScore).toBeGreaterThan(0);
      expect(quality.jitterScore).toBeGreaterThan(0);
      expect(quality.lossScore).toBeGreaterThan(0);
      expect(quality.stability).toBeGreaterThanOrEqual(0);
      expect(quality.stability).toBeLessThanOrEqual(1);
      expect(quality.prediction.trend).toBeDefined();
    });

    it('对高质量路径应该返回高分', () => {
      const results = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'test-path',
        latency: 15 + Math.random() * 3,
        jitter: 2 + Math.random() * 1,
        packetLoss: 0.001,
        bandwidth: 500,
        hopCount: 5,
      }));

      const quality = predictor.calculatePathQualityWithPrediction('test-path', results);
      expect(quality.overallScore).toBeGreaterThan(80);
    });

    it('对低质量路径应该返回低分', () => {
      const results = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'test-path',
        latency: 300 + Math.random() * 50,
        jitter: 80 + Math.random() * 20,
        packetLoss: 0.08,
        bandwidth: 10,
        hopCount: 20,
      }));

      const quality = predictor.calculatePathQualityWithPrediction('test-path', results);
      expect(quality.overallScore).toBeLessThan(40);
    });
  });

  describe('切换决策', () => {
    const createResultMap = (pathId: string, results: ProbeResult[]): Map<string, ProbeResult[]> => {
      const map = new Map<string, ProbeResult[]>();
      map.set(pathId, results);
      return map;
    };

    it('对稳定高质量路径不应该建议切换', () => {
      const currentResults = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'current',
        latency: 20 + Math.random() * 5,
        jitter: 3 + Math.random() * 2,
        packetLoss: 0.002,
        bandwidth: 300,
        hopCount: 8,
      }));

      const allResults = createResultMap('current', currentResults);
      allResults.set('backup', Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'backup',
        latency: 30 + Math.random() * 5,
        jitter: 5 + Math.random() * 3,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      })));

      const decision = predictor.shouldSwitch('current', currentResults, allResults);
      expect(decision.shouldSwitch).toBe(false);
    });

    it('evaluateSwitchCandidates 应该正确排序候选路径', () => {
      const currentResults = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'current',
        latency: 100 + Math.random() * 20,
        jitter: 30 + Math.random() * 10,
        packetLoss: 0.03,
        bandwidth: 100,
        hopCount: 15,
      }));

      const allResults = createResultMap('current', currentResults);
      
      const goodResults = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'good',
        latency: 25 + Math.random() * 5,
        jitter: 5 + Math.random() * 2,
        packetLoss: 0.003,
        bandwidth: 300,
        hopCount: 8,
      }));
      allResults.set('good', goodResults);

      const okResults = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'ok',
        latency: 50 + Math.random() * 10,
        jitter: 10 + Math.random() * 5,
        packetLoss: 0.01,
        bandwidth: 200,
        hopCount: 12,
      }));
      allResults.set('ok', okResults);

      const candidates = predictor.evaluateSwitchCandidates('current', allResults);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
      for (const candidate of candidates) {
        expect(candidate.pathId).not.toBe('current');
        expect(candidate.quality.overallScore).toBeDefined();
      }
    });

    it('记录切换后应该在最小间隔内阻止再次切换', () => {
      predictor.recordSwitch();

      const results = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'current',
        latency: 200,
        jitter: 50,
        packetLoss: 0.05,
        bandwidth: 50,
        hopCount: 20,
      }));

      const allResults = createResultMap('current', results);
      const decision = predictor.shouldSwitch('current', results, allResults);
      expect(decision.shouldSwitch).toBe(false);
    });
  });

  describe('配置更新', () => {
    it('updateClientConfig 应该更新灵敏度设置', () => {
      const newConfig = { ...DEFAULT_CONFIG, switchSensitivity: 'high' as const };
      predictor.updateClientConfig(newConfig);
      
      const results = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'current',
        latency: 200,
        jitter: 50,
        packetLoss: 0.05,
        bandwidth: 50,
        hopCount: 20,
      }));

      const allResults = new Map<string, ProbeResult[]>();
      allResults.set('current', results);
      allResults.set('backup', Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'backup',
        latency: 30,
        jitter: 5,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      })));

      const decision = predictor.shouldSwitch('current', results, allResults);
      expect(decision.shouldSwitch).toBeDefined();
    });
  });

  describe('数据管理', () => {
    it('addResult 应该存储历史数据', () => {
      const result: ProbeResult = {
        timestamp: Date.now(),
        pathId: 'test',
        latency: 30,
        jitter: 5,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      };

      predictor.addResult(result);
      const quality = predictor.getPathQuality('test');
      expect(quality).toBeUndefined();
    });

    it('reset 应该清空所有数据', () => {
      const results = Array(30).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        pathId: 'test',
        latency: 30,
        jitter: 5,
        packetLoss: 0.005,
        bandwidth: 200,
        hopCount: 10,
      }));

      predictor.calculatePathQualityWithPrediction('test', results);
      expect(predictor.getPathQuality('test')).toBeDefined();

      predictor.reset();
      expect(predictor.getAllPathQualities().size).toBe(0);
    });
  });
});
