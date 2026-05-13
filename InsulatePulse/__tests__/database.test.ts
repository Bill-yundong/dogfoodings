import { db, InsulatePulseDatabase, initializeMockData } from '@/lib/database';
import { Insulator, HealthRecord, MaintenanceTask } from '@/types';

describe('Database - IndexedDB 设备健康档案存储', () => {
  let database: InsulatePulseDatabase;

  beforeEach(async () => {
    database = new InsulatePulseDatabase();
    await database.delete();
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
    database.close();
  });

  describe('绝缘子设备管理', () => {
    it('应正确添加新的绝缘子设备', async () => {
      const insulator: Insulator = {
        id: 'ins-001',
        name: '1号塔 A相绝缘子',
        location: '1号塔 A相',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      };

      const id = await database.addInsulator(insulator);
      const saved = await database.getInsulator(id);

      expect(saved).toBeDefined();
      expect(saved?.id).toBe('ins-001');
      expect(saved?.name).toBe('1号塔 A相绝缘子');
    });

    it('应正确查询所有绝缘子设备', async () => {
      const insulators: Insulator[] = [
        { id: 'ins-001', name: '1号', location: 'A', voltageLevel: 500, type: '瓷', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'normal' },
        { id: 'ins-002', name: '2号', location: 'B', voltageLevel: 500, type: '玻璃', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'warning' },
        { id: 'ins-003', name: '3号', location: 'C', voltageLevel: 500, type: '复合', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'critical' }
      ];

      await database.bulkAddInsulators(insulators);
      const all = await database.getAllInsulators();

      expect(all.length).toBe(3);
    });

    it('应正确更新设备状态', async () => {
      const insulator: Insulator = {
        id: 'ins-001',
        name: '测试设备',
        location: '测试位置',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      };

      await database.addInsulator(insulator);
      await database.updateInsulatorStatus('ins-001', 'critical');

      const updated = await database.getInsulator('ins-001');
      expect(updated?.status).toBe('critical');
    });
  });

  describe('健康档案管理', () => {
    it('应正确添加健康记录', async () => {
      const record: HealthRecord = {
        id: 'hr-001',
        insulatorId: 'ins-001',
        timestamp: Date.now(),
        features: {
          timeDomain: { peakValue: 1.0, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 },
          frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 }
        },
        prediction: { probability: 0.3, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: ['总谐波畸变率'] },
        environmentalData: { temperature: 25, humidity: 60, pollutionLevel: 3, windSpeed: 5, precipitation: 0 }
      };

      const id = await database.addHealthRecord(record);
      expect(id).toBe('hr-001');
    });

    it('应按设备ID查询健康记录', async () => {
      const records: HealthRecord[] = [
        { id: 'hr-001', insulatorId: 'ins-001', timestamp: Date.now(), features: { timeDomain: { peakValue: 1, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 } }, prediction: { probability: 0.3, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] }, environmentalData: { temperature: 25, humidity: 60, pollutionLevel: 3, windSpeed: 5, precipitation: 0 } },
        { id: 'hr-002', insulatorId: 'ins-001', timestamp: Date.now() - 3600000, features: { timeDomain: { peakValue: 0.9, rmsValue: 0.65, meanValue: 0, variance: 0.08, skewness: 0, kurtosis: 0, pulseCount: 1 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.08], totalHarmonicDistortion: 0.12, peakValue: 0.75, rmsValue: 0.48, crestFactor: 1.56, spectralEntropy: 1.8 } }, prediction: { probability: 0.25, riskLevel: 'low', confidence: 0.85, predictedTime: Infinity, contributingFactors: [] }, environmentalData: { temperature: 24, humidity: 58, pollutionLevel: 2.8, windSpeed: 4, precipitation: 0 } }
      ];

      await database.bulkAddHealthRecords(records);
      const results = await database.getHealthRecordsByInsulator('ins-001');

      expect(results.length).toBe(2);
    });

    it('应按时间范围查询健康记录', async () => {
      const now = Date.now();
      const records: HealthRecord[] = [
        { id: 'hr-001', insulatorId: 'ins-001', timestamp: now - 7200000, features: { timeDomain: { peakValue: 1, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 } }, prediction: { probability: 0.3, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] }, environmentalData: { temperature: 25, humidity: 60, pollutionLevel: 3, windSpeed: 5, precipitation: 0 } },
        { id: 'hr-002', insulatorId: 'ins-001', timestamp: now + 3600000, features: { timeDomain: { peakValue: 0.9, rmsValue: 0.65, meanValue: 0, variance: 0.08, skewness: 0, kurtosis: 0, pulseCount: 1 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.08], totalHarmonicDistortion: 0.12, peakValue: 0.75, rmsValue: 0.48, crestFactor: 1.56, spectralEntropy: 1.8 } }, prediction: { probability: 0.25, riskLevel: 'low', confidence: 0.85, predictedTime: Infinity, contributingFactors: [] }, environmentalData: { temperature: 24, humidity: 58, pollutionLevel: 2.8, windSpeed: 4, precipitation: 0 } }
      ];

      await database.bulkAddHealthRecords(records);
      const results = await database.getHealthRecordsByTimeRange(now - 3600000, now + 7200000);

      expect(results.length).toBe(1);
    });
  });

  describe('维护任务管理', () => {
    it('应正确添加维护任务', async () => {
      const task: MaintenanceTask = {
        id: 'task-001',
        insulatorId: 'ins-001',
        type: 'cleaning',
        priority: 'high',
        scheduledTime: Date.now() + 24 * 60 * 60 * 1000,
        status: 'pending',
        description: '绝缘子清洗任务'
      };

      const id = await database.addMaintenanceTask(task);
      expect(id).toBe('task-001');
    });

    it('应正确查询待处理任务', async () => {
      const tasks: MaintenanceTask[] = [
        { id: 'task-001', insulatorId: 'ins-001', type: 'cleaning', priority: 'high', scheduledTime: Date.now() + 3600000, status: 'pending', description: '清洗' },
        { id: 'task-002', insulatorId: 'ins-002', type: 'inspection', priority: 'medium', scheduledTime: Date.now() + 7200000, status: 'in_progress', description: '巡检' },
        { id: 'task-003', insulatorId: 'ins-003', type: 'replacement', priority: 'low', scheduledTime: Date.now() + 86400000, status: 'completed', description: '更换' }
      ];

      for (const task of tasks) {
        await database.addMaintenanceTask(task);
      }

      const pending = await database.getPendingMaintenanceTasks();
      expect(pending.length).toBe(2);
    });
  });

  describe('风险统计', () => {
    it('应正确统计各风险等级设备数量', async () => {
      const insulators: Insulator[] = [
        { id: 'ins-001', name: '正常设备', location: 'A', voltageLevel: 500, type: '瓷', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'normal' },
        { id: 'ins-002', name: '预警设备', location: 'B', voltageLevel: 500, type: '玻璃', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'warning' },
        { id: 'ins-003', name: '严重设备', location: 'C', voltageLevel: 500, type: '复合', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'critical' },
        { id: 'ins-004', name: '检修设备', location: 'D', voltageLevel: 500, type: '瓷', installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'maintenance' }
      ];

      await database.bulkAddInsulators(insulators);
      const summary = await database.getRiskSummary();

      expect(summary.total).toBe(4);
      expect(summary.critical).toBe(1);
      expect(summary.high).toBe(1);
      expect(summary.medium).toBe(1);
      expect(summary.low).toBe(1);
    });
  });

  describe('数据清理', () => {
    it('应正确清理旧数据', async () => {
      const oldRecords: HealthRecord[] = [
        { id: 'hr-old', insulatorId: 'ins-001', timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, features: { timeDomain: { peakValue: 1, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 } }, prediction: { probability: 0.3, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] }, environmentalData: { temperature: 25, humidity: 60, pollutionLevel: 3, windSpeed: 5, precipitation: 0 } },
        { id: 'hr-new', insulatorId: 'ins-001', timestamp: Date.now(), features: { timeDomain: { peakValue: 0.9, rmsValue: 0.65, meanValue: 0, variance: 0.08, skewness: 0, kurtosis: 0, pulseCount: 1 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.08], totalHarmonicDistortion: 0.12, peakValue: 0.75, rmsValue: 0.48, crestFactor: 1.56, spectralEntropy: 1.8 } }, prediction: { probability: 0.25, riskLevel: 'low', confidence: 0.85, predictedTime: Infinity, contributingFactors: [] }, environmentalData: { temperature: 24, humidity: 58, pollutionLevel: 2.8, windSpeed: 4, precipitation: 0 } }
      ];

      await database.bulkAddHealthRecords(oldRecords);
      await database.clearOldData(30);

      const remaining = await database.getHealthRecordsByInsulator('ins-001');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('hr-new');
    });
  });

  describe('数据库统计信息', () => {
    it('应正确返回统计信息', async () => {
      const insulator: Insulator = {
        id: 'ins-001', name: '测试', location: 'A', voltageLevel: 500, type: '瓷',
        installationDate: Date.now(), lastMaintenanceDate: Date.now(), status: 'normal'
      };
      await database.addInsulator(insulator);

      const record: HealthRecord = {
        id: 'hr-001', insulatorId: 'ins-001', timestamp: Date.now(),
        features: { timeDomain: { peakValue: 1, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 }, frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 } },
        prediction: { probability: 0.3, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] },
        environmentalData: { temperature: 25, humidity: 60, pollutionLevel: 3, windSpeed: 5, precipitation: 0 }
      };
      await database.addHealthRecord(record);

      const stats = await database.getStatistics();

      expect(stats.totalInsulators).toBe(1);
      expect(stats.totalRecords).toBe(1);
    });
  });
});
