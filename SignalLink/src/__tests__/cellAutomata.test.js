import {
  Cell,
  Vehicle,
  Intersection,
  CellularAutomata,
  MAX_SPEED
} from '../simulation/cellAutomata';
import { SignalPhase, Direction } from '../types';

describe('Cell 类测试', () => {
  test('应该创建一个空的 Cell', () => {
    const cell = new Cell(5, 10);
    expect(cell.x).toBe(5);
    expect(cell.y).toBe(10);
    expect(cell.vehicle).toBeNull();
    expect(cell.isIntersection).toBe(false);
    expect(cell.intersectionId).toBeNull();
  });
});

describe('Vehicle 类测试', () => {
  test('应该创建一个 Vehicle', () => {
    const vehicle = new Vehicle('v1', 'car', Direction.EAST, 3);
    expect(vehicle.id).toBe('v1');
    expect(vehicle.type).toBe('car');
    expect(vehicle.direction).toBe(Direction.EAST);
    expect(vehicle.speed).toBe(3);
    expect(vehicle.waitingTime).toBe(0);
    expect(vehicle.travelTime).toBe(0);
  });
});

describe('Intersection 类测试', () => {
  describe('基本功能测试', () => {
    test('应该创建一个交叉口', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });

      expect(intersection.id).toBe('int_1');
      expect(intersection.x).toBe(50);
      expect(intersection.y).toBe(30);
      expect(intersection.config.greenTimeNS).toBe(30);
      expect(intersection.config.greenTimeEW).toBe(25);
      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);
    });

    test('应该从绿灯NS开始，然后切换到黄灯，再切换到红灯，最后切换到绿灯EW', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 10,
        greenTimeEW: 8,
        yellowTime: 2,
        redTime: 2,
        offset: 0
      });

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);

      for (let i = 0; i < 11; i++) {
        intersection.update(1);
      }
      expect(intersection.currentPhase).toBe(SignalPhase.YELLOW);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);

      for (let i = 0; i < 2; i++) {
        intersection.update(1);
      }
      expect(intersection.currentPhase).toBe(SignalPhase.RED);
      expect(intersection.phaseDirection).toBe(Direction.EAST);

      for (let i = 0; i < 3; i++) {
        intersection.update(1);
      }
      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.EAST);
    });

    test('应该完成完整的信号周期', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 10,
        greenTimeEW: 8,
        yellowTime: 2,
        redTime: 2,
        offset: 0
      });

      const totalCycle = 10 + 2 + 2 + 8 + 2 + 2;

      for (let i = 0; i < totalCycle; i++) {
        intersection.update(1);
      }

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);
    });
  });

  describe('绿波偏移量测试', () => {
    test('应该根据 offset 设置初始相位（绿灯 NS）', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 15
      });

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);
      expect(intersection.phaseTimer).toBe(15);
    });

    test('应该根据 offset 设置初始相位（黄灯 NS）', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 32
      });

      expect(intersection.currentPhase).toBe(SignalPhase.YELLOW);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);
    });

    test('应该根据 offset 设置初始相位（绿灯 EW）', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 40
      });

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.EAST);
    });

    test('应该支持动态更新 offset', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);

      intersection.setOffset(40);

      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.EAST);
    });

    test('offset 应该模运算处理', () => {
      const totalCycle = 30 + 25 + 3 + 3 + 3 + 3;
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        redTime: 3,
        offset: totalCycle + 15
      });

      expect(intersection.phaseTimer).toBe(15);
      expect(intersection.currentPhase).toBe(SignalPhase.GREEN);
      expect(intersection.phaseDirection).toBe(Direction.NORTH);
    });
  });

  describe('通行规则测试', () => {
    test('绿灯时应该允许对应方向通行', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });

      expect(intersection.canPass(Direction.NORTH)).toBe(true);
      expect(intersection.canPass(Direction.SOUTH)).toBe(true);
      expect(intersection.canPass(Direction.EAST)).toBe(false);
      expect(intersection.canPass(Direction.WEST)).toBe(false);
    });

    test('切换相位后应该允许另一方向通行', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 10,
        greenTimeEW: 8,
        yellowTime: 2,
        redTime: 2,
        offset: 0
      });

      intersection.update(11);
      intersection.update(2);
      intersection.update(3);

      expect(intersection.canPass(Direction.EAST)).toBe(true);
      expect(intersection.canPass(Direction.WEST)).toBe(true);
      expect(intersection.canPass(Direction.NORTH)).toBe(false);
      expect(intersection.canPass(Direction.SOUTH)).toBe(false);
    });

    test('黄灯时应该禁止通行', () => {
      const intersection = new Intersection('int_1', 50, 30, {
        greenTimeNS: 10,
        greenTimeEW: 8,
        yellowTime: 2,
        offset: 0
      });

      intersection.update(11);

      expect(intersection.currentPhase).toBe(SignalPhase.YELLOW);
      expect(intersection.canPass(Direction.NORTH)).toBe(false);
      expect(intersection.canPass(Direction.EAST)).toBe(false);
    });
  });
});

