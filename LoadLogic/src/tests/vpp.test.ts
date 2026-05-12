import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualPowerPlant, createVPP, generateHouseholds } from '$lib/modules/vpp';
import { CommandStatus, CommandSeverity } from '$lib/types';

describe('VirtualPowerPlant', () => {
  describe('初始化', () => {
    it('应该能够创建空的 VPP 实例', () => {
      const vpp = new VirtualPowerPlant();
      expect(vpp).toBeInstanceOf(VirtualPowerPlant);
    });

    it('应该能够创建指定数量家庭的 VPP', () => {
      const vpp = createVPP(100);
      const status = vpp.getStatus();
      expect(status.totalHouseholds).toBe(100);
    });

    it('应该生成有效的家庭数据', () => {
      const households = generateHouseholds(10);
      expect(households.length).toBe(10);
      households.forEach(h => {
        expect(h.id).toBeDefined();
        expect(h.name).toBeDefined();
        expect(h.baseLoad).toBeGreaterThan(0);
        expect(h.responseProbability).toBeGreaterThan(0);
        expect(h.responseProbability).toBeLessThanOrEqual(1);
        expect(h.appliances.length).toBeGreaterThan(0);
      });
    });
  });

  describe('家庭管理', () => {
    it('应该能够添加家庭', () => {
      const vpp = createVPP(10);
      const newHousehold = generateHouseholds(1)[0];
      vpp.addHousehold(newHousehold);
      expect(vpp.getStatus().totalHouseholds).toBe(11);
    });

    it('应该能够移除家庭', () => {
      const vpp = createVPP(10);
      const households = vpp.getHouseholds();
      vpp.removeHousehold(households[0].id);
      expect(vpp.getStatus().totalHouseholds).toBe(9);
    });

    it('应该能够通过 ID 获取家庭', () => {
      const vpp = createVPP(10);
      const households = vpp.getHouseholds();
      const found = vpp.getHouseholdById(households[0].id);
      expect(found?.id).toBe(households[0].id);
    });

    it('应该能够更新家庭响应概率', () => {
      const vpp = createVPP(10);
      const households = vpp.getHouseholds();
      const householdId = households[0].id;
      vpp.updateResponseProbability(householdId, 0.99);
      const updated = vpp.getHouseholdById(householdId);
      expect(updated?.responseProbability).toBeCloseTo(0.99);
    });
  });

  describe('节能指令', () => {
    it('应该能够发布节能指令', () => {
      const vpp = createVPP(100);
      const command = vpp.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.MEDIUM,
        source: 'VPP'
      });
      expect(command.id).toBeDefined();
      expect(command.severity).toBe(CommandSeverity.MEDIUM);
      expect(command.status).toBe(CommandStatus.PENDING);
    });

    it('应该执行指令并生成响应快照', async () => {
      const vpp = createVPP(100);
      const command = vpp.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.HIGH,
        source: 'VPP'
      });
      const results = await vpp.executeCommand(command.id);
      expect(results.length).toBe(100);
      results.forEach(r => {
        expect(r.householdId).toBeDefined();
        expect(r.baselineLoad).toBeGreaterThan(0);
        expect(r.responseProbability).toBeGreaterThan(0);
      });
    });

    it('不同严重级别应该产生不同的响应效果', async () => {
      const vpp1 = createVPP(100);
      const commandLow = vpp1.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.LOW,
        source: 'VPP'
      });
      const resultsLow = await vpp1.executeCommand(commandLow.id);
      const avgReductionLow = resultsLow.reduce((sum, r) => sum + r.reducedLoad, 0) / resultsLow.length;

      const vpp2 = createVPP(100);
      const commandCritical = vpp2.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.CRITICAL,
        source: 'VPP'
      });
      const resultsCritical = await vpp2.executeCommand(commandCritical.id);
      const avgReductionCritical = resultsCritical.reduce((sum, r) => sum + r.reducedLoad, 0) / resultsCritical.length;

      expect(avgReductionCritical).toBeGreaterThan(avgReductionLow);
    });
  });

  describe('状态管理', () => {
    it('应该正确追踪响应家庭数量', async () => {
      const vpp = createVPP(100);
      const command = vpp.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.HIGH,
        source: 'VPP'
      });
      await vpp.executeCommand(command.id);
      const status = vpp.getStatus();
      expect(status.respondingHouseholds).toBeGreaterThan(0);
      expect(status.currentReduction).toBeGreaterThan(0);
    });

    it('应该能够重置所有响应状态', async () => {
      const vpp = createVPP(100);
      const command = vpp.issueCommand({
        targetReduction: 50,
        duration: 3600,
        severity: CommandSeverity.HIGH,
        source: 'VPP'
      });
      await vpp.executeCommand(command.id);
      vpp.resetAllResponses();
      const status = vpp.getStatus();
      expect(status.respondingHouseholds).toBe(0);
      expect(status.currentReduction).toBe(0);
    });
  });

  describe('负荷计算', () => {
    it('应该正确计算总负荷', () => {
      const vpp = createVPP(10);
      const totalLoad = vpp.getTotalLoad();
      const households = vpp.getHouseholds();
      const expected = households.reduce((sum, h) => sum + h.currentLoad, 0);
      expect(totalLoad).toBeCloseTo(expected);
    });
  });
});
