import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDB,
  saveHistoricalRecord,
  saveHistoricalRecords,
  getHistoricalRecordsByLocation,
  getAllLocationAnalysis,
  saveLocationAnalysis,
  getLocationAnalysis,
  clearAllHistoricalRecords,
  resetAllCache,
  getRecordCount,
  locationToId,
  tidalDataToHistoricalRecord,
  closeDB,
} from '../db/tidalDB';
import { GeoLocation, TidalData, LocationAnalysis } from '../types/tidal';

describe('TidalDB - IndexedDB 缓存管理', () => {
  const testLocation: GeoLocation = { latitude: 30.0, longitude: 120.5 };
  const testLocationId = locationToId(testLocation);

  beforeEach(async () => {
    await initDB();
    await resetAllCache();
  });

  afterEach(async () => {
    await resetAllCache();
    closeDB();
  });

  describe('locationToId - 地理位置ID生成', () => {
    it('相同坐标应生成相同ID', () => {
      const id1 = locationToId(testLocation);
      const id2 = locationToId(testLocation);
      expect(id1).toBe(id2);
    });

    it('不同坐标应生成不同ID', () => {
      const id1 = locationToId(testLocation);
      const id2 = locationToId({ latitude: 31.0, longitude: 121.0 });
      expect(id1).not.toBe(id2);
    });

    it('ID应包含经纬度信息', () => {
      const id = locationToId(testLocation);
      expect(id).toContain('30.0000');
      expect(id).toContain('120.5000');
    });
  });

  describe('tidalDataToHistoricalRecord - 潮汐数据转换', () => {
    it('应正确转换为历史记录格式', () => {
      const tidalData: TidalData = {
        timestamp: Date.now(),
        waterLevel: 1.5,
        velocity: { magnitude: 2.0, direction: 90 },
      };

      const record = tidalDataToHistoricalRecord(tidalData, testLocation);
      expect(record.locationId).toBe(testLocationId);
      expect(record.timestamp).toBe(tidalData.timestamp);
      expect(record.waterLevel).toBe(1.5);
      expect(record.velocityMagnitude).toBe(2.0);
      expect(record.velocityDirection).toBe(90);
      expect(record.createdAt).toBeDefined();
    });
  });

  describe('saveHistoricalRecord - 保存单条历史记录', () => {
    it('应成功保存历史记录', async () => {
      const tidalData: TidalData = {
        timestamp: Date.now(),
        waterLevel: 1.5,
        velocity: { magnitude: 2.0, direction: 90 },
      };

      const record = tidalDataToHistoricalRecord(tidalData, testLocation);
      const id = await saveHistoricalRecord(record);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');

      const count = await getRecordCount();
      expect(count).toBe(1);
    });
  });

  describe('saveHistoricalRecords - 批量保存历史记录', () => {
    it('应批量保存多条历史记录', async () => {
      const records = [];
      for (let i = 0; i < 10; i++) {
        const tidalData: TidalData = {
          timestamp: Date.now() + i * 60000,
          waterLevel: Math.sin(i / 10),
          velocity: { magnitude: 1.5 + Math.random(), direction: 90 },
        };
        records.push(tidalDataToHistoricalRecord(tidalData, testLocation));
      }

      const ids = await saveHistoricalRecords(records);
      expect(ids.length).toBe(10);

      const count = await getRecordCount();
      expect(count).toBe(10);
    });
  });

  describe('getHistoricalRecordsByLocation - 按位置查询历史记录', () => {
    it('应按位置正确返回记录', async () => {
      const tidalData: TidalData = {
        timestamp: Date.now(),
        waterLevel: 1.5,
        velocity: { magnitude: 2.0, direction: 90 },
      };

      await saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation));
      const records = await getHistoricalRecordsByLocation(testLocationId);
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].locationId).toBe(testLocationId);
    });

    it('应支持时间范围查询', async () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        const tidalData: TidalData = {
          timestamp: now + i * 60000,
          waterLevel: Math.sin(i / 5),
          velocity: { magnitude: 1.5, direction: 90 },
        };
        await saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation));
      }

      const startTime = now + 60000;
      const endTime = now + 3 * 60000;
      const records = await getHistoricalRecordsByLocation(testLocationId, startTime, endTime);
      expect(records.length).toBe(3);
    });
  });

  describe('LocationAnalysis - 位点分析数据管理', () => {
    const analysis: LocationAnalysis = {
      locationId: testLocationId,
      location: testLocation,
      avgPowerDensity: 1000,
      maxPowerDensity: 2000,
      minPowerDensity: 500,
      capacityFactor: 0.35,
      annualEnergyProduction: 3000000,
    };

    it('应成功保存位点分析数据', async () => {
      const id = await saveLocationAnalysis(analysis);
      expect(id).toBe(testLocationId);
    });

    it('应正确读取位点分析数据', async () => {
      await saveLocationAnalysis(analysis);
      const saved = await getLocationAnalysis(testLocationId);
      expect(saved).toBeDefined();
      expect(saved?.locationId).toBe(testLocationId);
      expect(saved?.avgPowerDensity).toBe(1000);
      expect(saved?.capacityFactor).toBe(0.35);
    });

    it('应获取所有位点分析数据', async () => {
      await saveLocationAnalysis(analysis);
      const location2: GeoLocation = { latitude: 31.0, longitude: 121.0 };
      await saveLocationAnalysis({
        ...analysis,
        locationId: locationToId(location2),
        location: location2,
      });

      const all = await getAllLocationAnalysis();
      expect(all.length).toBe(2);
    });
  });

  describe('clearAllHistoricalRecords - 清空历史记录', () => {
    it('应正确清空所有历史记录', async () => {
      for (let i = 0; i < 5; i++) {
        const tidalData: TidalData = {
          timestamp: Date.now() + i * 60000,
          waterLevel: Math.sin(i / 5),
          velocity: { magnitude: 1.5, direction: 90 },
        };
        await saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation));
      }

      let count = await getRecordCount();
      expect(count).toBe(5);

      await clearAllHistoricalRecords();
      count = await getRecordCount();
      expect(count).toBe(0);
    });

    it('空数据库调用不应报错', async () => {
      const count = await clearAllHistoricalRecords();
      expect(count).toBe(0);
    });
  });

  describe('resetAllCache - 重置所有缓存', () => {
    it('应清空所有类型的缓存数据', async () => {
      for (let i = 0; i < 5; i++) {
        const tidalData: TidalData = {
          timestamp: Date.now() + i * 60000,
          waterLevel: Math.sin(i / 5),
          velocity: { magnitude: 1.5, direction: 90 },
        };
        await saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation));
      }

      const analysis: LocationAnalysis = {
        locationId: testLocationId,
        location: testLocation,
        avgPowerDensity: 1000,
        maxPowerDensity: 2000,
        minPowerDensity: 500,
        capacityFactor: 0.35,
        annualEnergyProduction: 3000000,
      };
      await saveLocationAnalysis(analysis);

      const result = await resetAllCache();
      expect(result.historicalRecords).toBe(5);
      expect(result.locationAnalysis).toBe(1);

      const recordCount = await getRecordCount();
      expect(recordCount).toBe(0);
    });
  });

  describe('getRecordCount - 获取记录数量', () => {
    it('空数据库应返回0', async () => {
      const count = await getRecordCount();
      expect(count).toBe(0);
    });

    it('添加记录后数量应正确增加', async () => {
      expect(await getRecordCount()).toBe(0);

      const tidalData: TidalData = {
        timestamp: Date.now(),
        waterLevel: 1.5,
        velocity: { magnitude: 2.0, direction: 90 },
      };
      await saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation));

      expect(await getRecordCount()).toBe(1);
    });
  });

  describe('并发操作测试', () => {
    it('应正确处理并发保存操作', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const tidalData: TidalData = {
          timestamp: Date.now() + i * 60000,
          waterLevel: Math.sin(i / 10),
          velocity: { magnitude: 1.5, direction: 90 },
        };
        promises.push(saveHistoricalRecord(tidalDataToHistoricalRecord(tidalData, testLocation)));
      }

      await Promise.all(promises);
      const count = await getRecordCount();
      expect(count).toBe(10);
    });
  });
});
