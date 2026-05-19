import * as THREE from 'three';
import {
  createAABBFromObstacle,
  createOBBFromLink,
  checkAABBIntersection,
  checkOBBIntersection,
  computeDistanceToObstacle,
  computeDistanceBetweenLinks,
  checkRobotSelfCollision,
  checkRobotEnvironmentCollision,
  checkMultiRobotCollision,
  getCollisionWarningLevel,
  checkAllCollisions,
  AABB,
  OBB,
} from '@/lib/planning/collision';
import type { Obstacle, RobotModel } from '@/types/robot';
import { defaultRobotModels } from '@/lib/robotics/robotModel';

describe('碰撞检测模块测试', () => {
  describe('AABB 碰撞检测', () => {
    test('createAABBFromObstacle 应该正确创建包围盒', () => {
      const obstacle: Obstacle = {
        id: 'obs-1',
        type: 'box',
        position: [0, 0, 0],
        size: [2, 2, 2],
        color: '#ff0000',
      };
      
      const aabb = createAABBFromObstacle(obstacle);
      expect(aabb.min).toEqual([-1, -1, -1]);
      expect(aabb.max).toEqual([1, 1, 1]);
    });

    test('重叠的 AABB 应该检测为相交', () => {
      const a: AABB = { min: [0, 0, 0], max: [2, 2, 2] };
      const b: AABB = { min: [1, 1, 1], max: [3, 3, 3] };
      
      expect(checkAABBIntersection(a, b)).toBe(true);
    });

    test('不重叠的 AABB 应该检测为不相交', () => {
      const a: AABB = { min: [0, 0, 0], max: [1, 1, 1] };
      const b: AABB = { min: [2, 2, 2], max: [3, 3, 3] };
      
      expect(checkAABBIntersection(a, b)).toBe(false);
    });

    test('刚好接触的 AABB 应该检测为相交', () => {
      const a: AABB = { min: [0, 0, 0], max: [1, 1, 1] };
      const b: AABB = { min: [1, 0, 0], max: [2, 1, 1] };
      
      expect(checkAABBIntersection(a, b)).toBe(true);
    });
  });

  describe('OBB 碰撞检测', () => {
    test('createOBBFromLink 应该正确创建有向包围盒', () => {
      const transform = new THREE.Matrix4().setPosition(1, 2, 3);
      const dimensions = { length: 1, radius: 0.1 };
      
      const obb = createOBBFromLink(transform, dimensions);
      
      expect(obb.center).toEqual([1, 2, 3]);
      expect(obb.halfExtents).toEqual([0.1, 0.5, 0.1]);
      expect(obb.axes).toHaveLength(3);
    });

    test('相同位置的 OBB 应该检测为相交', () => {
      const obb1: OBB = {
        center: [0, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [1, 1, 1],
      };
      const obb2: OBB = {
        center: [0.5, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [1, 1, 1],
      };
      
      expect(checkOBBIntersection(obb1, obb2)).toBe(true);
    });

    test('分离的 OBB 应该检测为不相交', () => {
      const obb1: OBB = {
        center: [0, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [0.5, 0.5, 0.5],
      };
      const obb2: OBB = {
        center: [5, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [0.5, 0.5, 0.5],
      };
      
      expect(checkOBBIntersection(obb1, obb2)).toBe(false);
    });
  });

  describe('距离计算', () => {
    test('到 box 障碍物的距离计算', () => {
      const obstacle: Obstacle = {
        id: 'obs-1',
        type: 'box',
        position: [0, 0, 0],
        size: [2, 2, 2],
        color: '#ff0000',
      };
      
      const distance = computeDistanceToObstacle([3, 0, 0], obstacle);
      expect(distance).toBeCloseTo(2);
    });

    test('到 sphere 障碍物的距离计算', () => {
      const obstacle: Obstacle = {
        id: 'obs-1',
        type: 'sphere',
        position: [0, 0, 0],
        size: [2, 2, 2],
        color: '#ff0000',
      };
      
      const distance = computeDistanceToObstacle([3, 0, 0], obstacle);
      expect(distance).toBeCloseTo(2);
    });

    test('障碍物内部点距离应为 0', () => {
      const obstacle: Obstacle = {
        id: 'obs-1',
        type: 'box',
        position: [0, 0, 0],
        size: [2, 2, 2],
        color: '#ff0000',
      };
      
      const distance = computeDistanceToObstacle([0, 0, 0], obstacle);
      expect(distance).toBe(0);
    });

    test('连杆之间的距离计算', () => {
      const link1: OBB = {
        center: [0, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [0.5, 0.5, 0.5],
      };
      const link2: OBB = {
        center: [3, 0, 0],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        halfExtents: [0.5, 0.5, 0.5],
      };
      
      const distance = computeDistanceBetweenLinks(link1, link2);
      expect(distance).toBeCloseTo(2);
    });
  });

  describe('碰撞检测', () => {
    test('正常位姿下不应检测到自碰撞', () => {
      const links: OBB[] = [
        { center: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
        { center: [0, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
        { center: [0, 1.0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
        { center: [0, 1.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
        { center: [0, 2.0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
        { center: [0, 2.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.2, 0.1] },
      ];
      
      expect(checkRobotSelfCollision(links)).toBe(false);
    });

    test('折叠位姿下应检测到自碰撞', () => {
      const links: OBB[] = [
        { center: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
        { center: [0, 1, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
        { center: [0, 2, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
        { center: [0, 0.1, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
        { center: [0, 0.2, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
        { center: [0, 0.3, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
      ];
      
      expect(checkRobotSelfCollision(links)).toBe(true);
    });

    test('应检测到与障碍物的碰撞', () => {
      const links: OBB[] = [
        { center: [0, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
      ];
      
      const obstacles: Obstacle[] = [
        {
          id: 'obs-1',
          type: 'box',
          position: [0, 0.5, 0],
          size: [1, 1, 1],
          color: '#ff0000',
        },
      ];
      
      expect(checkRobotEnvironmentCollision(links, obstacles)).toBe(true);
    });

    test('应检测到多机器人碰撞', () => {
      const robot1: OBB[] = [
        { center: [0, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
      ];
      const robot2: OBB[] = [
        { center: [0.3, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.5, 0.5, 0.5] },
      ];
      
      expect(checkMultiRobotCollision(robot1, robot2)).toBe(true);
    });

    test('分离的机器人不应检测到碰撞', () => {
      const robot1: OBB[] = [
        { center: [0, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
      ];
      const robot2: OBB[] = [
        { center: [5, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
      ];
      
      expect(checkMultiRobotCollision(robot1, robot2)).toBe(false);
    });
  });

  describe('碰撞预警等级', () => {
    test('应根据距离返回正确的预警等级', () => {
      expect(getCollisionWarningLevel(0.01)).toBe('emergency');
      expect(getCollisionWarningLevel(0.1)).toBe('danger');
      expect(getCollisionWarningLevel(0.2)).toBe('warning');
      expect(getCollisionWarningLevel(0.5)).toBe('safe');
    });
  });

  describe('综合碰撞检测', () => {
    test('checkAllCollisions 应返回碰撞警告列表', () => {
      const robotModels: RobotModel[] = defaultRobotModels.slice(0, 1);
      const links: OBB[] = [
        { center: [-2, 0.5, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfExtents: [0.1, 0.1, 0.1] },
      ];
      
      const obstacles: Obstacle[] = [];
      const warnings = checkAllCollisions([links], obstacles, robotModels);
      
      expect(Array.isArray(warnings)).toBe(true);
    });
  });
});
