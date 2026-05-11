import { openDB, DBSchema, IDBPDatabase } from "idb";
import { TrackingLog } from "@/types";

interface BirdTrackingDB extends DBSchema {
  trackingLogs: {
    key: string;
    value: TrackingLog;
    indexes: {
      "by-bird": string;
      "by-device": string;
      "by-timestamp": number;
      "by-sync-status": string;
    };
  };
  syncMetadata: {
    key: string;
    value: {
      lastSyncTime: number;
      lastSyncVersion: number;
      pendingChanges: number;
      conflictCount: number;
    };
  };
}

const DB_NAME = "BirdTrackingDB";
const DB_VERSION = 1;
const SYNC_BATCH_SIZE = 50;
const CONFLICT_RESOLUTION_STRATEGY = "latest-wins";

export class IndexedDBTrackingStore {
  private db: IDBPDatabase<BirdTrackingDB> | null = null;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private isSyncing = false;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<BirdTrackingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const trackingStore = db.createObjectStore("trackingLogs", {
          keyPath: "id",
        });
        trackingStore.createIndex("by-bird", "birdId");
        trackingStore.createIndex("by-device", "deviceId");
        trackingStore.createIndex("by-timestamp", "timestamp");
        trackingStore.createIndex("by-sync-status", "syncStatus");

        db.createObjectStore("syncMetadata");
      },
    });

    await this.initMetadata();
  }

  private async initMetadata(): Promise<void> {
    const metadata = await this.db?.get("syncMetadata", "global");
    if (!metadata) {
      await this.db?.put("syncMetadata", {
        lastSyncTime: 0,
        lastSyncVersion: 0,
        pendingChanges: 0,
        conflictCount: 0,
      }, "global");
    }
  }

  async addLog(log: Omit<TrackingLog, "version" | "syncStatus">): Promise<void> {
    await this.ensureDB();
    
    const newLog: TrackingLog = {
      ...log,
      version: 1,
      syncStatus: "local",
    };

    await this.db!.add("trackingLogs", newLog);
    await this.incrementPendingChanges();
    this.notifySyncListeners();
  }

  async bulkAddLogs(logs: Omit<TrackingLog, "version" | "syncStatus">[]): Promise<void> {
    await this.ensureDB();
    
    const tx = this.db!.transaction("trackingLogs", "readwrite");
    
    for (const log of logs) {
      const newLog: TrackingLog = {
        ...log,
        version: 1,
        syncStatus: "local",
      };
      tx.store.add(newLog);
    }

    await tx.done;
    await this.incrementPendingChanges(logs.length);
    this.notifySyncListeners();
  }

  async getLogsByBird(birdId: string, limit?: number): Promise<TrackingLog[]> {
    await this.ensureDB();
    
    const logs = await this.db!.getAllFromIndex(
      "trackingLogs",
      "by-bird",
      birdId
    );
    
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }

  async getLogsByTimeRange(start: Date, end: Date): Promise<TrackingLog[]> {
    await this.ensureDB();
    
    const logs = await this.db!.getAll("trackingLogs");
    return logs.filter(
      (log) => log.timestamp >= start && log.timestamp <= end
    );
  }

  async getUnsyncedLogs(): Promise<TrackingLog[]> {
    await this.ensureDB();
    
    return this.db!.getAllFromIndex(
      "trackingLogs",
      "by-sync-status",
      "local"
    );
  }

  async getConflictLogs(): Promise<TrackingLog[]> {
    await this.ensureDB();
    
    return this.db!.getAllFromIndex(
      "trackingLogs",
      "by-sync-status",
      "conflict"
    );
  }

  async syncWithRemote(
    remoteFetch: () => Promise<TrackingLog[]>,
    remotePush: (logs: TrackingLog[]) => Promise<void>
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, message: "Sync already in progress" };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      await this.ensureDB();

      const unsyncedLogs = await this.getUnsyncedLogs();
      if (unsyncedLogs.length > 0) {
        const batches = Math.ceil(unsyncedLogs.length / SYNC_BATCH_SIZE);
        for (let i = 0; i < batches; i++) {
          const batch = unsyncedLogs.slice(i * SYNC_BATCH_SIZE, (i + 1) * SYNC_BATCH_SIZE);
          try {
            await remotePush(batch);
            for (const log of batch) {
              log.syncStatus = "synced";
              await this.db!.put("trackingLogs", log);
            }
            result.pushed += batch.length;
          } catch (error) {
            result.errors.push(`Push batch ${i + 1} failed`);
          }
        }
      }

      const remoteLogs = await remoteFetch();
      for (const remoteLog of remoteLogs) {
        const localLog = await this.db!.get("trackingLogs", remoteLog.id);
        
        if (!localLog) {
          await this.db!.put("trackingLogs", remoteLog);
          result.pulled++;
        } else if (this.hasConflict(localLog, remoteLog)) {
          const resolved = this.resolveConflict(localLog, remoteLog);
          await this.db!.put("trackingLogs", resolved);
          result.conflicts++;
        }
      }

      await this.updateMetadata(result);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
    } finally {
      this.isSyncing = false;
    }

    this.notifySyncListeners();
    return result;
  }

  private hasConflict(local: TrackingLog, remote: TrackingLog): boolean {
    return local.version !== remote.version && local.syncStatus === "synced";
  }

  private resolveConflict(local: TrackingLog, remote: TrackingLog): TrackingLog {
    if (CONFLICT_RESOLUTION_STRATEGY === "latest-wins") {
      const localTime = local.timestamp.getTime();
      const remoteTime = remote.timestamp.getTime();
      
      if (remoteTime > localTime) {
        return { ...remote, syncStatus: "synced" };
      }
      return { ...local, version: Math.max(local.version, remote.version) + 1 };
    }
    
    return { ...local, syncStatus: "conflict" };
  }

  private async incrementPendingChanges(count: number = 1): Promise<void> {
    const metadata = await this.db!.get("syncMetadata", "global");
    if (metadata) {
      metadata.pendingChanges += count;
      await this.db!.put("syncMetadata", metadata, "global");
    }
  }

  private async updateMetadata(result: SyncResult): Promise<void> {
    const metadata = await this.db!.get("syncMetadata", "global");
    if (metadata) {
      metadata.lastSyncTime = Date.now();
      metadata.lastSyncVersion++;
      metadata.pendingChanges = Math.max(0, metadata.pendingChanges - result.pushed);
      metadata.conflictCount += result.conflicts;
      await this.db!.put("syncMetadata", metadata, "global");
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    await this.ensureDB();
    
    const metadata = await this.db!.get("syncMetadata", "global");
    const pendingCount = (await this.getUnsyncedLogs()).length;
    const conflictCount = (await this.getConflictLogs()).length;
    const totalLogs = await this.getTotalLogsCount();

    return {
      lastSyncTime: metadata?.lastSyncTime || 0,
      pendingChanges: pendingCount,
      conflictCount,
      totalLogs,
      isSyncing: this.isSyncing,
    };
  }

  async getTotalLogsCount(): Promise<number> {
    await this.ensureDB();
    return this.db!.count("trackingLogs");
  }

  subscribeToSyncChanges(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  private notifySyncListeners(): void {
    this.getSyncStatus().then((status) => {
      for (const listener of this.syncListeners) {
        listener(status);
      }
    });
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureDB();
    await this.db!.clear("trackingLogs");
    await this.initMetadata();
    this.notifySyncListeners();
  }

  async exportData(): Promise<string> {
    await this.ensureDB();
    const logs = await this.db!.getAll("trackingLogs");
    return JSON.stringify(logs, null, 2);
  }
}

export interface SyncStatus {
  lastSyncTime: number;
  pendingChanges: number;
  conflictCount: number;
  totalLogs: number;
  isSyncing: boolean;
}

export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
  message?: string;
}

