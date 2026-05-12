import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '$lib/modules/database';
import { ScenarioType, CommandSeverity } from '$lib/types';
import { createVPP } from '$lib/modules/vpp';

describe('Database Module', () => {
  beforeEach(async () => {
    await db.snapshots.clear();
    await db.profiles.clear();
    await db.stats.clear();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('快照存储', () => {
    it('应该能够存储单个响应快照', async () => {
      const snapshot = {
        timestamp: new Date(),
        commandId: 'cmd-001',
        householdId: 'house-001',
        householdName: '测试家庭',
        baselineLoad: 2.5,
        actualLoad: 2.0,
        reducedLoad: 0.5,
        responseProbability: 0.8,
        didRespond: true,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      };
      const id = await db.addSnapshot(snapshot);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('应该能够批量存储响应快照', async () => {
      const snapshots = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        commandId: `cmd-${i}`,
        householdId: `house-${i}`,
        householdName: `家庭 ${i}`,
        baselineLoad: 2 + Math.random(),
        actualLoad: 1.5 + Math.random(),
        reducedLoad: 0.3 + Math.random() * 0.5,
        responseProbability: 0.5 + Math.random() * 0.4,
        didRespond: Math.random() > 0.3,
        responseTime: 100 + Math.random() * 200,
        scenario: ScenarioType.PEAK_SHAVING
      }));
      await db.addSnapshots(snapshots);
      const count = await db.getSnapshotCount();
      expect(count).toBe(100);
    });

    it('应该能够按家庭查询快照', async () => {
      const testHouseholdId = 'test-house';
      const snapshots = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(),
        commandId: `cmd-${i}`,
        householdId: i === 0 ? testHouseholdId : `house-${i}`,
        householdName: `家庭 ${i}`,
        baselineLoad: 2.5,
        actualLoad: 2.0,
        reducedLoad: 0.5,
        responseProbability: 0.8,
        didRespond: true,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      }));
      await db.addSnapshots(snapshots);

      const householdSnapshots = await db.getSnapshotsByHousehold(testHouseholdId);
      expect(householdSnapshots.length).toBe(1);
      expect(householdSnapshots[0].householdId).toBe(testHouseholdId);
    });

    it('应该能够按场景查询快照', async () => {
      const snapshots = [
        {
          timestamp: new Date(),
          commandId: 'cmd-1',
          householdId: 'house-1',
          householdName: '家庭1',
          baselineLoad: 2.5,
          actualLoad: 2.0,
          reducedLoad: 0.5,
          responseProbability: 0.8,
          didRespond: true,
          responseTime: 150,
          scenario: ScenarioType.EMERGENCY
        },
        {
          timestamp: new Date(),
          commandId: 'cmd-2',
          householdId: 'house-2',
          householdName: '家庭2',
          baselineLoad: 3.0,
          actualLoad: 2.5,
          reducedLoad: 0.5,
          responseProbability: 0.7,
          didRespond: true,
          responseTime: 200,
          scenario: ScenarioType.EMERGENCY
        },
        {
          timestamp: new Date(),
          commandId: 'cmd-3',
          householdId: 'house-3',
          householdName: '家庭3',
          baselineLoad: 2.8,
          actualLoad: 2.8,
          reducedLoad: 0,
          responseProbability: 0.2,
          didRespond: false,
          responseTime: 100,
          scenario: ScenarioType.MAINTENANCE
        }
      ];
      await db.addSnapshots(snapshots);

      const emergencySnapshots = await db.getSnapshotsByScenario(ScenarioType.EMERGENCY);
      expect(emergencySnapshots.length).toBe(2);
    });

    it('应该能够获取最近的快照', async () => {
      const now = Date.now();
      const snapshots = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(now - i * 1000 * 60),
        commandId: `cmd-${i}`,
        householdId: `house-${i}`,
        householdName: `家庭 ${i}`,
        baselineLoad: 2.5,
        actualLoad: 2.0,
        reducedLoad: 0.5,
        responseProbability: 0.8,
        didRespond: true,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      }));
      await db.addSnapshots(snapshots);

      const recent = await db.getRecentSnapshots(10);
      expect(recent.length).toBe(10);
      expect(recent[0].timestamp.getTime()).toBeGreaterThan(recent[9].timestamp.getTime());
    });

    it('应该能够获取快照数量', async () => {
      expect(await db.getSnapshotCount()).toBe(0);
      const snapshot = {
        timestamp: new Date(),
        commandId: 'cmd-001',
        householdId: 'house-001',
        householdName: '测试家庭',
        baselineLoad: 2.5,
        actualLoad: 2.0,
        reducedLoad: 0.5,
        responseProbability: 0.8,
        didRespond: true,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      };
      await db.addSnapshot(snapshot);
      expect(await db.getSnapshotCount()).toBe(1);
    });

    it('应该能够清空所有快照', async () => {
      const snapshots = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(),
        commandId: `cmd-${i}`,
        householdId: `house-${i}`,
        householdName: `家庭 ${i}`,
        baselineLoad: 2.5,
        actualLoad: 2.0,
        reducedLoad: 0.5,
        responseProbability: 0.8,
        didRespond: true,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      }));
      await db.addSnapshots(snapshots);
      expect(await db.getSnapshotCount()).toBe(10);
      await db.clearAllSnapshots();
      expect(await db.getSnapshotCount()).toBe(0);
    });
  });

  describe('家庭档案管理', () => {
    it('应该能够创建新的家庭档案', async () => {
      await db.updateHouseholdProfile(
        'house-001',
        '测试家庭',
        true,
        0.5,
        0.8
      );
      const profiles = await db.profiles.toArray();
      expect(profiles.length).toBe(1);
      expect(profiles[0].householdId).toBe('house-001');
      expect(profiles[0].totalResponses).toBe(1);
    });

    it('应该能够更新现有家庭档案', async () => {
      await db.updateHouseholdProfile('house-001', '测试家庭', true, 0.5, 0.8);
      await db.updateHouseholdProfile('house-001', '测试家庭', true, 0.3, 0.7);

      const profile = await db.profiles.get('house-001');
      expect(profile?.totalResponses).toBe(2);
      expect(profile?.totalReduction).toBeCloseTo(0.8);
      expect(profile?.averageResponseProbability).toBeCloseTo(0.75);
    });

    it('应该能够批量更新家庭档案', async () => {
      const vpp = createVPP(10);
      const command = vpp.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.MEDIUM,
        source: 'VPP'
      });
      const results = await vpp.executeCommand(command.id);

      await db.bulkUpdateHouseholdProfiles(results);
      const profiles = await db.profiles.toArray();
      expect(profiles.length).toBe(10);
    });

    it('应该能够获取响应最多的家庭', async () => {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < i + 1; j++) {
          await db.updateHouseholdProfile(
            `house-${i}`,
            `家庭 ${i}`,
            true,
            0.5,
            0.8
          );
        }
      }
      const topResponders = await db.getTopResponders(3);
      expect(topResponders.length).toBe(3);
      expect(topResponders[0].totalResponses).toBeGreaterThan(topResponders[2].totalResponses);
    });

    it('应该能够获取削减最多的家庭', async () => {
      for (let i = 0; i < 5; i++) {
        await db.updateHouseholdProfile(
          `house-${i}`,
          `家庭 ${i}`,
          true,
          (i + 1) * 0.5,
          0.8
        );
      }
      const topReducers = await db.getTopReducers(3);
      expect(topReducers.length).toBe(3);
      expect(topReducers[0].totalReduction).toBeGreaterThan(topReducers[2].totalReduction);
    });
  });

  describe('统计聚合', () => {
    it('应该能够正确计算聚合统计', async () => {
      const snapshots = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        commandId: `cmd-${Math.floor(i / 10)}`,
        householdId: `house-${i}`,
        householdName: `家庭 ${i}`,
        baselineLoad: 2.5,
        actualLoad: i < 70 ? 2.0 : 2.5,
        reducedLoad: i < 70 ? 0.5 : 0,
        responseProbability: 0.7,
        didRespond: i < 70,
        responseTime: 150,
        scenario: ScenarioType.PEAK_SHAVING
      }));
      await db.addSnapshots(snapshots);
      for (let i = 0; i < 50; i++) {
        await db.updateHouseholdProfile(
          `house-${i}`,
          `家庭 ${i}`,
          true,
          0.5,
          0.7
        );
      }

      const stats = await db.getAggregateStats();
      expect(stats.totalSnapshots).toBe(100);
      expect(stats.totalResponses).toBe(70);
      expect(stats.averageResponseRate).toBeCloseTo(0.7);
      expect(stats.totalHouseholds).toBe(50);
    });

    it('应该能够按场景统计响应率', async () => {
      const scenarios = [
        ScenarioType.EMERGENCY,
        ScenarioType.PEAK_SHAVING,
        ScenarioType.MAINTENANCE
      ];
      const snapshots = [];
      for (let i = 0; i < 30; i++) {
        snapshots.push({
          timestamp: new Date(),
          commandId: `cmd-${i}`,
          householdId: `house-${i}`,
          householdName: `家庭 ${i}`,
          baselineLoad: 2.5,
          actualLoad: i < 27 ? 2.0 : 2.5,
          reducedLoad: i < 27 ? 0.5 : 0,
          responseProbability: 0.9,
          didRespond: i < 27,
          responseTime: 150,
          scenario: scenarios[0]
        });
      }
      for (let i = 0; i < 30; i++) {
        snapshots.push({
          timestamp: new Date(),
          commandId: `cmd-${i + 30}`,
          householdId: `house-${i + 30}`,
          householdName: `家庭 ${i + 30}`,
          baselineLoad: 2.5,
          actualLoad: i < 21 ? 2.0 : 2.5,
          reducedLoad: i < 21 ? 0.5 : 0,
          responseProbability: 0.7,
          didRespond: i < 21,
          responseTime: 150,
          scenario: scenarios[1]
        });
      }
      for (let i = 0; i < 30; i++) {
        snapshots.push({
          timestamp: new Date(),
          commandId: `cmd-${i + 60}`,
          householdId: `house-${i + 60}`,
          householdName: `家庭 ${i + 60}`,
          baselineLoad: 2.5,
          actualLoad: i < 9 ? 2.0 : 2.5,
          reducedLoad: i < 9 ? 0.5 : 0,
          responseProbability: 0.3,
          didRespond: i < 9,
          responseTime: 150,
          scenario: scenarios[2]
        });
      }
      await db.addSnapshots(snapshots);

      const rates = await db.getResponseRateByScenario();
      expect(rates[ScenarioType.EMERGENCY].rate).toBeCloseTo(0.9);
      expect(rates[ScenarioType.PEAK_SHAVING].rate).toBeCloseTo(0.7);
      expect(rates[ScenarioType.MAINTENANCE].rate).toBeCloseTo(0.3);
    });
  });

  describe('样本数据生成', () => {
    it('应该能够生成指定数量的样本数据', async () => {
      await db.generateSampleData(100, 5);
      const snapshotCount = await db.getSnapshotCount();
      expect(snapshotCount).toBe(500);
    });

    it('生成的数据应该包含所有场景', async () => {
      await db.generateSampleData(100, 10);
      const rates = await db.getResponseRateByScenario();
      const scenarioKeys = Object.keys(rates);
      expect(scenarioKeys.length).toBeGreaterThanOrEqual(3);
    });

    it('生成的数据应该有合理的响应分布', async () => {
      await db.generateSampleData(200, 10);
      const stats = await db.getAggregateStats();
      expect(stats.averageResponseRate).toBeGreaterThan(0.3);
      expect(stats.averageResponseRate).toBeLessThan(0.8);
    });
  });

  describe('错误处理', () => {
    it('批量更新时出错不应该抛出异常', async () => {
      const invalidSnapshots: any[] = [];
      await expect(db.bulkUpdateHouseholdProfiles(invalidSnapshots)).resolves.not.toThrow();
    });

    it('生成样本数据时错误应该正确处理', async () => {
      await expect(db.generateSampleData(0, 0)).resolves.not.toThrow();
    });
  });
});
