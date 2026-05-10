import { describe, it, expect } from 'vitest';
import {
  calculateReynoldsNumber,
  calculateDarcyWeisbachFrictionFactor,
  calculateHeadLoss,
  calculatePressureFromHead,
  calculateVelocityFromFlow,
  calculateFlowDecay,
  simulatePressureDistribution,
  simulateTimeBasedDecay,
  interpolatePressure,
} from '../src/simulation/fluidDynamics';
import { WATER_VISCOSITY } from '../src/constants';

describe('流体力学模拟 - 核心业务场景', () => {
  describe('基础流体力学计算', () => {
    it('SC-201: 应能正确计算 Reynolds 数', () => {
      const velocity = 1.5;
      const diameter = 0.2;

      const reynolds = calculateReynoldsNumber(velocity, diameter);
      const expected = (velocity * diameter) / WATER_VISCOSITY;

      expect(reynolds).toBeCloseTo(expected, 10);
      expect(reynolds).toBeGreaterThan(1000);
    });

    it('SC-202: 层流状态下应返回正确的摩擦因子', () => {
      const laminarReynolds = 1500;
      const friction = calculateDarcyWeisbachFrictionFactor(laminarReynolds, 0.001);

      const expected = 64 / laminarReynolds;
      expect(friction).toBeCloseTo(expected, 6);
    });

    it('SC-203: 湍流状态下应能收敛到正确的摩擦因子', () => {
      const turbulentReynolds = 10000;
      const relativeRoughness = 0.001;

      const friction = calculateDarcyWeisbachFrictionFactor(
        turbulentReynolds,
        relativeRoughness
      );

      expect(friction).toBeGreaterThan(0.01);
      expect(friction).toBeLessThan(0.05);
    });

    it('SC-204: 应能正确计算流速', () => {
      const flowRate = 0.1;
      const diameter = 0.3;
      const area = Math.PI * Math.pow(diameter / 2, 2);
      const expected = flowRate / area;

      const velocity = calculateVelocityFromFlow(flowRate, diameter);
      expect(velocity).toBeCloseTo(expected, 6);
    });

    it('SC-205: 应能正确计算水头损失', () => {
      const frictionFactor = 0.02;
      const length = 1000;
      const diameter = 0.3;
      const velocity = 1.5;
      const g = 9.81;

      const headLoss = calculateHeadLoss(
        frictionFactor,
        length,
        diameter,
        velocity
      );

      const expected = (frictionFactor * length * velocity * velocity) / (2 * g * diameter);
      expect(headLoss).toBeCloseTo(expected, 6);
      expect(headLoss).toBeGreaterThan(0);
    });

    it('SC-206: 应能正确将水头转换为压力', () => {
      const head = 10;
      const rho = 1000;
      const g = 9.81;
      const expected = (rho * g * head) / 1000000;

      const pressure = calculatePressureFromHead(head);
      expect(pressure).toBeCloseTo(expected, 6);
    });
  });

  describe('流量衰减模拟', () => {
    it('SC-207: 应能正确计算流量衰减', () => {
      const params = {
        initialFlow: 0.1,
        distance: 1000,
        pipeDiameter: 0.3,
        frictionCoefficient: 130,
        viscosity: WATER_VISCOSITY,
        time: Date.now(),
      };

      const result = calculateFlowDecay(params);

      expect(result.pressure).toBeDefined();
      expect(result.flowRate).toBeLessThanOrEqual(params.initialFlow);
      expect(result.velocity).toBeGreaterThan(0);
      expect(result.reynoldsNumber).toBeGreaterThan(0);
      expect(result.frictionFactor).toBeGreaterThan(0);
      expect(result.headLoss).toBeGreaterThanOrEqual(0);
    });

    it('SC-208: 距离越长，衰减效果越明显', () => {
      const commonParams = {
        initialFlow: 0.1,
        pipeDiameter: 0.3,
        frictionCoefficient: 130,
        viscosity: WATER_VISCOSITY,
        time: Date.now(),
      };

      const shortResult = calculateFlowDecay({
        ...commonParams,
        distance: 100,
      });
      const longResult = calculateFlowDecay({
        ...commonParams,
        distance: 5000,
      });

      expect(longResult.pressure).toBeLessThanOrEqual(shortResult.pressure);
      expect(longResult.flowRate).toBeLessThanOrEqual(shortResult.flowRate);
      expect(longResult.headLoss).toBeGreaterThanOrEqual(shortResult.headLoss);
    });

    it('SC-209: 管径越大，衰减效果越小', () => {
      const commonParams = {
        initialFlow: 0.1,
        distance: 1000,
        frictionCoefficient: 130,
        viscosity: WATER_VISCOSITY,
        time: Date.now(),
      };

      const smallPipe = calculateFlowDecay({
        ...commonParams,
        pipeDiameter: 0.1,
      });
      const largePipe = calculateFlowDecay({
        ...commonParams,
        pipeDiameter: 0.5,
      });

      expect(largePipe.pressure).toBeGreaterThanOrEqual(smallPipe.pressure);
      expect(largePipe.flowRate).toBeGreaterThanOrEqual(smallPipe.flowRate);
    });

    it('SC-210: 应能进行基于时间的衰减计算', () => {
      const initialPressure = 0.5;
      const timeSeconds = 3600;
      const flowRate = 10;

      const decayedPressure = simulateTimeBasedDecay(
        initialPressure,
        timeSeconds,
        flowRate
      );

      expect(decayedPressure).toBeLessThan(initialPressure);
      expect(decayedPressure).toBeGreaterThan(0);
    });

    it('SC-211: 时间越长，压力衰减越明显', () => {
      const initialPressure = 0.5;
      const flowRate = 10;

      const shortTime = simulateTimeBasedDecay(initialPressure, 60, flowRate);
      const longTime = simulateTimeBasedDecay(initialPressure, 86400, flowRate);

      expect(longTime).toBeLessThan(shortTime);
    });
  });

  describe('压力分布模拟', () => {
    it('SC-212: 应能异步模拟管网压力分布', async () => {
      const sourcePressures = new Map<string, number>([
        ['node-1', 0.6],
        ['node-2', 0.55],
      ]);

      const connections = new Map<string, string[]>([
        ['node-1', ['node-3', 'node-4']],
        ['node-2', ['node-4', 'node-5']],
        ['node-3', ['node-6']],
        ['node-4', ['node-6']],
        ['node-5', []],
        ['node-6', []],
      ]);

      const distances = new Map<string, number>([
        ['node-3', 500],
        ['node-4', 800],
        ['node-5', 300],
        ['node-6', 600],
      ]);

      const result = await simulatePressureDistribution(
        sourcePressures,
        connections,
        distances,
        0.3,
        130
      );

      expect(result.size).toBeGreaterThanOrEqual(2);

      expect(result.get('node-1')).toBe(0.6);
      expect(result.get('node-2')).toBe(0.55);

      for (const [, pressure] of result) {
        expect(pressure).toBeGreaterThanOrEqual(0.05);
      }
    });

    it('SC-213: 压力应沿管网路径递减', async () => {
      const sourcePressures = new Map<string, number>([['source', 0.6]]);

      const connections = new Map<string, string[]>([
        ['source', ['A']],
        ['A', ['B']],
        ['B', ['C']],
        ['C', []],
      ]);

      const distances = new Map<string, number>([
        ['A', 200],
        ['B', 400],
        ['C', 600],
      ]);

      const result = await simulatePressureDistribution(
        sourcePressures,
        connections,
        distances,
        0.3,
        130
      );

      const sourcePressure = result.get('source')!;
      const aPressure = result.get('A');
      const bPressure = result.get('B');
      const cPressure = result.get('C');

      if (aPressure && bPressure && cPressure) {
        expect(aPressure).toBeLessThan(sourcePressure);
        expect(bPressure).toBeLessThan(aPressure);
        expect(cPressure).toBeLessThan(bPressure);
      }
    });

    it('SC-214: 空的源节点应返回空结果', async () => {
      const result = await simulatePressureDistribution(
        new Map(),
        new Map(),
        new Map(),
        0.3,
        130
      );

      expect(result.size).toBe(0);
    });
  });

  describe('压力插值', () => {
    it('SC-215: 应能使用反距离加权插值计算压力', () => {
      const knownPoints = [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 0, pressure: 0.4 },
        { x: 0, y: 10, pressure: 0.45 },
        { x: 10, y: 10, pressure: 0.35 },
      ];

      const interpolated = interpolatePressure(5, 5, knownPoints);

      expect(interpolated).toBeGreaterThan(0.35);
      expect(interpolated).toBeLessThan(0.5);
    });

    it('SC-216: 当插值点与已知点重合时应返回该点压力', () => {
      const knownPoints = [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 10, pressure: 0.4 },
      ];

      const interpolated = interpolatePressure(0, 0, knownPoints);
      expect(interpolated).toBe(0.5);
    });

    it('SC-217: 空的已知点列表应返回 0', () => {
      const interpolated = interpolatePressure(5, 5, []);
      expect(interpolated).toBe(0);
    });

    it('SC-218: 插值结果应受距离影响', () => {
      const knownPoints = [
        { x: 0, y: 0, pressure: 0.6 },
        { x: 100, y: 100, pressure: 0.2 },
      ];

      const nearHighPressure = interpolatePressure(1, 1, knownPoints);
      const nearLowPressure = interpolatePressure(99, 99, knownPoints);

      expect(nearHighPressure).toBeGreaterThan(nearLowPressure);
    });
  });

  describe('边界条件验证', () => {
    it('SC-219: 流量衰减计算中压力不应为负', () => {
      const params = {
        initialFlow: 0.1,
        distance: 10000,
        pipeDiameter: 0.1,
        frictionCoefficient: 50,
        viscosity: WATER_VISCOSITY,
        time: Date.now(),
      };

      const result = calculateFlowDecay(params);
      expect(result.pressure).toBeGreaterThanOrEqual(0);
    });

    it('SC-220: 模拟压力分布中压力应不低于最小值', async () => {
      const sourcePressures = new Map<string, number>([['source', 0.1]]);

      const connections = new Map<string, string[]>([
        ['source', ['node-1']],
        ['node-1', []],
      ]);

      const distances = new Map<string, number>([['node-1', 10000]]);

      const result = await simulatePressureDistribution(
        sourcePressures,
        connections,
        distances,
        0.1,
        50
      );

      for (const [, pressure] of result) {
        expect(pressure).toBeGreaterThanOrEqual(0.05);
      }
    });
  });
});
