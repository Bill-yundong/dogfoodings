import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SortingSnapshot, Package, WCSCommand, PLCStatus, PerformanceMetrics, ErrorEvent } from '../types/core';
import { SYSTEM_CONFIG } from '../config/constants';
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
    value: ErrorEvent;
    indexes: {
      'by-timestamp': number;
      'by-type': string;
      'by-severity': string;
    };
  };
}

export class SnapshotStore {
  private db!: IDBPDatabase<SortingDB>;
  private readonly maxSnapshots: number;
  private readonly snapshotInterval: number;
  private lastSnapshotTime = 0;
  private currentVersion = 1;
  private isInitialized = false;

  constructor() {
    const { MAX_SNAPSHOTS, INTERVAL } = SYSTEM_CONFIG.SNAPSHOT;
    this.maxSnapshots = MAX_SNAPSHOTS;
    this.snapshotInterval = INTERVAL;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    const { DB_NAME, DB_VERSION } = SYSTEM_CONFIG.SNAPSHOT;
    
    this.db = await openDB<SortingDB>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        this.createObjectStores(db);
      },
    });

    this.isInitialized = true;
  }

  private createObjectStores(db: IDBPDatabase<SortingDB>): void {
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
    errorStore.createIndex('by-severity', 'severity');
  }

  async createSnapshot(
    packages: Package[],
    commands: WCSCommand[],
    plcStatus: PLCStatus[],
    performanceMetrics: PerformanceMetrics
  ): Promise<SortingSnapshot> {
    await this.ensureInitialized();

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

  async getSnapshot(snapshotId: string): Promise<SortingSnapshot | undefined> {
    await this.ensureInitialized();
    return this.db.get('snapshots', snapshotId);
  }

  async getLatestSnapshot(): Promise<SortingSnapshot | undefined> {
    await this.ensureInitialized();
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-timestamp');
    return snapshots[snapshots.length - 1];
  }

  async getSnapshotsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<SortingSnapshot[]> {
    await this.ensureInitialized();
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-timestamp');
    return snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  async getSnapshotByVersion(version: number): Promise<SortingSnapshot | undefined> {
    await this.ensureInitialized();
    const snapshots = await this.db.getAllFromIndex('snapshots', 'by-version', version);
    return snapshots[0];
  }

  async restoreSnapshot(snapshotId: string): Promise<SortingSnapshot | null> {
    await this.ensureInitialized();
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) return null;

    await this.logError({
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'SENSOR_ERROR',
      severity: 'medium',
      message: `System restored to snapshot version ${snapshot.version}`,
      resolved: true
    });

    return snapshot;
  }

  async getAllSnapshots(limit?: number): Promise<SortingSnapshot[]> {
    await this.ensureInitialized();
    const snapshots = await this.db.getAll('snapshots');
    return limit ? snapshots.slice(-limit) : snapshots;
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
    await this.ensureInitialized();
    return this.db.get('packages', packageId);
  }

  async getPackagesByStatus(status: Package['status']): Promise<Package[]> {
    await this.ensureInitialized();
    return this.db.getAllFromIndex('packages', 'by-status', status);
  }

  async getAllPackages(): Promise<Package[]> {
    await this.ensureInitialized();
    return this.db.getAll('packages');
  }

  async getCommand(commandId: string): Promise<WCSCommand | undefined> {
    await this.ensureInitialized();
    return this.db.get('commands', commandId);
  }

  async getCommandsByPackage(packageId: string): Promise<WCSCommand[]> {
    await this.ensureInitialized();
    return this.db.getAllFromIndex('commands', 'by-package', packageId);
  }

  async getCommandsByStatus(status: WCSCommand['status']): Promise<WCSCommand[]> {
    await this.ensureInitialized();
    return this.db.getAllFromIndex('commands', 'by-status', status);
  }

  async logError(error: ErrorEvent): Promise<void> {
    await this.ensureInitialized();
    await this.db.add('errorLogs', error);
  }

  async getErrorLogs(
    type?: string,
    severity?: string,
    limit: number = 100
  ): Promise<ErrorEvent[]> {
    await this.ensureInitialized();
    
    let logs: ErrorEvent[];
    if (type) {
      logs = await this.db.getAllFromIndex('errorLogs', 'by-type', type);
    } else if (severity) {
      logs = await this.db.getAllFromIndex('errorLogs', 'by-severity', severity);
    } else {
      logs = await this.db.getAll('errorLogs');
    }
    
    return logs.slice(-limit);
  }

  async getActiveErrors(): Promise<ErrorEvent[]> {
    await this.ensureInitialized();
    const logs = await this.db.getAll('errorLogs');
    return logs.filter(e => !e.resolved);
  }

  async markErrorResolved(errorId: string, resolution: string): Promise<void> {
    await this.ensureInitialized();
    const error = await this.db.get('errorLogs', errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
      error.resolution = resolution;
      await this.db.put('errorLogs', error);
    }
  }

  async tracePackageHistory(packageId: string): Promise<{
    package: Package | undefined;
    commands: WCSCommand[];
    snapshots: SortingSnapshot[];
  }> {
    await this.ensureInitialized();
    
    const [pkg, commands, allSnapshots] = await Promise.all([
      this.getPackage(packageId),
      this.getCommandsByPackage(packageId),
      this.getAllSnapshots()
    ]);

    const relatedSnapshots = allSnapshots.filter(
      snapshot => snapshot.packages.some(p => p.id === packageId)
    );

    return {
      package: pkg,
      commands,
      snapshots: relatedSnapshots
    };
  }

  async getSnapshotCount(): Promise<number> {
    await this.ensureInitialized();
    return this.db.count('snapshots');
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

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    await Promise.all([
      this.db.clear('snapshots'),
      this.db.clear('packages'),
      this.db.clear('commands'),
      this.db.clear('errorLogs')
    ]);
    this.currentVersion = 1;
    this.lastSnapshotTime = 0;
  }

  shouldCreateSnapshot(): boolean {
    return Date.now() - this.lastSnapshotTime >= this.snapshotInterval;
  }

  setSnapshotInterval(interval: number): void {
    (this as { snapshotInterval: number }).snapshotInterval = interval;
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }

  getLastSnapshotTime(): number {
    return this.lastSnapshotTime;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

export default SnapshotStore;
