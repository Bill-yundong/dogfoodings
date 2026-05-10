import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { semanticSynchronizer } from '../src/sync/semanticSync';
import { closeDB } from '../src/db';
import {
  createMockHydrant,
  createConflictingReadings,
  createNonConflictingReadings,
} from './testDataFactory';
import { DataSource, SyncMessage } from '../src/types';

describe('语义同步机制 - 核心业务场景', () => {
  beforeEach(() => {
    closeDB();
    semanticSynchronizer.destroy();
  });

  afterEach(() => {
    closeDB();
    semanticSynchronizer.destroy();
  });

  describe('消息队列管理', () => {
    it('SC-101: 应能正确地将消息加入对应队列', async () => {
      const hydrant = createMockHydrant();
      const fireDeptReading = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.4
      );
      const waterCompanyReading = semanticSynchronizer.createWaterCompanyReading(
        hydrant.id,
        0.38
      );

      const fireDeptMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        fireDeptReading,
        DataSource.FIRE_DEPARTMENT
      );
      const waterCompanyMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        waterCompanyReading,
        DataSource.WATER_COMPANY
      );

      semanticSynchronizer.queueMessage(fireDeptMsg);
      semanticSynchronizer.queueMessage(waterCompanyMsg);

      const queueSize = semanticSynchronizer.getQueueSize();
      expect(queueSize.fireDept).toBe(1);
      expect(queueSize.waterCompany).toBe(1);
    });

    it('SC-102: 应能正确统计总消息数', () => {
      const hydrant1 = createMockHydrant();
      const hydrant2 = createMockHydrant();

      for (let i = 0; i < 5; i++) {
        const fireDeptReading = semanticSynchronizer.createFireDeptReading(
          hydrant1.id,
          0.4
        );
        const msg = semanticSynchronizer.createSyncMessage(
          'data_sync',
          fireDeptReading,
          DataSource.FIRE_DEPARTMENT
        );
        semanticSynchronizer.queueMessage(msg);

        const waterCompanyReading = semanticSynchronizer.createWaterCompanyReading(
          hydrant2.id,
          0.38
        );
        const msg2 = semanticSynchronizer.createSyncMessage(
          'data_sync',
          waterCompanyReading,
          DataSource.WATER_COMPANY
        );
        semanticSynchronizer.queueMessage(msg2);
      }

      const stats = semanticSynchronizer.getStats();
      expect(stats.totalMessages).toBe(10);
    });

    it('SC-103: 应能正确处理空队列', async () => {
      const initialStats = semanticSynchronizer.getStats();
      expect(initialStats.synced).toBe(0);

      await semanticSynchronizer.processQueue();

      const afterStats = semanticSynchronizer.getStats();
      expect(afterStats.synced).toBe(0);
    });
  });

  describe('双源数据同步', () => {
    it('SC-104: 应能同步非冲突的双源数据', async () => {
      const hydrant = createMockHydrant();
      const { fireDept, waterCompany } = createNonConflictingReadings(hydrant.id);

      const fireDeptMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        fireDept,
        DataSource.FIRE_DEPARTMENT
      );
      const waterCompanyMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        waterCompany,
        DataSource.WATER_COMPANY
      );

      semanticSynchronizer.queueMessage(fireDeptMsg);
      semanticSynchronizer.queueMessage(waterCompanyMsg);

      const conflictsBefore = semanticSynchronizer.getStats().conflicts;
      await semanticSynchronizer.processQueue();

      const stats = semanticSynchronizer.getStats();
      expect(stats.synced).toBeGreaterThan(0);
      expect(stats.conflicts).toBe(conflictsBefore);
    });

    it('SC-105: 应能检测并创建冲突记录', async () => {
      const hydrant = createMockHydrant();
      const { fireDept, waterCompany } = createConflictingReadings(hydrant.id);

      const fireDeptMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        fireDept,
        DataSource.FIRE_DEPARTMENT
      );
      const waterCompanyMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        waterCompany,
        DataSource.WATER_COMPANY
      );

      semanticSynchronizer.queueMessage(fireDeptMsg);
      semanticSynchronizer.queueMessage(waterCompanyMsg);

      const conflictsBefore = semanticSynchronizer.getStats().conflicts;
      await semanticSynchronizer.processQueue();

      const stats = semanticSynchronizer.getStats();
      expect(stats.conflicts).toBe(conflictsBefore + 1);
    });

    it('SC-106: 应能基于置信度自动解决冲突', async () => {
      const hydrant = createMockHydrant();

      const fireDeptReading = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.45,
        0.95
      );
      const waterCompanyReading = semanticSynchronizer.createWaterCompanyReading(
        hydrant.id,
        0.25,
        0.7
      );

      const fireDeptMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        fireDeptReading,
        DataSource.FIRE_DEPARTMENT
      );
      const waterCompanyMsg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        waterCompanyReading,
        DataSource.WATER_COMPANY
      );

      semanticSynchronizer.queueMessage(fireDeptMsg);
      semanticSynchronizer.queueMessage(waterCompanyMsg);

      await semanticSynchronizer.processQueue();

      const stats = semanticSynchronizer.getStats();
      expect(stats.synced).toBeGreaterThan(0);
      expect(stats.conflicts).toBe(1);
    });

    it('SC-107: 应能正确创建同步消息', () => {
      const hydrant = createMockHydrant();
      const reading = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.4
      );

      const message = semanticSynchronizer.createSyncMessage(
        'data_sync',
        reading,
        DataSource.FIRE_DEPARTMENT
      );

      expect(message.type).toBe('data_sync');
      expect(message.source).toBe(DataSource.FIRE_DEPARTMENT);
      expect(message.correlationId).toBeDefined();
      expect(message.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('SC-108: 应能创建语义元数据', () => {
      const metadata = semanticSynchronizer.createSemanticMetadata(
        { responsePriority: 'high' },
        { supplyZone: 'A区' }
      );

      expect(metadata.fireDeptSemantic.responsePriority).toBe('high');
      expect(metadata.waterCompanySemantic.supplyZone).toBe('A区');
      expect(metadata.syncStatus).toBe('synced');
    });
  });

  describe('事件系统', () => {
    it('SC-109: 应能触发消息入队事件', () => {
      const hydrant = createMockHydrant();
      let eventTriggered = false;

      const unregister = semanticSynchronizer.on('message-queued', () => {
        eventTriggered = true;
      });

      const reading = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.4
      );
      const msg = semanticSynchronizer.createSyncMessage(
        'data_sync',
        reading,
        DataSource.FIRE_DEPARTMENT
      );
      semanticSynchronizer.queueMessage(msg);

      expect(eventTriggered).toBe(true);
      unregister();
    });

    it('SC-110: 应能正确注销事件监听器', () => {
      const hydrant = createMockHydrant();
      let eventCount = 0;

      const unregister = semanticSynchronizer.on('message-queued', () => {
        eventCount++;
      });

      const reading1 = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.4
      );
      const msg1 = semanticSynchronizer.createSyncMessage(
        'data_sync',
        reading1,
        DataSource.FIRE_DEPARTMENT
      );
      semanticSynchronizer.queueMessage(msg1);

      unregister();

      const reading2 = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.38
      );
      const msg2 = semanticSynchronizer.createSyncMessage(
        'data_sync',
        reading2,
        DataSource.FIRE_DEPARTMENT
      );
      semanticSynchronizer.queueMessage(msg2);

      expect(eventCount).toBe(1);
    });
  });

  describe('同步统计', () => {
    it('SC-111: 应能正确统计同步次数', async () => {
      const hydrant = createMockHydrant();

      for (let i = 0; i < 3; i++) {
        const fireDept = semanticSynchronizer.createFireDeptReading(
          hydrant.id,
          0.4 + i * 0.01
        );
        const waterCompany = semanticSynchronizer.createWaterCompanyReading(
          hydrant.id,
          0.4 + i * 0.01
        );

        semanticSynchronizer.queueMessage(
          semanticSynchronizer.createSyncMessage(
            'data_sync',
            fireDept,
            DataSource.FIRE_DEPARTMENT
          )
        );
        semanticSynchronizer.queueMessage(
          semanticSynchronizer.createSyncMessage(
            'data_sync',
            waterCompany,
            DataSource.WATER_COMPANY
          )
        );

        await semanticSynchronizer.processQueue();
      }

      const stats = semanticSynchronizer.getStats();
      expect(stats.synced).toBe(3);
    });

    it('SC-112: 应能记录上次同步时间', async () => {
      const hydrant = createMockHydrant();

      const beforeTime = Date.now();

      const reading = semanticSynchronizer.createFireDeptReading(
        hydrant.id,
        0.4
      );
      semanticSynchronizer.queueMessage(
        semanticSynchronizer.createSyncMessage(
          'data_sync',
          reading,
          DataSource.FIRE_DEPARTMENT
        )
      );
      await semanticSynchronizer.processQueue();

      const stats = semanticSynchronizer.getStats();
      expect(stats.lastSyncTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });
});
