import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  SystemSnapshot,
  SnapshotMetadata,
  MonitoringPoint,
  DispatchCommand,
} from '../types/hydrodynamics';

interface SnapshotDB extends DBSchema {
  snapshots: {
    key: string;
    value: SystemSnapshot;
    indexes: {
      byTimestamp: number;
      bySyncStatus: string;
      byOffline: boolean;
    };
  };
  monitoringPoints: {
    key: string;
    value: MonitoringPoint & { snapshotId: string };
    indexes: {
      bySnapshotId: string;
      byStatus: string;
    };
  };
  commands: {
    key: string;
    value: DispatchCommand & { executedOffline: boolean };
    indexes: {
      byStatus: string;
      byPriority: string;
      byTimestamp: number;
    };
  };
  systemState: {
    key: string;
    value: {
      id: string;
      lastSyncTimestamp: number;
      isOffline: boolean;
      pendingSyncCount: number;
      currentSnapshotId: string | null;
    };
  };
}

const DB_NAME = 'AquaNexusSnapshotDB';
const DB_VERSION = 1;
const MAX_SNAPSHOTS = 1000;

export class SnapshotDatabase {
  private db: IDBPDatabase<SnapshotDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<SnapshotDB>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        const snapshotStore = db.createObjectStore('snapshots', {
          keyPath: 'metadata.id',
        });
        snapshotStore.createIndex('byTimestamp', 'metadata.timestamp');
        snapshotStore.createIndex('bySyncStatus', 'metadata.synchronizationStatus');
        snapshotStore.createIndex('byOffline', 'metadata.isOffline');

        const monitoringStore = db.createObjectStore('monitoringPoints', {
          keyPath: 'id',
        });
        monitoringStore.createIndex('bySnapshotId', 'snapshotId');
        monitoringStore.createIndex('byStatus', 'status');

        const commandStore = db.createObjectStore('commands', {
          keyPath: 'id',
        });
        commandStore.createIndex('byStatus', 'status');
        commandStore.createIndex('byPriority', 'priority');
        commandStore.createIndex('byTimestamp', 'timestamp');

