export interface WaveObservationLog {
  id?: string;
  timestamp: number;
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  location: string;
  energyDensity?: number;
  breakingProbability?: number;
  source: "maritime" | "energy" | "simulation";
  quality: number;
}

export interface DataSyncRecord {
  id?: string;
  syncTime: number;
  sourceSystem: "maritime" | "energy";
  recordCount: number;
  status: "pending" | "completed" | "failed";
  dataHash: string;
}

export interface ShoreProtectionLog {
  id?: string;
  timestamp: number;
  structureType: string;
  structureHeight: number;
  structureWidth: number;
  protectionIndex: number;
  waveConditions: {
    waveHeight: number;
    wavePeriod: number;
  };
  stormIntensity?: number;
}

class WaveCacheDB {
  private dbName: string = "WaveNexusDB";
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB is not supported in this browser"));
          return;
        }

        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.error("IndexedDB error:", request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          
          this.db.onerror = (event) => {
            console.error("Database error:", event);
          };

          this.db.onversionchange = () => {
            if (this.db) {
              this.db.close();
            }
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log("IndexedDB upgrade needed, creating stores...");

          if (!db.objectStoreNames.contains("waveObservations")) {
            const observationStore = db.createObjectStore("waveObservations", {
              keyPath: "id",
            });
            observationStore.createIndex("timestamp", "timestamp", {
              unique: false,
            });
            observationStore.createIndex("location", "location", {
              unique: false,
            });
            observationStore.createIndex("source", "source", { unique: false });
          }

          if (!db.objectStoreNames.contains("syncRecords")) {
            const syncStore = db.createObjectStore("syncRecords", {
              keyPath: "id",
            });
            syncStore.createIndex("syncTime", "syncTime", { unique: false });
            syncStore.createIndex("sourceSystem", "sourceSystem", {
              unique: false,
            });
          }

          if (!db.objectStoreNames.contains("shoreProtectionLogs")) {
            const protectionStore = db.createObjectStore("shoreProtectionLogs", {
              keyPath: "id",
            });
            protectionStore.createIndex("timestamp", "timestamp", {
              unique: false,
            });
            protectionStore.createIndex("structureType", "structureType", {
              unique: false,
            });
          }
        };

        request.onblocked = () => {
          console.warn("IndexedDB open request blocked");
          reject(new Error("Database open blocked, please close other tabs"));
        };
      } catch (error) {
        console.error("IndexedDB init exception:", error);
        reject(error);
      }
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  async addWaveObservation(log: Omit<WaveObservationLog, "id">): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDB();
        const transaction = db.transaction(["waveObservations"], "readwrite");
        const store = transaction.objectStore("waveObservations");
        const request = store.add({
          ...log,
          id: crypto.randomUUID(),
        });

        request.onsuccess = () => resolve(request.result as string);
        request.onerror = () => {
          console.error("Error adding wave observation:", request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error("addWaveObservation exception:", error);
        reject(error);
      }
    });
  }

  async addWaveObservationsBatch(
    logs: Omit<WaveObservationLog, "id">[]
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["waveObservations"], "readwrite");
      const store = transaction.objectStore("waveObservations");
      const ids: string[] = [];

      logs.forEach((log) => {
        const request = store.add({
          ...log,
          id: crypto.randomUUID(),
        });
        request.onsuccess = () => ids.push(request.result as string);
      });

      transaction.oncomplete = () => resolve(ids);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getWaveObservations(
    startTime?: number,
    endTime?: number,
    source?: string
  ): Promise<WaveObservationLog[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["waveObservations"], "readonly");
      const store = transaction.objectStore("waveObservations");
      const index = store.index("timestamp");

      const range =
        startTime && endTime
          ? IDBKeyRange.bound(startTime, endTime)
          : startTime
          ? IDBKeyRange.lowerBound(startTime)
          : undefined;

      const request = range ? index.getAll(range) : index.getAll();

      request.onsuccess = () => {
        let results = request.result as WaveObservationLog[];
        if (source) {
          results = results.filter((log) => log.source === source);
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getWaveObservationsByLocation(
    location: string,
    limit: number = 100
  ): Promise<WaveObservationLog[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["waveObservations"], "readonly");
      const store = transaction.objectStore("waveObservations");
      const index = store.index("location");

      const request = index.getAll(IDBKeyRange.only(location), limit);

      request.onsuccess = () => resolve(request.result as WaveObservationLog[]);
      request.onerror = () => reject(request.error);
    });
  }

  async addSyncRecord(
    record: Omit<DataSyncRecord, "id">
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["syncRecords"], "readwrite");
      const store = transaction.objectStore("syncRecords");
      const request = store.add({
        ...record,
        id: crypto.randomUUID(),
      });

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncRecords(): Promise<DataSyncRecord[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["syncRecords"], "readonly");
      const store = transaction.objectStore("syncRecords");
      const index = store.index("syncTime");
      const request = index.getAll();

      request.onsuccess = () => {
        const results = request.result as DataSyncRecord[];
        resolve(results.filter((r) => r.status === "pending"));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addShoreProtectionLog(
    log: Omit<ShoreProtectionLog, "id">
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["shoreProtectionLogs"], "readwrite");
      const store = transaction.objectStore("shoreProtectionLogs");
      const request = store.add({
        ...log,
        id: crypto.randomUUID(),
      });

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getShoreProtectionLogs(
    startTime?: number,
    endTime?: number
  ): Promise<ShoreProtectionLog[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(["shoreProtectionLogs"], "readonly");
      const store = transaction.objectStore("shoreProtectionLogs");
      const index = store.index("timestamp");

      const range =
        startTime && endTime
          ? IDBKeyRange.bound(startTime, endTime)
          : undefined;

      const request = range ? index.getAll(range) : index.getAll();

      request.onsuccess = () =>
        resolve(request.result as ShoreProtectionLog[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getStatistics(): Promise<{
    totalObservations: number;
    maritimeRecords: number;
    energyRecords: number;
    simulationRecords: number;
    avgWaveHeight: number;
    avgWavePeriod: number;
  }> {
    try {
      const observations = await this.getWaveObservations();

      if (observations.length === 0) {
        return {
          totalObservations: 0,
          maritimeRecords: 0,
          energyRecords: 0,
          simulationRecords: 0,
          avgWaveHeight: 0,
          avgWavePeriod: 0,
        };
      }

      const totalHeight = observations.reduce(
        (sum, log) => sum + (log.waveHeight || 0),
        0
      );
      const totalPeriod = observations.reduce(
        (sum, log) => sum + (log.wavePeriod || 0),
        0
      );

      return {
        totalObservations: observations.length,
        maritimeRecords: observations.filter((log) => log.source === "maritime").length,
        energyRecords: observations.filter((log) => log.source === "energy").length,
        simulationRecords: observations.filter(
          (log) => log.source === "simulation"
        ).length,
        avgWaveHeight: totalHeight / observations.length,
        avgWavePeriod: totalPeriod / observations.length,
      };
    } catch (error) {
      console.error("getStatistics error:", error);
      return {
        totalObservations: 0,
        maritimeRecords: 0,
        energyRecords: 0,
        simulationRecords: 0,
        avgWaveHeight: 0,
        avgWavePeriod: 0,
      };
    }
  }

  async clearOldData(olderThan: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB();
      const transaction = db.transaction(
        ["waveObservations", "syncRecords", "shoreProtectionLogs"],
        "readwrite"
      );

      const observationStore =
        transaction.objectStore("waveObservations");
      const syncStore = transaction.objectStore("syncRecords");
      const protectionStore = transaction.objectStore("shoreProtectionLogs");

      const obsIndex = observationStore.index("timestamp");
      const syncIndex = syncStore.index("syncTime");
      const protIndex = protectionStore.index("timestamp");

      const obsRange = IDBKeyRange.upperBound(olderThan);
      const syncRange = IDBKeyRange.upperBound(olderThan);
      const protRange = IDBKeyRange.upperBound(olderThan);

      observationStore.delete(obsRange);
      syncStore.delete(syncRange);
      protectionStore.delete(protRange);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const waveCacheDB = new WaveCacheDB();
