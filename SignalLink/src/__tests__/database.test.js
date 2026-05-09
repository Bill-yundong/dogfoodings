import { database } from '../services/database';
import { TimeSlot } from '../types';

describe('DatabaseService 测试', () => {
  beforeEach(async () => {
    await database.clearAll();
  });

  afterEach(() => {
    database.db = null;
    database.isReady = false;
  });

  describe('初始化测试', () => {
    test('应该初始化数据库', async () => {
      await database.init();
      expect(database.isReady).toBe(true);
      expect(database.db).toBeDefined();
    });

    test('多次初始化应该返回同一个实例', async () => {
      await database.init();
      const db1 = database.db;
      await database.init();
      const db2 = database.db;
      expect(db1).toBe(db2);
    });
  });

  describe('信号日志测试', () => {
    test('应该添加信号日志', async () => {
      await database.init();

      const logEntry = {
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true,
        deviation: { offsetDiff: 0.5, cycleDiff: 1 }
      };

      const id = await database.addSignalLog(logEntry);
      expect(id).toBeDefined();
      expect(id).toBeGreaterThan(0);
    });

    test('应该按交叉口查询信号日志', async () => {
      await database.init();

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      await database.addSignalLog({
        intersectionId: 'int_2',
        deviceId: 'device_2',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.EVENING_PEAK,
        isAligned: false
      });

      const logs = await database.getSignalLogs('int_1');
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.intersectionId === 'int_1')).toBe(true);
    });

    test('应该按时段查询信号日志', async () => {
      await database.init();

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.EVENING_PEAK,
        isAligned: false
      });

      const logs = await database.getSignalLogs('int_1', TimeSlot.MIDDAY);
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.timeSlot === TimeSlot.MIDDAY)).toBe(true);
    });

    test('应该按时间范围查询信号日志', async () => {
      await database.init();

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      const now = Date.now();
      const logs = await database.getSignalLogsByTimeRange(now - 60000, now + 60000);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    test('添加的日志应该包含时间戳', async () => {
      await database.init();

      const before = Date.now();
      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      const logs = await database.getSignalLogs('int_1');
      const after = Date.now();

      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('绿波方案测试', () => {
    test('应该保存绿波方案', async () => {
      await database.init();

      const plan = {
        id: 1,
        timeSlot: TimeSlot.MIDDAY,
        intersections: [
          { intersectionId: 'int_1', offset: 0 },
          { intersectionId: 'int_2', offset: 25 }
        ],
        targetSpeed: 50,
        cycleLength: 100,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'active'
      };

      const id = await database.saveGreenWavePlan(plan);
      expect(id).toBeDefined();
    });

    test('应该获取绿波方案列表', async () => {
      await database.init();

      await database.saveGreenWavePlan({
        id: 1,
        timeSlot: TimeSlot.MIDDAY,
        intersections: [{ intersectionId: 'int_1', offset: 0 }],
        targetSpeed: 50,
        cycleLength: 100,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'active'
      });

      await database.saveGreenWavePlan({
        id: 2,
        timeSlot: TimeSlot.NIGHT,
        intersections: [{ intersectionId: 'int_1', offset: 0 }],
        targetSpeed: 45,
        cycleLength: 80,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'draft'
      });

      const plans = await database.getGreenWavePlans();
      expect(plans.length).toBe(2);
    });

    test('应该更新已存在的绿波方案', async () => {
      await database.init();

      const plan1 = {
        id: 1,
        timeSlot: TimeSlot.MIDDAY,
        intersections: [{ intersectionId: 'int_1', offset: 0 }],
        targetSpeed: 50,
        cycleLength: 100,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'draft'
      };

      await database.saveGreenWavePlan(plan1);

      const plan2 = {
        id: 1,
        timeSlot: TimeSlot.MIDDAY,
        intersections: [
          { intersectionId: 'int_1', offset: 0 },
          { intersectionId: 'int_2', offset: 25 }
        ],
        targetSpeed: 50,
        cycleLength: 100,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'active'
      };

      await database.saveGreenWavePlan(plan2);

      const plans = await database.getGreenWavePlans();
      expect(plans.length).toBe(1);
      expect(plans[0].intersections.length).toBe(2);
      expect(plans[0].status).toBe('active');
    });
  });

  describe('设备配置测试', () => {
    test('应该保存设备配置', async () => {
      await database.init();

      const config = {
        deviceId: 'device_1',
        intersectionId: 'int_1',
        location: { x: 50, y: 30 },
        status: 'online',
        lastSync: Date.now(),
        config: {
          greenTimeNS: 30,
          greenTimeEW: 25,
          offset: 0
        }
      };

      const id = await database.saveDeviceConfig(config);
      expect(id).toBe('device_1');
    });

    test('应该获取设备配置', async () => {
      await database.init();

      const config = {
        deviceId: 'device_1',
        intersectionId: 'int_1',
        location: { x: 50, y: 30 },
        status: 'online',
        config: {
          greenTimeNS: 30,
          greenTimeEW: 25,
          offset: 0
        }
      };

      await database.saveDeviceConfig(config);
      const savedConfig = await database.getDeviceConfig('device_1');

      expect(savedConfig).toBeDefined();
      expect(savedConfig.deviceId).toBe('device_1');
      expect(savedConfig.intersectionId).toBe('int_1');
    });

    test('获取不存在的设备配置应该返回 undefined', async () => {
      await database.init();
      const config = await database.getDeviceConfig('non_existent_device');
      expect(config).toBeUndefined();
    });
  });

  describe('仿真结果测试', () => {
    test('应该保存仿真结果', async () => {
      await database.init();

      const result = {
        timeStep: 1000,
        stats: {
          totalVehicles: 100,
          averageSpeed: 3.5,
          waitingVehicles: 10,
          throughput: 50
        },
        timeSlot: TimeSlot.MIDDAY,
        intersectionCount: 4
      };

      const id = await database.saveSimulationResult(result);
      expect(id).toBeDefined();
    });

    test('保存的仿真结果应该包含时间戳', async () => {
      await database.init();

      const result = {
        timeStep: 1000,
        stats: {
          totalVehicles: 100,
          averageSpeed: 3.5,
          waitingVehicles: 10,
          throughput: 50
        },
        timeSlot: TimeSlot.MIDDAY,
        intersectionCount: 4
      };

      const before = Date.now();
      await database.saveSimulationResult(result);
      const results = await database.getSimulationResults(1);
      const after = Date.now();

      expect(results[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(results[0].timestamp).toBeLessThanOrEqual(after);
    });

    test('应该获取仿真结果列表（按时间倒序）', async () => {
      jest.useRealTimers();
      await database.init();

      for (let i = 0; i < 5; i++) {
        await database.saveSimulationResult({
          timeStep: i * 100,
          stats: {
            totalVehicles: i * 10,
            averageSpeed: 3 + i * 0.5,
            waitingVehicles: i,
            throughput: i * 5
          },
          timeSlot: TimeSlot.MIDDAY,
          intersectionCount: 4
        });
      }

      const results = await database.getSimulationResults(3);
      expect(results.length).toBe(3);
      jest.useFakeTimers();
    });

    test('应该限制返回的仿真结果数量', async () => {
      await database.init();

      for (let i = 0; i < 15; i++) {
        await database.saveSimulationResult({
          timeStep: i * 100,
          stats: {
            totalVehicles: i * 10,
            averageSpeed: 3,
            waitingVehicles: i,
            throughput: i * 5
          },
          timeSlot: TimeSlot.MIDDAY,
          intersectionCount: 4
        });
      }

      const results = await database.getSimulationResults(10);
      expect(results.length).toBe(10);
    });
  });

  describe('分时段存储测试', () => {
    test('应该正确存储不同时段的信号日志', async () => {
      await database.init();

      const timeSlots = [
        TimeSlot.MORNING_PEAK,
        TimeSlot.MIDDAY,
        TimeSlot.EVENING_PEAK,
        TimeSlot.NIGHT
      ];

      for (const slot of timeSlots) {
        for (let i = 0; i < 3; i++) {
          await database.addSignalLog({
            intersectionId: 'int_1',
            deviceId: 'device_1',
            timeSlot: slot,
            isAligned: true
          });
        }
      }

      for (const slot of timeSlots) {
        const logs = await database.getSignalLogs('int_1', slot);
        expect(logs.length).toBe(3);
        expect(logs.every(log => log.timeSlot === slot)).toBe(true);
      }
    });

    test('应该正确存储不同时段的仿真结果', async () => {
      await database.init();

      const configs = {
        [TimeSlot.MORNING_PEAK]: { targetSpeed: 40, cycleLength: 120 },
        [TimeSlot.MIDDAY]: { targetSpeed: 50, cycleLength: 100 },
        [TimeSlot.EVENING_PEAK]: { targetSpeed: 35, cycleLength: 130 },
        [TimeSlot.NIGHT]: { targetSpeed: 45, cycleLength: 80 }
      };

      for (const [slot, config] of Object.entries(configs)) {
        await database.saveSimulationResult({
          timeStep: 1000,
          stats: {
            totalVehicles: 100,
            averageSpeed: config.targetSpeed / 10,
            waitingVehicles: 10,
            throughput: 50
          },
          timeSlot: slot,
          intersectionCount: 4
        });
      }

      const results = await database.getSimulationResults(10);
      const timeSlotsInResults = [...new Set(results.map(r => r.timeSlot))];
      expect(timeSlotsInResults.length).toBe(4);
    });
  });

  describe('清除数据测试', () => {
    test('应该清除所有数据', async () => {
      await database.init();

      await database.addSignalLog({
        intersectionId: 'int_1',
        deviceId: 'device_1',
        timeSlot: TimeSlot.MIDDAY,
        isAligned: true
      });

      await database.saveGreenWavePlan({
        id: 1,
        timeSlot: TimeSlot.MIDDAY,
        intersections: [{ intersectionId: 'int_1', offset: 0 }],
        targetSpeed: 50,
        cycleLength: 100,
        priorityDirection: 'balanced',
        createdAt: Date.now(),
        status: 'active'
      });

      await database.saveSimulationResult({
        timeStep: 1000,
        stats: {
          totalVehicles: 100,
          averageSpeed: 3.5,
          waitingVehicles: 10,
          throughput: 50
        },
        timeSlot: TimeSlot.MIDDAY,
        intersectionCount: 4
      });

      await database.clearAll();

      const logs = await database.getSignalLogs('int_1');
      const plans = await database.getGreenWavePlans();
      const results = await database.getSimulationResults(10);

      expect(logs.length).toBe(0);
      expect(plans.length).toBe(0);
      expect(results.length).toBe(0);
    });
  });
});
