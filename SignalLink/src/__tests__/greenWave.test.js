import {
  RoadsideDevice,
  TrafficManagementSystem,
  trafficSystem
} from '../coordination/greenWave';
import { TimeSlot } from '../types';

describe('RoadsideDevice 类测试', () => {
  test('应该创建一个路侧设备', () => {
    const device = new RoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

    expect(device.deviceId).toBe('device_1');
    expect(device.intersectionId).toBe('int_1');
    expect(device.location).toEqual({ x: 50, y: 30 });
    expect(device.status).toBe('online');
    expect(device.lastSync).toBeNull();
    expect(device.actualTiming).toBeNull();
    expect(device.commands).toEqual([]);
  });

  test('应该更新设备状态', () => {
    const device = new RoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

    device.updateStatus('offline');
    expect(device.status).toBe('offline');
  });

  test('应该接收命令', () => {
    const device = new RoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

    const command = {
      type: 'sync_timing',
      payload: { greenTimeNS: 30, greenTimeEW: 25 }
    };

    const result = device.receiveCommand(command);
    expect(result).toBe(true);
    expect(device.commands.length).toBe(1);
    expect(device.commands[0].type).toBe('sync_timing');
    expect(device.commands[0].receivedAt).toBeDefined();
  });

  test('应该执行同步命令', () => {
    const device = new RoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

    const command = {
      type: 'sync_timing',
      payload: { greenTimeNS: 30, greenTimeEW: 25, offset: 0 }
    };

    device.receiveCommand(command);
    const executed = device.executeCommands();

    expect(executed.length).toBe(1);
    expect(device.actualTiming).toEqual(command.payload);
    expect(device.lastSync).toBeDefined();
    expect(device.commands.length).toBe(0);
  });

  test('应该返回设备状态', () => {
    const device = new RoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

    const status = device.getStatus();
    expect(status.deviceId).toBe('device_1');
    expect(status.intersectionId).toBe('int_1');
    expect(status.status).toBe('online');
  });
});

