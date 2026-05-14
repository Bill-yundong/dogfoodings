console.log('WaveCacheDB module loaded');

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
    console.log('WaveCacheDB.init() called');
    return new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) {
          console.warn('IndexedDB not supported, using memory fallback');
          resolve();
          return;
        }

        console.log('Opening IndexedDB...');
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.error('IndexedDB error:', request.error);
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('IndexedDB opened successfully');
          
          this.db.onerror = (event) => {
            console.error('Database error:', event);
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          console.log('IndexedDB upgrade needed...');
          const db = (event.target as IDBOpenDBRequest).result;

          try {
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
              console.log('waveObservations store created');
            }

            if (!db.objectStoreNames.contains("syncRecords")) {
              const syncStore = db.createObjectStore("syncRecords", {
                keyPath: "id",
              });
              syncStore.createIndex("syncTime", "syncTime", { unique: false });
              syncStore.createIndex("sourceSystem", "sourceSystem", {
                unique: false,
              });
              console.log('syncRecords store created');
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
              console.log('shoreProtectionLogs store created');
            }
          } catch (e) {
            console.error('Error during upgrade:', e);
          }
        };

        request.onblocked = () => {
          console.warn('IndexedDB open blocked');
          resolve();
        };
      } catch (error) {
        console.error('WaveCacheDB init exception:', error);
        resolve();
      }
    });
  }

  private ensureDB(): IDBDatabase | null {
    return this.db;
  }

  async getStatistics(): Promise<{
    totalObservations: number;
    maritimeRecords: number;
    energyRecords: number;
    simulationRecords: number;
    avgWaveHeight: number;
    avgWavePeriod: number;
  }> {
    console.log('getStatistics called');
    try {
      const observations = await this.getWaveObservations();
      console.log(`Got ${observations.length} observations`);

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
      console.error('getStatistics error:', error);
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

  async getWaveObservations(
    startTime?: number,
    endTime?: number,
    source?: string
  ): Promise<WaveObservationLog[]> {
    const db = this.ensureDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(["waveObservations"], "readonly");
        const store = transaction.objectStore("waveObservations");
        const index = store.index("timestamp");

        const request = index.getAll();

        request.onsuccess = () => {
          let results = request.result as WaveObservationLog[];
          if (source) {
            results = results.filter((log) => log.source === source);
          }
          resolve(results);
        };
        request.onerror = () => resolve([]);
      } catch (e) {
        console.error('getWaveObservations error:', e);
        resolve([]);
      }
    });
  }

  async addWaveObservation(log: Omit<WaveObservationLog, "id">): Promise<string> {
    const id = crypto.randomUUID();
    try {
      const db = this.ensureDB();
      if (!db) return id;

      const transaction = db.transaction(["waveObservations"], "readwrite");
      const store = transaction.objectStore("waveObservations");
      store.add({ ...log, id });
    } catch (e) {
      console.error('addWaveObservation error:', e);
    }
    return id;
  }

  async addWaveObservationsBatch(
    logs: Omit<WaveObservationLog, "id">[]
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const log of logs) {
      ids.push(await this.addWaveObservation(log));
    }
    return ids;
  }

  async addSyncRecord(
    record: Omit<DataSyncRecord, "id">
  ): Promise<string> {
    const id = crypto.randomUUID();
    try {
      const db = this.ensureDB();
      if (!db) return id;

      const transaction = db.transaction(["syncRecords"], "readwrite");
      const store = transaction.objectStore("syncRecords");
      store.add({ ...record, id });
    } catch (e) {
      console.error('addSyncRecord error:', e);
    }
    return id;
  }

  async clearOldData(olderThan: number): Promise<void> {
    console.log('clearOldData called with:', olderThan);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const waveCacheDB = new WaveCacheDB();
console.log('waveCacheDB instance created');