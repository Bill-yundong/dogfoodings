import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataLinkService } from '../services/DataLinkService';
import { db } from '../database/indexedDB';
import { ProcessParams, QualityData } from '../types';

const DEFAULT_PARAMS: ProcessParams = {
  materialConductivity: 50,
  density: 7850,
  specificHeat: 450,
  ambientTemperature: 25,
  convectionCoefficient: 100,
  timeStep: 1,
  gridSize: 6
};

describe('DataLinkService', () => {
  let service: DataLinkService;

  beforeEach(async () => {
    await db.init();
    service = new DataLinkService(DEFAULT_PARAMS);
  });

  afterEach(async () => {
    await db.clearAllData();
  });

  describe('模型初始化', () => {
    it('应该在构造时初始化热模型', () => {
      expect(service).toBeDefined();
    });

    it('应该支持动态初始化模型', () => {
      const newService = new DataLinkService();
      newService.initModel(DEFAULT_PARAMS);
      expect(newService).toBeDefined();
    });
  });

  describe('订阅发布机制', () => {
    it('应该支持制造系统订阅', () => {
      const callback = vi.fn();
      service.subscribeToManufacturing('batch-001', callback);
      expect(callback).toBeDefined();
    });

    it('应该支持质检系统订阅', () => {
      const callback = vi.fn();
      service.subscribeToQuality('batch-001', callback);
      expect(callback).toBeDefined();
    });

    it('应该支持取消订阅', () => {
      service.subscribeToManufacturing('batch-001', vi.fn());
      service.unsubscribe('batch-001');
    });
  });

  describe('冷却速率数据联动', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch({
        partNumber: 'TEST-LINK-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });
    });

    it('应该发送冷却速率更新事件', async () => {
      const callback = vi.fn();
      service.subscribeToManufacturing(batchId, callback);

      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800 + Math.random() * 100);
        await service.processCoolingSnapshot(batch, temperatures, 900);

        const snapshots = await db.getSnapshotsByBatch(batchId);
        expect(snapshots.length).toBe(1);
        expect(snapshots[0].coolingRate).toBeDefined();
      }
    });

    it('应该正确计算冷却速率', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const prevTemp = 1000;
        const currentTemp = 800;
        const temperatures = Array.from({ length: 216 }, () => currentTemp);
        
        const snapshot = await service.processCoolingSnapshot(batch, temperatures, prevTemp);
        const expectedRate = (prevTemp - currentTemp) / DEFAULT_PARAMS.timeStep;
        
        expect(Math.abs(snapshot.coolingRate - expectedRate)).toBeLessThan(1);
      }
    });

    it('应该将快照关联到批次', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800);
        await service.processCoolingSnapshot(batch, temperatures, 900);

        const updatedBatch = await db.getBatch(batchId);
        expect(updatedBatch?.snapshots.length).toBe(1);
      }
    });
  });

  describe('质检反馈联动', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch({
        partNumber: 'TEST-QUALITY-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });
    });

    it('应该处理质检反馈数据', async () => {
      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: [],
        passed: true,
        coolingRateDeviation: 5.2
      };

      await service.sendQualityFeedback(batchId, quality);

      const savedQuality = await db.getQualityData(batchId);
      expect(savedQuality).toBeDefined();
      expect(savedQuality?.hardness).toBe(45);
      expect(savedQuality?.passed).toBe(true);
    });

    it('应该根据质检反馈调整工艺参数', async () => {
      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 40,
        microstructure: 'bainite',
        defects: ['裂纹'],
        passed: false,
        coolingRateDeviation: 20
      };

      const batchBefore = await db.getBatch(batchId);
      const originalRate = batchBefore?.targetCoolingRate || 25;

      await service.sendQualityFeedback(batchId, quality);

      const batchAfter = await db.getBatch(batchId);
      expect(batchAfter?.targetCoolingRate).not.toBe(originalRate);
    });

    it('应该创建质检反馈事件', async () => {
      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: [],
        passed: true,
        coolingRateDeviation: 5.2
      };

      await service.sendQualityFeedback(batchId, quality);

      const events = await db.getEventsByBatch(batchId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe('quality_feedback');
    });
  });

  describe('应力预测', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch({
        partNumber: 'TEST-STRESS-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });
    });

    it('应该预测批次应力分布', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800);
        await service.processCoolingSnapshot(batch, temperatures, 900);
      }

      const stressValues = await service.predictStressForBatch(batchId);
      
      expect(stressValues.length).toBe(DEFAULT_PARAMS.gridSize ** 3);
      stressValues.forEach(stress => {
        expect(stress).toBeGreaterThanOrEqual(0);
      });

      const updatedBatch = await db.getBatch(batchId);
      expect(updatedBatch?.predictedStress).toBeDefined();
      expect(updatedBatch?.predictedStress?.length).toBe(DEFAULT_PARAMS.gridSize ** 3);
    });
  });

  describe('数据查询', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch({
        partNumber: 'TEST-QUERY-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });
    });

    it('应该获取批次及其关联数据', async () => {
      const result = await service.getBatchWithQuality(batchId);
      
      expect(result.batch).toBeDefined();
      expect(result.batch?.id).toBe(batchId);
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe('离线数据闭环', () => {
    let batchId: string;

    beforeEach(async () => {
      batchId = await db.createBatch({
        partNumber: 'TEST-CLOSE-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });
    });

    it('应该在满足条件时关闭数据闭环', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800);
        await service.processCoolingSnapshot(batch, temperatures, 900);
      }

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

      const closed = await service.closeOfflineLoop(batchId);
      expect(closed).toBe(true);

      const updatedBatch = await db.getBatch(batchId);
      expect(updatedBatch?.status).toBe('completed');
      expect(updatedBatch?.qualityScore).toBeDefined();
      expect(updatedBatch?.endTime).toBeDefined();
    });

    it('缺少快照时不应关闭闭环', async () => {
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

      const closed = await service.closeOfflineLoop(batchId);
      expect(closed).toBe(false);
    });

    it('缺少质检数据时不应关闭闭环', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800);
        await service.processCoolingSnapshot(batch, temperatures, 900);
      }

      const closed = await service.closeOfflineLoop(batchId);
      expect(closed).toBe(false);
    });

    it('应该正确计算质量评分', async () => {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const temperatures = Array.from({ length: 216 }, () => 800);
        await service.processCoolingSnapshot(batch, temperatures, 900);
      }

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

      await service.closeOfflineLoop(batchId);

      const updatedBatch = await db.getBatch(batchId);
      expect(updatedBatch?.qualityScore).toBeGreaterThanOrEqual(0);
      expect(updatedBatch?.qualityScore).toBeLessThanOrEqual(100);
    });
  });
});
