import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDB,
  saveHydrants,
  getHydrants,
  getHydrantById,
  getHydrantsByRegion,
  savePressureReadings,
  getLatestReadings,
  saveWaterMain,
  getWaterMain,
  saveSemanticMetadata,
  getLatestSemanticMetadata,
  saveConflictRecord,
  getUnresolvedConflicts,
  bulkInsertHydrants,
  bulkInsertReadings,
  getDBStats,
  closeDB,
} from '../src/db';
import {
  createMockHydrant,
  createMockPressureReading,
  createMockWaterMain,
  createMockSemanticMetadata,
  createMockConflict,
  createBatchHydrants,
  createBatchReadings,
} from './testDataFactory';
import { DataSource, HydrantStatus } from '../src/types';

describe('IndexedDB 缓存层 - 核心业务场景', () => {
  beforeEach(async () => {
    closeDB();
  });

  afterEach(() => {
    closeDB();
  });

  describe('消火栓数据管理', () => {
    it('SC-001: 应能初始化数据库并创建所有对象存储', async () => {
      const db = await initDB();
      expect(db).toBeDefined();
      expect(db.objectStoreNames.contains('hydrants')).toBe(true);
      expect(db.objectStoreNames.contains('pressureReadings')).toBe(true);
      expect(db.objectStoreNames.contains('waterMains')).toBe(true);
      expect(db.objectStoreNames.contains('semanticMetadata')).toBe(true);
      expect(db.objectStoreNames.contains('conflictRecords')).toBe(true);
    });

    it('SC-002: 应能保存和查询单个消火栓', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const savedHydrant = await getHydrantById(hydrant.id);
      expect(savedHydrant).toBeDefined();
      expect(savedHydrant?.id).toBe(hydrant.id);
      expect(savedHydrant?.code).toBe(hydrant.code);
      expect(savedHydrant?.name).toBe(hydrant.name);
    });

    it('SC-003: 应能按区域查询消火栓', async () => {
      const region1Hydrants = createBatchHydrants(5).map((h) => ({
        ...h,
        region: '东城区',
      }));
      const region2Hydrants = createBatchHydrants(3).map((h) => ({
        ...h,
        region: '西城区',
      }));

      await saveHydrants([...region1Hydrants, ...region2Hydrants]);

      const region1Results = await getHydrantsByRegion('东城区');
      expect(region1Results.length).toBe(5);
      region1Results.forEach((h) => expect(h.region).toBe('东城区'));

      const region2Results = await getHydrantsByRegion('西城区');
      expect(region2Results.length).toBe(3);
      region2Results.forEach((h) => expect(h.region).toBe('西城区'));
    });

    it('SC-004: 应能批量插入大量消火栓数据（万级数据支持）', async () => {
      const hydrants = createBatchHydrants(1000);
      const result = await bulkInsertHydrants(hydrants);

      expect(result.success).toBe(1000);
      expect(result.failed).toBe(0);

      const allHydrants = await getHydrants();
      expect(allHydrants.length).toBeGreaterThanOrEqual(1000);
    });

    it('SC-005: 应能获取正确的数据库统计信息', async () => {
      const hydrants = createBatchHydrants(50);
      const readings = createBatchReadings(hydrants, 5);

      await bulkInsertHydrants(hydrants);
      await bulkInsertReadings(readings);

      const stats = await getDBStats();
      expect(stats.hydrantCount).toBe(50);
      expect(stats.readingCount).toBe(250);
    });
  });

  describe('水压读数存储和查询', () => {
    it('SC-006: 应能保存和查询水压读数', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const reading = createMockPressureReading(hydrant.id, DataSource.FIRE_DEPARTMENT);
      await savePressureReadings([reading]);

      const readings = await getLatestReadings(hydrant.id);
      expect(readings.length).toBe(1);
      expect(readings[0].hydrantId).toBe(hydrant.id);
      expect(readings[0].source).toBe(DataSource.FIRE_DEPARTMENT);
    });

    it('SC-007: 应能按时间戳排序获取最新读数', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const now = Date.now();
      const readings = Array.from({ length: 10 }, (_, i) =>
        createMockPressureReading(hydrant.id, DataSource.SIMULATED, {
          timestamp: now - i * 1000,
        })
      );

      await savePressureReadings(readings);

      const latestReadings = await getLatestReadings(hydrant.id, 5);
      expect(latestReadings.length).toBe(5);
      expect(latestReadings[0].timestamp).toBeGreaterThan(
        latestReadings[4].timestamp
      );
    });

    it('SC-008: 应能批量插入大量水压读数', async () => {
      const hydrants = createBatchHydrants(100);
      await bulkInsertHydrants(hydrants);

      const readings = createBatchReadings(hydrants, 24);
      expect(readings.length).toBe(2400);

      const result = await bulkInsertReadings(readings);
      expect(result.success).toBe(2400);
      expect(result.failed).toBe(0);
    });

    it('SC-009: 应支持双数据源读数（消防支队/自来水公司）', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const now = Date.now();
      const fireDeptReading = createMockPressureReading(
        hydrant.id,
        DataSource.FIRE_DEPARTMENT,
        { pressure: 0.4, timestamp: now }
      );
      const waterCompanyReading = createMockPressureReading(
        hydrant.id,
        DataSource.WATER_COMPANY,
        { pressure: 0.38, timestamp: now + 1000 }
      );

      await savePressureReadings([fireDeptReading, waterCompanyReading]);

      const readings = await getLatestReadings(hydrant.id);
      expect(readings.length).toBe(2);

      const sources = readings.map((r) => r.source);
      expect(sources).toContain(DataSource.FIRE_DEPARTMENT);
      expect(sources).toContain(DataSource.WATER_COMPANY);
    });
  });

  describe('冲突记录管理', () => {
    it('SC-010: 应能保存和查询冲突记录', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const conflict = createMockConflict(hydrant.id);
      await saveConflictRecord(conflict);

      const unresolved = await getUnresolvedConflicts();
      expect(unresolved.length).toBe(1);
      expect(unresolved[0].hydrantId).toBe(hydrant.id);
      expect(unresolved[0].resolved).toBe(false);
    });

    it('SC-011: 应能区分已解决和未解决的冲突', async () => {
      const hydrant1 = createMockHydrant();
      const hydrant2 = createMockHydrant();
      await saveHydrants([hydrant1, hydrant2]);

      const unresolvedConflict = createMockConflict(hydrant1.id);
      const resolvedConflict = {
        ...createMockConflict(hydrant2.id),
        resolved: true,
        resolution: 'average' as const,
      };

      await saveConflictRecord(unresolvedConflict);
      await saveConflictRecord(resolvedConflict);

      const unresolved = await getUnresolvedConflicts();
      expect(unresolved.length).toBe(1);
      expect(unresolved[0].hydrantId).toBe(hydrant1.id);
    });

    it('SC-012: 冲突记录应包含完整的双源读数信息', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      const conflict = createMockConflict(hydrant.id, 0.2);
      await saveConflictRecord(conflict);

      const saved = await getUnresolvedConflicts();
      expect(saved[0].fireDeptReading).toBeDefined();
      expect(saved[0].waterCompanyReading).toBeDefined();
      expect(saved[0].fireDeptReading.source).toBe(DataSource.FIRE_DEPARTMENT);
      expect(saved[0].waterCompanyReading.source).toBe(DataSource.WATER_COMPANY);

      const pressureDiff = Math.abs(
        saved[0].fireDeptReading.pressure - saved[0].waterCompanyReading.pressure
      );
      expect(pressureDiff).toBeGreaterThan(0.1);
    });
  });

  describe('语义元数据和管网管理', () => {
    it('SC-013: 应能保存和查询语义元数据', async () => {
      const metadata = createMockSemanticMetadata();
      await saveSemanticMetadata(metadata);

      const saved = await getLatestSemanticMetadata();
      expect(saved).toBeDefined();
      expect(saved?.fireDeptSemantic.category).toBe('消防供水设施');
      expect(saved?.waterCompanySemantic.category).toBe('管网末端压力点');
    });

    it('SC-014: 应能获取最新的语义映射版本', async () => {
      const oldMetadata = createMockSemanticMetadata({
        mappingVersion: '1.0.0',
        lastSyncTime: Date.now() - 100000,
      });
      const newMetadata = createMockSemanticMetadata({
        mappingVersion: '1.0.1',
        lastSyncTime: Date.now(),
      });

      await saveSemanticMetadata(oldMetadata);
      await saveSemanticMetadata(newMetadata);

      const latest = await getLatestSemanticMetadata();
      expect(latest?.mappingVersion).toBe('1.0.1');
    });

    it('SC-015: 应能保存和查询管网信息', async () => {
      const main = createMockWaterMain();
      await saveWaterMain(main);

      const saved = await getWaterMain(main.id);
      expect(saved).toBeDefined();
      expect(saved?.id).toBe(main.id);
      expect(saved?.material).toBe(main.material);
    });
  });

  describe('离线缓存支持', () => {
    it('SC-016: 应能在数据库关闭后重新初始化', async () => {
      const hydrant = createMockHydrant();
      await saveHydrants([hydrant]);

      closeDB();

      const reloaded = await getHydrants();
      expect(reloaded.length).toBeGreaterThanOrEqual(1);
    });

    it('SC-017: 批量插入应具有容错能力', async () => {
      const hydrants = createBatchHydrants(100);
      const result = await bulkInsertHydrants(hydrants);

      expect(result.success + result.failed).toBe(100);
      expect(result.failed).toBe(0);
    });
  });
});
