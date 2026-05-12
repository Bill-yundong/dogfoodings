import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Snapshot, SecurityNode, AccessEvent } from '@/types/security';

interface VaultDB extends DBSchema {
  snapshots: {
    key: string;
    value: Snapshot;
    indexes: { 'by-timestamp': number };
  };
  securityNodes: {
    key: string;
    value: SecurityNode;
    indexes: { 'by-status': string; 'by-level': number };
  };
  accessEvents: {
    key: string;
    value: AccessEvent;
    indexes: { 'by-timestamp': number; 'by-node': string; 'by-result': string };
  };
  biometricHashes: {
    key: string;
    value: {
      id: string;
      userId: string;
      hashValue: string;
      hashType: string;
      timestamp: number;
    };
    indexes: { 'by-user': string; 'by-type': string };
  };
}

const DB_NAME = 'VaultSafeDB';
const DB_VERSION = 1;

export class SnapshotStore {
  private db: IDBPDatabase<VaultDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-timestamp', 'timestamp');

        const nodeStore = db.createObjectStore('securityNodes', { keyPath: 'id' });
        nodeStore.createIndex('by-status', 'status');
        nodeStore.createIndex('by-level', 'level');

        const eventStore = db.createObjectStore('accessEvents', { keyPath: 'id' });
        eventStore.createIndex('by-timestamp', 'timestamp');
        eventStore.createIndex('by-node', 'nodeId');
        eventStore.createIndex('by-result', 'result');

        const bioStore = db.createObjectStore('biometricHashes', { keyPath: 'id' });
        bioStore.createIndex('by-user', 'userId');
        bioStore.createIndex('by-type', 'hashType');
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<VaultDB>> {
    if (!this.db) await this.init();
    return this.db!;
  }

  async createSnapshot(nodes: SecurityNode[], events: AccessEvent[]): Promise<Snapshot> {
    const db = await this.ensureDB();
    const timestamp = Date.now();
    
    const snapshot: Snapshot = {
      id: `snap-${timestamp}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp,
      nodes: [...nodes],
      events: [...events],
      hash: this.generateHash(nodes, events, timestamp),
    };

    await db.add('snapshots', snapshot);
    return snapshot;
  }

  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    const db = await this.ensureDB();
    return db.get('snapshots', id);
  }

  async getRecentSnapshots(limit: number = 10): Promise<Snapshot[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('snapshots', 'by-timestamp', undefined, limit);
  }

  async getSnapshotsInTimeRange(start: number, end: number): Promise<Snapshot[]> {
    const db = await this.ensureDB();
    const range = IDBKeyRange.bound(start, end);
    return db.getAllFromIndex('snapshots', 'by-timestamp', range);
  }

  async deleteSnapshot(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('snapshots', id);
  }

  async clearOldSnapshots(beforeTimestamp: number): Promise<void> {
    const db = await this.ensureDB();
    const range = IDBKeyRange.upperBound(beforeTimestamp, true);
    const keys = await db.getAllKeysFromIndex('snapshots', 'by-timestamp', range);
    
    for (const key of keys) {
      await db.delete('snapshots', key);
    }
  }

  async saveNode(node: SecurityNode): Promise<void> {
    const db = await this.ensureDB();
    await db.put('securityNodes', node);
  }

  async saveNodes(nodes: SecurityNode[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('securityNodes', 'readwrite');
    
    for (const node of nodes) {
      await tx.store.put(node);
    }
    
    await tx.done;
  }

  async getNodes(): Promise<SecurityNode[]> {
    const db = await this.ensureDB();
    return db.getAll('securityNodes');
  }

  async getNodesByStatus(status: SecurityNode['status']): Promise<SecurityNode[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('securityNodes', 'by-status', status);
  }

  async saveEvent(event: AccessEvent): Promise<void> {
    const db = await this.ensureDB();
    await db.put('accessEvents', event);
  }

  async saveEvents(events: AccessEvent[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('accessEvents', 'readwrite');
    
    for (const event of events) {
      await tx.store.put(event);
    }
    
    await tx.done;
  }

  async getRecentEvents(limit: number = 50): Promise<AccessEvent[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('accessEvents', 'by-timestamp', undefined, limit);
  }

  async getEventsByNode(nodeId: string): Promise<AccessEvent[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('accessEvents', 'by-node', nodeId);
  }

  private generateHash(nodes: SecurityNode[], events: AccessEvent[], timestamp: number): string {
    const data = JSON.stringify({ nodes: nodes.map(n => n.id), events: events.map(e => e.id), timestamp });
    let hash = 0;
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(32, '0');
  }

  async getStats(): Promise<{
    snapshotCount: number;
    nodeCount: number;
    eventCount: number;
    oldestSnapshot: number;
    newestSnapshot: number;
  }> {
    const db = await this.ensureDB();
    
    const [snapshots, nodes, events] = await Promise.all([
      db.getAll('snapshots'),
      db.getAll('securityNodes'),
      db.getAll('accessEvents'),
    ]);

    const timestamps = snapshots.map(s => s.timestamp);

    return {
      snapshotCount: snapshots.length,
      nodeCount: nodes.length,
      eventCount: events.length,
      oldestSnapshot: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestSnapshot: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const snapshotStore = new SnapshotStore();
