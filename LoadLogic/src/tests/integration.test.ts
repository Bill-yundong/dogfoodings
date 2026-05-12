import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  householdCount,
  vpp,
  isSimulating,
  simulationProgress,
  snapshots,
  gameTheoryResults,
  initializeVPP,
  runSimulation,
  resetSimulation,
  generateHistoricalData,
  loadHistoricalData
} from '$lib/stores';
import db from '$lib/modules/database';
import { get } from 'svelte/store';
import { ScenarioType, CommandSeverity } from '$lib/types';

describe('Integration Tests', () => {
  beforeEach(async () => {
    await db.snapshots.clear();
    await db.profiles.clear();
    await db.stats.clear();
    await resetSimulation();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('系统初始化', () => {
    it('应该正确初始化 VPP 系统', async () => {
      expect(get(vpp)).toBeNull();
      await initializeVPP(100);
      expect(get(vpp)).not.toBeNull();
      expect(get(vpp)?.getHouseholds().length).toBe(100);
    });

    it('应该支持不同规模的家庭数量', async () => {
      const sizes = [10, 100, 500, 1000];
      for (const size of sizes) {
        await initializeVPP(size);
        expect(get(vpp)?.getHouseholds().length).toBe(size);
      }
    });

    it('初始化后状态应该正确', async () => {
      await initializeVPP(100);
      const status = get(vpp)?.getStatus();
      expect(status?.totalHouseholds).toBe(100);
      expect(status?.respondingHouseholds).toBe(0);
      expect(status?.currentReduction).toBe(0);
    });
  });

  describe('模拟执行流程', () => {
    it('应该能够完整执行一次模拟', async () => {
      await initializeVPP(100);
      expect(get(isSimulating)).toBe(false);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      expect(get(isSimulating)).toBe(false);
      expect(get(snapshots).length).toBe(100);
    });

    it('模拟过程中进度应该更新', async () => {
      await initializeVPP(100);
      const progressValues: number[] = [];
      const unsubscribe = simulationProgress.subscribe(v => progressValues.push(v));
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      unsubscribe();
      expect(progressValues.some(p => p > 0)).toBe(true);
    });

    it('模拟应该生成博弈论分析结果', async () => {
      await initializeVPP(100);
      expect(get(gameTheoryResults)).toBeNull();
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      expect(get(gameTheoryResults)).not.toBeNull();
      const scenarios = Object.values(ScenarioType);
      expect(Object.keys(get(gameTheoryResults)!).length).toBe(scenarios.length);
    });

    it('多次模拟应该累积数据', async () => {
      await initializeVPP(50);
      for (let i = 0; i < 3; i++) {
        await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
        expect(get(snapshots).length).toBe(50);
      }
      const dbCount = await db.getSnapshotCount();
      expect(dbCount).toBe(150);
    });

    it('不同严重级别应该产生不同的响应结果', async () => {
      const results = [];
      for (const severity of [CommandSeverity.LOW, CommandSeverity.MEDIUM, CommandSeverity.HIGH, CommandSeverity.CRITICAL]) {
        await initializeVPP(100);
        await runSimulation(ScenarioType.PEAK_SHAVING, severity);
        const responding = get(snapshots).filter(s => s.didRespond).length;
        results.push(responding);
      }
      expect(results[0]).toBeLessThanOrEqual(results[1]);
      expect(results[1]).toBeLessThanOrEqual(results[2]);
      expect(results[2]).toBeLessThanOrEqual(results[3]);
    });
  });

  describe('数据持久化', () => {
    it('模拟数据应该正确存储到数据库', async () => {
      await initializeVPP(100);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      const dbCount = await db.getSnapshotCount();
      expect(dbCount).toBe(100);
    });

    it('应该能够从数据库加载历史数据', async () => {
      await db.generateSampleData(50, 5);
      await loadHistoricalData();
      expect(get(snapshots).length).toBeGreaterThan(0);
    });

    it('家庭档案应该正确更新', async () => {
      await initializeVPP(20);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      const profiles = await db.profiles.toArray();
      expect(profiles.length).toBe(20);
    });

    it('应该能够生成大量样本数据', async () => {
      await generateHistoricalData(200, 5);
      const count = await db.getSnapshotCount();
      expect(count).toBe(1000);
    });
  });

  describe('状态重置', () => {
    it('应该能够正确重置模拟状态', async () => {
      await initializeVPP(100);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      expect(get(snapshots).length).toBe(100);
      await resetSimulation();
      expect(get(snapshots).length).toBe(0);
      const status = get(vpp)?.getStatus();
      expect(status?.respondingHouseholds).toBe(0);
    });

    it('重置后博弈论结果应该清空', async () => {
      await initializeVPP(100);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      expect(get(gameTheoryResults)).not.toBeNull();
      await resetSimulation();
      expect(get(gameTheoryResults)).toBeNull();
    });
  });

  describe('跨场景分析', () => {
    it('应该能够分析所有场景的响应率', async () => {
      const scenarios = [
        ScenarioType.EMERGENCY,
        ScenarioType.RENEWABLE_SHORTAGE,
        ScenarioType.PEAK_SHAVING,
        ScenarioType.MARKET_PRICE,
        ScenarioType.MAINTENANCE
      ];
      for (const scenario of scenarios) {
        await initializeVPP(50);
        await runSimulation(scenario, CommandSeverity.MEDIUM);
      }
      const rates = await db.getResponseRateByScenario();
      expect(Object.keys(rates).length).toBeGreaterThanOrEqual(3);
    });

    it('紧急场景应该有最高的响应率', async () => {
      for (const scenario of [ScenarioType.EMERGENCY, ScenarioType.MAINTENANCE]) {
        await initializeVPP(100);
        await runSimulation(scenario, CommandSeverity.MEDIUM);
      }
      const rates = await db.getResponseRateByScenario();
      expect(rates[ScenarioType.EMERGENCY].rate).toBeGreaterThan(rates[ScenarioType.MAINTENANCE].rate);
    });
  });

  describe('统计聚合', () => {
    it('应该能够正确计算所有统计指标', async () => {
      await initializeVPP(100);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      const stats = await db.getAggregateStats();
      expect(stats.totalSnapshots).toBe(100);
      expect(stats.totalResponses).toBeGreaterThan(0);
      expect(stats.totalResponses).toBeLessThanOrEqual(100);
      expect(stats.averageResponseRate).toBeGreaterThan(0);
      expect(stats.averageResponseRate).toBeLessThanOrEqual(1);
      expect(stats.totalHouseholds).toBe(100);
    });

    it('应该能够识别响应最多的家庭', async () => {
      await initializeVPP(50);
      for (let i = 0; i < 5; i++) {
        await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      }
      const topResponders = await db.getTopResponders(10);
      expect(topResponders.length).toBe(10);
      expect(topResponders[0].totalResponses).toBeGreaterThanOrEqual(topResponders[9].totalResponses);
    });

    it('应该能够识别削减最多的家庭', async () => {
      await initializeVPP(50);
      for (let i = 0; i < 5; i++) {
        await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.HIGH);
      }
      const topReducers = await db.getTopReducers(10);
      expect(topReducers.length).toBe(10);
      expect(topReducers[0].totalReduction).toBeGreaterThanOrEqual(topReducers[9].totalReduction);
    });
  });

  describe('错误恢复', () => {
    it('VPP 未初始化时运行模拟应该能够恢复', async () => {
      expect(get(vpp)).toBeNull();
      await expect(runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM)).resolves.not.toThrow();
    });

    it('空数据时统计计算应该正常工作', async () => {
      const stats = await db.getAggregateStats();
      expect(stats.totalSnapshots).toBe(0);
      expect(stats.totalResponses).toBe(0);
      expect(stats.averageResponseRate).toBe(0);
    });

    it('重复初始化应该工作正常', async () => {
      await initializeVPP(50);
      await initializeVPP(100);
      await initializeVPP(200);
      expect(get(vpp)?.getHouseholds().length).toBe(200);
    });
  });

  describe('大规模数据测试', () => {
    it('应该能够处理 1000 个家庭的模拟', async () => {
      await initializeVPP(1000);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      expect(get(snapshots).length).toBe(1000);
      const dbCount = await db.getSnapshotCount();
      expect(dbCount).toBe(1000);
    });

    it('应该能够存储大量快照数据', async () => {
      await db.generateSampleData(200, 25);
      const count = await db.getSnapshotCount();
      expect(count).toBe(5000);
    });

    it('大数据量下统计计算应该正常工作', async () => {
      await db.generateSampleData(200, 25);
      const stats = await db.getAggregateStats();
      expect(stats.totalSnapshots).toBe(5000);
      expect(stats.totalHouseholds).toBe(200);
    });

    it('大数据量下应该能够按场景查询', async () => {
      await db.generateSampleData(200, 25);
      const rates = await db.getResponseRateByScenario();
      expect(Object.keys(rates).length).toBeGreaterThan(0);
    });
  });

  describe('业务流程完整性', () => {
    it('完整业务流程应该正常执行', async () => {
      await initializeVPP(100);
      for (let i = 0; i < 3; i++) {
        await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      }
      const stats = await db.getAggregateStats();
      expect(stats.totalSnapshots).toBe(300);
      const topResponders = await db.getTopResponders(5);
      expect(topResponders.length).toBe(5);
      await resetSimulation();
      expect(get(snapshots).length).toBe(0);
      await loadHistoricalData();
      expect(get(snapshots).length).toBeGreaterThan(0);
    });

    it('不同场景的响应概率应该符合预期', async () => {
      await initializeVPP(100);
      await runSimulation(ScenarioType.PEAK_SHAVING, CommandSeverity.MEDIUM);
      const results = get(gameTheoryResults);
      expect(results).not.toBeNull();
      const emergencyProb = results![ScenarioType.EMERGENCY].responseProbability;
      const maintenanceProb = results![ScenarioType.MAINTENANCE].responseProbability;
      expect(emergencyProb).toBeGreaterThan(maintenanceProb);
    });

    it('模拟结果应该符合博弈论预测', async () => {
      await initializeVPP(200);
      await runSimulation(ScenarioType.EMERGENCY, CommandSeverity.CRITICAL);
      const results = get(gameTheoryResults);
      const actualResponseRate = get(snapshots).filter(s => s.didRespond).length / get(snapshots).length;
      const predictedProb = results![ScenarioType.EMERGENCY].responseProbability;
      expect(Math.abs(actualResponseRate - predictedProb)).toBeLessThan(0.3);
    });
  });
});
