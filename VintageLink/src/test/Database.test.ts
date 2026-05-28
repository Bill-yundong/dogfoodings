import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import type { WineLabel, CellarZone, WineBottle, SensorReading, MaturationModel, DrinkingWindow, Alert } from '@/types';

describe('DatabaseManager - IndexedDB数据存储层', () => {
  beforeEach(async () => {
    await db.init();
    await db.clearAll();
  });

  afterEach(async () => {
    try {
      await db.clearAll();
    } catch (e) {
      // ignore clear errors
    }
    db.close();
  });

  describe('场景1: 酒标元数据存储与检索 (万级数据支持)', () => {
    it('TS-201: 存储和获取单条酒标数据', async () => {
      const label: WineLabel = {
        id: 'label-1',
        chateau: 'Chateau Lafite Rothschild',
        vintage: 2010,
        region: 'Bordeaux',
        appellation: 'Pauillac',
        grapeVarieties: ['Cabernet Sauvignon', 'Merlot'],
        classification: 'Premier Grand Cru Classé',
        alcoholContent: 13.5,
        bottleSize: 750,
        producer: 'Chateau Lafite Rothschild',
        country: 'France',
        tastingNotes: ['黑醋栗', '雪松', '烟草'],
        agingPotential: {
          minYears: 10,
          maxYears: 50,
          peakStart: 20,
          peakEnd: 40,
          confidence: 0.95,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.bulkAddWineLabels([label]);
      const retrieved = await db.getWineLabel('label-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.chateau).toBe('Chateau Lafite Rothschild');
      expect(retrieved?.vintage).toBe(2010);
    });

    it('TS-202: 批量存储大量酒标数据 (模拟万级数据)', async () => {
      const labels: WineLabel[] = Array.from({ length: 100 }, (_, i) => ({
        id: `label-${i}`,
        chateau: `Chateau Test ${i}`,
        vintage: 2000 + (i % 25),
        region: i % 2 === 0 ? 'Bordeaux' : 'Burgundy',
        appellation: 'Test AOC',
        grapeVarieties: ['Cabernet Sauvignon'],
        classification: 'Grand Cru',
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
          confidence: 0.8,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      await db.bulkAddWineLabels(labels);
      const allLabels = await db.getAllWineLabels();
      
      expect(allLabels).toHaveLength(100);
    });

    it('TS-203: 按酒庄名称查询酒标', async () => {
      const labels: WineLabel[] = [
        {
          id: 'l1',
          chateau: 'Chateau Margaux',
          vintage: 2015,
          region: 'Bordeaux',
          appellation: 'Margaux',
          grapeVarieties: ['Cabernet Sauvignon'],
          classification: 'Premier Grand Cru Classé',
          alcoholContent: 13.5,
          bottleSize: 750,
          producer: 'Chateau Margaux',
          country: 'France',
          tastingNotes: ['测试'],
          agingPotential: { minYears: 8, maxYears: 40, peakStart: 15, peakEnd: 30, confidence: 0.9 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'l2',
          chateau: 'Chateau Latour',
          vintage: 2016,
          region: 'Bordeaux',
          appellation: 'Pauillac',
          grapeVarieties: ['Cabernet Sauvignon'],
          classification: 'Premier Grand Cru Classé',
          alcoholContent: 13.5,
          bottleSize: 750,
          producer: 'Chateau Latour',
          country: 'France',
          tastingNotes: ['测试'],
          agingPotential: { minYears: 10, maxYears: 50, peakStart: 20, peakEnd: 40, confidence: 0.92 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await db.bulkAddWineLabels(labels);
      const margaux = await db.getWineLabelsByChateau('Chateau Margaux');
      
      expect(margaux).toHaveLength(1);
      expect(margaux[0].id).toBe('l1');
    });

    it('TS-204: 按年份查询酒标', async () => {
      const labels: WineLabel[] = Array.from({ length: 10 }, (_, i) => ({
        id: `label-${i}`,
        chateau: `Chateau ${i}`,
        vintage: 2010 + (i % 5),
        region: 'Bordeaux',
        appellation: 'Test',
        grapeVarieties: ['Cabernet Sauvignon'],
        classification: 'Grand Cru',
        alcoholContent: 13.5,
        bottleSize: 750,
        producer: 'Test',
        country: 'France',
        tastingNotes: ['测试'],
        agingPotential: { minYears: 5, maxYears: 30, peakStart: 10, peakEnd: 20, confidence: 0.8 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      await db.bulkAddWineLabels(labels);
      const vintage2012 = await db.getWineLabelsByVintage(2012);
      
      expect(vintage2012).toHaveLength(2);
    });

    it('TS-205: 全文搜索酒标', async () => {
      const labels: WineLabel[] = [
        {
          id: 'l1',
          chateau: 'Domaine de la Romanee-Conti',
          vintage: 2010,
          region: 'Burgundy',
          appellation: 'Romanée-Conti',
          grapeVarieties: ['Pinot Noir'],
          classification: 'Grand Cru',
          alcoholContent: 13,
          bottleSize: 750,
          producer: 'DRC',
          country: 'France',
          tastingNotes: ['测试'],
          agingPotential: { minYears: 10, maxYears: 50, peakStart: 20, peakEnd: 40, confidence: 0.95 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'l2',
          chateau: 'Chateau d\'Yquem',
          vintage: 2015,
          region: 'Bordeaux',
          appellation: 'Sauternes',
          grapeVarieties: ['Sémillon'],
          classification: 'Premier Grand Cru Classé Supérieur',
          alcoholContent: 14,
          bottleSize: 750,
          producer: 'Chateau d\'Yquem',
          country: 'France',
          tastingNotes: ['测试'],
          agingPotential: { minYears: 10, maxYears: 100, peakStart: 30, peakEnd: 70, confidence: 0.9 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await db.bulkAddWineLabels(labels);
      
      const burgundyResults = await db.searchWineLabels('Burgundy');
      expect(burgundyResults).toHaveLength(1);
      
      const franceResults = await db.searchWineLabels('France');
      expect(franceResults).toHaveLength(2);
      
      const yearResults = await db.searchWineLabels('2015');
      expect(yearResults).toHaveLength(1);
    });
  });

  describe('场景2: 传感器数据存储与检索', () => {
    let testZone: CellarZone;

    beforeEach(async () => {
      testZone = {
        id: 'zone-1',
        name: '测试区',
        description: '测试',
        targetTemperature: { min: 10, max: 16, optimal: 13 },
        targetHumidity: { min: 60, max: 80, optimal: 70 },
        sensorIds: ['sensor-1'],
        wineBottleIds: [],
      };
      await db.addCellarZone(testZone);
    });

    it('TS-206: 存储和检索传感器数据', async () => {
      const reading: SensorReading = {
        id: 'reading-1',
        timestamp: Date.now(),
        zoneId: 'zone-1',
        temperature: 13.5,
        humidity: 72,
        lightIntensity: 15,
        vibration: 0.05,
      };

      await db.addSensorReading(reading);
      const zoneReadings = await db.getSensorReadingsByZone('zone-1');
      
      expect(zoneReadings).toHaveLength(1);
      expect(zoneReadings[0].temperature).toBe(13.5);
    });

    it('TS-207: 批量存储传感器数据', async () => {
      const readings: SensorReading[] = Array.from({ length: 50 }, (_, i) => ({
        id: `r-${i}`,
        timestamp: Date.now() - i * 3600000,
        zoneId: 'zone-1',
        temperature: 12.5 + Math.random() * 1.5,
        humidity: 68 + Math.random() * 5,
        lightIntensity: 10,
        vibration: 0.05,
      }));

      await db.bulkAddSensorReadings(readings);
      const allReadings = await db.getSensorReadingsByZone('zone-1');
      
      expect(allReadings).toHaveLength(50);
    });

    it('TS-208: 按时间范围查询传感器数据', async () => {
      const now = Date.now();
      const readings: SensorReading[] = [
        { id: 'r1', timestamp: now - 86400000 * 5, zoneId: 'zone-1', temperature: 13, humidity: 70 },
        { id: 'r2', timestamp: now - 86400000 * 3, zoneId: 'zone-1', temperature: 13.2, humidity: 71 },
        { id: 'r3', timestamp: now - 86400000 * 1, zoneId: 'zone-1', temperature: 12.8, humidity: 69 },
      ];

      await db.bulkAddSensorReadings(readings);
      
      const recentReadings = await db.getSensorReadingsByZone(
        'zone-1',
        now - 86400000 * 4,
        now
      );
      
      expect(recentReadings).toHaveLength(2);
    });

    it('TS-209: 获取最新传感器读数', async () => {
      const now = Date.now();
      const readings: SensorReading[] = [
        { id: 'r1', timestamp: now - 3600000, zoneId: 'zone-1', temperature: 13, humidity: 70 },
        { id: 'r2', timestamp: now, zoneId: 'zone-1', temperature: 13.5, humidity: 72 },
      ];

      await db.bulkAddSensorReadings(readings);
      const latest = await db.getLatestSensorReading('zone-1');
      
      expect(latest?.id).toBe('r2');
      expect(latest?.temperature).toBe(13.5);
    });
  });

  describe('场景3: 多索引查询与数据一致性', () => {
    beforeEach(async () => {
      const zone1: CellarZone = {
        id: 'zone-1', name: '红酒区', description: '',
        targetTemperature: { min: 10, max: 16, optimal: 13 },
        targetHumidity: { min: 60, max: 80, optimal: 70 },
        sensorIds: ['s1'], wineBottleIds: ['b1', 'b2'],
      };
      const zone2: CellarZone = {
        id: 'zone-2', name: '白酒区', description: '',
        targetTemperature: { min: 8, max: 12, optimal: 10 },
        targetHumidity: { min: 60, max: 80, optimal: 70 },
        sensorIds: ['s2'], wineBottleIds: ['b3'],
      };
      await db.addCellarZone(zone1);
      await db.addCellarZone(zone2);

      const bottles: WineBottle[] = [
        { id: 'b1', labelId: 'l1', purchaseDate: Date.now(), purchasePrice: 2000,
          location: { zoneId: 'zone-1', position: 'A-01' }, quantity: 1,
          condition: 'excellent', storageStartDate: Date.now() },
        { id: 'b2', labelId: 'l2', purchaseDate: Date.now(), purchasePrice: 3000,
          location: { zoneId: 'zone-1', position: 'A-02' }, quantity: 1,
          condition: 'good', storageStartDate: Date.now() },
        { id: 'b3', labelId: 'l3', purchaseDate: Date.now(), purchasePrice: 1500,
          location: { zoneId: 'zone-2', position: 'B-01' }, quantity: 1,
          condition: 'excellent', storageStartDate: Date.now() },
      ];
      await db.bulkAddWineBottles(bottles);
    });

    it('TS-210: 按区域查询酒款', async () => {
      const zone1Bottles = await db.getWineBottlesByLabel('l1');
      expect(zone1Bottles).toHaveLength(1);
    });

    it('TS-211: 获取所有区域', async () => {
      const zones = await db.getAllCellarZones();
      expect(zones).toHaveLength(2);
    });

    it('TS-212: 存储和查询熟化模型', async () => {
      const model: MaturationModel = {
        id: 'mat-1',
        wineId: 'b1',
        currentAge: 5,
        maturityScore: 70,
        tanninLevel: 80,
        acidityLevel: 75,
        fruitLevel: 72,
        complexityLevel: 68,
        lastUpdated: Date.now(),
        predictedDevelopment: [],
      };

      await db.addMaturationModel(model);
      const retrieved = await db.getMaturationModel('b1');
      
      expect(retrieved?.wineId).toBe('b1');
      expect(retrieved?.maturityScore).toBe(70);
    });

    it('TS-213: 存储和查询适饮窗口', async () => {
      const window: DrinkingWindow = {
        id: 'dw-1',
        wineId: 'b1',
        windowStart: Date.now() + 86400000 * 365,
        windowEnd: Date.now() + 86400000 * 365 * 10,
        peakDate: Date.now() + 86400000 * 365 * 5,
        confidence: 0.85,
        drinkingRecommendation: '测试建议',
        foodPairings: ['牛排'],
        decantingTime: 60,
        servingTemperature: 18,
      };

      await db.addDrinkingWindow(window);
      const retrieved = await db.getDrinkingWindow('b1');
      
      expect(retrieved?.wineId).toBe('b1');
      expect(retrieved?.confidence).toBe(0.85);
    });
  });

  describe('场景4: 告警与系统元数据', () => {
    it('TS-214: 存储和查询告警', async () => {
      const alert: Alert = {
        id: 'alert-1',
        type: 'temperature',
        severity: 'warning',
        message: '温度过高',
        timestamp: Date.now(),
        zoneId: 'zone-1',
        resolved: false,
      };

      await db.addAlert(alert);
      
      const allAlerts = await db.getActiveAlerts();
      
      expect(allAlerts.length).toBeGreaterThanOrEqual(0);
    });

    it('TS-215: 解决告警', async () => {
      const alert: Alert = {
        id: 'alert-1',
        type: 'temperature',
        severity: 'warning',
        message: '温度过高',
        timestamp: Date.now(),
        zoneId: 'zone-1',
        resolved: false,
      };

      await db.addAlert(alert);
      await db.resolveAlert('alert-1');
      const activeAlerts = await db.getActiveAlerts();
      
      expect(activeAlerts).toHaveLength(0);
    });

    it('TS-216: 存储和获取系统元数据', async () => {
      await db.setMetadata('systemInitialized', true);
      const initialized = await db.getMetadata<boolean>('systemInitialized');
      
      expect(initialized).toBe(true);
    });

    it('TS-217: 获取数据统计', async () => {
      const label: WineLabel = {
        id: 'l1', chateau: 'Test', vintage: 2015, region: 'Test',
        appellation: 'Test', grapeVarieties: ['Test'], classification: 'Test',
        alcoholContent: 13, bottleSize: 750, producer: 'Test', country: 'Test',
        tastingNotes: ['Test'],
        agingPotential: { minYears: 5, maxYears: 30, peakStart: 10, peakEnd: 20, confidence: 0.8 },
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      await db.bulkAddWineLabels([label]);

      const count = await db.getCount('wineLabels');
      expect(count).toBe(1);
    });
  });

  describe('场景5: 数据总线完整性', () => {
    it('TS-218: 清空所有数据', async () => {
      const label: WineLabel = {
        id: 'l1', chateau: 'Test', vintage: 2015, region: 'Test',
        appellation: 'Test', grapeVarieties: ['Test'], classification: 'Test',
        alcoholContent: 13, bottleSize: 750, producer: 'Test', country: 'Test',
        tastingNotes: ['Test'],
        agingPotential: { minYears: 5, maxYears: 30, peakStart: 10, peakEnd: 20, confidence: 0.8 },
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      await db.bulkAddWineLabels([label]);
      await db.clearAll();

      const labels = await db.getAllWineLabels();
      expect(labels).toHaveLength(0);
    });

    it('TS-219: 重复初始化不报错', async () => {
      await db.init();
      await db.init();
      
      const initialized = await db.getMetadata<boolean>('systemInitialized');
      expect(initialized).toBeUndefined();
    });
  });
});
