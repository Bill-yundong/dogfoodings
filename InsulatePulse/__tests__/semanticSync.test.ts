import { SemanticSynchronizer, semanticSynchronizer } from '@/lib/semanticSync';
import { SemanticSyncMessage, HealthRecord, MaintenanceTask, DispatchCommand, Insulator } from '@/types';

describe('SemanticSynchronizer - 状态检修与调度控制系统语义同步', () => {
  let synchronizer: SemanticSynchronizer;

  beforeEach(async () => {
    synchronizer = new SemanticSynchronizer();
    await synchronizer['db'].delete();
    await synchronizer['db'].open();
  });

  afterEach(async () => {
    await synchronizer['db'].delete();
    synchronizer['db'].close();
  });

  describe('消息创建与发送', () => {
    it('应正确创建状态更新消息', async () => {
      const message = await synchronizer.sendStatusUpdate(
        'maintenance',
        'dispatch',
        'ins-001',
        'warning'
      );

      expect(message.source).toBe('maintenance');
      expect(message.target).toBe('dispatch');
      expect(message.type).toBe('status_update');
      expect(message.payload.insulatorId).toBe('ins-001');
      expect(message.payload.status).toBe('warning');
      expect(message.status).toBe('pending');
    });

    it('应正确创建预测结果消息', async () => {
      const healthRecord: HealthRecord = {
        id: 'hr-001',
        insulatorId: 'ins-001',
        timestamp: Date.now(),
        features: {
          timeDomain: { peakValue: 1.0, rmsValue: 0.7, meanValue: 0, variance: 0.1, skewness: 0, kurtosis: 0, pulseCount: 2 },
          frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.1], totalHarmonicDistortion: 0.15, peakValue: 0.8, rmsValue: 0.5, crestFactor: 1.6, spectralEntropy: 2.0 }
        },
        prediction: { probability: 0.6, riskLevel: 'high', confidence: 0.85, predictedTime: 6 * 60 * 60 * 1000, contributingFactors: ['总谐波畸变率', '电流有效值'] },
        environmentalData: { temperature: 28, humidity: 75, pollutionLevel: 6, windSpeed: 2, precipitation: 1 }
      };

      const message = await synchronizer.sendPrediction('maintenance', 'dispatch', healthRecord);

      expect(message.type).toBe('prediction');
      expect(message.payload.healthRecord.id).toBe('hr-001');
      expect(message.payload.healthRecord.prediction.riskLevel).toBe('high');
    });

    it('应正确创建维护请求消息', async () => {
      const task: MaintenanceTask = {
        id: 'task-001',
        insulatorId: 'ins-001',
        type: 'cleaning',
        priority: 'high',
        scheduledTime: Date.now() + 24 * 60 * 60 * 1000,
        status: 'pending',
        description: '基于风险预测的紧急清洗任务'
      };

      const message = await synchronizer.sendMaintenanceRequest('maintenance', 'dispatch', task);

      expect(message.type).toBe('maintenance_request');
      expect(message.payload.task.id).toBe('task-001');
      expect(message.payload.task.priority).toBe('high');
    });

    it('应正确创建调度命令消息', async () => {
      const command: DispatchCommand = {
        id: 'cmd-001',
        timestamp: Date.now(),
        type: 'load_adjustment',
        targetInsulators: ['ins-001', 'ins-002'],
        parameters: { reduction: 0.3, duration: 3600 },
        status: 'issued'
      };

      const message = await synchronizer.sendDispatchCommand('dispatch', 'maintenance', command);

      expect(message.type).toBe('command');
      expect(message.payload.command.type).toBe('load_adjustment');
    });
  });

  describe('消息处理', () => {
    it('应正确处理状态更新消息', async () => {
      await synchronizer['db'].addInsulator({
        id: 'ins-001',
        name: '测试设备',
        location: '测试位置',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      });

      const message = await synchronizer.sendStatusUpdate('maintenance', 'dispatch', 'ins-001', 'critical');

      await synchronizer.processPendingMessages();

      const updated = await synchronizer['db'].getInsulator('ins-001');
      expect(updated?.status).toBe('critical');
    });

    it('应正确处理预测消息并自动创建维护任务', async () => {
      await synchronizer['db'].addInsulator({
        id: 'ins-001',
        name: '测试设备',
        location: '测试位置',
        voltageLevel: 500,
        type: '瓷绝缘子',
        installationDate: Date.now(),
        lastMaintenanceDate: Date.now(),
        status: 'normal'
      });

      const healthRecord: HealthRecord = {
        id: 'hr-001',
        insulatorId: 'ins-001',
        timestamp: Date.now(),
        features: {
          timeDomain: { peakValue: 1.5, rmsValue: 1.2, meanValue: 0, variance: 0.2, skewness: 0.5, kurtosis: 1.5, pulseCount: 5 },
          frequencyDomain: { fundamentalFrequency: 50, harmonicRatios: [0.3, 0.2], totalHarmonicDistortion: 0.45, peakValue: 1.3, rmsValue: 1.0, crestFactor: 1.3, spectralEntropy: 3.5 }
        },
        prediction: { probability: 0.85, riskLevel: 'critical', confidence: 0.9, predictedTime: 60 * 60 * 1000, contributingFactors: ['总谐波畸变率', '电流有效值', '污秽程度'] },
        environmentalData: { temperature: 32, humidity: 85, pollutionLevel: 9, windSpeed: 1, precipitation: 3 }
      };

      await synchronizer.sendPrediction('maintenance', 'dispatch', healthRecord);
      await synchronizer.processPendingMessages();

      const tasks = await synchronizer['db'].getPendingMaintenanceTasks();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].insulatorId).toBe('ins-001');
      expect(tasks[0].priority).toBe('high');
    });

    it('应正确处理维护请求消息', async () => {
      const task: MaintenanceTask = {
        id: 'task-001',
        insulatorId: 'ins-001',
        type: 'replacement',
        priority: 'high',
        scheduledTime: Date.now() + 3600000,
        status: 'pending',
        description: '测试任务'
      };

      await synchronizer.sendMaintenanceRequest('maintenance', 'dispatch', task);
      await synchronizer.processPendingMessages();

      const tasks = await synchronizer['db'].getPendingMaintenanceTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('task-001');
    });

    it('应正确标记消息为已确认', async () => {
      const message = await synchronizer.sendStatusUpdate('maintenance', 'dispatch', 'ins-001', 'warning');

      const pendingMessages = await synchronizer['db'].getPendingSyncMessages();
      expect(pendingMessages.length).toBe(1);
      expect(pendingMessages[0].status).toBe('pending');

      await synchronizer.processPendingMessages();

      const afterProcessing = await synchronizer['db'].getPendingSyncMessages();
      expect(afterProcessing.length).toBe(0);
    });
  });

  describe('待处理消息查询', () => {
    it('应正确查询所有待处理消息', async () => {
      for (let i = 0; i < 5; i++) {
        await synchronizer.sendStatusUpdate('maintenance', 'dispatch', `ins-00${i}`, 'normal');
      }

      const pending = await synchronizer['db'].getPendingSyncMessages();
      expect(pending.length).toBe(5);
    });
  });

  describe('消息格式化', () => {
    it('formatMessageForDisplay 应正确格式化消息', () => {
      const message: SemanticSyncMessage = {
        id: 'msg-001',
        timestamp: Date.now(),
        source: 'maintenance',
        target: 'dispatch',
        type: 'prediction',
        payload: {},
        status: 'pending'
      };

      const formatted = require('@/lib/semanticSync').formatMessageForDisplay(message);

      expect(formatted).toContain('检修系统');
      expect(formatted).toContain('调度系统');
      expect(formatted).toContain('预测结果');
    });
  });

  describe('处理器注册机制', () => {
    it('应正确注册自定义处理器', async () => {
      let customHandlerCalled = false;

      synchronizer.registerHandler('custom_type', async (msg) => {
        customHandlerCalled = true;
      });

      await synchronizer.createMessage('maintenance', 'dispatch', 'custom_type', {});
      await synchronizer.processPendingMessages();

      expect(customHandlerCalled).toBe(true);
    });
  });
});
