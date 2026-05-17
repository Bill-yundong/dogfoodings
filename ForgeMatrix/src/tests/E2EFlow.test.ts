import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../database/indexedDB';
import { dataLinkService } from '../services/DataLinkService';
import { AsyncHeatConductionModel } from '../models/HeatConductionModel';
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

describe('端到端业务流程测试', () => {
  let heatModel: AsyncHeatConductionModel;

  beforeEach(async () => {
    await db.init();
    heatModel = new AsyncHeatConductionModel(DEFAULT_PARAMS);
    dataLinkService.initModel(DEFAULT_PARAMS);
  });

  afterEach(async () => {
    await db.clearAllData();
  });

  describe('完整锻造工艺流程', () => {
    it('应该完成从批次创建到数据闭环的完整流程', async () => {
      const batchId = await db.createBatch({
        partNumber: 'E2E-TEST-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });

      expect(batchId).toBeDefined();
      const batch = await db.getBatch(batchId);
      expect(batch).toBeDefined();
      expect(batch?.status).toBe('ongoing');

      heatModel.setInitialTemperature(1150);
      let previousTemp = 1150;
      const snapshotCount = 5;

      for (let i = 0; i < snapshotCount; i++) {
        await heatModel.simulateStepAsync();
        const allTemps = heatModel.getAllTemperatures().map(p => p.temperature);
        const currentBatch = await db.getBatch(batchId);
        
        if (currentBatch) {
          const snapshot = await dataLinkService.processCoolingSnapshot(
            currentBatch, 
            allTemps, 
            previousTemp
          );
          expect(snapshot).toBeDefined();
          expect(snapshot.coolingRate).toBeGreaterThan(0);
          previousTemp = snapshot.averageTemperature;
        }
      }

      const snapshots = await db.getSnapshotsByBatch(batchId);
      expect(snapshots.length).toBe(snapshotCount);

      const updatedBatch = await db.getBatch(batchId);
      expect(updatedBatch?.snapshots.length).toBe(snapshotCount);

      await dataLinkService.predictStressForBatch(batchId);
      const batchWithStress = await db.getBatch(batchId);
      expect(batchWithStress?.predictedStress).toBeDefined();
      expect(batchWithStress?.predictedStress?.length).toBe(DEFAULT_PARAMS.gridSize ** 3);

      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 45,
        microstructure: 'martensite',
        defects: [],
        passed: true,
        coolingRateDeviation: 5.2
      };
      await dataLinkService.sendQualityFeedback(batchId, quality);

      const savedQuality = await db.getQualityData(batchId);
      expect(savedQuality).toBeDefined();
      expect(savedQuality?.passed).toBe(true);

      const closed = await dataLinkService.closeOfflineLoop(batchId);
      expect(closed).toBe(true);

      const finalBatch = await db.getBatch(batchId);
      expect(finalBatch?.status).toBe('completed');
      expect(finalBatch?.qualityScore).toBeDefined();
      expect(finalBatch?.endTime).toBeDefined();
      expect(finalBatch?.qualityScore).toBeGreaterThanOrEqual(0);
      expect(finalBatch?.qualityScore).toBeLessThanOrEqual(100);

      const events = await db.getEventsByBatch(batchId);
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.eventType === 'cooling_rate_update')).toBe(true);
      expect(events.some(e => e.eventType === 'quality_feedback')).toBe(true);

      const summary = await db.getOfflineDataSummary();
      expect(summary.totalBatches).toBe(1);
      expect(summary.totalSnapshots).toBe(snapshotCount);
      expect(summary.offlineBatches).toBe(1);
    });

    it('应该处理多批次并发的场景', async () => {
      const batchIds: string[] = [];
      const batchCount = 3;

      for (let i = 0; i < batchCount; i++) {
        const id = await db.createBatch({
          partNumber: `E2E-BATCH-${i + 1}`,
          startTime: Date.now(),
          material: '42CrMo',
          initialTemperature: 1150,
          targetCoolingRate: 25,
          status: 'ongoing',
          snapshots: []
        });
        batchIds.push(id);
      }

      const allBatches = await db.getAllBatches();
      expect(allBatches.length).toBe(batchCount);

      for (const id of batchIds) {
        const batch = await db.getBatch(id);
        if (batch) {
          const temps = Array.from({ length: 216 }, () => 800 + Math.random() * 100);
          await dataLinkService.processCoolingSnapshot(batch, temps, 900);
        }
      }

      const summary = await db.getOfflineDataSummary();
      expect(summary.totalBatches).toBe(batchCount);
      expect(summary.totalSnapshots).toBe(batchCount);
    });

    it('应该正确处理有缺陷的批次', async () => {
      const batchId = await db.createBatch({
        partNumber: 'E2E-DEFECT-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });

      const batch = await db.getBatch(batchId);
      if (batch) {
        const temps = Array.from({ length: 216 }, () => 800);
        await dataLinkService.processCoolingSnapshot(batch, temps, 900);
      }

      const quality: QualityData = {
        batchId,
        inspectionTime: Date.now(),
        hardness: 35,
        microstructure: 'bainite',
        defects: ['裂纹', '气孔'],
        passed: false,
        coolingRateDeviation: 25.5
      };
      await dataLinkService.sendQualityFeedback(batchId, quality);

      const adjustedBatch = await db.getBatch(batchId);
      expect(adjustedBatch?.targetCoolingRate).not.toBe(25);

      await dataLinkService.closeOfflineLoop(batchId);

      const finalBatch = await db.getBatch(batchId);
      expect(finalBatch?.qualityScore).toBeDefined();
      expect(finalBatch?.qualityScore).toBeLessThan(70);
    });
  });

  describe('数据一致性验证', () => {
    it('应该保持批次与快照的数据一致性', async () => {
      const batchId = await db.createBatch({
        partNumber: 'CONSISTENCY-001',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });

      const batch = await db.getBatch(batchId);
      if (batch) {
        for (let i = 0; i < 3; i++) {
          const temps = Array.from({ length: 216 }, () => 800 - i * 50);
          await dataLinkService.processCoolingSnapshot(batch, temps, 900);
        }
      }

      const updatedBatch = await db.getBatch(batchId);
      const snapshots = await db.getSnapshotsByBatch(batchId);

      expect(updatedBatch?.snapshots.length).toBe(snapshots.length);
      
      snapshots.forEach(snap => {
        expect(snap.batchId).toBe(batchId);
        expect(updatedBatch?.snapshots).toContain(snap.id);
      });
    });

    it('应该正确关联质检数据与批次', async () => {
      const batchId = await db.createBatch({
        partNumber: 'CONSISTENCY-002',
        startTime: Date.now(),
        material: '42CrMo',
        initialTemperature: 1150,
        targetCoolingRate: 25,
        status: 'ongoing',
        snapshots: []
      });

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

      const savedQuality = await db.getQualityData(batchId);
      expect(savedQuality?.batchId).toBe(batchId);

      const result = await dataLinkService.getBatchWithQuality(batchId);
      expect(result.batch?.id).toBe(batchId);
      expect(result.quality?.batchId).toBe(batchId);
    });
  });
});
