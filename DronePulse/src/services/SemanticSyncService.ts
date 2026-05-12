import { Subject, Observable, filter } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { CommandCenterMessage, SemanticSyncData, Drone, CoverageSnapshot, SupportModule } from '../types';
import { dbStore } from '../store/indexedDB';

export class SemanticSyncService {
  private messageBus: Subject<CommandCenterMessage> = new Subject();
  private nodeId: string;
  private nodeType: 'command' | 'support' | 'drone';
  private syncInterval: number = 5000;
  private intervalId: number | null = null;

  constructor(nodeType: 'command' | 'support' | 'drone', nodeId?: string) {
    this.nodeType = nodeType;
    this.nodeId = nodeId || `${nodeType}-${uuidv4()}`;
  }

  getNodeId(): string {
    return this.nodeId;
  }

  getNodeType(): string {
    return this.nodeType;
  }

  sendMessage(type: CommandCenterMessage['type'], payload: any, target?: string): void {
    const message: CommandCenterMessage = {
      type,
      payload,
      timestamp: Date.now(),
      source: this.nodeId,
      target,
    };
    this.messageBus.next(message);
  }

  receiveMessages(filterType?: CommandCenterMessage['type']): Observable<CommandCenterMessage> {
    if (filterType) {
      return this.messageBus.pipe(filter(msg => msg.type === filterType));
    }
    return this.messageBus.asObservable();
  }

  receiveFromSource(sourceId: string): Observable<CommandCenterMessage> {
    return this.messageBus.pipe(filter(msg => msg.source === sourceId));
  }

  receiveForTarget(targetId: string): Observable<CommandCenterMessage> {
    return this.messageBus.pipe(filter(msg => msg.target === targetId || !msg.target));
  }

  async createSyncSnapshot(): Promise<SemanticSyncData> {
    const snapshot = await dbStore.createSnapshot();
    this.sendMessage('SYNC', snapshot);
    await dbStore.saveSyncRecord(snapshot);
    return snapshot;
  }

  async applySyncSnapshot(snapshot: SemanticSyncData): Promise<boolean> {
    try {
      const currentSnapshot = await dbStore.getLatestSyncRecord();
      
      if (currentSnapshot && currentSnapshot.timestamp >= snapshot.timestamp) {
        console.warn('Received older snapshot, ignoring');
        return false;
      }

      await dbStore.restoreFromSnapshot(snapshot);
      this.sendMessage('STATUS', { 
        type: 'SYNC_COMPLETE', 
        snapshotVersion: snapshot.version,
        timestamp: snapshot.timestamp 
      });
      
      return true;
    } catch (error) {
      console.error('Failed to apply sync snapshot:', error);
      this.sendMessage('ALERT', { type: 'SYNC_FAILED', error: String(error) });
      return false;
    }
  }

  broadcastDroneUpdate(drone: Drone): void {
    this.sendMessage('STATUS', {
      type: 'DRONE_UPDATE',
      drone,
    });
  }

  broadcastCoverageUpdate(snapshot: CoverageSnapshot): void {
    this.sendMessage('STATUS', {
      type: 'COVERAGE_UPDATE',
      snapshot,
    });
  }

  broadcastModuleUpdate(module: SupportModule): void {
    this.sendMessage('STATUS', {
      type: 'MODULE_UPDATE',
      module,
    });
  }

  sendCommand(target: string, command: string, params: any = {}): void {
    this.sendMessage('COMMAND', {
      command,
      params,
    }, target);
  }

  sendAlert(alertType: string, details: any): void {
    this.sendMessage('ALERT', {
      type: alertType,
      details,
      level: this.getAlertLevel(alertType),
    });
  }

  startAutoSync(): void {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(async () => {
      await this.createSyncSnapshot();
    }, this.syncInterval);
  }

  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setSyncInterval(ms: number): void {
    this.syncInterval = ms;
    if (this.intervalId) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }

  private getAlertLevel(alertType: string): 'info' | 'warning' | 'critical' {
    const criticalAlerts = ['DRONE_Fault', 'SYNC_FAILED', 'COVERAGE_GAP'];
    const warningAlerts = ['LOW_BATTERY', 'DRONE_IDLE'];
    
    if (criticalAlerts.includes(alertType)) return 'critical';
    if (warningAlerts.includes(alertType)) return 'warning';
    return 'info';
  }

  async verifyConsistency(): Promise<{ 
    consistent: boolean; 
    discrepancies: string[];
    hash: string;
  }> {
    const [drones, coverage, modules] = await Promise.all([
      dbStore.getAllDrones(),
      dbStore.getLatestSnapshots(10),
      dbStore.getAllSupportModules(),
    ]);

    const discrepancies: string[] = [];

    drones.forEach(drone => {
      if (drone.battery < 0 || drone.battery > 100) {
        discrepancies.push(`Drone ${drone.id}: Invalid battery level ${drone.battery}`);
      }
      if (Date.now() - drone.lastUpdate > 60000) {
        discrepancies.push(`Drone ${drone.id}: Stale data (last update > 60s)`);
      }
    });

    const latestSnapshot = await dbStore.getLatestSyncRecord();
    if (latestSnapshot) {
      const currentHash = await this.generateHash(JSON.stringify({ drones, coverage, modules }));
      if (currentHash !== latestSnapshot.hash) {
        discrepancies.push('Data hash mismatch with last sync record');
      }
    }

    return {
      consistent: discrepancies.length === 0,
      discrepancies,
      hash: latestSnapshot?.hash || '',
    };
  }

  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  destroy(): void {
    this.stopAutoSync();
    this.messageBus.complete();
  }
}

export const syncService = new SemanticSyncService('command');
