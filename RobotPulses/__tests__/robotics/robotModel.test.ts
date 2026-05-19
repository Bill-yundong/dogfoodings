import {
  createStandardDHParameters,
  defaultRobotModels,
  createInitialJoints,
  clampJointAngle,
  checkJointLimits,
} from '@/lib/robotics/robotModel';

describe('机器人模型测试', () => {
  describe('DH 参数创建', () => {
    test('应该创建标准 6 轴 DH 参数', () => {
      const dhParams = createStandardDHParameters();
      expect(dhParams).toHaveLength(6);
      dhParams.forEach(param => {
        expect(param).toHaveProperty('alpha');
        expect(param).toHaveProperty('a');
        expect(param).toHaveProperty('d');
        expect(param).toHaveProperty('theta');
      });
    });
  });

  describe('默认机器人模型', () => {
    test('应该包含至少 2 个机器人模型', () => {
      expect(defaultRobotModels.length).toBeGreaterThanOrEqual(2);
    });

    test('每个机器人模型应有完整的属性', () => {
      defaultRobotModels.forEach(robot => {
        expect(robot).toHaveProperty('id');
        expect(robot).toHaveProperty('name');
        expect(robot).toHaveProperty('color');
        expect(robot).toHaveProperty('basePosition');
        expect(robot).toHaveProperty('dhParameters');
        expect(robot).toHaveProperty('jointLimits');
        expect(robot).toHaveProperty('maxJointVelocities');
        expect(robot).toHaveProperty('linkDimensions');
      });
    });

    test('关节限制和速度限制数量应匹配轴数', () => {
      defaultRobotModels.forEach(robot => {
        expect(robot.jointLimits).toHaveLength(6);
        expect(robot.maxJointVelocities).toHaveLength(6);
        expect(robot.linkDimensions).toHaveLength(6);
      });
    });

    test('不同机器人应有不同的 ID 和基座位置', () => {
      const ids = new Set(defaultRobotModels.map(r => r.id));
      const positions = new Set(defaultRobotModels.map(r => r.basePosition.join(',')));
      
      expect(ids.size).toBe(defaultRobotModels.length);
      expect(positions.size).toBe(defaultRobotModels.length);
    });
  });

  describe('初始关节角度', () => {
    test('应该创建 6 个初始关节角度', () => {
      const joints = createInitialJoints();
      expect(joints).toHaveLength(6);
      joints.forEach(joint => {
        expect(typeof joint).toBe('number');
        expect(!isNaN(joint)).toBe(true);
      });
    });
  });

  describe('关节角度限制', () => {
    test('clampJointAngle 应该将角度限制在范围内', () => {
      expect(clampJointAngle(10, -5, 5)).toBe(5);
      expect(clampJointAngle(-10, -5, 5)).toBe(-5);
      expect(clampJointAngle(0, -5, 5)).toBe(0);
      expect(clampJointAngle(3, -5, 5)).toBe(3);
    });

    test('checkJointLimits 应该正确检测超限', () => {
      const limits = [
        { min: -1, max: 1 },
        { min: -1, max: 1 },
        { min: -1, max: 1 },
        { min: -1, max: 1 },
        { min: -1, max: 1 },
        { min: -1, max: 1 },
      ];

      expect(checkJointLimits([0, 0, 0, 0, 0, 0], limits)).toBe(true);
      expect(checkJointLimits([2, 0, 0, 0, 0, 0], limits)).toBe(false);
      expect(checkJointLimits([0, 0, 0, 0, 0, -2], limits)).toBe(false);
    });

    test('边界值应该被视为有效', () => {
      const limits = [{ min: -1, max: 1 }];
      expect(checkJointLimits([1], limits as any)).toBe(true);
      expect(checkJointLimits([-1], limits as any)).toBe(true);
    });
  });
});
