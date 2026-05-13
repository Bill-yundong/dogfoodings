import { FrequencyAnalyzer, createLeakageCurrentData } from '@/lib/frequencyAnalysis';
import { FlashoverPredictor, createMockEnvironmentalData } from '@/lib/flashoverPrediction';
import { InsulatePulseDatabase } from '@/lib/database';
import { SemanticSynchronizer } from '@/lib/semanticSync';
import { Insulator, HealthRecord } from '@/types';

describe('Integration Tests - 特高压绝缘子污闪预警系统集成测试', () => {
  let analyzer: FrequencyAnalyzer;
  let predictor: FlashoverPredictor;
  let db: InsulatePulseDatabase;
  let synchronizer: SemanticSynchronizer;

  beforeEach(async () => {
    analyzer = new FrequencyAnalyzer(1000);
    predictor = new FlashoverPredictor();
    db = new InsulatePulseDatabase();
    synchronizer = new SemanticSynchronizer();
    
    await db.delete();
    await db.open();
    await synchronizer['db'].delete();
    await synchronizer['db'].open();
  });

  afterEach(async () => {
    await db.delete();
    db.close();
    await synchronizer['db'].delete();
    synchronizer['db'].close();
  });

  describe('核心业务流程 - 数据采集到预测同步', () => {
    it('应完成完整的数据分析与预警流程', async () => {
      const testInsulator: Insulator = {
        id: 'ins-test-001',
        name: '测试塔 A相绝缘子',
        location: '测试塔 A相',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      };
      await db.addInsulator(testInsulator);

      const leakageData = createLeakageCurrentData('ins-test-001', 1, 1000);
      expect(leakageData).toBeDefined();
      expect(leakageData.insulatorId).toBe('ins-test-001');

      const features = await analyzer.analyzeAsync(leakageData);
      expect(features.timeDomain).toBeDefined();
      expect(features.frequencyDomain).toBeDefined();
      expect(isFinite(features.timeDomain.rmsValue)).toBe(true);
      expect(isFinite(features.frequencyDomain.totalHarmonicDistortion)).toBe(true);

      const envData = createMockEnvironmentalData();
      const prediction = await predictor.predictAsync(features, envData);
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);

      const healthRecord: HealthRecord = {
        id: `hr-${Date.now()}`,
        insulatorId: 'ins-test-001',
        timestamp: Date.now(),
        features,
        prediction,
        environmentalData: envData,
        maintenanceRecommendation: predictor.generateMaintenanceRecommendation(prediction)
      };

      await db.addHealthRecord(healthRecord);

      const savedRecords = await db.getHealthRecordsByInsulator('ins-test-001');
      expect(savedRecords.length).toBe(1);
      expect(savedRecords[0].prediction.riskLevel).toBe(prediction.riskLevel);

      await synchronizer.sendPrediction('maintenance', 'dispatch', healthRecord);

      const pendingMessages = await synchronizer['db'].getPendingSyncMessages();
      expect(pendingMessages.length).toBe(1);
      expect(pendingMessages[0].type).toBe('prediction');

      await synchronizer.processPendingMessages();

      const afterProcessing = await synchronizer['db'].getPendingSyncMessages();
      expect(afterProcessing.length).toBe(0);

      const updatedInsulator = await synchronizer['db'].getInsulator('ins-test-001');
      expect(updatedInsulator).toBeDefined();
      
      if (prediction.riskLevel === 'critical') {
        expect(updatedInsulator?.status).toBe('critical');
      } else if (prediction.riskLevel === 'high') {
        expect(updatedInsulator?.status).toBe('warning');
      }

      if (prediction.riskLevel === 'critical' || prediction.riskLevel === 'high') {
        const tasks = await synchronizer['db'].getPendingMaintenanceTasks();
        expect(tasks.length).toBeGreaterThan(0);
        expect(tasks[0].insulatorId).toBe('ins-test-001');
      }
    });

    it('应正确处理批量设备数据分析', async () => {
      const insulators: Insulator[] = [];
      for (let i = 1; i <= 10; i++) {
        insulators.push({
          id: `ins-batch-${i}`,
          name: `${i}号塔 ${['A', 'B', 'C'][i % 3]}相`,
          location: `${i}号塔`,
          voltageLevel: 500,
          type: ['瓷绝缘子', '玻璃绝缘子', '复合绝缘子'][i % 3],
          installationDate: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          lastMaintenanceDate: Date.now(),
          status: 'normal'
        });
      }
      await db.bulkAddInsulators(insulators);

      const batchData = insulators.map(ins => createLeakageCurrentData(ins.id, 1, 1000));
      expect(batchData.length).toBe(10);

      const featurePromises = batchData.map(data => analyzer.analyzeAsync(data));
      const allFeatures = await Promise.all(featurePromises);
      expect(allFeatures.length).toBe(10);

      const predictionPromises = allFeatures.map(features => 
        predictor.predictAsync(features, createMockEnvironmentalData())
      );
      const allPredictions = await Promise.all(predictionPromises);
      expect(allPredictions.length).toBe(10);

      const healthRecords: HealthRecord[] = insulators.map((ins, i) => ({
        id: `hr-batch-${i}`,
        insulatorId: ins.id,
        timestamp: Date.now(),
        features: allFeatures[i],
        prediction: allPredictions[i],
        environmentalData: createMockEnvironmentalData(),
        maintenanceRecommendation: predictor.generateMaintenanceRecommendation(allPredictions[i])
      }));

      await db.bulkAddHealthRecords(healthRecords);

      const summary = await db.getRiskSummary();
      expect(summary.total).toBe(10);

      for (const record of healthRecords) {
        await synchronizer.sendPrediction('maintenance', 'dispatch', record);
      }

      const pending = await synchronizer['db'].getPendingSyncMessages();
      expect(pending.length).toBe(10);

      await synchronizer.processPendingMessages();

      const afterProcessing = await synchronizer['db'].getPendingSyncMessages();
      expect(afterProcessing.length).toBe(0);
    });
  });

  describe('状态检修与调度协同流程', () => {
    it('应正确触发状态更新通知流程', async () => {
      const insulator: Insulator = {
        id: 'ins-sync-001',
        name: '同步测试设备',
        location: '测试塔',
        voltageLevel: 500,
        type: '复合绝缘子',
        installationDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      };
      await db.addInsulator(insulator);
      await synchronizer['db'].addInsulator(insulator);

      await synchronizer.sendStatusUpdate('maintenance', 'dispatch', 'ins-sync-001', 'warning');

      let pending = await synchronizer['db'].getPendingSyncMessages();
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('status_update');

      await synchronizer.processPendingMessages();

      const updated = await synchronizer['db'].getInsulator('ins-sync-001');
      expect(updated?.status).toBe('warning');

      pending = await synchronizer['db'].getPendingSyncMessages();
      expect(pending.length).toBe(0);
    });

    it('应正确处理维护请求审批流程', async () => {
      const task = {
        id: 'task-sync-001',
        insulatorId: 'ins-sync-001',
        type: 'cleaning' as const,
        priority: 'high' as const,
        scheduledTime: Date.now() + 24 * 60 * 60 * 1000,
        status: 'pending' as const,
        description: '基于预测的绝缘子清洗任务'
      };

      await synchronizer.sendMaintenanceRequest('maintenance', 'dispatch', task);

      await synchronizer.processPendingMessages();

      const tasks = await synchronizer['db'].getPendingMaintenanceTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('task-sync-001');
      expect(tasks[0].priority).toBe('high');
    });
  });

  describe('边界条件与异常处理', () => {
    it('应正确处理无效输入数据', async () => {
      const invalidFeatures = {
        timeDomain: {
          peakValue: NaN,
          rmsValue: NaN,
          meanValue: NaN,
          variance: NaN,
          skewness: NaN,
          kurtosis: NaN,
          pulseCount: 0
        },
        frequencyDomain: {
          fundamentalFrequency: 50,
          harmonicRatios: [],
          totalHarmonicDistortion: NaN,
          peakValue: NaN,
          rmsValue: NaN,
          crestFactor: NaN,
          spectralEntropy: NaN
        }
      };

      const prediction = await predictor.predictAsync(invalidFeatures, createMockEnvironmentalData());
      
      expect(isFinite(prediction.probability)).toBe(true);
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
    });

    it('应正确处理极端环境条件', async () => {
      const extremeEnv = {
        temperature: 45,
        humidity: 95,
        pollutionLevel: 10,
        windSpeed: 0,
        precipitation: 5
      };

      const leakageData = createLeakageCurrentData('ins-extreme-001');
      const features = await analyzer.analyzeAsync(leakageData);
      const prediction = await predictor.predictAsync(features, extremeEnv);

      expect(prediction.probability).toBeGreaterThan(0.5);
      expect(['high', 'critical']).toContain(prediction.riskLevel);
    });

    it('应正确处理数据库并发操作', async () => {
      const operations = [];
      for (let i = 0; i < 20; i++) {
        const record: HealthRecord = {
          id: `hr-concurrent-${i}`,
          insulatorId: `ins-concurrent-${i % 5}`,
          timestamp: Date.now(),
          features: {
            timeDomain: { peakValue: 1, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 },
            frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 }
          },
          prediction: { probability: 0.3 + i * 0.03, riskLevel: 'medium', confidence: 0.8, predictedTime: 24 * 60 * 60 * 1000, contributingFactors: [] },
          environmentalData: createMockEnvironmentalData()
        };
        operations.push(db.addHealthRecord(record));
      }

      await Promise.all(operations);

      const stats = await db.getStatistics();
      expect(stats.totalRecords).toBe(20);
    });
  });

  describe('数据闭环验证', () => {
    it('应验证预测到维护的完整闭环', async () => {
      const insulator: Insulator = {
        id: 'ins-loop-001',
        name: '闭环测试设备',
        location: '测试塔',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      };
      await db.addInsulator(insulator);
      await synchronizer['db'].addInsulator(insulator);

      const leakageData = createLeakageCurrentData('ins-loop-001');
      const features = await analyzer.analyzeAsync(leakageData);
      
      const highRiskEnv = {
        temperature: 35,
        humidity: 90,
        pollutionLevel: 9,
        windSpeed: 1,
        precipitation: 3
      };
      const prediction = await predictor.predictAsync(features, highRiskEnv);

      const healthRecord: HealthRecord = {
        id: 'hr-loop-001',
        insulatorId: 'ins-loop-001',
        timestamp: Date.now(),
        features,
        prediction,
        environmentalData: highRiskEnv,
        maintenanceRecommendation: predictor.generateMaintenanceRecommendation(prediction)
      };
      await synchronizer.sendPrediction('maintenance', 'dispatch', healthRecord);

      await synchronizer.processPendingMessages();

      const tasks = await synchronizer['db'].getPendingMaintenanceTasks();
      expect(tasks.length).toBeGreaterThan(0);

      const updatedInsulator = await synchronizer['db'].getInsulator('ins-loop-001');
      expect(updatedInsulator?.status).not.toBe('normal');

      const records = await synchronizer['db'].getHealthRecordsByInsulator('ins-loop-001');
      expect(records.length).toBe(1);
      expect(records[0].maintenanceRecommendation).toBeDefined();
      expect(records[0].maintenanceRecommendation).toContain(
        prediction.riskLevel === 'critical' ? '更换' : '清洗'
      );
    });
  });
});
