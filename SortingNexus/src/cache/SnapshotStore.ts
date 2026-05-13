import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SortingSnapshot, Package, WCSCommand, PLCStatus, PerformanceMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SortingDB extends DBSchema {
  snapshots: {
    key: string;
    value: SortingSnapshot;
    indexes: {
      'by-timestamp': number;
      'by-version': number;
    };
  };
  packages: {
    key: string;
    value: Package;
    indexes: {
      'by-status': string;
      'by-destination': string;
    };
  };
  commands: {
    key: string;
    value: WCSCommand;
    indexes: {
      'by-status': string;
      'by-package': string;
    };
  };
  errorLogs: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: string;
      message: string;
      snapshotId?: string;
      packageId?: string;
    };
    indexes: {
      'by-timestamp': number;
      'by-type': string;
    };
  };
}

export class SnapshotStore {
  private db!: IDBPDatabase<SortingDB>;
  private maxSnapshots = 100;
  private snapshotInterval = 5000;
  private lastSnapshotTime = 0;
  private currentVersion = 1;

  async init(): Promise<void> {
    this.db = await openDB<SortingDB>('sorting-nexus-db', 1, {
      upgrade(db) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-timestamp', 'timestamp');
        snapshotStore.createIndex('by-version', 'version');

        const packageStore = db.createObjectStore('packages', { keyPath: 'id' });
        packageStore.createIndex('by-status', 'status');
        packageStore.createIndex('by-destination', 'destination');

        const commandStore = db.createObjectStore('commands', { keyPath: 'id' });
        commandStore.createIndex('by-status', 'status');
        commandStore.createIndex('by-package', 'packageId');

        const errorStore = db.createObjectStore('errorLogs', { keyPath: 'id' });
        errorStore.createIndex('by-timestamp', 'timestamp');
        errorStore.createIndex('by-type', 'type');
      }
    });
  }

  async createSnapshot(
    packages: Package[],
    commands: WCSCommand[],
    plcStatus: PLCStatus[],
    performanceMetrics: PerformanceMetrics
  ): Promise<SortingSnapshot> {
    const now = Date.now();

    const snapshot: SortingSnapshot = {
      id: uuidv4(),
      version: this.currentVersion++,
      timestamp: now,
      packages: JSON.parse(JSON.stringify(packages)),
      commands: JSON.parse(JSON.stringify(commands)),
      plcStatus: JSON.parse(JSON.stringify(plcStatus)),
      performanceMetrics: JSON.parse(JSON.stringify(performanceMetrics))
    };

    await this.db.add('snapshots', snapshot);
    this.lastSnapshotTime = now;

    await this.cleanupOldSnapshots();
    await this.savePackages(packages);
    await this.saveCommands(commands);

    return snapshot;
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const count = await this.db.count('snapshots');
    if (count > this.maxSnapshots) {
      const allSnapshots = await this.db.getAllFromIndex('snapshots', 'by-timestamp');
      const toDelete = allSnapshots.slice(0, count - this.maxSnapshots);
      for (const snapshot of toDelete) {
        await this.db.delete('snapshots', snapshot.id);
      }
    }
  }

  async getSnapshot(snapshotId: string): Promise<SortingSnapshot | undefined> {
    return this.db.get('snapshots', snapshotId);
  }

  async getLatestSnapshot(): Promise<SortingSnapshot | undefined> {
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-timestamp');
    return snapshots[snapshots.length - 1];
  }

  async getSnapshotsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<SortingSnapshot[]> {
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-timestamp');
    return snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  async getSnapshotByVersion(version: number): Promise<SortingSnapshot | undefined> {
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-version', version);
    return snapshots[0];
  }

  async restoreSnapshot(snapshotId: string): Promise<SortingSnapshot | null> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) return null;

    await this.logError({
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'RESTORE',
      message: `System restored to snapshot version ${snapshot.version}`,
      snapshotId: snapshot.id
    });

    return snapshot;
  }

  private async savePackages(packages: Package[]): Promise<void> {
    const tx = this.db.transaction('packages', 'readwrite');
    for (const pkg of packages) {
      await tx.store.put(pkg);
    }
    await tx.done;
  }

  private async saveCommands(commands: WCSCommand[]): Promise<void> {
    const tx = this.db.transaction('commands', 'readwrite');
    for (const cmd of commands) {
      await tx.store.put(cmd);
    }
    await tx.done;
  }

  async getPackage(packageId: string): Promise<Package | undefined> {
    return this.db.get('packages', packageId);
  }

  async getPackagesByStatus(status: Package['status']): Promise<Package[]> {
    return this.db.getAllFromIndex('packages', 'by-status', status);
  }

  async getCommand(commandId: string): Promise<WCSCommand | undefined> {
    return this.db.get('commands', commandId);
  }

  async getCommandsByPackage(packageId: string): Promise<WCSCommand[]> {
    return this.db.getAllFromIndex('commands', 'by-package', packageId);
  }

  async logError(error: {
    id: string;
    timestamp: number;
    type: string;
    message: string;
    snapshotId?: string;
    packageId?: string;
  }): Promise<void> {
    await this.db.add('errorLogs', error);
  }

  async getErrorLogs(
    type?: string,
    limit: number = 100
  ): Promise<Array<{
    id: string;
    timestamp: number;
    type: string;
    message: string;
    snapshotId?: string;
    packageId?: string;
  }>> {
    let logs;
    if (type) {
      logs = await this.db.getAllFromIndex('errorLogs', 'by-type', type);
    } else {
      logs = await this.db.getAll('errorLogs');
    }
    return logs.slice(-limit);
  }

  async tracePackageHistory(packageId: string): Promise<{
    package: Package | undefined;
    commands: WCSCommand[];
    snapshots: SortingSnapshot[];
  }> {
    const pkg = await this.getPackage(packageId);
    const commands = await this.getCommandsByPackage(packageId);
    const allSnapshots = await this.db.getAll('snapshots');

    const relatedSnapshots = allSnapshots.filter(
      snapshot => snapshot.packages.some(p => p.id === packageId)
    );

    return {
      package: pkg,
      commands,
      snapshots: relatedSnapshots
    };
  }

  async clearAll(): Promise<void> {
    await this.db.clear('snapshots');
    await this.db.clear('packages');
    await this.db.clear('commands');
    await this.db.clear('errorLogs');
    this.currentVersion = 1;
  }

  shouldCreateSnapshot(): boolean {
    return Date.now() - this.lastSnapshotTime >= this.snapshotInterval;
  }

  setSnapshotInterval(interval: number): void {
    this.snapshotInterval = interval;
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }
}

export default SnapshotStore;