export const trackingStore = new IndexedDBTrackingStore();

export function generateMockTrackingLogs(count: number = 50): Omit<TrackingLog, "version" | "syncStatus">[] {
  const birdIds = ["bird-001", "bird-002", "bird-003", "bird-004", "bird-005"];
  const deviceIds = ["GPS-001", "GPS-002", "GPS-003", "GPS-004", "GPS-005"];
  const species = ["丹顶鹤", "东方白鹳", "大天鹅", "小天鹅", "白枕鹤"];
  
  const logs: Omit<TrackingLog, "version" | "syncStatus">[] = [];
  const baseLat = 35;
  const baseLon = 115;

  for (let i = 0; i < count; i++) {
    const birdIndex = i % birdIds.length;
    const dayOffset = Math.floor(i / birdIds.length);
    
    logs.push({
      id: `log-${Date.now()}-${i}`,
      birdId: birdIds[birdIndex],
      location: {
        latitude: baseLat + (Math.random() - 0.5) * 20 + Math.sin(dayOffset / 5) * 5,
        longitude: baseLon + (Math.random() - 0.5) * 25 + Math.cos(dayOffset / 5) * 5,
        altitude: 10 + Math.random() * 500,
        timestamp: new Date(Date.now() - dayOffset * 86400000 - Math.random() * 3600000),
      },
      deviceId: deviceIds[birdIndex],
      signalStrength: 30 + Math.random() * 70,
      batteryLevel: 20 + Math.random() * 80,
      temperature: 10 + Math.random() * 25,
      heartRate: 60 + Math.random() * 40,
      timestamp: new Date(Date.now() - dayOffset * 86400000 - Math.random() * 3600000),
    });
  }

  return logs;
}