describe('TrafficManagementSystem 类测试', () => {
  let tms;

  beforeEach(() => {
    tms = new TrafficManagementSystem();
  });

  describe('基本功能测试', () => {
    test('应该创建一个交通管理系统', () => {
      expect(tms).toBeDefined();
      expect(tms.plans.size).toBe(0);
      expect(tms.devices.size).toBe(0);
      expect(tms.currentTimeSlot).toBe(TimeSlot.MIDDAY);
    });

    test('应该添加路侧设备', () => {
      const device = tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

      expect(device.deviceId).toBe('device_1');
      expect(tms.devices.size).toBe(1);
      expect(tms.devices.get('device_1')).toBeDefined();
    });

    test('应该获取设备列表', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });
      tms.addRoadsideDevice('device_2', 'int_2', { x: 100, y: 30 });

      const devices = tms.getDevices();
      expect(devices.length).toBe(2);
      expect(devices[0].deviceId).toBe('device_1');
      expect(devices[1].deviceId).toBe('device_2');
    });
  });

  describe('绿波方案测试', () => {
    test('应该创建绿波方案', () => {
      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      expect(plan.id).toBe('green_wave_1');
      expect(plan.timeSlot).toBe(TimeSlot.MIDDAY);
      expect(plan.intersections.length).toBe(2);
      expect(plan.status).toBe('draft');
    });

    test('应该为多路口计算绿波偏移量', () => {
      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_3', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_4', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      expect(plan.intersections[0].offset).toBe(0);
      expect(plan.intersections[1].offset).toBe(25);
      expect(plan.intersections[2].offset).toBe(50);
      expect(plan.intersections[3].offset).toBe(75);
    });

    test('应该激活绿波方案', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });
      tms.addRoadsideDevice('device_2', 'int_2', { x: 100, y: 30 });

      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      const activatedPlan = tms.activatePlan(plan.id);

      expect(activatedPlan.status).toBe('active');
      expect(tms.currentTimeSlot).toBe(TimeSlot.MIDDAY);

      const device1 = tms.devices.get('device_1');
      expect(device1.commands.length).toBe(1);
      expect(device1.commands[0].type).toBe('sync_timing');
    });

    test('应该获取方案列表', () => {
      tms.createGreenWavePlan(
        'green_wave_1',
        [{ intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 }],
        TimeSlot.MIDDAY
      );

      tms.createGreenWavePlan(
        'green_wave_2',
        [{ intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 }],
        TimeSlot.NIGHT
      );

      const plans = tms.getPlans();
      expect(plans.length).toBe(2);
    });
  });

  describe('设备同步测试', () => {
    test('应该同步设备', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });
      tms.addRoadsideDevice('device_2', 'int_2', { x: 100, y: 30 });

      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      tms.activatePlan(plan.id);
      const results = tms.syncDevices();

      expect(results.length).toBe(2);
      expect(results[0].deviceId).toBe('device_1');
      expect(results[0].status.actualTiming).toBeDefined();
    });

    test('应该检查设备对齐状态', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });

      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [{ intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 }],
        TimeSlot.MIDDAY
      );

      tms.activatePlan(plan.id);
      tms.syncDevices();

      const alignment = tms.getDeviceAlignment('device_1');
      expect(alignment).toBeDefined();
      expect(alignment.isAligned).toBe(true);
    });

    test('应该获取所有设备对齐状态', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });
      tms.addRoadsideDevice('device_2', 'int_2', { x: 100, y: 30 });

      const plan = tms.createGreenWavePlan(
        'green_wave_1',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      tms.activatePlan(plan.id);
      tms.syncDevices();

      const alignments = tms.getAllAlignments();
      expect(alignments['device_1']).toBeDefined();
      expect(alignments['device_2']).toBeDefined();
      expect(alignments['device_1'].isAligned).toBe(true);
      expect(alignments['device_2'].isAligned).toBe(true);
    });
  });

  describe('时段管理测试', () => {
    test('应该获取当前时段', () => {
      const hour = new Date().getHours();
      const currentSlot = tms.getCurrentTimeSlot();

      if (hour >= 7 && hour < 9) {
        expect(currentSlot).toBe(TimeSlot.MORNING_PEAK);
      } else if (hour >= 9 && hour < 17) {
        expect(currentSlot).toBe(TimeSlot.MIDDAY);
      } else if (hour >= 17 && hour < 19) {
        expect(currentSlot).toBe(TimeSlot.EVENING_PEAK);
      } else {
        expect(currentSlot).toBe(TimeSlot.NIGHT);
      }
    });

    test('应该添加和移除监听器', () => {
      const listener = jest.fn();

      tms.addListener(listener);
      expect(tms.listeners.length).toBe(1);

      tms.removeListener(listener);
      expect(tms.listeners.length).toBe(0);
    });

    test('应该通知监听器', () => {
      const listener = jest.fn();
      tms.addListener(listener);

      tms.notifyListeners('test_event', { data: 'test' });

      expect(listener).toHaveBeenCalledWith('test_event', { data: 'test' });
    });
  });

  describe('多路口绿波联动测试', () => {
    test('应该为4个路口创建绿波方案', () => {
      const plan = tms.createGreenWavePlan(
        'green_wave_4int',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_3', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_4', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      expect(plan.intersections.length).toBe(4);
      expect(plan.intersections[0].offset).toBe(0);
      expect(plan.intersections[1].offset).toBe(25);
      expect(plan.intersections[2].offset).toBe(50);
      expect(plan.intersections[3].offset).toBe(75);
    });

    test('应该为不同时段创建不同的绿波方案', () => {
      const plan1 = tms.createGreenWavePlan(
        'green_wave_morning',
        [
          { intersectionId: 'int_1', greenTimeNS: 35, greenTimeEW: 20 },
          { intersectionId: 'int_2', greenTimeNS: 35, greenTimeEW: 20 }
        ],
        TimeSlot.MORNING_PEAK
      );

      const plan2 = tms.createGreenWavePlan(
        'green_wave_evening',
        [
          { intersectionId: 'int_1', greenTimeNS: 20, greenTimeEW: 35 },
          { intersectionId: 'int_2', greenTimeNS: 20, greenTimeEW: 35 }
        ],
        TimeSlot.EVENING_PEAK
      );

      expect(plan1.intersections[0].greenTimeNS).toBe(35);
      expect(plan1.intersections[0].greenTimeEW).toBe(20);
      expect(plan2.intersections[0].greenTimeNS).toBe(20);
      expect(plan2.intersections[0].greenTimeEW).toBe(35);
    });

    test('应该为3个路口计算不同的偏移量', () => {
      const plan = tms.createGreenWavePlan(
        'green_wave_3int',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_3', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      expect(plan.intersections[0].offset).toBe(0);
      expect(plan.intersections[1].offset).toBeGreaterThan(0);
      expect(plan.intersections[2].offset).toBeGreaterThan(plan.intersections[1].offset);
    });

    test('应该激活多路口绿波方案并同步所有设备', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 20, y: 30 });
      tms.addRoadsideDevice('device_2', 'int_2', { x: 50, y: 30 });
      tms.addRoadsideDevice('device_3', 'int_3', { x: 80, y: 30 });
      tms.addRoadsideDevice('device_4', 'int_4', { x: 110, y: 30 });

      const plan = tms.createGreenWavePlan(
        'green_wave_4int',
        [
          { intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_2', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_3', greenTimeNS: 30, greenTimeEW: 25 },
          { intersectionId: 'int_4', greenTimeNS: 30, greenTimeEW: 25 }
        ],
        TimeSlot.MIDDAY
      );

      tms.activatePlan(plan.id);
      tms.syncDevices();

      const devices = tms.getDevices();
      expect(devices.length).toBe(4);

      for (let i = 0; i < 4; i++) {
        expect(devices[i].status).toBe('online');
        expect(devices[i].actualTiming).toBeDefined();
        expect(devices[i].actualTiming.offset).toBe(i * 25);
      }
    });
  });

  describe('系统重置测试', () => {
    test('应该重置系统', () => {
      tms.addRoadsideDevice('device_1', 'int_1', { x: 50, y: 30 });
      tms.createGreenWavePlan(
        'green_wave_1',
        [{ intersectionId: 'int_1', greenTimeNS: 30, greenTimeEW: 25 }],
        TimeSlot.MIDDAY
      );

      expect(tms.devices.size).toBe(1);
      expect(tms.plans.size).toBe(1);

      tms.reset();

      expect(tms.devices.size).toBe(0);
      expect(tms.plans.size).toBe(0);
      expect(tms.currentTimeSlot).toBe(TimeSlot.MIDDAY);
    });
  });
});
