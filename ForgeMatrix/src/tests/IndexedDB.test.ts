import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../database/indexedDB';
import { ForgingBatch, CoolingSnapshot, QualityData } from '../types';

const createTestBatch = (overrides: Partial<ForgingBatch> = {}): Omit<ForgingBatch, 'id'> => ({
  partNumber: 'TEST-001',
  startTime: Date.now(),
  material: '42CrMo',
  initialTemperature: 1150,
  targetCoolingRate: 25,
  status: 'ongoing',
  snapshots: [],
  ...overrides
});

describe('IndexedDB 存储层', () => {
  beforeEach(async () => {
    await db.init();
  });

  afterEach(async () => {
    await db.clearAllData();
  });

  describe('锻造批次管理', () => {
    it('应该创建新的锻造批次', async () => {
      const batch = createTestBatch();
      const id = await db.createBatch(batch);
      
      expect(id).toBeDefined();
      expect(id.startsWith('batch_')).toBe(true);
    });

    it('应该获取单个锻造批次', async () => {
      const batch = createTestBatch({ partNumber: 'TEST-GET-001' });
      const id = await db.createBatch(batch);
      
      const fetched = await db.getBatch(id);
      expect(fetched).toBeDefined();
      expect(fetched?.partNumber).toBe('TEST-GET-001');
      expect(fetched?.material).toBe('42CrMo');
    });

    it('应该获取所有锻造批次', async () => {
      await db.createBatch(createTestBatch({ partNumber: 'BATCH-1' }));
      await db.createBatch(createTestBatch({ partNumber: 'BATCH-2' }));
      await db.createBatch(createTestBatch({ partNumber: 'BATCH-3' }));
      
      const batches = await db.getAllBatches();
      expect(batches.length).toBe(3);
    });

    it('应该更新锻造批次', async () => {
      const id = await db.createBatch(createTestBatch());
      const batch = await db.getBatch(id);
      
      if (batch) {
        batch.status = 'completed';
        batch.endTime = Date.now();
        await db.updateBatch(batch);
        
        const updated = await db.getBatch(id);
        expect(updated?.status).toBe('completed');
        expect(updated?.endTime).toBeDefined();
      }
    });

    it('应该删除锻造批次', async () => {
      const id = await db.createBatch(createTestBatch());
      await db.deleteBatch(id);
      
      const deleted = await db.getBatch(id);
      expect(deleted).toBeUndefined();
    });

    it('应该支持批量快照关联', async () => {
      const id = await db.createBatch(createTestBatch());
      const batch = await db.getBatch(id);
      
      if (batch) {
        batch.snapshots = ['snap_1', 'snap_2', 'snap_3'];
        await db.updateBatch(batch);
        
        const updated = await db.getBatch(id);
        expect(updated?.snapshots.length).toBe(3);
      }
    });
  });

  describe('温度快照管理', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch(createTestBatch());
    });

    it('应该创建温度快照', async () => {
      const snapshot: Omit<CoolingSnapshot, 'id'> = {
        batchId,
        timestamp: Date.now(),
        temperatureField: [],
        coolingRate: 20.5,
        averageTemperature: 800,
        maxTemperature: 950,
        minTemperature: 650
      };

      const snapId = await db.createSnapshot(snapshot);
      expect(snapId).toBeDefined();
      expect(snapId.startsWith('snap_')).toBe(true);
    });

    it('应该获取单个快照', async () => {
      const snapshot: Omit<CoolingSnapshot, 'id'> = {
        batchId,
        timestamp: Date.now(),
        temperatureField: [],
        coolingRate: 20.5,
        averageTemperature: 800,
        maxTemperature: 950,
        minTemperature: 650
      };

      const snapId = await db.createSnapshot(snapshot);
      const fetched = await db.getSnapshot(snapId);
      
      expect(fetched).toBeDefined();
      expect(fetched?.coolingRate).toBe(20.5);
      expect(fetched?.averageTemperature).toBe(800);
    });

    it('应该按批次获取所有快照', async () => {
      for (let i = 0; i < 5; i++) {
        await db.createSnapshot({
          batchId,
          timestamp: Date.now() + i * 1000,
          temperatureField: [],
          coolingRate: 20 + i,
          averageTemperature: 800 - i * 50,
          maxTemperature: 950 - i * 30,
          minTemperature: 650 - i * 20
        });
      }

      const snapshots = await db.getSnapshotsByBatch(batchId);
      expect(snapshots.length).toBe(5);
      
      const coolingRates = snapshots.map(s => s.coolingRate).sort((a, b) => a - b);
      coolingRates.forEach((rate, i) => {
        expect(rate).toBe(20 + i);
      });
    });
  });

  describe('质量数据管理', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch(createTestBatch());
    });

    it('应该创建质量数据', async () => {
      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: [],
        passed: true,
        coolingRateDeviation: 5.2
      };

      await db.createQualityData(quality);
      const fetched = await db.getQualityData(batchId);
      
      expect(fetched).toBeDefined();
      expect(fetched?.hardness).toBe(45);
      expect(fetched?.passed).toBe(true);
    });

    it('应该更新质量数据', async () => {
      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: [],
        passed: true,
        coolingRateDeviation: 5.2
      };

      await db.createQualityData(quality);
      
      quality.hardness = 48;
      quality.defects = ['裂纹'];
      quality.passed = false;
      await db.createQualityData(quality);
      
      const updated = await db.getQualityData(batchId);
      expect(updated?.hardness).toBe(48);
      expect(updated?.defects).toContain('裂纹');
      expect(updated?.passed).toBe(false);
    });
  });

  describe('事件管理', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch(createTestBatch());
    });

    it('应该创建事件记录', async () => {
      const eventId = await db.createEvent({
        batchId,
        source: 'manufacturing',
        eventType: 'cooling_rate_update',
        data: { coolingRate: 25.5 }
      });

      expect(eventId).toBeDefined();
      expect(eventId.startsWith('event_')).toBe(true);
    });

    it('应该按批次获取事件', async () => {
      await db.createEvent({
        batchId,
        source: 'manufacturing',
        eventType: 'cooling_rate_update',
        data: {}
      });
      await db.createEvent({
        batchId,
        source: 'quality',
        eventType: 'quality_feedback',
        data: {}
      });

      const events = await db.getEventsByBatch(batchId);
      expect(events.length).toBe(2);
      expect(events.map(e => e.source)).toContain('manufacturing');
      expect(events.map(e => e.source)).toContain('quality');
    });
  });

  describe('数据统计', () => {
    it('应该返回正确的离线数据汇总', async () => {
      await db.createBatch(createTestBatch({ status: 'ongoing' }));
      await db.createBatch(createTestBatch({ status: 'completed' }));
      await db.createBatch(createTestBatch({ status: 'completed' }));

      const summary = await db.getOfflineDataSummary();
      expect(summary.totalBatches).toBe(3);
      expect(summary.offlineBatches).toBe(2);
    });
  });

  describe('数据清除', () => {
    it('应该清除所有数据', async () => {
      const id = await db.createBatch(createTestBatch());
      await db.createSnapshot({
        batchId: id,
        timestamp: Date.now(),
        temperatureField: [],
        coolingRate: 20,
        averageTemperature: 800,
        maxTemperature: 900,
        minTemperature: 700
      });

      await db.clearAllData();
      
      const batches = await db.getAllBatches();
      expect(batches.length).toBe(0);
      
      const summary = await db.getOfflineDataSummary();
      expect(summary.totalBatches).toBe(0);
      expect(summary.totalSnapshots).toBe(0);
    });
  });
});
