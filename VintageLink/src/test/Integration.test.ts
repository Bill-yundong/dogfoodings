import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { semanticEngine } from '@/models/SemanticAlignment';
import { drinkingWindowPredictor } from '@/models/DrinkingWindowPredictor';
import { simulationEngine } from '@/models/SimulationEngine';
import type { WineLabel, CellarZone, WineBottle, SensorReading, MaturationModel, DrinkingWindow, Alert } from '@/types';
import { generateMockDataset } from '@/data/mockData';

describe('End-to-End Integration - 端到端集成测试', () => {
  beforeEach(async () => {
    await db.init();
    await db.clearAll();
    simulationEngine.stop();
    simulationEngine.destroy();
  });

  afterEach(async () => {
    simulationEngine.stop();
    simulationEngine.destroy();
    try {
      await db.clearAll();
    } catch (e) {
      // ignore clear errors
    }
    db.close();
  });

  describe('核心业务场景1: 温湿度感知数据与酒液熟化模型的语义对齐', () => {
    let testZone: CellarZone;
    let testWine: { bottle: WineBottle; label: WineLabel };
    let testReadings: SensorReading[];

    beforeEach(async () => {
      const mockData = await generateMockDataset();
      testZone = mockData.zones[0];
      testWine = {
        bottle: mockData.bottles[0],
        label: mockData.labels.find(l => l.id === mockData.bottles[0].labelId)!,
      };
      testReadings = mockData.readings.filter(r => r.zoneId === testZone.id);

      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);
    });

    it('E2E-001: 传感器数据→语义对齐→熟化模型 完整数据流', async () => {
      const readings = await db.getSensorReadingsByZone(testZone.id);
      expect(readings.length).toBeGreaterThan(0);

      const impact = semanticEngine.calculateMaturationImpact(readings, testZone);
      expect(impact.impactScore).toBeGreaterThanOrEqual(0);
      expect(impact.impactScore).toBeLessThanOrEqual(100);
      expect(impact.factors.length).toBe(5);

      const baseTime = Date.now();
      const baseMaturation: MaturationModel = {
        id: 'mat-test',
        wineId: testWine.bottle.id,
        currentAge: 5,
        maturityScore: 70,
        tanninLevel: 80,
        acidityLevel: 75,
        fruitLevel: 70,
        complexityLevel: 65,
        lastUpdated: baseTime - 1000,
        predictedDevelopment: [],
      };

      const adjustedMaturation = semanticEngine.generateMaturationAdjustment(
        baseMaturation,
        impact.impactScore,
        365
      );

      expect(adjustedMaturation.maturityScore).toBeDefined();
      expect(adjustedMaturation.lastUpdated).toBeGreaterThanOrEqual(baseTime);

      const tempMapping = semanticEngine.alignSensorToWineProperty(
        'temperature',
        readings[0].temperature,
        'maturationRate'
      );
      expect(tempMapping.semanticDescription).toContain('熟化速度');
    });

    it('E2E-002: 跨模块语义标准一致性', () => {
      const mappings = semanticEngine.getMappings();
      
      const tempMapping = mappings.find(m => m.sensorMetric === 'temperature');
      expect(tempMapping).toBeDefined();
      expect(tempMapping?.wineProperty).toBe('maturationRate');
      expect(tempMapping?.correlation).toBeGreaterThan(0);

      const humidityMapping = mappings.find(m => m.sensorMetric === 'humidity');
      expect(humidityMapping).toBeDefined();
      expect(humidityMapping?.wineProperty).toBe('corkIntegrity');
    });

    it('E2E-003: 语义洞察生成与异常检测', async () => {
      const abnormalReadings: SensorReading[] = [
        {
          id: 'abnormal-1',
          zoneId: testZone.id,
          timestamp: Date.now(),
          temperature: 35,
          humidity: 40,
          lightIntensity: 1000,
          vibration: 1.5,
          temperatureVariation: 8,
        },
        {
          id: 'abnormal-2',
          zoneId: testZone.id,
          timestamp: Date.now() + 1000,
          temperature: 33,
          humidity: 42,
          lightIntensity: 1200,
          vibration: 1.8,
          temperatureVariation: 7,
        },
      ];

      const wines: { bottle: WineBottle; label: WineLabel }[] = [testWine];
      const insights = semanticEngine.getSemanticInsights(
        abnormalReadings,
        testZone,
        wines
      );

      expect(insights.overallHealth).toBeGreaterThan(0);
      expect(insights.zoneOptimization).toBeDefined();

      if (insights.keyInsights.length > 0) {
        expect(insights.recommendations.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('核心业务场景2: 异步适饮窗口预测模型分析陈年潜效', () => {
    let testLabel: WineLabel;
    let testBottle: WineBottle;
    let testMaturation: MaturationModel;
    let testZone: CellarZone;
    let testReadings: SensorReading[];

    beforeEach(async () => {
      const mockData = await generateMockDataset();
      testLabel = mockData.labels[0];
      testBottle = mockData.bottles[0];
      testZone = mockData.zones[0];
      testReadings = mockData.readings.filter(r => r.zoneId === testZone.id);

      testMaturation = {
        id: 'mat-e2e',
        wineId: testBottle.id,
        currentAge: 5,
        maturityScore: 72,
        tanninLevel: 85,
        acidityLevel: 78,
        fruitLevel: 75,
        complexityLevel: 70,
        lastUpdated: Date.now(),
        predictedDevelopment: [],
      };

      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);
      await db.addMaturationModel(testMaturation);
    });

    it('E2E-004: 完整适饮窗口预测流程', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel,
        testBottle,
        testMaturation,
        testReadings,
        testZone
      );

      expect(window).toBeDefined();
      expect(window.wineId).toBe(testBottle.id);
      expect(window.windowStart).toBeGreaterThan(0);
      expect(window.windowEnd).toBeGreaterThanOrEqual(window.windowStart);
      expect(window.peakDate).toBeGreaterThanOrEqual(window.windowStart);
      expect(window.peakDate).toBeLessThanOrEqual(window.windowEnd);
      expect(window.drinkingRecommendation.length).toBeGreaterThan(0);
      expect(window.foodPairings.length).toBeGreaterThan(0);

      await db.addDrinkingWindow(window);
      const retrievedWindow = await db.getDrinkingWindow(testBottle.id);
      expect(retrievedWindow?.id).toBe(window.id);
    });

    it('E2E-005: 陈年潜力分析与价值评估', async () => {
      const analysis = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel,
        testMaturation,
        testReadings,
        testZone
      );

      expect(analysis.potentialScore).toBeGreaterThan(0);
      expect(analysis.potentialScore).toBeLessThanOrEqual(100);
      expect(analysis.expectedPeakValue).toBeGreaterThan(0);
      expect(analysis.valueProgression.length).toBeGreaterThan(5);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      const values = analysis.valueProgression.map(v => v.estimatedValue);
      const maxValue = Math.max(...values);
      const maxIndex = values.indexOf(maxValue);
      
      expect(maxIndex).toBeGreaterThan(0);
      expect(maxIndex).toBeLessThan(values.length - 1);
    });

    it('E2E-006: 三种预测场景对比', async () => {
      const [conservative, optimal, aggressive] = await Promise.all([
        drinkingWindowPredictor.predictWindow(testLabel, testBottle, testMaturation, testReadings, testZone, { scenario: 'conservative' }),
        drinkingWindowPredictor.predictWindow(testLabel, testBottle, testMaturation, testReadings, testZone, { scenario: 'optimal' }),
        drinkingWindowPredictor.predictWindow(testLabel, testBottle, testMaturation, testReadings, testZone, { scenario: 'aggressive' }),
      ]);

      expect(conservative.confidence).toBeGreaterThanOrEqual(optimal.confidence * 0.9);
      expect(aggressive.confidence).toBeLessThanOrEqual(optimal.confidence * 1.1);
    });

    it('E2E-007: 陈年曲线与预测一致性', () => {
      const curve = drinkingWindowPredictor.getAgingCurveData(testLabel, 1);
      
      expect(curve.length).toBeGreaterThan(0);
      
      const peakQuality = Math.max(...curve.map(p => p.quality));
      const peakPoint = curve.find(p => p.quality === peakQuality)!;
      
      const currentYear = new Date().getFullYear();
      const expectedPeakAge = ((testLabel.agingPotential.peakStart + testLabel.agingPotential.peakEnd) / 2) - testLabel.vintage;
      
      expect(peakQuality).toBeGreaterThanOrEqual(80);
      expect(peakPoint.age).toBeGreaterThanOrEqual(0);
      expect(peakPoint.age).toBeLessThanOrEqual(100);
      
      if (expectedPeakAge > 0) {
        expect(Math.abs(peakPoint.age - expectedPeakAge)).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('核心业务场景3: IndexedDB存储万级名庄酒标元数据总线', () => {
    it('E2E-008: 大规模数据存储与检索性能', async () => {
      const mockData = await generateMockDataset();
      expect(mockData.labels.length).toBeGreaterThanOrEqual(40);
      expect(mockData.bottles.length).toBeGreaterThanOrEqual(100);
      expect(mockData.readings.length).toBeGreaterThanOrEqual(1000);

      const startTime = Date.now();
      
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);

      const insertTime = Date.now() - startTime;
      expect(insertTime).toBeLessThan(5000);

      const queryStart = Date.now();
      
      const [labels, zones, bottles, readings] = await Promise.all([
        db.getAllWineLabels(),
        db.getAllCellarZones(),
        db.getAllWineBottles(),
        db.getSensorReadingsByZone(mockData.zones[0].id),
      ]);

      const queryTime = Date.now() - queryStart;
      expect(queryTime).toBeLessThan(1000);

      expect(labels.length).toBe(mockData.labels.length);
      expect(zones.length).toBe(mockData.zones.length);
      expect(bottles.length).toBe(mockData.bottles.length);
      expect(readings.length).toBeGreaterThan(0);
    });

    it('E2E-009: 多索引查询验证', async () => {
      const mockData = await generateMockDataset();
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);

      const byChateau = await db.getWineLabelsByChateau(mockData.labels[0].chateau);
      expect(byChateau.length).toBeGreaterThan(0);
      expect(byChateau[0].chateau).toBe(mockData.labels[0].chateau);

      const byVintage = await db.getWineLabelsByVintage(mockData.labels[0].vintage);
      expect(byVintage.length).toBeGreaterThan(0);

      const searchResults = await db.searchWineLabels(mockData.labels[0].region);
      expect(searchResults.length).toBeGreaterThan(0);

      const byZone = await db.getWineBottlesByLabel(mockData.bottles[0].labelId);
      expect(byZone.length).toBeGreaterThan(0);

      const timeRangeStart = Date.now() - 86400000 * 30;
      const timeRangeEnd = Date.now();
      const byTimeRange = await db.getSensorReadingsByZone(
        mockData.zones[0].id,
        timeRangeStart,
        timeRangeEnd
      );
      expect(byTimeRange.length).toBeGreaterThanOrEqual(0);
    });

    it('E2E-010: 数据一致性验证', async () => {
      const mockData = await generateMockDataset();
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);

      const bottle = mockData.bottles[0];
      const label = mockData.labels.find(l => l.id === bottle.labelId)!;

      const retrievedBottle = (await db.getWineBottlesByLabel(bottle.labelId))[0];
      const retrievedLabel = await db.getWineLabel(label.id);

      expect(retrievedBottle?.id).toBe(bottle.id);
      expect(retrievedLabel?.id).toBe(label.id);
      expect(retrievedBottle?.labelId).toBe(retrievedLabel?.id);
    });
  });

  describe('核心业务场景4: 数字化私人酒窖的跨系统管理能力', () => {
    let mockData: Awaited<ReturnType<typeof generateMockDataset>>;

    beforeEach(async () => {
      mockData = await generateMockDataset();
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);
      await Promise.all(mockData.alerts.map(a => db.addAlert(a)));
      await Promise.all(mockData.maturationModels.map(m => db.addMaturationModel(m)));
      await Promise.all(mockData.drinkingWindows.map(w => db.addDrinkingWindow(w)));
    });

    it('E2E-011: 监控系统与资产管理模块数据互通', async () => {
      const zoneId = mockData.zones[0].id;
      const readings = await db.getSensorReadingsByZone(zoneId);
      const zone = mockData.zones.find(z => z.id === zoneId)!;
      
      const impact = semanticEngine.calculateMaturationImpact(readings, zone);
      
      const zoneBottles = mockData.bottles.filter(b => b.location.zoneId === zoneId);
      expect(zoneBottles.length).toBeGreaterThan(0);

      const zoneWines = zoneBottles
        .map(bottle => {
          const label = mockData.labels.find(l => l.id === bottle.labelId);
          return label ? { bottle, label } : null;
        })
        .filter(Boolean) as { bottle: WineBottle; label: WineLabel }[];

      expect(zoneWines.length).toBe(zoneBottles.length);
      expect(impact.impactScore).toBeGreaterThan(0);
    });

    it('E2E-012: 告警系统跨模块联动', async () => {
      const alerts = await db.getActiveAlerts();
      
      for (const alert of alerts) {
        if (alert.zoneId) {
          const zone = mockData.zones.find(z => z.id === alert.zoneId);
          expect(zone).toBeDefined();
        }
        if (alert.wineId) {
          const bottle = mockData.bottles.find(b => b.id === alert.wineId);
          expect(bottle).toBeDefined();
        }
      }
    });

    it('E2E-013: 系统状态完整反映', async () => {
      const [labels, zones, bottles, activeAlerts] = await Promise.all([
        db.getAllWineLabels(),
        db.getAllCellarZones(),
        db.getAllWineBottles(),
        db.getActiveAlerts(),
      ]);

      const sensorCount = zones.reduce((sum, z) => sum + z.sensorIds.length, 0);

      expect(labels.length).toBeGreaterThan(0);
      expect(zones.length).toBeGreaterThan(0);
      expect(bottles.length).toBeGreaterThan(0);
      expect(sensorCount).toBeGreaterThan(0);
      expect(activeAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('核心业务场景5: 仿真引擎驱动完整数据流转', () => {
    it('E2E-014: 仿真引擎初始化与回调系统', async () => {
      const mockData = await generateMockDataset();
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);
      await db.bulkAddSensorReadings(mockData.readings);
      await Promise.all(mockData.maturationModels.map(m => db.addMaturationModel(m)));
      await Promise.all(mockData.drinkingWindows.map(w => db.addDrinkingWindow(w)));

      const sensorReadings: SensorReading[] = [];
      const alerts: Alert[] = [];
      const maturationUpdates: MaturationModel[] = [];
      const drinkingWindows: DrinkingWindow[] = [];

      simulationEngine.setCallbacks({
        onSensorReading: (r) => sensorReadings.push(r),
        onAlert: (a) => alerts.push(a),
        onMaturationUpdate: (m) => maturationUpdates.push(m),
        onDrinkingWindowUpdate: (w) => drinkingWindows.push(w),
      });

      await simulationEngine.initialize(mockData.zones, mockData.bottles, mockData.labels);

      const state = simulationEngine.getState();
      expect(state.eventLog.length).toBeGreaterThan(0);
      expect(state.eventLog[0].message).toContain('仿真引擎初始化完成');
      
      simulationEngine.start('1x');
      expect(simulationEngine.getState().isRunning).toBe(true);
      expect(simulationEngine.getState().speed).toBe('1x');
      
      simulationEngine.stop();
      expect(simulationEngine.getState().isRunning).toBe(false);
      
      await simulationEngine.reset();
      expect(simulationEngine.getState().stats.totalSensorReadings).toBe(0);

      simulationEngine.destroy();
    });

    it('E2E-015: 仿真数据流转验证', async () => {
      const mockData = await generateMockDataset();
      await db.bulkAddWineLabels(mockData.labels);
      await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
      await db.bulkAddWineBottles(mockData.bottles);

      const initialReadings = await Promise.all(
        mockData.zones.map(z => db.getSensorReadingsByZone(z.id))
      );
      const initialTotal = initialReadings.reduce((sum, r) => sum + r.length, 0);

      await simulationEngine.initialize(mockData.zones, mockData.bottles, mockData.labels);
      
      const engineState = simulationEngine.getState();
      expect(engineState.stats).toBeDefined();
      expect(engineState.stats.totalSensorReadings).toBe(0);
      expect(engineState.stats.totalAlerts).toBe(0);

      const stateAfterInit = simulationEngine.getState();
      expect(stateAfterInit.eventLog.some(e => e.message.includes('区域'))).toBe(true);
      expect(stateAfterInit.eventLog.some(e => e.message.includes('藏酒'))).toBe(true);

      simulationEngine.destroy();
    });
  });
});
