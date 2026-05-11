import type {
  MonitoringPoint,
  AlignmentStatus,
  DispatchCommand,
} from '../types/hydrodynamics';
import { workerService } from './HydrodynamicsWorkerService';
import { snapshotDB } from './SnapshotDatabase';

export class AlignmentService {
  private environmentalData: MonitoringPoint[] = [];
  private municipalData: MonitoringPoint[] = [];
  private lastAlignmentTime: number = 0;
  private alignmentInterval: number = 5000;
  private alignmentStatus: AlignmentStatus | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.handleNetworkRecovery();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  setEnvironmentalData(points: MonitoringPoint[]): void {
    this.environmentalData = points;
  }

  setMunicipalData(points: MonitoringPoint[]): void {
    this.municipalData = points;
  }

  async performAlignment(
    onProgress?: (progress: number) => void
  ): Promise<AlignmentStatus> {
    const now = Date.now();
    if (now - this.lastAlignmentTime < this.alignmentInterval) {
      return this.alignmentStatus || this.createDefaultStatus();
    }

    if (this.environmentalData.length === 0 || this.municipalData.length === 0) {
      return this.createDefaultStatus();
    }

    try {
      onProgress?.(30);

      const result = await workerService.computeAlignmentScore(
        this.environmentalData,
        this.municipalData,
        (progress) => {
          onProgress?.(30 + progress.progress * 0.5);
        }
      );

      onProgress?.(80);

      this.alignmentStatus = {
        environmentalMonitoring: {
          latency: now - Math.max(...this.environmentalData.map((p) => p.lastUpdate)),
          dataPoints: this.environmentalData.length,
          lastSync: now,
        },
        municipalWaterSupply: {
          latency: now - Math.max(...this.municipalData.map((p) => p.lastUpdate)),
          dataPoints: this.municipalData.length,
          lastSync: now,
        },
        alignmentScore: result.alignmentScore,
        isAligned: result.isAligned,
      };

      this.lastAlignmentTime = now;

      onProgress?.(100);

      return this.alignmentStatus;
    } catch (error) {
      console.error('Alignment error:', error);
      return this.createDefaultStatus();
    }
  }

  getAlignmentStatus(): AlignmentStatus | null {
    return this.alignmentStatus;
  }

  isSystemAligned(): boolean {
    return this.alignmentStatus?.isAligned ?? false;
  }

  getAlignmentScore(): number {
    return this.alignmentStatus?.alignmentScore ?? 0;
  }

  async executeCommand(command: DispatchCommand): Promise<boolean> {
    try {
      await snapshotDB.init();
      
      if (this.isOnline) {
        await this.executeOnlineCommand(command);
      } else {
        await this.executeOfflineCommand(command);
      }
      return true;
    } catch (error) {
      console.error('Command execution failed:', error);
      return false;
    }
  }

  private async executeOnlineCommand(command: DispatchCommand): Promise<void> {
    await snapshotDB.saveCommand(command, false);
    await snapshotDB.updateCommandStatus(command.id, 'executing');

    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    await snapshotDB.updateCommandStatus(command.id, 'completed');
  }

  private async executeOfflineCommand(command: DispatchCommand): Promise<void> {
    await snapshotDB.saveCommand(command, true);
    await snapshotDB.updateCommandStatus(command.id, 'executing');

    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    await snapshotDB.updateCommandStatus(command.id, 'completed');
  }

  private async handleNetworkRecovery(): Promise<void> {
    const offlineCommands = await snapshotDB.getOfflineCommands();

    for (const command of offlineCommands) {
      if (command.status === 'pending' || command.status === 'executing') {
        await this.executeOnlineCommand(command);
      }
    }

    const pendingSnapshots = await snapshotDB.getPendingSyncSnapshots();
    for (const snapshot of pendingSnapshots) {
      await snapshotDB.updateSnapshotSyncStatus(snapshot.metadata.id, 'synced');
    }

    await snapshotDB.updateSystemState({
      isOffline: false,
      pendingSyncCount: 0,
      lastSyncTimestamp: Date.now(),
    });
  }

  private createDefaultStatus(): AlignmentStatus {
    return {
      environmentalMonitoring: {
        latency: 0,
        dataPoints: 0,
        lastSync: 0,
      },
      municipalWaterSupply: {
        latency: 0,
        dataPoints: 0,
        lastSync: 0,
      },
      alignmentScore: 0,
      isAligned: false,
    };
  }

  setAlignmentInterval(interval: number): void {
    this.alignmentInterval = interval;
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }
}

export const alignmentService = new AlignmentService();
