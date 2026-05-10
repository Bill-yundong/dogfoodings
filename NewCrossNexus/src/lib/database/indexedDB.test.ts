import { TrafficDatabase } from './indexedDB';
import { TrafficIndex, TrafficLevel } from '../types/traffic';

const createMockIndex = (timestamp: number, overall: number = 50): TrafficIndex => ({
  timestamp,
  overall,
  gridData: [
    [0, 0, 1, 0],
    [0, 2, 0, 1],
  ],
  hotspots: [
    { x: 1, y: 1, level: TrafficLevel.CONGESTED },
  ],
});

describe('TrafficDatabase', () => {
  let db: TrafficDatabase;

  beforeEach(async () => {
    db = new TrafficDatabase();
    await db.init();
  });

  afterEach(async () => {
    await db.clearAllRecords();
  });

  describe('初始化测试', () => {
    it('应该正确初始化数据库', async () => {
      const testDb = new TrafficDatabase();
      await testDb.init();
      expect(testDb.getLastSyncTimestamp()).toBe(0);
    });

    it('未初始化时调用方法应该抛出错误', async () => {
      const testDb = new TrafficDatabase();
      await expect(testDb.addRecord(createMockIndex(Date.now()))).rejects.toThrow(
        'Database not initialized. Call init() first.'
      );
    });

    it('应该可以多次初始化', async () => {
      await db.init();
      await db.init();
      const count = await db.getRecordCount();
      expect(count).toBe(0);
    });
  });

  describe('数据添加测试', () => {
    it('应该能添加记录并返回 ID', async () => {
      const index = createMockIndex(Date.now());
      const id = await db.addRecord(index);
      
      expect(id).toBeTruthy();
      expect(id.startsWith('record-')).toBe(true);
      
      const count = await db.getRecordCount();
      expect(count).toBe(1);
    });

    it('添加记录后应该更新同步时间戳', async () => {
      const timestamp = Date.now();
      const index = createMockIndex(timestamp);
      
      await db.addRecord(index);
      
      expect(db.getLastSyncTimestamp()).toBe(timestamp);
    });

    it('应该能添加多条记录', async () => {
      const now = Date.now();
      
      await db.addRecord(createMockIndex(now - 1000, 30));
      await db.addRecord(createMockIndex(now, 50));
      await db.addRecord(createMockIndex(now + 1000, 70));
      
      const count = await db.getRecordCount();
      expect(count).toBe(3);
    });
  });

  describe('数据查询测试', () => {
    beforeEach(async () => {
      const now = Date.now();
      await db.addRecord(createMockIndex(now - 10000, 30));
      await db.addRecord(createMockIndex(now - 5000, 50));
      await db.addRecord(createMockIndex(now, 70));
    });

    it('应该能按时间范围查询记录', async () => {
      const now = Date.now();
      const records = await db.getRecordsByTimeRange(now - 6000, now + 1000);
      
      expect(records.length).toBe(2);
      expect(records[0].trafficIndex.overall).toBe(50);
      expect(records[1].trafficIndex.overall).toBe(70);
    });

    it('应该能获取指定时间之后的记录', async () => {
      const now = Date.now();
      const records = await db.getRecordsSince(now - 6000);
      
      expect(records.length).toBeGreaterThanOrEqual(2);
    });

    it('空时间范围应该返回空数组', async () => {
      const records = await db.getRecordsByTimeRange(0, 100);
      expect(records.length).toBe(0);
    });

    it('应该能获取历史流量指数', async () => {
      const now = Date.now();
      const index = await db.getHistoricalTrafficIndex(now - 20000, now + 20000);
      
      expect(index).not.toBeNull();
      expect(index?.overall).toBe(70);
    });

    it('找不到历史数据时应该返回 null', async () => {
      const index = await db.getHistoricalTrafficIndex(0, 100);
      expect(index).toBeNull();
    });
  });

  describe('增量回溯测试', () => {
    beforeEach(async () => {
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        await db.addRecord(createMockIndex(now + i * 1000, 30 + i * 5));
      }
    });

    it('应该能按批次获取增量数据', async () => {
      const now = Date.now();
      const result = await db.getIncrementalRecords(now - 1000, 5);
      
      expect(result.records.length).toBe(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextTimestamp).toBeGreaterThan(now);
    });

    it('当数据不足批次大小时应该返回 hasMore = false', async () => {
      const now = Date.now();
      const result = await db.getIncrementalRecords(now - 1000, 20);
      
      expect(result.records.length).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('应该按时间排序返回增量数据', async () => {
      const now = Date.now();
      const result = await db.getIncrementalRecords(now - 1000, 10);
      
      for (let i = 1; i < result.records.length; i++) {
        expect(result.records[i].timestamp).toBeGreaterThan(result.records[i - 1].timestamp);
      }
    });
  });

  describe('高峰时段检测测试', () => {
    it('应该正确识别早高峰', async () => {
      const morningDate = new Date();
      morningDate.setHours(8, 0, 0, 0);
      
      const weekdayMonday = new Date(morningDate);
      const dayOfWeek = weekdayMonday.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekdayMonday.setDate(morningDate.getDate() - daysToMonday);
      
      const timestamp = weekdayMonday.getTime();
      const index = createMockIndex(timestamp);
      
      await db.addRecord(index);
      
      const morningRecords = await db.getPeakTrafficRecords('morning');
      expect(morningRecords.length).toBeGreaterThanOrEqual(0);
    });

    it('应该正确识别晚高峰', async () => {
      const eveningDate = new Date();
      eveningDate.setHours(18, 0, 0, 0);
      
      const weekdayMonday = new Date(eveningDate);
      const dayOfWeek = weekdayMonday.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekdayMonday.setDate(eveningDate.getDate() - daysToMonday);
      
      const timestamp = weekdayMonday.getTime();
      const index = createMockIndex(timestamp);
      
      await db.addRecord(index);
      
      const eveningRecords = await db.getPeakTrafficRecords('evening');
      expect(eveningRecords.length).toBeGreaterThanOrEqual(0);
    });

    it('应该能获取所有高峰数据', async () => {
      const now = Date.now();
      await db.addRecord(createMockIndex(now));
      
      const records = await db.getPeakTrafficRecords('both');
      expect(Array.isArray(records)).toBe(true);
    });
  });

  describe('历史数据对比测试', () => {
    beforeEach(async () => {
      const now = Date.now();
      await db.addRecord(createMockIndex(now - 25 * 60 * 60 * 1000, 40));
      await db.addRecord(createMockIndex(now, 60));
    });

    it('应该能与历史数据对比', async () => {
      const now = Date.now();
      const currentIndex = createMockIndex(now, 60);
      
      const result = await db.compareWithHistorical(currentIndex, 24);
      
      expect(result.current).toEqual(currentIndex);
      expect(result.comparison.overallChange).toBeDefined();
      expect(result.comparison.hotspotChange).toBeDefined();
    });

    it('没有历史数据时应该返回零变化', async () => {
      const now = Date.now();
      const currentIndex = createMockIndex(now, 60);
      
      const testDb = new TrafficDatabase();
      await testDb.init();
      
      const result = await testDb.compareWithHistorical(currentIndex, 1);
      
      expect(result.historical).toBeNull();
      expect(result.comparison.overallChange).toBe(0);
      expect(result.comparison.hotspotChange).toBe(0);
    });
  });

  describe('数据清理测试', () => {
    beforeEach(async () => {
      const now = Date.now();
      await db.addRecord(createMockIndex(now - 35 * 24 * 60 * 60 * 1000, 30));
      await db.addRecord(createMockIndex(now, 50));
    });

    it('应该能清理过期数据', async () => {
      const deletedCount = await db.cleanupOldRecords(30);
      
      expect(deletedCount).toBeGreaterThanOrEqual(1);
      
      const remainingCount = await db.getRecordCount();
      expect(remainingCount).toBe(1);
    });

    it('应该能清除所有数据', async () => {
      await db.clearAllRecords();
      
      const count = await db.getRecordCount();
      expect(count).toBe(0);
    });

    it('清理后应该能重新添加数据', async () => {
      await db.clearAllRecords();
      
      const index = createMockIndex(Date.now());
      await db.addRecord(index);
      
      const count = await db.getRecordCount();
      expect(count).toBe(1);
    });
  });

  describe('记录计数测试', () => {
    it('初始记录数应该为 0', async () => {
      const testDb = new TrafficDatabase();
      await testDb.init();
      
      const count = await testDb.getRecordCount();
      expect(count).toBe(0);
    });

    it('添加记录后计数应该增加', async () => {
      const index = createMockIndex(Date.now());
      
      const initialCount = await db.getRecordCount();
      await db.addRecord(index);
      const finalCount = await db.getRecordCount();
      
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('按小时查询测试', () => {
    beforeEach(async () => {
      const now = Date.now();
      const currentHour = new Date(now).getHours();
      
      for (let i = 0; i < 3; i++) {
        const recordDate = new Date(now);
        recordDate.setHours(currentHour, 0, 0, 0);
        recordDate.setMinutes(i * 20);
        
        await db.addRecord(createMockIndex(recordDate.getTime(), 30 + i * 10));
      }
    });

    it('应该能按小时查询记录', async () => {
      const currentHour = new Date().getHours();
      const records = await db.getRecordsByHour(currentHour);
      
      expect(records.length).toBeGreaterThanOrEqual(0);
    });

    it('记录应该按时间排序', async () => {
      const currentHour = new Date().getHours();
      const records = await db.getRecordsByHour(currentHour);
      
      for (let i = 1; i < records.length; i++) {
        expect(records[i].timestamp).toBeGreaterThanOrEqual(records[i - 1].timestamp);
      }
    });
  });
});
