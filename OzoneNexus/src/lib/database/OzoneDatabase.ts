import { openDB, DBSchema, IDBPDatabase } from "idb";
import { OzoneDataPoint, PolarVortexData, SyncStatus } from "@/types";

interface OzoneDB extends DBSchema {
  ozoneData: {
    key: string;
    value: OzoneDataPoint;
    indexes: { "by-timestamp": number; "by-version": string };
  };
  polarVortex: {
    key: string;
    value: PolarVortexData;
    indexes: { "by-timestamp": number; "by-region": string };
  };
  syncMetadata: {
    key: string;
    value: SyncStatus & { id: string };
  };
  pendingChanges: {
    key: string;
    value: {
      id: string;
      type: "add" | "update" | "delete";
      store: string;
      data: unknown;
      timestamp: number;
    };
  };
}

const DB_NAME = "OzoneNexusDB";
const DB_VERSION = 1;
const METADATA_KEY = "sync-status";

export class OzoneDatabase {
  private db: IDBPDatabase<OzoneDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OzoneDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const ozoneStore = db.createObjectStore("ozoneData", {
          keyPath: "id",
        });
        ozoneStore.createIndex("by-timestamp", "timestamp");
        ozoneStore.createIndex("by-version", "dataVersion");

        const vortexStore = db.createObjectStore("polarVortex", {
          keyPath: "id",
        });
        vortexStore.createIndex("by-timestamp", "timestamp");
        vortexStore.createIndex("by-region", "region");

        db.createObjectStore("syncMetadata", { keyPath: "id" });
        db.createObjectStore("pendingChanges", { keyPath: "id" });
      },
    });
  }

  private ensureDB(): IDBPDatabase<OzoneDB> {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  async addOzoneData(data: OzoneDataPoint): Promise<void> {
    const db = this.ensureDB();
    await db.put("ozoneData", data);
    await this.addPendingChange("add", "ozoneData", data);
  }

  async bulkAddOzoneData(data: OzoneDataPoint[]): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction("ozoneData", "readwrite");
    await Promise.all([...data.map((d) => tx.store.put(d)), tx.done]);
    await Promise.all(data.map((d) => this.addPendingChange("add", "ozoneData", d)));
  }

  async getOzoneDataByTimestampRange(
    start: number,
    end: number
  ): Promise<OzoneDataPoint[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex("ozoneData", "by-timestamp", IDBKeyRange.bound(start, end));
  }

  async getAllOzoneData(): Promise<OzoneDataPoint[]> {
    const db = this.ensureDB();
    return db.getAll("ozoneData");
  }

  async addPolarVortexData(data: PolarVortexData): Promise<void> {
    const db = this.ensureDB();
    await db.put("polarVortex", data);
    await this.addPendingChange("add", "polarVortex", data);
  }

  async bulkAddPolarVortexData(data: PolarVortexData[]): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction("polarVortex", "readwrite");
    await Promise.all([...data.map((d) => tx.store.put(d)), tx.done]);
    await Promise.all(data.map((d) => this.addPendingChange("add", "polarVortex", d)));
  }

  async getPolarVortexDataByRegion(
    region: "arctic" | "antarctic"
  ): Promise<PolarVortexData[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex("polarVortex", "by-region", region);
  }

  private async addPendingChange(
    type: "add" | "update" | "delete",
    store: string,
    data: unknown
  ): Promise<void> {
    const db = this.ensureDB();
    await db.add("pendingChanges", {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      store,
      data,
      timestamp: Date.now(),
    });
  }

  async getPendingChangesCount(): Promise<number> {
    const db = this.ensureDB();
    return db.count("pendingChanges");
  }

  async clearPendingChanges(): Promise<void> {
    const db = this.ensureDB();
    await db.clear("pendingChanges");
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const db = this.ensureDB();
    const metadata = await db.get("syncMetadata", METADATA_KEY);

    if (!metadata) {
      return {
        lastSync: 0,
        dataVersion: "1.0.0",
        pendingChanges: 0,
        isSyncing: false,
      };
    }

    return {
      lastSync: metadata.lastSync,
      dataVersion: metadata.dataVersion,
      pendingChanges: metadata.pendingChanges,
      isSyncing: metadata.isSyncing,
    };
  }

  async updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
    const db = this.ensureDB();
    const current = await this.getSyncStatus();
    await db.put("syncMetadata", {
      id: METADATA_KEY,
      ...current,
      ...status,
    });
  }

  async syncData(remoteData: {
    ozoneData: OzoneDataPoint[];
    polarVortexData: PolarVortexData[];
    dataVersion: string;
  }): Promise<void> {
    const db = this.ensureDB();

    await this.updateSyncStatus({ isSyncing: true });

    try {
      await this.bulkAddOzoneData(remoteData.ozoneData);
      await this.bulkAddPolarVortexData(remoteData.polarVortexData);

      await this.clearPendingChanges();

      await this.updateSyncStatus({
        lastSync: Date.now(),
        dataVersion: remoteData.dataVersion,
        pendingChanges: 0,
        isSyncing: false,
      });
    } catch (error) {
      await this.updateSyncStatus({ isSyncing: false });
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    await Promise.all([
      db.clear("ozoneData"),
      db.clear("polarVortex"),
      db.clear("pendingChanges"),
    ]);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const ozoneDatabase = new OzoneDatabase();
