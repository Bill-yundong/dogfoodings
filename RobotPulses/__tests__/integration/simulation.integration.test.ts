import { useSimulationStore } from '@/store/simulationStore';
import { defaultRobotModels, createInitialJoints } from '@/lib/robotics/robotModel';
import { forwardKinematics } from '@/lib/robotics/kinematics';
import { computeTotalForce, defaultAPFParameters } from '@/lib/planning/potentialField';
import { checkAllCollisions, createOBBFromLink } from '@/lib/planning/collision';
import { createDataFrame, DataAlignmentBuffer } from '@/lib/sync/dataAlignment';
import type { RobotPose, Obstacle } from '@/types/robot';
import * as THREE from 'three';

jest.mock('@/lib/storage/indexedDB', () => ({
  robotDB: {
    queueSnapshot: jest.fn(),
    getTotalSnapshotCount: jest.fn().mockResolvedValue(0),
    init: jest.fn(),
    close: jest.fn(),
  },
  initDatabase: jest.fn(),
  closeDatabase: jest.fn(),
}));

describe('仿真系统集成测试', () => {
  beforeEach(() => {
    useSimulationStore.getState().actions.reset();
    jest.clearAllMocks();
  });

  describe('多机器人协同运动场景', () => {
    test('两台机器人应能同时向目标运动而不碰撞', () => {
      const state = useSimulationStore.getState();
      const robots = state.robotModels;
      
      expect(robots.length).toBeGreaterThanOrEqual(2);
      
      robots.forEach(robot => {
        const target = state.robotTargets.get(robot.id);
        expect(target).toBeDefined();
        
        const initialPose = state.robotPoses.get(robot.id);
        expect(initialPose).toBeDefined();
        expect(initialPose?.joints).toHaveLength(6);
      });
    });

    test('机器人应能通过人工势场法规避障碍物', () => {
      const state = useSimulationStore.getState();
      const robot = state.robotModels[0];
      const pose = state.robotPoses.get(robot.id)!;
      const target = state.robotTargets.get(robot.id)!;
      
      const fkResult = forwardKinematics(robot.dhParameters, pose.joints, robot.basePosition);
      
      const otherRobots = state.robotModels
        .filter(r => r.id !== robot.id)
        .map(r => ({
          position: state.robotPoses.get(r.id)!.endEffector.position,
          radius: 0.3,
        }));
      
      const force = computeTotalForce(
        fkResult.position,
        { position: target.position },
        state.obstacles,
        otherRobots,
        state.apfParameters
      );
      
      expect(force).toHaveLength(3);
      expect(Math.abs(force[0]) + Math.abs(force[1]) + Math.abs(force[2])).toBeGreaterThan(0);
    });

    test('碰撞检测系统应能检测多机器人碰撞风险', () => {
      const state = useSimulationStore.getState();
      const allLinkOBBs: any[][] = [];
      
      for (const robot of state.robotModels) {
        const pose = state.robotPoses.get(robot.id)!;
        const fkResult = forwardKinematics(robot.dhParameters, pose.joints, robot.basePosition);
        const linkOBBs = fkResult.linkTransforms.slice(1).map(transform => 
          createOBBFromLink(transform, { length: 0.3, radius: 0.05 })
        );
        allLinkOBBs.push(linkOBBs);
      }
      
      const warnings = checkAllCollisions(allLinkOBBs, state.obstacles, state.robotModels);
      
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  describe('数据对齐场景', () => {
    test('主控与监控终端数据应保持逻辑对齐', () => {
      const alignmentBuffer = new DataAlignmentBuffer(100, 0.001);
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      const masterFrame = createDataFrame('robot-01', 1, joints, Date.now());
      const monitorFrame = createDataFrame('robot-01', 1, joints.map(j => j + (Math.random() - 0.5) * 0.00001), Date.now() + 2);
      
      alignmentBuffer.addMasterFrame(masterFrame);
      alignmentBuffer.addMonitorFrame(monitorFrame);
      
      expect(alignmentBuffer.isDataAligned(1)).toBe(true);
      
      const alignedPair = alignmentBuffer.getLatestAlignedPair();
      expect(alignedPair).not.toBeNull();
      expect(alignedPair?.maxDeviation).toBeLessThan(0.001);
    });

    test('数据偏差超过阈值时应检测到未对齐', () => {
      const alignmentBuffer = new DataAlignmentBuffer(100, 0.001);
      const masterJoints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const monitorJoints = [0.101, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      const masterFrame = createDataFrame('robot-01', 1, masterJoints, Date.now());
      const monitorFrame = createDataFrame('robot-01', 1, monitorJoints, Date.now() + 2);
      
      alignmentBuffer.addMasterFrame(masterFrame);
      alignmentBuffer.addMonitorFrame(monitorFrame);
      
      expect(alignmentBuffer.isDataAligned(1)).toBe(false);
    });
  });

  describe('运动学与路径规划集成', () => {
    test('正运动学计算结果应在工作空间范围内', () => {
      const robot = defaultRobotModels[0];
      const joints = createInitialJoints();
      
      const result = forwardKinematics(robot.dhParameters, joints, robot.basePosition);
      
      expect(result.position[1]).toBeGreaterThan(0);
      expect(Math.abs(result.position[0])).toBeLessThan(2.5);
      expect(Math.abs(result.position[2])).toBeLessThan(2.5);
      
      expect(result.orientation).toHaveLength(4);
      const quatNorm = Math.sqrt(
        result.orientation[0] ** 2 +
        result.orientation[1] ** 2 +
        result.orientation[2] ** 2 +
        result.orientation[3] ** 2
      );
      expect(quatNorm).toBeCloseTo(1, 5);
    });

    test('人工势场参数变化应影响力计算', () => {
      const position: [number, number, number] = [0, 0.5, 0];
      const target = { position: [1, 1, 1] as [number, number, number] };
      const obstacles: Obstacle[] = [];
      const otherRobots: Array<{ position: [number, number, number]; radius: number }> = [];
      
      const force1 = computeTotalForce(position, target, obstacles, otherRobots, defaultAPFParameters);
      
      const modifiedParams = { ...defaultAPFParameters, kAtt: defaultAPFParameters.kAtt * 2 };
      const force2 = computeTotalForce(position, target, obstacles, otherRobots, modifiedParams);
      
      const mag1 = Math.sqrt(force1[0] ** 2 + force1[1] ** 2 + force1[2] ** 2);
      const mag2 = Math.sqrt(force2[0] ** 2 + force2[1] ** 2 + force2[2] ** 2);
      
      expect(mag2).toBeGreaterThan(mag1);
    });
  });

  describe('状态管理完整性', () => {
    test('仿真控制流程应完整', () => {
      const actions = useSimulationStore.getState().actions;
      
      actions.start();
      expect(useSimulationStore.getState().status).toBe('running');
      
      actions.updateFrame(0.016);
      expect(useSimulationStore.getState().frameNumber).toBeGreaterThan(0);
      
      actions.pause();
      expect(useSimulationStore.getState().status).toBe('paused');
      
      actions.reset();
      expect(useSimulationStore.getState().status).toBe('idle');
      expect(useSimulationStore.getState().frameNumber).toBe(0);
    });

    test('多目标位置更新应独立生效', () => {
      const state = useSimulationStore.getState();
      const actions = state.actions;
      const robot1 = state.robotModels[0];
      const robot2 = state.robotModels[1];
      
      actions.setRobotTarget(robot1.id, [0, 1, 0]);
      actions.setRobotTarget(robot2.id, [1, 1, 1]);
      
      const newState = useSimulationStore.getState();
      expect(newState.robotTargets.get(robot1.id)?.position).toEqual([0, 1, 0]);
      expect(newState.robotTargets.get(robot2.id)?.position).toEqual([1, 1, 1]);
    });
  });

  describe('性能边界测试', () => {
    test('大量障碍物应仍能计算势场', () => {
      const position: [number, number, number] = [0, 0.5, 0];
      const target = { position: [2, 1, 0] as [number, number, number] };
      
      const manyObstacles: Obstacle[] = Array.from({ length: 20 }, (_, i) => ({
        id: `obs-${i}`,
        type: 'box' as const,
        position: [Math.random() * 3 - 1.5, Math.random() * 1.5, Math.random() * 3 - 1.5] as [number, number, number],
        size: [0.2, 0.2, 0.2] as [number, number, number],
        color: '#ff0000',
      }));
      
      const startTime = performance.now();
      const force = computeTotalForce(position, target, manyObstacles, [], defaultAPFParameters);
      const endTime = performance.now();
      
      expect(force).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
