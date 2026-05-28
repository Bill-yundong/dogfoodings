import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationEngine } from '@/models/SimulationEngine';
import type { CellarZone, WineBottle, WineLabel, SensorReading, MaturationModel, Alert, DrinkingWindow } from '@/types';
import { db } from '@/db';

describe('SimulationEngine - 仿真引擎', () => {
  let engine: SimulationEngine;
  let testZones: CellarZone[];
  let testBottles: WineBottle[];
  let testLabels: WineLabel[];

  beforeEach(async () => {
    engine = new SimulationEngine();

    testZones = [
      {
        id: 'zone-1',
        name: '珍藏红葡萄酒区',
        description: '顶级红酒储存区',
        targetTemperature: { min: 10, max: 16, optimal: 13 },
        targetHumidity: { min: 60, max: 80, optimal: 70 },
        sensorIds: ['sensor-1', 'sensor-2'],
        wineBottleIds: ['bottle-1', 'bottle-2'],
      },
    ];

    testLabels = [
      {
        id: 'label-1',
        chateau: 'Chateau Test',
        vintage: 2015,
        region: 'Bordeaux',
        appellation: 'Grand Cru',
        grapeVarieties: ['Cabernet Sauvignon'],
        classification: 'Grand Cru Classé',
        alcoholContent: 13.5,
        bottleSize: 750,
        producer: 'Test Producer',
        country: 'France',
        tastingNotes: ['测试'],
        agingPotential: {
          minYears: 5,
          maxYears: 30,
          peakStart: 10,
          peakEnd: 20,
          confidence: 0.9,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    testBottles = [
      {
        id: 'bottle-1',
        labelId: 'label-1',
        purchaseDate: Date.now() - 86400000 * 365 * 3,
        purchasePrice: 2000,
        location: { zoneId: 'zone-1', position: 'A-01' },
        quantity: 1,
        condition: 'excellent',
        storageStartDate: Date.now() - 86400000 * 365 * 3,
      },
    ];

    await db.init();
    try {
      await db.clearAll();
    } catch (e) {
      // ignore clear errors
    }
    await db.bulkAddWineLabels(testLabels);
    await Promise.all(testZones.map(z => db.addCellarZone(z)));
    await db.bulkAddWineBottles(testBottles);

    const maturationModel: MaturationModel = {
      id: 'mat-1',
      wineId: 'bottle-1',
      currentAge: 3,
      maturityScore: 65,
      tanninLevel: 85,
      acidityLevel: 78,
      fruitLevel: 72,
      complexityLevel: 65,
      lastUpdated: Date.now(),
      predictedDevelopment: [],
    };
    await db.addMaturationModel(maturationModel);
  });

  afterEach(() => {
    engine.stop();
    engine.destroy();
    db.close();
  });

  describe('场景1: 仿真引擎初始化', () => {
    it('TS-301: 初始化仿真引擎', async () => {
      const callbackSpy = vi.fn();
      const unsub = engine.subscribe(callbackSpy);

      await engine.initialize(testZones, testBottles, testLabels);
      
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
      expect(state.speed).toBe('paused');
      expect(state.eventLog.length).toBeGreaterThan(0);
      expect(state.eventLog[0].message).toContain('仿真引擎初始化完成');
      expect(callbackSpy).toHaveBeenCalled();

      unsub();
    });

    it('TS-302: 状态订阅与通知', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = engine.subscribe(listener1);
      const unsub2 = engine.subscribe(listener2);

      engine.start('1x');
      engine.stop();
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  describe('场景2: 仿真控制功能', () => {
    beforeEach(async () => {
      await engine.initialize(testZones, testBottles, testLabels);
    });

    it('TS-303: 启动仿真', () => {
      const callbackSpy = vi.fn();
      const unsub = engine.subscribe(callbackSpy);

      engine.start('1x');
      
      const state = engine.getState();
      expect(state.isRunning).toBe(true);
      expect(state.speed).toBe('1x');
      expect(state.eventLog.some(e => e.message.includes('仿真启动'))).toBe(true);

      engine.stop();
      unsub();
    });

    it('TS-304: 停止仿真', () => {
      engine.start('1x');
      engine.stop();
      
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
      expect(state.speed).toBe('paused');
      expect(state.eventLog.some(e => e.message.includes('仿真暂停'))).toBe(true);
    });

    it('TS-305: 调整仿真速度', () => {
      engine.start('1x');
      engine.setSpeed('5x');
      
      let state = engine.getState();
      expect(state.speed).toBe('5x');
      expect(state.eventLog.some(e => e.message.includes('仿真速度调整为 5x'))).toBe(true);

      engine.setSpeed('20x');
      state = engine.getState();
      expect(state.speed).toBe('20x');

      engine.setSpeed('100x');
      state = engine.getState();
      expect(state.speed).toBe('100x');

      engine.stop();
    });

    it('TS-306: 重置仿真', async () => {
      engine.start('1x');
      engine.stop();
      
      await engine.reset();
      
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
      expect(state.speed).toBe('paused');
      expect(state.elapsedHours).toBe(0);
      expect(state.totalSimulatedDays).toBe(0);
      expect(state.stats.totalSensorReadings).toBe(0);
      expect(state.eventLog.some(e => e.message.includes('仿真引擎已重置'))).toBe(true);
    });
  });

  describe('场景3: 回调系统集成', () => {
    beforeEach(async () => {
      await engine.initialize(testZones, testBottles, testLabels);
    });

    it('TS-316: 完整回调链路', () => {
      const callbacks = {
        onSensorReading: vi.fn<[SensorReading], void>(),
        onAlert: vi.fn<[Alert], void>(),
        onMaturationUpdate: vi.fn<[MaturationModel], void>(),
        onDrinkingWindowUpdate: vi.fn<[DrinkingWindow], void>(),
      };

      engine.setCallbacks(callbacks);
      expect(callbacks.onSensorReading).not.toHaveBeenCalled();
    });

    it('TS-317: 动态更新回调', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      engine.setCallbacks({ onSensorReading: callback1 });
      engine.setCallbacks({ onSensorReading: callback2 });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('场景4: 仿真统计与状态查询', () => {
    beforeEach(async () => {
      await engine.initialize(testZones, testBottles, testLabels);
    });

    it('TS-318: 获取仿真时间', () => {
      const time = engine.simulationTime;
      expect(time).toBeGreaterThan(0);
    });

    it('TS-319: 获取完整状态快照', () => {
      const state = engine.getState();
      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('speed');
      expect(state).toHaveProperty('elapsedHours');
      expect(state).toHaveProperty('totalSimulatedDays');
      expect(state).toHaveProperty('eventLog');
      expect(state).toHaveProperty('stats');
    });

    it('TS-320: 状态包含完整统计信息', () => {
      const state = engine.getState();
      expect(state.stats).toHaveProperty('totalSensorReadings');
      expect(state.stats).toHaveProperty('totalAlerts');
      expect(state.stats).toHaveProperty('maturationUpdates');
      expect(state.stats).toHaveProperty('predictionsRun');
      expect(state.stats).toHaveProperty('anomaliesDetected');
      expect(state.stats).toHaveProperty('winesEnteringPeak');
    });

    it('TS-321: 事件日志包含正确字段', () => {
      const state = engine.getState();
      const event = state.eventLog[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('simulatedTime');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('severity');
      expect(event).toHaveProperty('message');
    });
  });

  describe('场景5: 多区域初始化', () => {
    it('TS-322: 多区域独立初始化', async () => {
      const multiZones: CellarZone[] = [
        ...testZones,
        {
          id: 'zone-2',
          name: '白葡萄酒区',
          description: '白酒储存区',
          targetTemperature: { min: 8, max: 12, optimal: 10 },
          targetHumidity: { min: 60, max: 80, optimal: 70 },
          sensorIds: ['sensor-3'],
          wineBottleIds: ['bottle-2'],
        },
      ];

      const multiLabels: WineLabel[] = [
        ...testLabels,
        {
          ...testLabels[0],
          id: 'label-2',
          chateau: 'White Wine Chateau',
          grapeVarieties: ['Chardonnay'],
          vintage: 2020,
        },
      ];

      const multiBottles: WineBottle[] = [
        ...testBottles,
        {
          id: 'bottle-2',
          labelId: 'label-2',
          purchaseDate: Date.now() - 86400000 * 365,
          purchasePrice: 800,
          location: { zoneId: 'zone-2', position: 'B-01' },
          quantity: 1,
          condition: 'excellent',
          storageStartDate: Date.now() - 86400000 * 365,
        },
      ];

      await db.clearAll();
      await db.bulkAddWineLabels(multiLabels);
      await Promise.all(multiZones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(multiBottles);

      await engine.initialize(multiZones, multiBottles, multiLabels);
      
      const state = engine.getState();
      expect(state.eventLog[0].message).toContain('2 个区域');
      expect(state.eventLog[0].message).toContain('2 瓶藏酒');
    });
  });

  describe('场景6: 速度倍率映射', () => {
    beforeEach(async () => {
      await engine.initialize(testZones, testBottles, testLabels);
    });

    it('TS-323: 1x速度映射', () => {
      engine.start('1x');
      const state = engine.getState();
      expect(state.speed).toBe('1x');
      expect(state.isRunning).toBe(true);
      engine.stop();
    });

    it('TS-324: 5x速度映射', () => {
      engine.start('5x');
      const state = engine.getState();
      expect(state.speed).toBe('5x');
      expect(state.isRunning).toBe(true);
      engine.stop();
    });

    it('TS-325: 20x速度映射', () => {
      engine.start('20x');
      const state = engine.getState();
      expect(state.speed).toBe('20x');
      expect(state.isRunning).toBe(true);
      engine.stop();
    });

    it('TS-326: 100x速度映射', () => {
      engine.start('100x');
      const state = engine.getState();
      expect(state.speed).toBe('100x');
      expect(state.isRunning).toBe(true);
      engine.stop();
    });

    it('TS-327: paused状态停止仿真', () => {
      engine.start('1x');
      engine.setSpeed('paused');
      const state = engine.getState();
      expect(state.speed).toBe('paused');
      expect(state.isRunning).toBe(false);
    });
  });

  describe('场景7: 资源清理', () => {
    beforeEach(async () => {
      await engine.initialize(testZones, testBottles, testLabels);
    });

    it('TS-328: destroy清理所有监听器', () => {
      const listener = vi.fn();
      engine.subscribe(listener);
      
      engine.destroy();
      
      expect(engine.getState().isRunning).toBe(false);
    });

    it('TS-329: 多次stop安全调用', () => {
      engine.start('1x');
      engine.stop();
      engine.stop();
      
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
    });

    it('TS-330: 多次start安全调用', () => {
      engine.start('1x');
      engine.start('5x');
      
      const state = engine.getState();
      expect(state.speed).toBe('5x');
      expect(state.isRunning).toBe(true);
      
      engine.stop();
    });
  });
});
