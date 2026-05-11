import { describe, it, expect, beforeEach, vi } from 'vitest';
import { interpolationService } from '../../services/interpolation';
import { dataStore } from '../../services/dataStore';
import type { CrackPoint } from '../../types';

describe('SpatioTemporalInterpolation Service', () => {
  let testCrack: CrackPoint;

  beforeEach(async () => {
    await dataStore.init();
    const cracks = dataStore.getCracks();
    testCrack = cracks[0];
  });

  describe('初始化测试', () => {
    it('应该成功初始化服务', () => {
      expect(interpolationService).toBeDefined();
    });

    it('应该返回可用的插值方法列表', () => {
      const methods = interpolationService.getAvailableMethods();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods).toContain('linear');
      expect(methods).toContain('kriging');
      expect(methods).toContain('idw');
      expect(methods).toContain('spline');
    });

    it('每个插值方法应该有对应的描述', () => {
      const methods = interpolationService.getAvailableMethods();
      methods.forEach(method => {
        const description = interpolationService.getMethodDescription(method);
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('单次裂缝插值', () => {
    it('应该成功对未来日期进行插值预测', async () => {
      const futureDate = '2027-01-01';
      const result = await interpolationService.interpolateCrack(testCrack, futureDate);

      expect(result).toBeDefined();
      expect(result.crackId).toBe(testCrack.id);
      expect(result.targetDate).toBe(futureDate);
      expect(result.predictedWidth).toBeGreaterThan(testCrack.width);
      expect(result.predictedLength).toBeGreaterThan(testCrack.length);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.method).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('对历史日期应该返回原始裂缝数据', async () => {
      const historicalDate = '2020-01-01';
      const result = await interpolationService.interpolateCrack(testCrack, historicalDate);

      expect(result).toBeDefined();
      expect(result.predictedWidth).toBe(testCrack.width);
      expect(result.predictedLength).toBe(testCrack.length);
      expect(result.confidence).toBe(1.0);
    });

    it('根据严重程度的不同，扩展速率应该不同', async () => {
      const cracks = dataStore.getCracks();
      const lowSeverityCrack = cracks.find(c => c.severity === 'low');
      const criticalCrack = cracks.find(c => c.severity === 'critical');

      if (lowSeverityCrack && criticalCrack) {
        const futureDate = '2027-01-01';
        const lowResult = await interpolationService.interpolateCrack(lowSeverityCrack, futureDate);
        const criticalResult = await interpolationService.interpolateCrack(criticalCrack, futureDate);

        const lowGrowth = (lowResult.predictedWidth - lowSeverityCrack.width) / lowSeverityCrack.width;
        const criticalGrowth = (criticalResult.predictedWidth - criticalCrack.width) / criticalCrack.width;

        expect(criticalGrowth).toBeGreaterThan(lowGrowth);
      }
    });

    it('应该生成预测点坐标数组', async () => {
      const futureDate = '2027-01-01';
      const result = await interpolationService.interpolateCrack(testCrack, futureDate);

      expect(Array.isArray(result.predictedPoints)).toBe(true);
      expect(result.predictedPoints.length).toBeGreaterThan(0);
      expect(result.predictedPoints[0]).toHaveProperty('x');
      expect(result.predictedPoints[0]).toHaveProperty('y');
      expect(result.predictedPoints[0]).toHaveProperty('timestamp');
    });

    it('应该支持不同的插值方法', async () => {
      const futureDate = '2027-01-01';
      const methods = interpolationService.getAvailableMethods();

      for (const method of methods) {
        const result = await interpolationService.interpolateCrack(testCrack, futureDate, method);
        expect(result.method).toBe(method);
      }
    });

    it('单次预测应该在模拟列表中创建记录', async () => {
      const futureDate = '2027-01-01';
      await interpolationService.interpolateCrack(testCrack, futureDate);

      const simulations = interpolationService.getAllSimulations();
      const singleSimulation = simulations.find(s => s.simulationType === 'single');

      expect(singleSimulation).toBeDefined();
      expect(singleSimulation?.simulationType).toBe('single');
    });
  });

  describe('趋势模拟', () => {
    it('应该成功启动趋势模拟', async () => {
      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-06-30',
        30,
        'kriging'
      );

      expect(simulation).toBeDefined();
      expect(simulation.id).toContain('SIM-');
      expect(simulation.crackId).toBe(testCrack.id);
      expect(simulation.startDate).toBe('2026-01-01');
      expect(simulation.endDate).toBe('2026-06-30');
      expect(simulation.status).toBe('running');
      expect(simulation.simulationType).toBe('trend');
      expect(simulation.method).toBe('kriging');
    });

    it('模拟完成后应该生成多个步骤数据', async () => {
      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-03-01',
        30,
        'linear'
      );

      await new Promise(resolve => {
        const checkStatus = () => {
          const sim = interpolationService.getSimulation(simulation.id);
          if (sim && sim.status === 'completed') {
            resolve(sim);
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        setTimeout(checkStatus, 100);
      });

      const completedSim = interpolationService.getSimulation(simulation.id);
      expect(completedSim?.status).toBe('completed');
      expect(completedSim?.steps.length).toBeGreaterThan(1);
      expect(completedSim?.progress).toBe(100);
    });

    it('应该支持回调监听模拟完成', async () => {
      const completionCallback = vi.fn();

      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-02-01',
        15,
        'linear'
      );

      interpolationService.onSimulationComplete(simulation.id, completionCallback);

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(completionCallback).toHaveBeenCalled();
    });

    it('趋势模拟的步骤应该显示病害发展趋势', async () => {
      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-06-01',
        30,
        'linear'
      );

      await new Promise(resolve => {
        const checkStatus = () => {
          const sim = interpolationService.getSimulation(simulation.id);
          if (sim && sim.status === 'completed') {
            resolve(sim);
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        setTimeout(checkStatus, 100);
      });

      const completedSim = interpolationService.getSimulation(simulation.id);
      if (completedSim && completedSim.steps.length > 1) {
        const firstStep = completedSim.steps[0];
        const lastStep = completedSim.steps[completedSim.steps.length - 1];

        expect(lastStep.predictedWidth).toBeGreaterThan(firstStep.predictedWidth);
        expect(lastStep.predictedLength).toBeGreaterThan(firstStep.predictedLength);
      }
    });
  });

  describe('模拟查询管理', () => {
    it('getSimulation 应该根据ID返回正确的模拟', async () => {
      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-02-01',
        30,
        'linear'
      );

      const foundSim = interpolationService.getSimulation(simulation.id);
      expect(foundSim).toBeDefined();
      expect(foundSim?.id).toBe(simulation.id);
    });

    it('getSimulation 传入不存在的ID应该返回 undefined', () => {
      const result = interpolationService.getSimulation('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('getAllSimulations 应该返回所有模拟记录', async () => {
      await interpolationService.interpolateCrack(testCrack, '2027-01-01');
      await interpolationService.startTrendSimulation(testCrack, '2026-01-01', '2026-02-01', 30);

      const simulations = interpolationService.getAllSimulations();
      expect(simulations.length).toBeGreaterThanOrEqual(2);
    });

    it('模拟列表应该按创建时间倒序排列', async () => {
      await interpolationService.interpolateCrack(testCrack, '2027-01-01');
      await new Promise(resolve => setTimeout(resolve, 100));
      await interpolationService.interpolateCrack(testCrack, '2027-02-01');

      const simulations = interpolationService.getAllSimulations();
      if (simulations.length >= 2) {
        const firstTime = new Date(simulations[0].createdAt).getTime();
        const secondTime = new Date(simulations[1].createdAt).getTime();
        expect(firstTime).toBeGreaterThanOrEqual(secondTime);
      }
    });
  });

  describe('批量裂缝插值', () => {
    it('interpolateMultipleCracks 应该对多个裂缝同时进行插值', async () => {
      const cracks = dataStore.getCracks().slice(0, 3);
      const futureDate = '2027-01-01';

      const results = await interpolationService.interpolateMultipleCracks(cracks, futureDate);

      expect(results.length).toBe(cracks.length);
      results.forEach(result => {
        expect(result.crackId).toBeDefined();
        expect(result.targetDate).toBe(futureDate);
      });
    });
  });

  describe('模拟类型区分', () => {
    it('单次预测的 simulationType 应该是 single', async () => {
      await interpolationService.interpolateCrack(testCrack, '2027-01-01');
      const simulations = interpolationService.getAllSimulations();
      const singleSim = simulations.find(s => s.simulationType === 'single');
      expect(singleSim).toBeDefined();
    });

    it('趋势模拟的 simulationType 应该是 trend', async () => {
      const simulation = await interpolationService.startTrendSimulation(
        testCrack,
        '2026-01-01',
        '2026-02-01',
        30,
        'linear'
      );

      const foundSim = interpolationService.getSimulation(simulation.id);
      expect(foundSim?.simulationType).toBe('trend');
    });
  });
});