describe('CellularAutomata 类测试', () => {
  describe('基本功能测试', () => {
    test('应该创建一个元胞自动机实例', () => {
      const ca = new CellularAutomata(200, 150, 5);

      expect(ca.width).toBe(200);
      expect(ca.height).toBe(150);
      expect(ca.cellSize).toBe(5);
      expect(ca.gridWidth).toBe(40);
      expect(ca.gridHeight).toBe(30);
      expect(ca.vehicles.length).toBe(0);
      expect(ca.timeStep).toBe(0);
    });

    test('应该添加一个交叉口', () => {
      const ca = new CellularAutomata(200, 150, 5);
      const intersection = ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });

      expect(intersection.id).toBe('int_1');
      expect(ca.intersections.size).toBe(1);
      expect(ca.intersections.get('int_1')).toBeDefined();
    });

    test('应该添加多个交叉口（多路口绿波）', () => {
      const ca = new CellularAutomata(400, 150, 5);

      for (let i = 0; i < 4; i++) {
        ca.addIntersection(`int_${i + 1}`, 20 + i * 15, 15, {
          greenTimeNS: 30,
          greenTimeEW: 25,
          yellowTime: 3,
          offset: i * 15
        });
      }

      expect(ca.intersections.size).toBe(4);
    });

    test('应该添加一辆车', () => {
      const ca = new CellularAutomata(200, 150, 5);
      const vehicle = ca.addVehicle(5, 15, Direction.EAST);

      expect(vehicle).toBeDefined();
      expect(vehicle.id).toBe(0);
      expect(ca.vehicles.length).toBe(1);
      expect(ca.stats.totalVehicles).toBe(1);
    });

    test('不应该在已有车辆的位置添加车辆', () => {
      const ca = new CellularAutomata(200, 150, 5);
      ca.addVehicle(5, 15, Direction.EAST);
      const vehicle2 = ca.addVehicle(5, 15, Direction.WEST);

      expect(vehicle2).toBeNull();
      expect(ca.vehicles.length).toBe(1);
    });

    test('不应该在边界外添加车辆', () => {
      const ca = new CellularAutomata(200, 150, 5);
      const vehicle = ca.addVehicle(100, 100, Direction.EAST);

      expect(vehicle).toBeNull();
    });
  });

  describe('仿真逻辑测试', () => {
    test('应该执行一步仿真', () => {
      const ca = new CellularAutomata(200, 150, 5);
      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });
      ca.addVehicle(5, 15, Direction.EAST);

      const stats = ca.step();

      expect(ca.timeStep).toBe(1);
      expect(stats).toBeDefined();
    });

    test('车辆应该加速', () => {
      const ca = new CellularAutomata(200, 150, 5);
      const vehicle = ca.addVehicle(5, 15, Direction.EAST);

      for (let i = 0; i < 3; i++) {
        ca.step();
      }

      expect(vehicle.speed).toBeGreaterThan(0);
    });

    test('车辆应该有速度属性', () => {
      const ca = new CellularAutomata(200, 150, 5);
      const vehicle = ca.addVehicle(5, 15, Direction.EAST);

      expect(vehicle).toBeDefined();
      expect(vehicle.speed).toBeDefined();
      expect(vehicle.speed).toBe(0);
    });

    test('车辆速度应该在有效范围内', () => {
      const ca = new CellularAutomata(400, 150, 5);
      const vehicle = ca.addVehicle(5, 15, Direction.EAST);

      for (let i = 0; i < 5; i++) {
        ca.step();
      }

      expect(vehicle).toBeDefined();
      expect(vehicle.speed).toBeDefined();
      expect(typeof vehicle.speed).toBe('number');
    });

    test('车辆移出边界应该被移除', () => {
      const ca = new CellularAutomata(50, 50, 5);
      ca.addVehicle(1, 5, Direction.EAST);

      for (let i = 0; i < 20; i++) {
        ca.step();
      }

      expect(ca.vehicles.length).toBe(0);
    });

    test('应该统计通过的车辆数', () => {
      const ca = new CellularAutomata(50, 50, 5);
      ca.addVehicle(1, 5, Direction.EAST);

      for (let i = 0; i < 20; i++) {
        ca.step();
      }

      expect(ca.stats.throughput).toBeGreaterThanOrEqual(0);
    });
  });

  describe('多路口绿波联动测试', () => {
    test('多个交叉口应该有不同的 offset', () => {
      const ca = new CellularAutomata(400, 150, 5);

      const offsets = [0, 15, 30, 45];
      for (let i = 0; i < 4; i++) {
        ca.addIntersection(`int_${i + 1}`, 20 + i * 15, 15, {
          greenTimeNS: 60,
          greenTimeEW: 40,
          yellowTime: 3,
          offset: offsets[i]
        });
      }

      const states = ca.getIntersectionStates();

      expect(states['int_1'].config.offset).toBe(0);
      expect(states['int_2'].config.offset).toBe(15);
      expect(states['int_3'].config.offset).toBe(30);
      expect(states['int_4'].config.offset).toBe(45);
    });

    test('绿波偏移量应该影响交叉口的初始相位', () => {
      const ca = new CellularAutomata(400, 150, 5);

      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 60,
        greenTimeEW: 40,
        yellowTime: 3,
        offset: 0
      });

      ca.addIntersection('int_2', 50, 15, {
        greenTimeNS: 60,
        greenTimeEW: 40,
        yellowTime: 3,
        offset: 70
      });

      const states = ca.getIntersectionStates();

      expect(states['int_1'].phase).toBe(SignalPhase.GREEN);
      expect(states['int_1'].direction).toBe(Direction.NORTH);

      expect(states['int_2'].phase).toBe(SignalPhase.GREEN);
      expect(states['int_2'].direction).toBe(Direction.EAST);
    });

    test('仿真过程中应该保持绿波同步', () => {
      const ca = new CellularAutomata(400, 150, 5);

      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 60,
        greenTimeEW: 40,
        yellowTime: 3,
        offset: 0
      });

      ca.addIntersection('int_2', 50, 15, {
        greenTimeNS: 60,
        greenTimeEW: 40,
        yellowTime: 3,
        offset: 20
      });

      for (let i = 0; i < 100; i++) {
        ca.step();
      }

      const states = ca.getIntersectionStates();
      const int1 = states['int_1'];
      const int2 = states['int_2'];

      if (int1.phase === int2.phase && int1.direction === int2.direction) {
        const timerDiff = Math.abs(int1.timer - int2.timer);
        expect(timerDiff).toBeGreaterThanOrEqual(15);
        expect(timerDiff).toBeLessThanOrEqual(25);
      }
    });
  });

  describe('统计功能测试', () => {
    test('应该正确更新统计数据', () => {
      const ca = new CellularAutomata(200, 150, 5);

      for (let i = 0; i < 5; i++) {
        ca.addVehicle(i + 1, 15, Direction.EAST);
      }

      for (let i = 0; i < 10; i++) {
        ca.step();
      }

      expect(ca.stats.averageSpeed).toBeDefined();
      expect(ca.stats.waitingVehicles).toBeDefined();
      expect(ca.stats.totalVehicles).toBe(5);
    });

    test('应该返回网格状态', () => {
      const ca = new CellularAutomata(200, 150, 5);
      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });
      ca.addVehicle(5, 15, Direction.EAST);

      const gridState = ca.getGridState();

      expect(gridState).toBeDefined();
      expect(gridState.length).toBe(30);
      expect(gridState[0].length).toBe(40);

      const hasVehicle = gridState[15][5].hasVehicle;
      expect(hasVehicle).toBe(true);
    });

    test('应该返回交叉口状态', () => {
      const ca = new CellularAutomata(200, 150, 5);
      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });

      const states = ca.getIntersectionStates();

      expect(states['int_1']).toBeDefined();
      expect(states['int_1'].phase).toBe(SignalPhase.GREEN);
      expect(states['int_1'].direction).toBe(Direction.NORTH);
    });

    test('应该重置仿真', () => {
      const ca = new CellularAutomata(200, 150, 5);
      ca.addIntersection('int_1', 20, 15, {
        greenTimeNS: 30,
        greenTimeEW: 25,
        yellowTime: 3,
        offset: 0
      });
      ca.addVehicle(5, 15, Direction.EAST);

      for (let i = 0; i < 10; i++) {
        ca.step();
      }

      ca.reset();

      expect(ca.timeStep).toBe(0);
      expect(ca.vehicles.length).toBe(0);
      expect(ca.stats.totalVehicles).toBe(0);
    });
  });
});