        db.createObjectStore('systemState', { keyPath: 'id' });
      },
    });

    await this.ensureSystemState();
  }

  private async ensureSystemState(): Promise<void> {
    const existing = await this.db!.get('systemState', 'current');
    if (!existing) {
      await this.db!.put('systemState', {
        id: 'current',
        lastSyncTimestamp: Date.now(),
        isOffline: !navigator.onLine,
        pendingSyncCount: 0,
        currentSnapshotId: null,
      });
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async saveSnapshot(snapshot: SystemSnapshot): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(
      ['snapshots', 'monitoringPoints', 'systemState'],
      'readwrite'
    );

    await tx.store.put(snapshot);

    for (const point of snapshot.monitoringPoints) {
      await tx.objectStore('monitoringPoints').put({
        ...point,
        snapshotId: snapshot.metadata.id,
      });
    }

    await tx.objectStore('systemState').put({
      id: 'current',
      lastSyncTimestamp: Date.now(),
      isOffline: snapshot.metadata.isOffline,
      pendingSyncCount: snapshot.metadata.synchronizationStatus === 'pending' ? 1 : 0,
      currentSnapshotId: snapshot.metadata.id,
    });

    await tx.done;

    await this.cleanupOldSnapshots();
  }

  async getSnapshot(id: string): Promise<SystemSnapshot | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('snapshots', id);
  }

  async getLatestSnapshot(): Promise<SystemSnapshot | undefined> {
    if (!this.db) await this.init();

    const snapshots = await this.db!.getAllFromIndex(
      'snapshots',
      'byTimestamp',
      undefined,
      1
    );
    return snapshots[0];
  }

  async getSnapshotsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<SystemSnapshot[]> {
    if (!this.db) await this.init();

    const range = IDBKeyRange.bound(startTime, endTime);
    return this.db!.getAllFromIndex('snapshots', 'byTimestamp', range);
  }

  async getPendingSyncSnapshots(): Promise<SystemSnapshot[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('snapshots', 'bySyncStatus', 'pending');
  }

  async getOfflineSnapshots(): Promise<SystemSnapshot[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('snapshots', 'byOffline', true);
  }

  async updateSnapshotSyncStatus(
    id: string,
    status: SnapshotMetadata['synchronizationStatus']
  ): Promise<void> {
    if (!this.db) await this.init();

    const snapshot = await this.getSnapshot(id);
    if (snapshot) {
      const updated: SystemSnapshot = {
        ...snapshot,
        metadata: {
          ...snapshot.metadata,
          synchronizationStatus: status,
        },
      };
      await this.db!.put('snapshots', updated);
    }
  }

  async saveCommand(command: DispatchCommand, isOffline = false): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('commands', { ...command, executedOffline: isOffline });
  }

  async getPendingCommands(): Promise<(DispatchCommand & { executedOffline: boolean })[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('commands', 'byStatus', 'pending');
  }

  async getOfflineCommands(): Promise<(DispatchCommand & { executedOffline: boolean })[]> {
    if (!this.db) await this.init();
    const allCommands = await this.db!.getAll('commands');
    return allCommands.filter((c) => c.executedOffline);
  }

  async updateCommandStatus(
    id: string,
    status: DispatchCommand['status']
  ): Promise<void> {
    if (!this.db) await this.init();

    const command = await this.db!.get('commands', id);
    if (command) {
      await this.db!.put('commands', { ...command, status });
    }
  }

  async getMonitoringPointsBySnapshot(
    snapshotId: string
  ): Promise<(MonitoringPoint & { snapshotId: string })[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('monitoringPoints', 'bySnapshotId', snapshotId);
  }

  async getMonitoringPointsByStatus(
    status: MonitoringPoint['status']
  ): Promise<(MonitoringPoint & { snapshotId: string })[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('monitoringPoints', 'byStatus', status);
  }

  async getSystemState(): Promise<{
    lastSyncTimestamp: number;
    isOffline: boolean;
    pendingSyncCount: number;
    currentSnapshotId: string | null;
  }> {
    if (!this.db) await this.init();

    const state = await this.db!.get('systemState', 'current');
    return (
      state || {
        lastSyncTimestamp: 0,
        isOffline: true,
        pendingSyncCount: 0,
        currentSnapshotId: null,
      }
    );
  }

  async updateSystemState(updates: Partial<{
    lastSyncTimestamp: number;
    isOffline: boolean;
    pendingSyncCount: number;
    currentSnapshotId: string | null;
  }>): Promise<void> {
    if (!this.db) await this.init();

    const currentState = await this.getSystemState();
    await this.db!.put('systemState', {
      id: 'current',
      ...currentState,
      ...updates,
    });
  }

  async getSnapshotCount(): Promise<number> {
    if (!this.db) await this.init();
    return this.db!.count('snapshots');
  }

  private async cleanupOldSnapshots(): Promise<void> {
    if (!this.db) return;

    const count = await this.getSnapshotCount();
    if (count > MAX_SNAPSHOTS) {
      const excess = count - MAX_SNAPSHOTS;
      const oldestSnapshots = await this.db!.getAllFromIndex(
        'snapshots',
        'byTimestamp',
        undefined,
        excess
      );

      const tx = this.db!.transaction(
        ['snapshots', 'monitoringPoints'],
        'readwrite'
      );

      for (const snapshot of oldestSnapshots) {
        await tx.objectStore('snapshots').delete(snapshot.metadata.id);
        const points = await this.getMonitoringPointsBySnapshot(snapshot.metadata.id);
        for (const point of points) {
          await tx.objectStore('monitoringPoints').delete(point.id);
        }
      }

      await tx.done;
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(
      ['snapshots', 'monitoringPoints', 'commands', 'systemState'],
      'readwrite'
    );

    await tx.objectStore('snapshots').clear();
    await tx.objectStore('monitoringPoints').clear();
    await tx.objectStore('commands').clear();
    await tx.objectStore('systemState').clear();

    await tx.done;
  }

  async exportData(): Promise<{
    snapshots: SystemSnapshot[];
    commands: (DispatchCommand & { executedOffline: boolean })[];
    systemState: ReturnType<SnapshotDatabase['getSystemState']>;
  }> {
    if (!this.db) await this.init();

    const [snapshots, commands, systemState] = await Promise.all([
      this.db!.getAll('snapshots'),
      this.db!.getAll('commands'),
      this.getSystemState(),
    ]);

    return { snapshots, commands, systemState };
  }

  async importData(data: {
    snapshots: SystemSnapshot[];
    commands: (DispatchCommand & { executedOffline: boolean })[];
    systemState: ReturnType<SnapshotDatabase['getSystemState']>;
  }): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(
      ['snapshots', 'monitoringPoints', 'commands', 'systemState'],
      'readwrite'
    );

    for (const snapshot of data.snapshots) {
      await tx.objectStore('snapshots').put(snapshot);
      for (const point of snapshot.monitoringPoints) {
        await tx.objectStore('monitoringPoints').put({
          ...point,
          snapshotId: snapshot.metadata.id,
        });
      }
    }

    for (const command of data.commands) {
      await tx.objectStore('commands').put(command);
    }

    await tx.objectStore('systemState').put({ id: 'current', ...data.systemState });

    await tx.done;
  }
}

export const snapshotDB = new SnapshotDatabase();
