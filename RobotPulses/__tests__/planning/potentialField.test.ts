import {
  defaultAPFParameters,
  computeAttractiveForce,
  computeRepulsiveForce,
  computeRepulsiveForceFromRobots,
  computeTotalForce,
  computeJointVelocityFromForce,
  asyncAPFPlanning,
} from '@/lib/planning/potentialField';
import type { Obstacle } from '@/types/robot';

describe('人工势场算法测试', () => {
  const defaultParams = defaultAPFParameters;

  describe('默认参数', () => {
    test('应该包含所有必要的参数', () => {
      expect(defaultParams).toHaveProperty('kAtt');
      expect(defaultParams).toHaveProperty('kRep');
      expect(defaultParams).toHaveProperty('d0');
      expect(defaultParams).toHaveProperty('maxForce');
      expect(defaultParams).toHaveProperty('gain');
      
      expect(defaultParams.kAtt).toBeGreaterThan(0);
      expect(defaultParams.kRep).toBeGreaterThan(0);
      expect(defaultParams.d0).toBeGreaterThan(0);
    });
  });

  describe('引力计算', () => {
    test('目标点处引力应为零', () => {
      const position: [number, number, number] = [1, 2, 3];
      const force = computeAttractiveForce(position, position, defaultParams.kAtt);
      
      expect(force).toEqual([0, 0, 0]);
    });

    test('引力方向应指向目标', () => {
      const current: [number, number, number] = [0, 0, 0];
      const target: [number, number, number] = [1, 0, 0];
      const force = computeAttractiveForce(current, target, defaultParams.kAtt);
      
      expect(force[0]).toBeGreaterThan(0);
      expect(force[1]).toBeCloseTo(0);
      expect(force[2]).toBeCloseTo(0);
    });

    test('引力大小应与距离成正比', () => {
      const target: [number, number, number] = [0, 0, 0];
      const force1 = computeAttractiveForce([1, 0, 0], target, defaultParams.kAtt);
      const force2 = computeAttractiveForce([2, 0, 0], target, defaultParams.kAtt);
      
      const mag1 = Math.sqrt(force1[0] ** 2 + force1[1] ** 2 + force1[2] ** 2);
      const mag2 = Math.sqrt(force2[0] ** 2 + force2[1] ** 2 + force2[2] ** 2);
      
      expect(mag2).toBeCloseTo(mag1 * 2);
    });
  });

  describe('斥力计算 - 静态障碍物', () => {
    test('障碍物作用范围外斥力应为零', () => {
      const position: [number, number, number] = [0, 0, 0];
      const obstacles: Obstacle[] = [
        {
          id: 'obs-1',
          type: 'box',
          position: [10, 0, 0],
          size: [1, 1, 1],
          color: '#ff0000',
        },
      ];
      
      const force = computeRepulsiveForce(position, obstacles, defaultParams.kRep, defaultParams.d0);
      expect(force).toEqual([0, 0, 0]);
    });

    test('障碍物附近斥力应指向远离障碍物方向', () => {
      const position: [number, number, number] = [0, 0, 0];
      const obstacles: Obstacle[] = [
        {
          id: 'obs-1',
          type: 'box',
          position: [0.3, 0, 0],
          size: [0.2, 0.2, 0.2],
          color: '#ff0000',
        },
      ];
      
      const force = computeRepulsiveForce(position, obstacles, defaultParams.kRep, 0.5);
      expect(force[0]).toBeLessThan(0);
    });

    test('多个障碍物斥力应叠加', () => {
      const position: [number, number, number] = [0, 0, 0];
      const obstacle1: Obstacle[] = [
        {
          id: 'obs-1',
          type: 'box',
          position: [0.3, 0, 0],
          size: [0.2, 0.2, 0.2],
          color: '#ff0000',
        },
      ];
      const obstacles: Obstacle[] = [
        ...obstacle1,
        {
          id: 'obs-2',
          type: 'box',
          position: [-0.3, 0, 0],
          size: [0.2, 0.2, 0.2],
          color: '#00ff00',
        },
      ];
      
      const force1 = computeRepulsiveForce(position, obstacle1, defaultParams.kRep, 0.5);
      const force2 = computeRepulsiveForce(position, obstacles, defaultParams.kRep, 0.5);
      
      expect(force2[0]).not.toEqual(force1[0]);
    });
  });

  describe('斥力计算 - 其他机器人', () => {
    test('其他机器人作用范围外斥力应为零', () => {
      const position: [number, number, number] = [0, 0, 0];
      const otherRobots = [
        { position: [10, 0, 0] as [number, number, number], radius: 0.3 },
      ];
      
      const force = computeRepulsiveForceFromRobots(position, otherRobots, defaultParams.kRep, defaultParams.d0);
      expect(force).toEqual([0, 0, 0]);
    });

    test('应排斥其他机器人', () => {
      const position: [number, number, number] = [0, 0, 0];
      const otherRobots = [
        { position: [0.5, 0, 0] as [number, number, number], radius: 0.3 },
      ];
      
      const force = computeRepulsiveForceFromRobots(position, otherRobots, defaultParams.kRep, 1.0);
      expect(force[0]).toBeLessThan(0);
    });
  });

  describe('合力计算', () => {
    test('无障碍物时合力等于引力', () => {
      const current: [number, number, number] = [0, 0, 0];
      const target = { position: [1, 0, 0] as [number, number, number] };
      const obstacles: Obstacle[] = [];
      const otherRobots: Array<{ position: [number, number, number]; radius: number }> = [];
      
      const force = computeTotalForce(current, target, obstacles, otherRobots, defaultParams);
      expect(force[0]).toBeGreaterThan(0);
    });

    test('合力应受最大力限制', () => {
      const current: [number, number, number] = [0, 0, 0];
      const target = { position: [100, 100, 100] as [number, number, number] };
      const obstacles: Obstacle[] = [];
      const otherRobots: Array<{ position: [number, number, number]; radius: number }> = [];
      const params = { ...defaultParams, maxForce: 10 };
      
      const force = computeTotalForce(current, target, obstacles, otherRobots, params);
      const magnitude = Math.sqrt(force[0] ** 2 + force[1] ** 2 + force[2] ** 2);
      
      expect(magnitude).toBeLessThanOrEqual(params.maxForce + 0.001);
    });
  });

  describe('关节速度计算', () => {
    test('应返回 6 个关节速度', () => {
      const force: [number, number, number] = [1, 0, 0];
      const jacobian = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1],
      ];
      const maxVelocities = [1, 1, 1, 1, 1, 1];
      
      const velocities = computeJointVelocityFromForce(force, jacobian, maxVelocities);
      expect(velocities).toHaveLength(6);
    });

    test('关节速度不应超过最大限制', () => {
      const force: [number, number, number] = [100, 0, 0];
      const jacobian = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1],
      ];
      const maxVelocities = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      
      const velocities = computeJointVelocityFromForce(force, jacobian, maxVelocities);
      velocities.forEach(v => {
        expect(Math.abs(v)).toBeLessThanOrEqual(0.5 + 0.001);
      });
    });
  });

  describe('异步 APF 规划', () => {
    test('应异步计算并返回合力', async () => {
      const current: [number, number, number] = [0, 0, 0];
      const target = { position: [1, 0, 0] as [number, number, number] };
      const obstacles: Obstacle[] = [];
      const otherRobots: Array<{ position: [number, number, number]; radius: number }> = [];
      
      const result = await asyncAPFPlanning(current, target, obstacles, otherRobots, defaultParams);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBeGreaterThan(0);
    });
  });
});
