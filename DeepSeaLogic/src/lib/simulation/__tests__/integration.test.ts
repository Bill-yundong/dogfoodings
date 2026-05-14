import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationController } from '../SimulationController';
import { SedimentDiffusionSimulator } from '../SedimentDiffusion';
import { MultiBodyDynamicsEngine } from '../MultiBodyDynamics';
import { IndexedDBStorage } from '../../storage/IndexedDBStorage';
import { SemanticSynchronizer } from '../../sync/SemanticSync';

describe('Deep Sea Mining Simulation - Integration Tests', () => {
  describe('1. 沉积物扩散模拟模块 - SedimentDiffusionSimulator', () => {
    let simulator: SedimentDiffusionSimulator;
    const mockCurrent = {
      velocity: { x: 0.5, y: 0.1, z: 0.3 },
      turbulence: 0.3,
      temperature: 4,
      salinity: 35,
      depth: 4000
    };

    beforeEach(() => {
      simulator = new SedimentDiffusionSimulator();
    });

    it('1.1 应正确初始化沉积物扩散模拟器', () => {
      expect(simulator.getParticleCount()).toBe(0);
      expect(simulator.getGridSize()).toEqual({ x: 100, y: 50, z: 100 });
    });

    it('1.2 应能生成沉积物粒子', () => {
      const position = { x: 50, y: 25, z: 50 };
      simulator.generateParticles(10, position, 1.0);
      expect(simulator.getParticleCount()).toBe(10);
    });

    it('1.3 应能更新粒子位置（扩散效果）', () => {
      const position = { x: 50, y: 25, z: 50 };
      simulator.generateParticles(5, position, 1.0);
      const initialParticles = simulator.getParticles();
      const initialPositions = initialParticles.map(p => p.position);

      simulator.update(0.1, mockCurrent);
      const updatedParticles = simulator.getParticles();

      updatedParticles.forEach((particle, index) => {
        expect(particle.position).not.toEqual(initialPositions[index]);
      });
    });

    it('1.4 粒子浓度应随时间衰减', () => {
      const position = { x: 50, y: 25, z: 50 };
      simulator.generateParticles(1, position, 1.0);
      const initialConcentration = simulator.getParticles()[0].concentration;

      for (let i = 0; i < 1000; i++) {
        simulator.update(1.0, mockCurrent);
      }

      const finalConcentration = simulator.getParticles()[0].concentration;
      expect(finalConcentration).toBeLessThan(initialConcentration);
    });

    it('1.5 应能清除所有粒子', () => {
      const position = { x: 50, y: 25, z: 50 };
      simulator.generateParticles(10, position, 1.0);
      expect(simulator.getParticleCount()).toBe(10);

      simulator.clear();
      expect(simulator.getParticleCount()).toBe(0);
    });

    it('1.6 应能计算指定位置的浓度', () => {
      const position = { x: 50, y: 25, z: 50 };
      simulator.generateParticles(20, position, 1.0);

      const nearConcentration = simulator.getConcentrationAtPosition(position, 10);
      const farConcentration = simulator.getConcentrationAtPosition({ x: 99, y: 49, z: 99 }, 10);

      expect(nearConcentration).toBeGreaterThan(0);
      expect(farConcentration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. 多体动力学引擎 - MultiBodyDynamicsEngine', () => {
    let engine: MultiBodyDynamicsEngine;
    const mockCurrent = {
      velocity: { x: 0.5, y: 0.1, z: 0.3 },
      turbulence: 0.3,
      temperature: 4,
      salinity: 35,
      depth: 4000
    };

    beforeEach(() => {
      engine = new MultiBodyDynamicsEngine();
    });

    it('2.1 应能添加采矿泵组', () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mass: 5000,
        forces: { x: 0, y: 0, z: 0 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      expect(engine.getPumps().length).toBe(1);
      expect(engine.getPumps()[0].id).toBe('pump-1');
    });

    it('2.2 应能异步更新泵组状态', async () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mass: 5000,
        forces: { x: 0, y: 0, z: 0 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      const initialPosition = { ...engine.getPumps()[0].position };

      await engine.updateAsync(mockCurrent);
      const updatedPump = engine.getPumps()[0];

      expect(updatedPump.position).not.toEqual(initialPosition);
      expect(updatedPump.velocity).not.toEqual({ x: 0, y: 0, z: 0 });
    });

    it('2.3 应能计算泵组受力平衡', () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mass: 5000,
        forces: { x: 0, y: 0, z: 0 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      const forces = engine.getForceBalance('pump-1', mockCurrent);

      expect(forces).not.toBeNull();
      expect(forces!.buoyancy.y).toBeGreaterThan(0);
      expect(forces!.weight.y).toBeLessThan(0);
      expect(forces!.netForce).toBeDefined();
    });

    it('2.4 应能切换泵组状态', () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mass: 5000,
        forces: { x: 0, y: 0, z: 0 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      expect(engine.getPumps()[0].isActive).toBe(true);

      engine.togglePump('pump-1');
      expect(engine.getPumps()[0].isActive).toBe(false);
    });

    it('2.5 应能重置泵组状态', async () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 1, y: 1, z: 1 },
        rotation: { x: 0.5, y: 0.5, z: 0.5 },
        mass: 5000,
        forces: { x: 100, y: 100, z: 100 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      await engine.updateAsync(mockCurrent);
      engine.reset();

      const resetPump = engine.getPumps()[0];
      expect(resetPump.velocity).toEqual({ x: 0, y: 0, z: 0 });
      expect(resetPump.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(resetPump.forces).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('2.6 应能移除泵组', () => {
      const pump = {
        id: 'pump-1',
        name: 'Test Pump',
        position: { x: 50, y: 25, z: 50 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mass: 5000,
        forces: { x: 0, y: 0, z: 0 },
        isActive: true,
        power: 75,
        flowRate: 7.5
      };

      engine.addPump(pump);
      expect(engine.getPumps().length).toBe(1);

      engine.removePump('pump-1');
      expect(engine.getPumps().length).toBe(0);
    });
  });

  describe('3. 语义参数同步模块 - SemanticSynchronizer', () => {
    let sync: SemanticSynchronizer;

    beforeEach(() => {
      sync = new SemanticSynchronizer();
    });

    it('3.1 应正确初始化默认参数', () => {
      const params = sync.getAllParameters();
      expect(params.length).toBe(5);
      expect(params[0].name).toBe('Pump Power');
    });

    it('3.2 工程参数变更应自动同步到环保参数', () => {
      const pumpPowerParam = sync.getParameter('pump-power');
      const initialEnvValue = pumpPowerParam!.environmentalValue;

      sync.setEngineeringValue('pump-power', 100);
      const updatedParam = sync.getParameter('pump-power');

      expect(updatedParam!.engineeringValue).toBe(100);
      expect(updatedParam!.environmentalValue).not.toBe(initialEnvValue);
      expect(updatedParam!.isSynced).toBe(true);
    });

    it('3.3 环保参数变更应自动同步到工程参数', () => {
      const pumpPowerParam = sync.getParameter('pump-power');
      const initialEngValue = pumpPowerParam!.engineeringValue;

      sync.setEnvironmentalValue('pump-power', 150);
      const updatedParam = sync.getParameter('pump-power');

      expect(updatedParam!.environmentalValue).toBe(150);
      expect(updatedParam!.engineeringValue).not.toBe(initialEngValue);
      expect(updatedParam!.isSynced).toBe(true);
    });

    it('3.4 应能获取工程参数集合', () => {
      const params = sync.getEngineeringParameters();
      expect(params).toHaveProperty('pumpPower');
      expect(params).toHaveProperty('miningDepth');
      expect(params).toHaveProperty('sedimentReleaseRate');
      expect(params).toHaveProperty('currentSpeed');
      expect(params).toHaveProperty('environmentalThreshold');
    });

    it('3.5 应能验证参数同步状态', () => {
      sync.forceSyncAll();
      const isSynced = sync.validateSync('pump-power');
      expect(isSynced).toBe(true);

      const allSyncStatus = sync.validateAllSync();
      expect(Object.keys(allSyncStatus).length).toBe(5);
    });

    it('3.6 应能强制同步所有参数', () => {
      sync.forceSyncAll();
      const allSyncStatus = sync.validateAllSync();
      Object.values(allSyncStatus).forEach(status => {
        expect(status).toBe(true);
      });
    });

    it('3.7 应能正确转换参数单位', () => {
      sync.setEngineeringValue('pump-power', 100);
      const param = sync.getParameter('pump-power');
      
      expect(param!.engineeringUnit).toBe('kW');
      expect(param!.environmentalUnit).toBe('Environmental Impact Score');
    });

    it('3.8 应能导出语义映射', () => {
      const mapping = sync.exportSemanticMapping();
      expect(mapping).toHaveProperty('pump-power');
      expect(mapping['pump-power'].engineering.unit).toBe('kW');
    });

    it('3.9 应能重置所有参数', () => {
      sync.setEngineeringValue('pump-power', 100);
      sync.reset();
      const resetParam = sync.getParameter('pump-power');
      expect(resetParam!.engineeringValue).toBe(75);
    });

    it('3.10 应能按利益相关方筛选参数', () => {
      const engineeringParams = sync.getStakeholderParameters('engineering');
      expect(Array.isArray(engineeringParams)).toBe(true);
    });

    it('3.11 应能获取同步状态统计', () => {
      const status = sync.getSyncStatus();
      expect(status.total).toBe(5);
      expect(status.synced).toBe(5);
      expect(status.unsynced).toBe(0);
    });
  });

  describe('4. 主仿真控制器 - SimulationController', () => {
    let controller: SimulationController;

    beforeEach(() => {
      controller = new SimulationController();
    });

    it('4.1 应正确初始化所有子模块', () => {
      expect(controller.getSedimentSimulator()).toBeDefined();
      expect(controller.getDynamicsEngine()).toBeDefined();
      expect(controller.getStorage()).toBeDefined();
      expect(controller.getSemanticSync()).toBeDefined();
    });

    it('4.2 应包含默认泵组配置', () => {
      const pumps = controller.getDynamicsEngine().getPumps();
      expect(pumps.length).toBe(2);
      expect(pumps[0].name).toBe('Main Mining Pump');
      expect(pumps[1].name).toBe('Auxiliary Pump');
    });

    it('4.3 应能获取洋流参数', () => {
      const current = controller.getCurrent();
      expect(current.velocity).toBeDefined();
      expect(current.turbulence).toBeDefined();
      expect(current.temperature).toBe(4);
    });

    it('4.4 重置功能应更新所有状态回调', async () => {
      await controller.getStorage().init();
      await controller.start();
      
      controller.getSemanticSync().setEngineeringValue('pump-power', 100);
      
      controller.reset();
      
      expect(controller.getElapsedTime()).toBe(0);
      expect(controller.getIsRunning()).toBe(false);
      expect(controller.getSedimentSimulator().getParticleCount()).toBe(0);
      
      const pumps = controller.getDynamicsEngine().getPumps();
      pumps.forEach(pump => {
        expect(pump.velocity).toEqual({ x: 0, y: 0, z: 0 });
      });
    });
  });

  describe('5. 端到端业务场景测试 - E2E Business Scenarios', () => {
    let controller: SimulationController;

    beforeEach(async () => {
      controller = new SimulationController();
      await controller.getStorage().init();
    });

    afterEach(async () => {
      controller.stop();
      await controller.getStorage().clearAllStates();
    });

    it('5.1 场景：正常采矿作业流程', async () => {
      const initialTime = controller.getElapsedTime();
      expect(initialTime).toBe(0);

      await controller.start();
      expect(controller.getIsRunning()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(controller.getElapsedTime()).toBeGreaterThan(0);
      expect(controller.getSedimentSimulator().getParticleCount()).toBeGreaterThanOrEqual(0);

      controller.stop();
      expect(controller.getIsRunning()).toBe(false);
    });

    it('5.2 场景：参数调整对沉积物扩散的影响', async () => {
      const sync = controller.getSemanticSync();
      
      sync.setEngineeringValue('currentSpeed', 0.1);
      sync.setEngineeringValue('sedimentReleaseRate', 5);
      
      await controller.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const particleCount1 = controller.getSedimentSimulator().getParticleCount();
      
      sync.setEngineeringValue('sedimentReleaseRate', 20);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const particleCount2 = controller.getSedimentSimulator().getParticleCount();
      
      expect(particleCount2).toBeGreaterThanOrEqual(particleCount1);
    });

    it('5.3 场景：状态快照持久化与恢复', async () => {
      const sync = controller.getSemanticSync();
      sync.setEngineeringValue('pump-power', 90);
      sync.setEngineeringValue('miningDepth', 3000);

      const snapshot1 = await controller.createSnapshot();
      expect(snapshot1).toHaveProperty('id');
      expect(snapshot1.parameters.pumpPower).toBe(90);

      sync.setEngineeringValue('pump-power', 50);
      
      const states = await controller.getStorage().getAllStates();
      expect(states.length).toBeGreaterThanOrEqual(1);

      await controller.loadState(snapshot1);
      const loadedParams = controller.getSemanticSync().getEngineeringParameters();
      expect(loadedParams.pumpPower).toBe(90);
    });

    it('5.4 场景：泵组启停对受力平衡的影响', async () => {
      const engine = controller.getDynamicsEngine();
      const current = controller.getCurrent();
      const pumps = engine.getPumps();
      
      pumps.forEach(pump => {
        const forces = engine.getForceBalance(pump.id, current);
        expect(forces).not.toBeNull();
        expect(forces!.netForce).toBeDefined();
      });

      engine.togglePump(pumps[0].id);
      
      await engine.updateAsync(current);
      
      const updatedPumps = engine.getPumps();
      expect(updatedPumps[0].isActive).toBe(false);
    });

    it('5.5 场景：跨利益相关方参数协同', async () => {
      const sync = controller.getSemanticSync();
      
      sync.setEngineeringValue('pump-power', 80);
      const envValue1 = sync.getParameter('pump-power')!.environmentalValue;
      
      sync.setEnvironmentalValue('pump-power', envValue1 * 1.5);
      const engValueAfterEnv = sync.getParameter('pump-power')!.engineeringValue;
      
      expect(engValueAfterEnv).toBeGreaterThan(80);
      
      const syncStatus = sync.validateSync('pump-power');
      expect(syncStatus).toBe(true);
    });

    it('5.6 场景：仿真全生命周期管理', async () => {
      await controller.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const snapshot = await controller.createSnapshot();
      expect(snapshot.elapsedTime).toBeGreaterThan(0);
      
      controller.stop();
      expect(controller.getIsRunning()).toBe(false);
      
      controller.reset();
      expect(controller.getElapsedTime()).toBe(0);
      expect(controller.getSedimentSimulator().getParticleCount()).toBe(0);
      
      await controller.loadState(snapshot);
      expect(controller.getSemanticSync().getAllParameters().length).toBe(5);
    });

    it('5.7 场景：旧状态自动清理机制', async () => {
      for (let i = 0; i < 150; i++) {
        await controller.createSnapshot();
      }
      
      await controller.getStorage().cleanupOldStates(100);
      const statesAfterCleanup = await controller.getStorage().getAllStates();
      expect(statesAfterCleanup.length).toBeLessThanOrEqual(100);
    });

    it('5.8 场景：状态查询与筛选功能', async () => {
      const snapshot1 = await controller.createSnapshot();
      const stateCount1 = await controller.getStorage().getStateCount();
      expect(stateCount1).toBe(1);

      const snapshot2 = await controller.createSnapshot();
      const stateCount2 = await controller.getStorage().getStateCount();
      expect(stateCount2).toBe(2);
    });

    it('5.9 场景：状态删除功能', async () => {
      const snapshot = await controller.createSnapshot();
      const initialCount = await controller.getStorage().getStateCount();
      
      await controller.getStorage().deleteState(snapshot.id);
      const finalCount = await controller.getStorage().getStateCount();
      
      expect(finalCount).toBe(initialCount - 1);
      
      const deletedState = await controller.getStorage().getState(snapshot.id);
      expect(deletedState).toBeNull();
    });
  });
});
