import { useSimulationStore } from '@/store/simulationStore';
import type { Obstacle } from '@/types/robot';

describe('仿真状态管理测试', () => {
  beforeEach(() => {
    useSimulationStore.getState().actions.reset();
  });

  describe('初始状态', () => {
    test('状态应该正确初始化', () => {
      const state = useSimulationStore.getState();
      
      expect(state.status).toBe('idle');
      expect(state.simulationTime).toBe(0);
      expect(state.frameNumber).toBe(0);
      expect(state.speedMultiplier).toBe(1.0);
      expect(state.robotModels.length).toBeGreaterThanOrEqual(2);
      expect(state.robotPoses.size).toBe(state.robotModels.length);
      expect(state.robotTargets.size).toBe(state.robotModels.length);
      expect(state.obstacles.length).toBeGreaterThan(0);
      expect(state.isDataAligned).toBe(true);
    });
  });

  describe('仿真控制', () => {
    test('start 应该将状态设置为 running', () => {
      useSimulationStore.getState().actions.start();
      expect(useSimulationStore.getState().status).toBe('running');
    });

    test('pause 应该将状态设置为 paused', () => {
      useSimulationStore.getState().actions.start();
      useSimulationStore.getState().actions.pause();
      expect(useSimulationStore.getState().status).toBe('paused');
    });

    test('reset 应该重置所有状态', () => {
      useSimulationStore.getState().actions.start();
      useSimulationStore.getState().actions.setSpeed(2.0);
      useSimulationStore.getState().actions.reset();
      
      const state = useSimulationStore.getState();
      expect(state.status).toBe('idle');
      expect(state.simulationTime).toBe(0);
      expect(state.frameNumber).toBe(0);
      expect(state.speedMultiplier).toBe(2.0);
    });

    test('setSpeed 应该正确设置速度倍数', () => {
      useSimulationStore.getState().actions.setSpeed(2.5);
      expect(useSimulationStore.getState().speedMultiplier).toBe(2.5);
    });
  });

  describe('目标位置设置', () => {
    test('应该正确设置机器人目标位置', () => {
      const robotId = useSimulationStore.getState().robotModels[0].id;
      const newTarget: [number, number, number] = [1.5, 1.0, 2.0];
      
      useSimulationStore.getState().actions.setRobotTarget(robotId, newTarget);
      
      const target = useSimulationStore.getState().robotTargets.get(robotId);
      expect(target?.position).toEqual(newTarget);
    });
  });

  describe('障碍物管理', () => {
    test('应该添加障碍物', () => {
      const newObstacle: Obstacle = {
        id: 'test-obs-1',
        type: 'box',
        position: [0, 0.5, 0],
        size: [0.5, 0.5, 0.5],
        color: '#ff0000',
      };
      
      const initialCount = useSimulationStore.getState().obstacles.length;
      useSimulationStore.getState().actions.addObstacle(newObstacle);
      
      expect(useSimulationStore.getState().obstacles.length).toBe(initialCount + 1);
      expect(useSimulationStore.getState().obstacles.some(o => o.id === 'test-obs-1')).toBe(true);
    });

    test('应该删除障碍物', () => {
      const obstacleId = useSimulationStore.getState().obstacles[0].id;
      const initialCount = useSimulationStore.getState().obstacles.length;
      
      useSimulationStore.getState().actions.removeObstacle(obstacleId);
      
      expect(useSimulationStore.getState().obstacles.length).toBe(initialCount - 1);
    });
  });

  describe('机器人选择', () => {
    test('应该正确选择机器人', () => {
      const robotId = useSimulationStore.getState().robotModels[1].id;
      useSimulationStore.getState().actions.selectRobot(robotId);
      expect(useSimulationStore.getState().selectedRobotId).toBe(robotId);
    });

    test('应该支持取消选择', () => {
      useSimulationStore.getState().actions.selectRobot(null);
      expect(useSimulationStore.getState().selectedRobotId).toBeNull();
    });
  });

  describe('显示选项', () => {
    test('toggleTrajectories 应该切换轨迹显示', () => {
      const initial = useSimulationStore.getState().showTrajectories;
      useSimulationStore.getState().actions.toggleTrajectories();
      expect(useSimulationStore.getState().showTrajectories).toBe(!initial);
    });

    test('toggleCollisionZones 应该切换碰撞区域显示', () => {
      const initial = useSimulationStore.getState().showCollisionZones;
      useSimulationStore.getState().actions.toggleCollisionZones();
      expect(useSimulationStore.getState().showCollisionZones).toBe(!initial);
    });
  });

  describe('APF 参数更新', () => {
    test('应该更新人工势场参数', () => {
      const newParams = {
        kAtt: 10.0,
        kRep: 50.0,
        d0: 1.0,
      };
      
      useSimulationStore.getState().actions.updateAPFParams(newParams);
      
      const params = useSimulationStore.getState().apfParameters;
      expect(params.kAtt).toBe(10.0);
      expect(params.kRep).toBe(50.0);
      expect(params.d0).toBe(1.0);
    });
  });

  describe('帧更新', () => {
    test('updateFrame 应该在 running 状态下更新', () => {
      useSimulationStore.getState().actions.start();
      const initialFrame = useSimulationStore.getState().frameNumber;
      
      useSimulationStore.getState().actions.updateFrame(0.016);
      
      expect(useSimulationStore.getState().frameNumber).toBe(initialFrame + 1);
      expect(useSimulationStore.getState().simulationTime).toBeGreaterThan(0);
    });

    test('updateFrame 在非 running 状态下不应更新', () => {
      const initialFrame = useSimulationStore.getState().frameNumber;
      useSimulationStore.getState().actions.updateFrame(0.016);
      expect(useSimulationStore.getState().frameNumber).toBe(initialFrame);
    });
  });
});
