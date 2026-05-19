import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { SnapshotRecord } from '@/types/robot';

interface RobotDB extends DBSchema {
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: {
      'by-robot-id': string;
      'by-timestamp': number;
      'by-robot-timestamp': [string, number];
    };
  };
  simulation_runs: {
    key: string;
    value: {
      id: string;
      startTime: number;
      endTime?: number;
      robotCount: number;
      name: string;
    };
  };
}

const DB_NAME = 'robot_snapshots_db';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const RUN_STORE = 'simulation_runs';

class RobotIndexedDB {
  private db: IDBPDatabase<RobotDB> | null = null;
  private maxSnapshotsPerRobot: number = 10000;
  private batchSize: number = 50;
  private pendingSnapshots: SnapshotRecord[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(maxSnapshotsPerRobot: number = 10000) {
    this.maxSnapshotsPerRobot = maxSnapshotsPerRobot;
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<RobotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, {
            keyPath: 'id',
            autoIncrement: false,
          });
          snapshotStore.createIndex('by-robot-id', 'robotId');
          snapshotStore.createIndex('by-timestamp', 'timestamp');
          snapshotStore.createIndex('by-robot-timestamp', ['robotId', 'timestamp']);
        }

        if (!db.objectStoreNames.contains(RUN_STORE)) {
          db.createObjectStore(RUN_STORE, { keyPath: 'id' });
        }
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<RobotDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  generateId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async addSnapshot(snapshot: SnapshotRecord): Promise<void> {
    const db = await this.ensureDB();
    const record: SnapshotRecord = {
      ...snapshot,
      id: snapshot.id || this.generateId(),
    };
    await db.put(SNAPSHOT_STORE, record);
    await this.enforceMaxSnapshots(snapshot.robotId);
  }

  async addSnapshotsBatch(snapshots: SnapshotRecord[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    const store = tx.store;

    for (const snapshot of snapshots) {
      const record: SnapshotRecord = {
        ...snapshot,
        id: snapshot.id || this.generateId(),
      };
      store.put(record);
    }

    await tx.done;

    const robotIds = [...new Set(snapshots.map(s => s.robotId))];
    for (const robotId of robotIds) {
      await this.enforceMaxSnapshots(robotId);
    }
  }

  async queueSnapshot(snapshot: SnapshotRecord): Promise<void> {
    this.pendingSnapshots.push({
      ...snapshot,
      id: snapshot.id || this.generateId(),
    });

    if (this.pendingSnapshots.length >= this.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
        this.batchTimeout = null;
      }, 100);
    }
  }

  async flushBatch(): Promise<void> {
    if (this.pendingSnapshots.length === 0) return;

    const batch = this.pendingSnapshots.splice(0, this.batchSize);
    await this.addSnapshotsBatch(batch);
  }

  async getSnapshot(id: string): Promise<SnapshotRecord | undefined> {
    const db = await this.ensureDB();
    return db.get(SNAPSHOT_STORE, id);
  }

  async getSnapshotsByRobot(
    robotId: string,
    limit?: number,
    startTime?: number,
    endTime?: number
  ): Promise<SnapshotRecord[]> {
    const db = await this.ensureDB();
    const index = db.transaction(SNAPSHOT_STORE).store.index('by-robot-timestamp');

    const results: SnapshotRecord[] = [];
    const lowerBound: [string, number] = [robotId, startTime || 0];
    const upperBound: [string, number] = [robotId, endTime || Date.now()];
    const range = IDBKeyRange.bound(lowerBound, upperBound);

    let cursor = await index.openCursor(range, 'prev');
    let count = 0;

    while (cursor && (!limit || count < limit)) {
      results.unshift(cursor.value);
      count++;
      cursor = await cursor.continue();
    }

    return results;
  }

  async getSnapshotCountByRobot(robotId: string): Promise<number> {
    const db = await this.ensureDB();
    const index = db.transaction(SNAPSHOT_STORE).store.index('by-robot-id');
    return index.count(robotId);
  }

  async getLatestSnapshot(robotId: string): Promise<SnapshotRecord | undefined> {
    const snapshots = await this.getSnapshotsByRobot(robotId, 1);
    return snapshots[0];
  }

  async getTotalSnapshotCount(): Promise<number> {
    const db = await this.ensureDB();
    return db.count(SNAPSHOT_STORE);
  }

  async deleteSnapshotsByRobot(robotId: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    const index = tx.store.index('by-robot-id');

    let cursor = await index.openCursor(robotId);
    while (cursor) {
      cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  async deleteOldSnapshots(robotId: string, olderThan: number): Promise<number> {
    const db = await this.ensureDB();
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    const index = tx.store.index('by-robot-timestamp');

    const upperBound: [string, number] = [robotId, olderThan];
    const range = IDBKeyRange.upperBound(upperBound);

    let cursor = await index.openCursor(range);
    let deleted = 0;

    while (cursor) {
      cursor.delete();
      deleted++;
      cursor = await cursor.continue();
    }

    await tx.done;
    return deleted;
  }

  private async enforceMaxSnapshots(robotId: string): Promise<void> {
    const count = await this.getSnapshotCountByRobot(robotId);
    if (count > this.maxSnapshotsPerRobot) {
      const toDelete = count - this.maxSnapshotsPerRobot;
      const snapshots = await this.getSnapshotsByRobot(robotId, toDelete);
      if (snapshots.length > 0) {
        const oldestTimestamp = snapshots[snapshots.length - 1].timestamp;
        await this.deleteOldSnapshots(robotId, oldestTimestamp);
      }
    }
  }

  async exportAllSnapshots(robotId?: string): Promise<string> {
    let snapshots: SnapshotRecord[];
    if (robotId) {
      snapshots = await this.getSnapshotsByRobot(robotId);
    } else {
      const db = await this.ensureDB();
      snapshots = await db.getAll(SNAPSHOT_STORE);
    }

    return JSON.stringify({
      exportTime: Date.now(),
      count: snapshots.length,
      robotId,
      data: snapshots,
    }, null, 2);
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction([SNAPSHOT_STORE, RUN_STORE], 'readwrite');
    await tx.objectStore(SNAPSHOT_STORE).clear();
    await tx.objectStore(RUN_STORE).clear();
    await tx.done;
  }

  async close(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      await this.flushBatch();
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getPendingCount(): number {
    return this.pendingSnapshots.length;
  }
}

export const robotDB = new RobotIndexedDB(10000);

export const initDatabase = async (): Promise<void> => {
  await robotDB.init();
};

export const closeDatabase = async (): Promise<void> => {
  await robotDB.close();
};
