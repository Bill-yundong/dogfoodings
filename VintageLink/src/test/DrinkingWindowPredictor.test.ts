import { describe, it, expect, beforeEach } from 'vitest';
import { drinkingWindowPredictor } from '@/models/DrinkingWindowPredictor';
import type { WineLabel, WineBottle, MaturationModel, SensorReading, CellarZone } from '@/types';

describe('AsyncDrinkingWindowPredictor - 异步适饮窗口预测模型', () => {
  let testLabel: WineLabel;
  let testBottle: WineBottle;
  let testMaturation: MaturationModel;
  let testReadings: SensorReading[];
  let testZone: CellarZone;

  beforeEach(() => {
    testLabel = {
      id: 'label-1',
      chateau: 'Chateau Margaux',
      vintage: 2015,
      region: 'Bordeaux',
      appellation: 'Premier Grand Cru Classé',
      grapeVarieties: ['Cabernet Sauvignon', 'Merlot'],
      classification: 'Premier Grand Cru Classé',
      alcoholContent: 13.5,
      bottleSize: 750,
      producer: 'Chateau Margaux',
      country: 'France',
      tastingNotes: ['黑加仑', '紫罗兰', '雪松'],
      agingPotential: {
        minYears: 8,
        maxYears: 40,
        peakStart: 15,
        peakEnd: 30,
        confidence: 0.92,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    testBottle = {
      id: 'bottle-1',
      labelId: 'label-1',
      purchaseDate: Date.now() - 86400000 * 365 * 5,
      purchasePrice: 8000,
      location: { zoneId: 'zone-1', position: 'A-01' },
      quantity: 1,
      condition: 'excellent',
      storageStartDate: Date.now() - 86400000 * 365 * 5,
    };

    testMaturation = {
      id: 'mat-1',
      wineId: 'bottle-1',
      currentAge: 8,
      maturityScore: 72,
      tanninLevel: 85,
      acidityLevel: 78,
      fruitLevel: 75,
      complexityLevel: 70,
      lastUpdated: Date.now(),
      predictedDevelopment: [
        { date: Date.now() + 86400000 * 365, predictedScore: 75, confidence: 0.85, scenario: 'optimal' },
      ],
    };

    testReadings = Array.from({ length: 100 }, (_, i) => ({
      id: `r-${i}`,
      timestamp: Date.now() - i * 3600000,
      zoneId: 'zone-1',
      temperature: 12.5 + Math.random() * 1.5,
      humidity: 68 + Math.random() * 5,
      lightIntensity: 8 + Math.random() * 10,
      vibration: 0.03 + Math.random() * 0.05,
    }));

    testZone = {
      id: 'zone-1',
      name: '珍藏红葡萄酒区',
      description: '顶级红酒储存区',
      targetTemperature: { min: 10, max: 16, optimal: 13 },
      targetHumidity: { min: 60, max: 80, optimal: 70 },
      sensorIds: ['sensor-1', 'sensor-2'],
      wineBottleIds: ['bottle-1'],
    };
  });

  describe('场景1: 单瓶酒适饮窗口预测', () => {
    it('TS-101: 异步预测适饮窗口 - 正常情况', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel,
        testBottle,
        testMaturation,
        testReadings,
        testZone
      );

      expect(window).toBeDefined();
      expect(window.wineId).toBe('bottle-1');
      expect(window.windowStart).toBeGreaterThan(Date.now());
      expect(window.windowEnd).toBeGreaterThan(window.windowStart);
      expect(window.peakDate).toBeGreaterThan(window.windowStart);
      expect(window.peakDate).toBeLessThan(window.windowEnd);
      expect(window.confidence).toBeGreaterThan(0.5);
      expect(window.confidence).toBeLessThanOrEqual(1);
      expect(window.drinkingRecommendation).toBeDefined();
      expect(window.foodPairings.length).toBeGreaterThan(0);
      expect(window.decantingTime).toBeGreaterThan(0);
      expect(window.servingTemperature).toBeGreaterThan(0);
    });

    it('TS-102: 保守场景预测', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel,
        testBottle,
        testMaturation,
        testReadings,
        testZone,
        { scenario: 'conservative' }
      );

      expect(window.confidence).toBeGreaterThan(0.8);
    });

    it('TS-103: 激进场景预测', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel,
        testBottle,
        testMaturation,
        testReadings,
        testZone,
        { scenario: 'aggressive' }
      );

      expect(window.confidence).toBeLessThan(0.95);
    });

    it('TS-104: 无传感器数据时使用默认值', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel,
        testBottle,
        testMaturation,
        [],
        testZone
      );

      expect(window).toBeDefined();
      expect(window.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('场景2: 批量预测', () => {
    it('TS-105: 批量预测多瓶酒的适饮窗口', async () => {
      const wines = [
        { label: testLabel, bottle: testBottle, maturation: testMaturation },
        { 
          label: { ...testLabel, id: 'label-2', vintage: 2018 },
          bottle: { ...testBottle, id: 'bottle-2', labelId: 'label-2' },
          maturation: { ...testMaturation, id: 'mat-2', wineId: 'bottle-2', currentAge: 5 },
        },
      ];

      const windows = await drinkingWindowPredictor.predictBatch(
        wines,
        testReadings,
        testZone
      );

      expect(windows).toHaveLength(2);
      expect(windows[0].wineId).toBe('bottle-1');
      expect(windows[1].wineId).toBe('bottle-2');
    });
  });

  describe('场景3: 陈年潜力分析', () => {
    it('TS-106: 分析陈年潜力 - 未到适饮期', async () => {
      const result = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel,
        { ...testMaturation, currentAge: 5 },
        testReadings,
        testZone
      );

      expect(result.potentialScore).toBeGreaterThan(70);
      expect(result.expectedPeakValue).toBeGreaterThan(1500);
      expect(result.valueProgression.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('TS-107: 分析陈年潜力 - 已到适饮期', async () => {
      const result = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel,
        { ...testMaturation, currentAge: 18 },
        testReadings,
        testZone
      );

      expect(result.potentialScore).toBeGreaterThan(80);
      expect(result.recommendations.some(r => r.includes('价值高峰期'))).toBe(true);
    });

    it('TS-108: 分析陈年潜力 - 已过巅峰期', async () => {
      const result = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel,
        { ...testMaturation, currentAge: 35 },
        testReadings,
        testZone
      );

      expect(result.potentialScore).toBeLessThan(80);
      expect(result.recommendations.some(r => r.includes('已过价值峰值'))).toBe(true);
    });

    it('TS-109: 价值递增曲线验证', async () => {
      const result = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel,
        testMaturation,
        testReadings,
        testZone
      );

      const values = result.valueProgression.map(v => v.estimatedValue);
      const peakIndex = values.indexOf(Math.max(...values));
      
      expect(peakIndex).toBeGreaterThan(0);
      expect(peakIndex).toBeLessThan(values.length - 1);
    });

    it('TS-110: 储存条件影响价值评估', async () => {
      const badReadings = testReadings.map(r => ({ 
        ...r, 
        temperature: 25, 
        humidity: 35 
      }));

      const goodResult = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel, testMaturation, testReadings, testZone
      );

      const badResult = await drinkingWindowPredictor.analyzeAgingPotential(
        testLabel, testMaturation, badReadings, testZone
      );

      expect(badResult.potentialScore).toBeLessThanOrEqual(goodResult.potentialScore);
      expect(badResult.expectedPeakValue).toBeLessThanOrEqual(goodResult.expectedPeakValue);
    });
  });

  describe('场景4: 陈年曲线生成', () => {
    it('TS-111: 生成陈年品质曲线', () => {
      const curve = drinkingWindowPredictor.getAgingCurveData(testLabel, 1);
      
      expect(curve.length).toBeGreaterThan(0);
      
      const qualities = curve.map(p => p.quality);
      const maxQuality = Math.max(...qualities);
      const peakIndex = qualities.indexOf(maxQuality);
      
      expect(curve[0].age).toBe(0);
      expect(curve[peakIndex].age).toBeGreaterThan(testLabel.agingPotential.peakStart);
      expect(curve[peakIndex].age).toBeLessThan(testLabel.agingPotential.peakEnd + 5);
      expect(maxQuality).toBeGreaterThan(80);
    });

    it('TS-112: 储存条件影响曲线形状', () => {
      const goodCurve = drinkingWindowPredictor.getAgingCurveData(testLabel, 1);
      const badCurve = drinkingWindowPredictor.getAgingCurveData(testLabel, 0.5);

      const goodMax = Math.max(...goodCurve.map(p => p.quality));
      const badMax = Math.max(...badCurve.map(p => p.quality));

      expect(badMax).toBeLessThanOrEqual(goodMax);
    });
  });

  describe('场景5: 侍酒建议生成', () => {
    it('TS-113: 根据葡萄品种生成食物搭配', async () => {
      const window = await drinkingWindowPredictor.predictWindow(
        testLabel, testBottle, testMaturation, testReadings, testZone
      );

      expect(window.foodPairings).toContain('战斧牛排');
      expect(window.foodPairings.length).toBeLessThanOrEqual(4);
    });

    it('TS-114: 计算醒酒时间', async () => {
      const oldWine = { ...testLabel, vintage: 2000 };
      const window = await drinkingWindowPredictor.predictWindow(
        oldWine, testBottle, testMaturation, testReadings, testZone
      );

      expect(window.decantingTime).toBeGreaterThan(60);
    });

    it('TS-115: 计算侍酒温度', async () => {
      const whiteWine = { 
        ...testLabel, 
        id: 'white-1',
        grapeVarieties: ['Chardonnay'] 
      };
      const window = await drinkingWindowPredictor.predictWindow(
        whiteWine, testBottle, testMaturation, testReadings, testZone
      );

      expect(window.servingTemperature).toBeLessThan(15);
    });
  });
});
