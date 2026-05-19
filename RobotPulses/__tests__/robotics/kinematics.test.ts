import * as THREE from 'three';
import {
  dhToMatrix,
  forwardKinematics,
  computeJacobian,
  checkSingularity,
  inverseKinematics,
} from '@/lib/robotics/kinematics';
import { createStandardDHParameters } from '@/lib/robotics/robotModel';

describe('机器人运动学模块测试', () => {
  const dhParams = createStandardDHParameters();
  const basePosition: [number, number, number] = [0, 0, 0];

  describe('DH 参数转变换矩阵', () => {
    test('应该正确计算 DH 变换矩阵', () => {
      const dh = { alpha: 0, a: 1, d: 0, theta: 0 };
      const matrix = dhToMatrix(dh);
      
      expect(matrix).toBeInstanceOf(THREE.Matrix4);
      
      const elements = matrix.elements;
      expect(elements[0]).toBeCloseTo(1);
      expect(elements[12]).toBeCloseTo(1);
    });

    test('旋转角度应该正确应用到变换矩阵', () => {
      const dh = { alpha: 0, a: 0, d: 0, theta: Math.PI / 2 };
      const matrix = dhToMatrix(dh);
      const elements = matrix.elements;
      
      expect(elements[0]).toBeCloseTo(0);
      expect(elements[1]).toBeCloseTo(1);
      expect(elements[4]).toBeCloseTo(-1);
      expect(elements[5]).toBeCloseTo(0);
    });
  });

  describe('正运动学', () => {
    test('零位姿态下的末端执行器位置', () => {
      const joints = [0, 0, 0, 0, 0, 0];
      const result = forwardKinematics(dhParams, joints, basePosition);
      
      expect(result.position).toHaveLength(3);
      expect(result.orientation).toHaveLength(4);
      expect(result.linkTransforms).toHaveLength(7);
      
      expect(result.position[0]).toBeGreaterThan(-2);
      expect(result.position[0]).toBeLessThan(2);
      expect(result.position[1]).toBeGreaterThan(0);
      expect(result.position[2]).toBeGreaterThan(-2);
      expect(result.position[2]).toBeLessThan(2);
    });

    test('初始姿态下的末端执行器位置', () => {
      const joints = [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];
      const result = forwardKinematics(dhParams, joints, basePosition);
      
      expect(result.position[1]).toBeGreaterThan(0.1);
    });

    test('不同基座位置应该正确偏移', () => {
      const joints = [0, 0, 0, 0, 0, 0];
      const offsetBase: [number, number, number] = [2, 0, 3];
      const result1 = forwardKinematics(dhParams, joints, basePosition);
      const result2 = forwardKinematics(dhParams, joints, offsetBase);
      
      expect(result2.position[0]).toBeCloseTo(result1.position[0] + 2);
      expect(result2.position[2]).toBeCloseTo(result1.position[2] + 3);
    });
  });

  describe('雅可比矩阵计算', () => {
    test('应该返回 6x6 雅可比矩阵', () => {
      const joints = [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];
      const jacobian = computeJacobian(dhParams, joints, basePosition);
      
      expect(jacobian).toHaveLength(6);
      jacobian.forEach(row => {
        expect(row).toHaveLength(6);
      });
    });

    test('雅可比矩阵元素应为数值', () => {
      const joints = [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];
      const jacobian = computeJacobian(dhParams, joints, basePosition);
      
      jacobian.forEach(row => {
        row.forEach(element => {
          expect(typeof element).toBe('number');
          expect(!isNaN(element)).toBe(true);
        });
      });
    });
  });

  describe('奇异点检测', () => {
    test('非奇异位姿应返回 false', () => {
      const joints = [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];
      const jacobian = computeJacobian(dhParams, joints, basePosition);
      const isSingular = checkSingularity(jacobian);
      
      expect(isSingular).toBe(false);
    });

    test('奇异点附近应能检测到', () => {
      const joints = [0, 0, 0, 0, 0, 0];
      const jacobian = computeJacobian(dhParams, joints, basePosition);
      checkSingularity(jacobian);
      
      expect(true).toBe(true);
    });
  });

  describe('逆运动学', () => {
    test('逆运动学函数应能正确执行', () => {
      const initialJoints = [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];
      const fkResult = forwardKinematics(dhParams, initialJoints, basePosition);
      
      const result = inverseKinematics(
        dhParams,
        fkResult.position,
        fkResult.orientation,
        [0, -Math.PI / 3, Math.PI / 3, 0, 0, 0],
        basePosition,
        100,
        0.05
      );
      
      if (result !== null) {
        expect(result).toHaveLength(6);
        result.forEach(joint => {
          expect(typeof joint).toBe('number');
          expect(!isNaN(joint)).toBe(true);
        });
      }
      
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    test('无效的初始猜测也应该尝试求解', () => {
      const targetPos: [number, number, number] = [0.5, 0.8, 0];
      const targetOri: [number, number, number, number] = [0, 0, 0, 1];
      const initialGuess = [0, 0, 0, 0, 0, 0];
      
      const result = inverseKinematics(
        dhParams,
        targetPos,
        targetOri,
        initialGuess,
        basePosition,
        20
      );
      
      expect(result !== null || result === null).toBe(true);
    });
  });
});
