import { TrafficSimulation } from './cellular-automaton';
import { Direction, TrafficLevel, SimulationConfig } from '../types/traffic';

describe('TrafficSimulation', () => {
  const testConfig: SimulationConfig = {
    gridWidth: 12,
    gridHeight: 12,
    vehicleDensity: 0.5,
    maxSpeed: 3,
    lightCycleDuration: 10,
    simulationSpeed: 1,
  };

  describe('初始化测试', () => {
    it('应该正确初始化 TrafficSimulation 实例', () => {
      const simulation = new TrafficSimulation(testConfig);
      expect(simulation).toBeInstanceOf(TrafficSimulation);
    });

    it('应该创建正确尺寸的网格', () => {
      const simulation = new TrafficSimulation(testConfig);
      const grid = simulation.getGrid();
      expect(grid.length).toBe(testConfig.gridHeight);
      expect(grid[0].length).toBe(testConfig.gridWidth);
    });

    it('应该创建道路和交叉口', () => {
      const simulation = new TrafficSimulation(testConfig);
      const grid = simulation.getGrid();
      
      let hasRoad = false;
      let hasIntersection = false;
      let hasBuilding = false;
      let hasPark = false;

      for (let y = 0; y < testConfig.gridHeight; y++) {
        for (let x = 0; x < testConfig.gridWidth; x++) {
          const cell = grid[y][x];
          if (cell.type === 'road') hasRoad = true;
          if (cell.type === 'intersection') hasIntersection = true;
          if (cell.type === 'building') hasBuilding = true;
          if (cell.type === 'park') hasPark = true;
        }
      }

      expect(hasRoad).toBe(true);
      expect(hasIntersection).toBe(true);
      expect(hasBuilding).toBe(true);
      expect(hasPark).toBe(true);
    });

    it('应该初始化交通灯状态', () => {
      const simulation = new TrafficSimulation(testConfig);
      const intersections = simulation.getIntersections();
      
      expect(intersections.length).toBeGreaterThan(0);
      intersections.forEach(intersection => {
        expect(intersection.northSouthLight).toBe('green');
        expect(intersection.eastWestLight).toBe('red');
        expect(intersection.lightTimer).toBe(0);
      });
    });

    it('应该在 4x4 网格位置创建交叉口', () => {
      const simulation = new TrafficSimulation(testConfig);
      const intersections = simulation.getIntersections();
      
      intersections.forEach(intersection => {
        expect(intersection.x % 4).toBe(0);
        expect(intersection.y % 4).toBe(0);
      });
    });

    it('步骤计数初始应为 0', () => {
      const simulation = new TrafficSimulation(testConfig);
      expect(simulation.getStepCount()).toBe(0);
    });

    it('运行状态初始应为 false', () => {
      const simulation = new TrafficSimulation(testConfig);
      expect(simulation.getIsRunning()).toBe(false);
    });

    it('应该返回正确的配置', () => {
      const simulation = new TrafficSimulation(testConfig);
      expect(simulation.getConfig()).toEqual(testConfig);
    });
  });

  describe('交通流量指数测试', () => {
    it('应该生成有效的 TrafficIndex', () => {
      const simulation = new TrafficSimulation(testConfig);
      const index = simulation.getTrafficIndex();
      
      expect(index.timestamp).toBeGreaterThan(0);
      expect(index.overall).toBeGreaterThanOrEqual(0);
      expect(index.overall).toBeLessThanOrEqual(100);
      expect(index.gridData.length).toBe(testConfig.gridHeight);
      expect(index.gridData[0].length).toBe(testConfig.gridWidth);
      expect(Array.isArray(index.hotspots)).toBe(true);
    });

    it('应该识别拥堵热点', () => {
      const simulation = new TrafficSimulation(testConfig);
      const index = simulation.getTrafficIndex();
      
      index.hotspots.forEach(hotspot => {
        expect(hotspot.level).toBeGreaterThanOrEqual(TrafficLevel.CONGESTED);
        expect(hotspot.x).toBeGreaterThanOrEqual(0);
        expect(hotspot.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('gridData 应该包含有效的交通等级值', () => {
      const simulation = new TrafficSimulation(testConfig);
      const index = simulation.getTrafficIndex();
      
      for (let y = 0; y < testConfig.gridHeight; y++) {
        for (let x = 0; x < testConfig.gridWidth; x++) {
          const level = index.gridData[y][x];
          expect(level).toBeGreaterThanOrEqual(TrafficLevel.SMOOTH);
          expect(level).toBeLessThanOrEqual(TrafficLevel.SEVERE);
        }
      }
    });
  });

  describe('仿真步骤测试', () => {
    it('执行 step 应该增加步骤计数', async () => {
      const simulation = new TrafficSimulation(testConfig);
      const initialSteps = simulation.getStepCount();
      
      await simulation.step();
      
      expect(simulation.getStepCount()).toBe(initialSteps + 1);
    });

    it('执行多个 step 应该累积步骤计数', async () => {
      const simulation = new TrafficSimulation(testConfig);
      const stepsToRun = 5;
      
      for (let i = 0; i < stepsToRun; i++) {
        await simulation.step();
      }
      
      expect(simulation.getStepCount()).toBe(stepsToRun);
    });

    it('执行 step 后应该更新交通指数', async () => {
      const simulation = new TrafficSimulation(testConfig);
      const index1 = simulation.getTrafficIndex();
      
      for (let i = 0; i < 10; i++) {
        await simulation.step();
      }
      
      const index2 = simulation.getTrafficIndex();
      
      expect(index2.timestamp).toBeGreaterThanOrEqual(index1.timestamp);
    });
  });

  describe('交通灯测试', () => {
    it('交通灯应该根据周期切换', async () => {
      const simulation = new TrafficSimulation(testConfig);
      const intersections = simulation.getIntersections();
      
      expect(intersections[0].northSouthLight).toBe('green');
      expect(intersections[0].eastWestLight).toBe('red');
      
      for (let i = 0; i < testConfig.lightCycleDuration; i++) {
        await simulation.step();
      }
      
      expect(intersections[0].northSouthLight).toBe('yellow');
      
      for (let i = 0; i < testConfig.lightCycleDuration; i++) {
        await simulation.step();
      }
      
      expect(intersections[0].northSouthLight).toBe('red');
      expect(intersections[0].eastWestLight).toBe('green');
    });
  });

  describe('运行状态管理测试', () => {
    it('start 应该设置运行状态为 true', () => {
      const simulation = new TrafficSimulation(testConfig);
      simulation.start();
      expect(simulation.getIsRunning()).toBe(true);
    });

    it('stop 应该设置运行状态为 false', () => {
      const simulation = new TrafficSimulation(testConfig);
      simulation.start();
      simulation.stop();
      expect(simulation.getIsRunning()).toBe(false);
    });

    it('可以多次调用 start 和 stop', () => {
      const simulation = new TrafficSimulation(testConfig);
      
      simulation.start();
      expect(simulation.getIsRunning()).toBe(true);
      
      simulation.stop();
      expect(simulation.getIsRunning()).toBe(false);
      
      simulation.start();
      expect(simulation.getIsRunning()).toBe(true);
    });
  });

  describe('网格数据测试', () => {
    it('getGrid 应该返回二维数组', () => {
      const simulation = new TrafficSimulation(testConfig);
      const grid = simulation.getGrid();
      
      expect(Array.isArray(grid)).toBe(true);
      expect(Array.isArray(grid[0])).toBe(true);
    });

    it('每个网格单元格应该有正确的属性', () => {
      const simulation = new TrafficSimulation(testConfig);
      const grid = simulation.getGrid();
      
      grid.forEach(row => {
        row.forEach(cell => {
          expect(typeof cell.x).toBe('number');
          expect(typeof cell.y).toBe('number');
          expect(['road', 'intersection', 'building', 'park']).toContain(cell.type);
          expect(cell.trafficLevel).toBeGreaterThanOrEqual(TrafficLevel.SMOOTH);
          expect(cell.trafficLevel).toBeLessThanOrEqual(TrafficLevel.SEVERE);
          expect(typeof cell.flowRate).toBe('number');
        });
      });
    });
  });

  describe('不同配置测试', () => {
    it('不同车辆密度应该影响初始车辆数量', () => {
      const lowDensityConfig: SimulationConfig = {
        ...testConfig,
        vehicleDensity: 0.1,
      };
      
      const highDensityConfig: SimulationConfig = {
        ...testConfig,
        vehicleDensity: 1.0,
      };

      const lowSim = new TrafficSimulation(lowDensityConfig);
      const highSim = new TrafficSimulation(highDensityConfig);
      
      const lowIndex = lowSim.getTrafficIndex();
      const highIndex = highSim.getTrafficIndex();
      
      expect(highIndex.overall).toBeGreaterThanOrEqual(lowIndex.overall);
    });

    it('不同网格尺寸应该正确处理', () => {
      const smallConfig: SimulationConfig = {
        ...testConfig,
        gridWidth: 8,
        gridHeight: 8,
      };

      const simulation = new TrafficSimulation(smallConfig);
      const grid = simulation.getGrid();
      const index = simulation.getTrafficIndex();
      
      expect(grid.length).toBe(8);
      expect(grid[0].length).toBe(8);
      expect(index.gridData.length).toBe(8);
      expect(index.gridData[0].length).toBe(8);
    });
  });
});
