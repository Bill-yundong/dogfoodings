import Dexie, { Table } from 'dexie';
import { Insulator, HealthRecord, MaintenanceTask, SemanticSyncMessage, DispatchCommand } from '@/types';

export class InsulatePulseDatabase extends Dexie {
  insulators!: Table<Insulator>;
  healthRecords!: Table<HealthRecord>;
  maintenanceTasks!: Table<MaintenanceTask>;
  syncMessages!: Table<SemanticSyncMessage>;
  dispatchCommands!: Table<DispatchCommand>;

  constructor() {
    super('InsulatePulseDB');
    
    this.version(1).stores({
      insulators: 'id, status, voltageLevel, location',
      healthRecords: 'id, insulatorId, timestamp, prediction.riskLevel',
      maintenanceTasks: 'id, insulatorId, priority, status, scheduledTime',
      syncMessages: 'id, timestamp, source, target, status',
      dispatchCommands: 'id, timestamp, status'
    });
  }

  async addInsulator(insulator: Insulator): Promise<string> {
    return this.insulators.put(insulator) as Promise<string>;
  }

  async getInsulator(id: string): Promise<Insulator | undefined> {
    return this.insulators.get(id);
  }

  async getAllInsulators(): Promise<Insulator[]> {
    return this.insulators.toArray();
  }

  async updateInsulatorStatus(id: string, status: Insulator['status']): Promise<number> {
    return this.insulators.update(id, { status });
  }

  async addHealthRecord(record: HealthRecord): Promise<string> {
    return this.healthRecords.put(record) as Promise<string>;
  }

  async getHealthRecordsByInsulator(insulatorId: string, limit: number = 100): Promise<HealthRecord[]> {
    return this.healthRecords
      .where('insulatorId')
      .equals(insulatorId)
      .reverse()
      .sortBy('timestamp')
      .then(records => records.slice(0, limit));
  }

  async getHealthRecordsByTimeRange(startTime: number, endTime: number): Promise<HealthRecord[]> {
    return this.healthRecords
      .where('timestamp')
      .between(startTime, endTime)
      .toArray();
  }

  async addMaintenanceTask(task: MaintenanceTask): Promise<string> {
    return this.maintenanceTasks.put(task) as Promise<string>;
  }

  async getPendingMaintenanceTasks(): Promise<MaintenanceTask[]> {
    return this.maintenanceTasks
      .where('status')
      .anyOf(['pending', 'in_progress'])
      .sortBy('scheduledTime');
  }

  async addSyncMessage(message: SemanticSyncMessage): Promise<string> {
    return this.syncMessages.put(message) as Promise<string>;
  }

  async getPendingSyncMessages(): Promise<SemanticSyncMessage[]> {
    return this.syncMessages
      .where('status')
      .equals('pending')
      .sortBy('timestamp');
  }

  async updateSyncMessageStatus(id: string, status: SemanticSyncMessage['status']): Promise<number> {
    return this.syncMessages.update(id, { status });
  }

  async addDispatchCommand(command: DispatchCommand): Promise<string> {
    return this.dispatchCommands.put(command) as Promise<string>;
  }

  async getRiskSummary(): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const insulators = await this.insulators.toArray();
    const summary = {
      total: insulators.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const insulator of insulators) {
      switch (insulator.status) {
        case 'critical':
          summary.critical++;
          break;
        case 'warning':
          summary.high++;
          break;
        case 'normal':
          summary.low++;
          break;
        default:
          summary.medium++;
      }
    }

    return summary;
  }

  async getRecentPredictions(hours: number = 24): Promise<HealthRecord[]> {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.healthRecords
      .where('timestamp')
      .above(cutoffTime)
      .reverse()
      .sortBy('timestamp');
  }

  async bulkAddInsulators(insulators: Insulator[]): Promise<void> {
    await this.insulators.bulkPut(insulators);
  }

  async bulkAddHealthRecords(records: HealthRecord[]): Promise<void> {
    await this.healthRecords.bulkPut(records);
  }

  async getStatistics(): Promise<{
    totalInsulators: number;
    totalRecords: number;
    totalTasks: number;
    pendingSync: number;
  }> {
    const [insulators, records, tasks, sync] = await Promise.all([
      this.insulators.count(),
      this.healthRecords.count(),
      this.maintenanceTasks.count(),
      this.syncMessages.where('status').equals('pending').count()
    ]);

    return {
      totalInsulators: insulators,
      totalRecords: records,
      totalTasks: tasks,
      pendingSync: sync
    };
  }

  async clearOldData(days: number = 30): Promise<void> {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    
    await Promise.all([
      this.healthRecords.where('timestamp').below(cutoffTime).delete(),
      this.maintenanceTasks.where('scheduledTime').below(cutoffTime).delete(),
      this.syncMessages.where('timestamp').below(cutoffTime).delete(),
      this.dispatchCommands.where('timestamp').below(cutoffTime).delete()
    ]);
  }
}

export const db = new InsulatePulseDatabase();

export function initializeMockData(): void {
  const insulators: Insulator[] = [];
  const locations = ['A相', 'B相', 'C相'];
  const types = ['瓷绝缘子', '玻璃绝缘子', '复合绝缘子'];
  
  for (let i = 1; i <= 100; i++) {
    insulators.push({
      id: `ins_${String(i).padStart(4, '0')}`,
      name: `${i}号塔 ${locations[i % 3]}绝缘子`,
      location: `${i}号塔 ${locations[i % 3]}`,
      voltageLevel: 500,
      type: types[i % 3],
      installationDate: Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000,
      lastMaintenanceDate: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      status: i % 15 === 0 ? 'critical' : i % 10 === 0 ? 'warning' : i % 20 === 0 ? 'maintenance' : 'normal'
    });
  }

  db.bulkAddInsulators(insulators).catch(console.error);
}

export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const count = await db.insulators.count();
    if (count === 0) {
      initializeMockData();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}