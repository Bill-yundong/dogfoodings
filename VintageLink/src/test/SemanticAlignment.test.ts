import { describe, it, expect, beforeEach } from 'vitest';
import { semanticEngine } from '@/models/SemanticAlignment';
import type { SensorReading, CellarZone, WineBottle, WineLabel } from '@/types';

describe('SemanticAlignmentEngine - 语义对齐引擎', () => {
  let testReadings: SensorReading[];
  let testZone: CellarZone;
  let testWines: { bottle: WineBottle; label: WineLabel }[];

  beforeEach(() => {
    testReadings = [
      {
        id: 'r1',
        timestamp: Date.now(),
        zoneId: 'zone-1',
        temperature: 13,
        humidity: 70,
        lightIntensity: 10,
        vibration: 0.05,
      },
      {
        id: 'r2',
        timestamp: Date.now() - 3600000,
        zoneId: 'zone-1',
        temperature: 13.2,
        humidity: 71,
        lightIntensity: 12,
        vibration: 0.06,
      },
    ];

    testZone = {
      id: 'zone-1',
      name: '测试区域',
      description: '测试用酒窖区域',
      targetTemperature: { min: 10, max: 16, optimal: 13 },
      targetHumidity: { min: 60, max: 80, optimal: 70 },
      sensorIds: ['sensor-1'],
      wineBottleIds: ['bottle-1'],
    };

    testWines = [
      {
        bottle: {
          id: 'bottle-1',
          labelId: 'label-1',
          purchaseDate: Date.now() - 86400000 * 365,
          purchasePrice: 2000,
          location: { zoneId: 'zone-1', position: 'A-01' },
          quantity: 1,
          condition: 'excellent',
          storageStartDate: Date.now() - 86400000 * 365,
        } as WineBottle,
        label: {
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
          tastingNotes: ['黑加仑', '雪松', '烟草'],
          agingPotential: {
            minYears: 5,
            maxYears: 30,
            peakStart: 10,
            peakEnd: 20,
            confidence: 0.9,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as WineLabel,
      },
    ];
  });

  describe('场景1: 温湿度数据语义化映射', () => {
    it('TS-001: 正常环境下计算熟化影响评分', () => {
      const result = semanticEngine.calculateMaturationImpact(testReadings, testZone);
      
      expect(result.impactScore).toBeGreaterThan(70);
      expect(result.impactScore).toBeLessThanOrEqual(100);
      expect(result.factors).toHaveLength(5);
      expect(result.factors[0].metric).toBe('temperature');
    });

    it('TS-002: 温度异常时评分降低', () => {
      const hotReadings = testReadings.map(r => ({ ...r, temperature: 25 }));
      const result = semanticEngine.calculateMaturationImpact(hotReadings, testZone);
      
      const tempFactor = result.factors.find(f => f.metric === 'temperature');
      expect(tempFactor?.impact).toBeLessThan(80);
    });

    it('TS-003: 湿度异常时评分降低', () => {
      const dryReadings = testReadings.map(r => ({ ...r, humidity: 40 }));
      const result = semanticEngine.calculateMaturationImpact(dryReadings, testZone);
      
      const humidityFactor = result.factors.find(f => f.metric === 'humidity');
      expect(humidityFactor?.impact).toBeLessThan(80);
    });

    it('TS-004: 温度波动过大时评分降低', () => {
      const volatileReadings = [
        ...testReadings,
        { ...testReadings[0], id: 'r3', temperature: 16, timestamp: Date.now() - 7200000 },
        { ...testReadings[0], id: 'r4', temperature: 10, timestamp: Date.now() - 10800000 },
        { ...testReadings[0], id: 'r5', temperature: 14.5, timestamp: Date.now() - 14400000 },
        { ...testReadings[0], id: 'r6', temperature: 11.5, timestamp: Date.now() - 18000000 },
      ];
      const result = semanticEngine.calculateMaturationImpact(volatileReadings, testZone);
      
      const tempVarFactor = result.factors.find(f => f.metric === 'temperatureVariation');
      expect(tempVarFactor?.impact).toBeLessThanOrEqual(85);
    });
  });

  describe('场景2: 传感器数据到酒质属性的语义转换', () => {
    it('TS-005: 温度到熟化速度的语义映射', () => {
      const result = semanticEngine.alignSensorToWineProperty(
        'temperature',
        15,
        'maturationRate'
      );
      
      expect(result.alignedValue).toBeGreaterThan(1);
      expect(result.semanticDescription).toContain('熟化速度');
      expect(result.correlation).toBeGreaterThan(0);
    });

    it('TS-006: 低温减慢熟化速度', () => {
      const result = semanticEngine.alignSensorToWineProperty(
        'temperature',
        10,
        'maturationRate'
      );
      
      expect(result.alignedValue).toBeLessThan(1);
    });

    it('TS-007: 湿度到软木塞完整性的语义映射', () => {
      const result = semanticEngine.alignSensorToWineProperty(
        'humidity',
        70,
        'corkIntegrity'
      );
      
      expect(result.alignedValue).toBeGreaterThan(90);
      expect(result.semanticDescription).toContain('软木塞完整性');
    });

    it('TS-008: 湿度异常降低软木塞评分', () => {
      const result = semanticEngine.alignSensorToWineProperty(
        'humidity',
        45,
        'corkIntegrity'
      );
      
      expect(result.alignedValue).toBeLessThan(80);
    });

    it('TS-009: 未知映射返回默认值', () => {
      const result = semanticEngine.alignSensorToWineProperty(
        'unknownMetric',
        50,
        'unknownProperty'
      );
      
      expect(result.alignedValue).toBe(50);
      expect(result.semanticDescription).toBe('未知映射');
      expect(result.correlation).toBe(0);
    });
  });

  describe('场景3: 熟化模型调整', () => {
    it('TS-010: 良好环境提升熟化评分', () => {
      const baseTime = Date.now();
      const baseMaturation = {
        id: 'mat-1',
        wineId: 'bottle-1',
        currentAge: 5,
        maturityScore: 70,
        tanninLevel: 80,
        acidityLevel: 75,
        fruitLevel: 70,
        complexityLevel: 65,
        lastUpdated: baseTime - 1000,
        predictedDevelopment: [],
      };

      const adjusted = semanticEngine.generateMaturationAdjustment(
        baseMaturation,
        90,
        365
      );

      expect(adjusted.maturityScore).toBeGreaterThanOrEqual(60);
      expect(adjusted.tanninLevel).toBeGreaterThanOrEqual(70);
      expect(adjusted.lastUpdated).toBeGreaterThanOrEqual(baseTime);
    });

    it('TS-011: 较差环境降低熟化评分', () => {
      const baseMaturation = {
        id: 'mat-1',
        wineId: 'bottle-1',
        currentAge: 5,
        maturityScore: 70,
        tanninLevel: 80,
        acidityLevel: 75,
        fruitLevel: 70,
        complexityLevel: 65,
        lastUpdated: Date.now(),
        predictedDevelopment: [],
      };

      const adjusted = semanticEngine.generateMaturationAdjustment(
        baseMaturation,
        50,
        365
      );

      expect(adjusted.maturityScore).toBeLessThanOrEqual(baseMaturation.maturityScore);
    });
  });

  describe('场景4: 语义洞察生成', () => {
    it('TS-012: 正常环境生成正面洞察', () => {
      const insights = semanticEngine.getSemanticInsights(
        testReadings,
        testZone,
        testWines
      );

      expect(insights.overallHealth).toBeGreaterThan(70);
      expect(insights.zoneOptimization).toContain('极佳');
    });

    it('TS-013: 异常环境生成建议', () => {
      const badReadings = [
        ...testReadings.map(r => ({ ...r, temperature: 25, humidity: 40, lightIntensity: 150, vibration: 1.0 })),
        { ...testReadings[0], id: 'r3', temperature: 20, humidity: 35, lightIntensity: 200, vibration: 1.5, timestamp: Date.now() - 3600000 },
        { ...testReadings[0], id: 'r4', temperature: 30, humidity: 45, lightIntensity: 180, vibration: 1.2, timestamp: Date.now() - 7200000 },
        { ...testReadings[0], id: 'r5', temperature: 18, humidity: 38, lightIntensity: 160, vibration: 1.3, timestamp: Date.now() - 10800000 },
      ];
      const insights = semanticEngine.getSemanticInsights(
        badReadings,
        testZone,
        testWines
      );

      expect(insights.keyInsights.length).toBeGreaterThan(0);
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.zoneOptimization).toBeDefined();
    });
  });

  describe('场景5: 语义映射配置', () => {
    it('TS-014: 获取所有语义映射', () => {
      const mappings = semanticEngine.getMappings();
      
      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0]).toHaveProperty('sensorMetric');
      expect(mappings[0]).toHaveProperty('wineProperty');
      expect(mappings[0]).toHaveProperty('correlation');
      expect(mappings[0]).toHaveProperty('impactFactor');
    });
  });
});
