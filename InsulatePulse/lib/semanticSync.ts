import { SemanticSyncMessage, MaintenanceTask, DispatchCommand, Insulator, HealthRecord } from '@/types';
import { db } from './database';

type MessageHandler = (message: SemanticSyncMessage) => Promise<void>;

export class SemanticSynchronizer {
  private handlers: Map<string, MessageHandler>;
  private isProcessing: boolean;

  constructor() {
    this.handlers = new Map();
    this.isProcessing = false;
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.handlers.set('status_update', this.handleStatusUpdate.bind(this));
    this.handlers.set('prediction', this.handlePrediction.bind(this));
    this.handlers.set('maintenance_request', this.handleMaintenanceRequest.bind(this));
    this.handlers.set('command', this.handleCommand.bind(this));
  }

  async createMessage(
    source: SemanticSyncMessage['source'],
    target: SemanticSyncMessage['target'],
    type: SemanticSyncMessage['type'],
    payload: any
  ): Promise<SemanticSyncMessage> {
    const message: SemanticSyncMessage = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source,
      target,
      type,
      payload,
      status: 'pending'
    };

    await db.addSyncMessage(message);
    return message;
  }

  async processPendingMessages(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    try {
      const pendingMessages = await db.getPendingSyncMessages();
      
      for (const message of pendingMessages) {
        const handler = this.handlers.get(message.type);
        if (handler) {
          try {
            await handler(message);
            await db.updateSyncMessageStatus(message.id, 'confirmed');
          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
            await db.updateSyncMessageStatus(message.id, 'rejected');
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleStatusUpdate(message: SemanticSyncMessage): Promise<void> {
    const { insulatorId, status } = message.payload;
    if (insulatorId && status) {
      await db.updateInsulatorStatus(insulatorId, status);
    }
  }

  private async handlePrediction(message: SemanticSyncMessage): Promise<void> {
    const { healthRecord } = message.payload;
    if (healthRecord) {
      await db.addHealthRecord(healthRecord);
      
      if (healthRecord.prediction) {
        const newStatus = this.mapRiskToStatus(healthRecord.prediction.riskLevel);
        await db.updateInsulatorStatus(healthRecord.insulatorId, newStatus);
        
        if (healthRecord.prediction.riskLevel === 'critical' || healthRecord.prediction.riskLevel === 'high') {
          await this.createMaintenanceTaskFromPrediction(healthRecord);
        }
      }
    }
  }

  private async handleMaintenanceRequest(message: SemanticSyncMessage): Promise<void> {
    const { task } = message.payload;
    if (task) {
      await db.addMaintenanceTask(task);
    }
  }

  private async handleCommand(message: SemanticSyncMessage): Promise<void> {
    const { command } = message.payload;
    if (command) {
      await db.addDispatchCommand(command);
      
      if (message.source === 'dispatch') {
        await this.executeDispatchCommand(command);
      }
    }
  }

  private mapRiskToStatus(riskLevel: string): Insulator['status'] {
    switch (riskLevel) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'warning';
      case 'medium':
        return 'normal';
      case 'low':
        return 'normal';
      default:
        return 'normal';
    }
  }

  private async createMaintenanceTaskFromPrediction(healthRecord: HealthRecord): Promise<void> {
    const taskType = healthRecord.prediction.riskLevel === 'critical' ? 'replacement' : 'cleaning';
    const priority = healthRecord.prediction.riskLevel === 'critical' ? 'high' : 'medium';
    
    const task: MaintenanceTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      insulatorId: healthRecord.insulatorId,
      type: taskType,
      priority,
      scheduledTime: Date.now() + (priority === 'high' ? 1 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
      status: 'pending',
      description: `基于污闪风险预测的${taskType === 'replacement' ? '更换' : '清洗'}任务`
    };

    await db.addMaintenanceTask(task);

    await this.createMessage(
      'maintenance',
      'dispatch',
      'maintenance_request',
      { task, reason: 'prediction_based' }
    );
  }

  private async executeDispatchCommand(command: DispatchCommand): Promise<void> {
    switch (command.type) {
      case 'load_adjustment':
        console.log('Executing load adjustment:', command.parameters);
        break;
      case 'isolation':
        console.log('Executing isolation:', command.parameters);
        break;
      case 'inspection_order':
        console.log('Executing inspection order:', command.parameters);
        break;
    }
  }

  async sendStatusUpdate(
    from: SemanticSyncMessage['source'],
    to: SemanticSyncMessage['target'],
    insulatorId: string,
    status: Insulator['status']
  ): Promise<SemanticSyncMessage> {
    return this.createMessage(from, to, 'status_update', { insulatorId, status });
  }

  async sendPrediction(
    from: SemanticSyncMessage['source'],
    to: SemanticSyncMessage['target'],
    healthRecord: HealthRecord
  ): Promise<SemanticSyncMessage> {
    return this.createMessage(from, to, 'prediction', { healthRecord });
  }

  async sendMaintenanceRequest(
    from: SemanticSyncMessage['source'],
    to: SemanticSyncMessage['target'],
    task: MaintenanceTask
  ): Promise<SemanticSyncMessage> {
    return this.createMessage(from, to, 'maintenance_request', { task });
  }

  async sendDispatchCommand(
    from: SemanticSyncMessage['source'],
    to: SemanticSyncMessage['target'],
    command: DispatchCommand
  ): Promise<SemanticSyncMessage> {
    return this.createMessage(from, to, 'command', { command });
  }

  registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  startPolling(intervalMs: number = 5000): NodeJS.Timeout {
    return setInterval(() => this.processPendingMessages(), intervalMs);
  }
}

export const semanticSynchronizer = new SemanticSynchronizer();

export function formatMessageForDisplay(message: SemanticSyncMessage): string {
  const sourceName = message.source === 'maintenance' ? '检修系统' : '调度系统';
  const targetName = message.target === 'maintenance' ? '检修系统' : '调度系统';
  const typeName = {
    'status_update': '状态更新',
    'prediction': '预测结果',
    'maintenance_request': '检修请求',
    'command': '调度命令'
  }[message.type] || message.type;

  return `[${new Date(message.timestamp).toLocaleTimeString()}] ${sourceName} → ${targetName}: ${typeName}`;
}