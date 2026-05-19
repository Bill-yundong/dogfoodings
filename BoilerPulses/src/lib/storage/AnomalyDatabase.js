import { openDB } from 'idb';

const DB_NAME = 'boiler-pulses-db';
const DB_VERSION = 1;

const STORES = {
  ANOMALY_SNAPSHOTS: 'anomaly_snapshots',
  WAVEFORM_DATA: 'waveform_data',
  OPTIMIZATION_RECORDS: 'optimization_records',
  SYNC_LOGS: 'sync_logs',
  SYSTEM_EVENTS: 'system_events'
};

export class AnomalyDatabase {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(STORES.ANOMALY_SNAPSHOTS)) {
          const anomalyStore = db.createObjectStore(STORES.ANOMALY_SNAPSHOTS, {
            keyPath: 'id',
            autoIncrement: true
          });
          anomalyStore.createIndex('timestamp', 'timestamp');
          anomalyStore.createIndex('anomalyType', 'anomalyType');
          anomalyStore.createIndex('severity', 'severity');
        }
        if (!db.objectStoreNames.contains(STORES.WAVEFORM_DATA)) {
          const waveformStore = db.createObjectStore(STORES.WAVEFORM_DATA, {
            keyPath: 'id',
            autoIncrement: true
          });
          waveformStore.createIndex('snapshotId', 'snapshotId');
          waveformStore.createIndex('parameter', 'parameter');
          waveformStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORES.OPTIMIZATION_RECORDS)) {
          const optStore = db.createObjectStore(STORES.OPTIMIZATION_RECORDS, {
            keyPath: 'id',
            autoIncrement: true
          });
          optStore.createIndex('timestamp', 'timestamp');
          optStore.createIndex('snapshotId', 'snapshotId');
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_LOGS)) {
          const syncStore = db.createObjectStore(STORES.SYNC_LOGS, {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('source', 'source');
          syncStore.createIndex('target', 'target');
        }
        if (!db.objectStoreNames.contains(STORES.SYSTEM_EVENTS)) {
          const eventStore = db.createObjectStore(STORES.SYSTEM_EVENTS, {
            keyPath: 'id',
            autoIncrement: true
          });
          eventStore.createIndex('timestamp', 'timestamp');
          eventStore.createIndex('eventType', 'eventType');
        }
      }
    });
    return this.db;
  }

  async saveAnomalySnapshot(anomalyData, waveformData) {
    await this.ready;
    const tx = this.db.transaction(
      [STORES.ANOMALY_SNAPSHOTS, STORES.WAVEFORM_DATA],
      'readwrite'
    );
    const anomalyStore = tx.objectStore(STORES.ANOMALY_SNAPSHOTS);
    const waveformStore = tx.objectStore(STORES.WAVEFORM_DATA);
    const snapshotRecord = {
      timestamp: anomalyData.timestamp,
      anomalyType: anomalyData.type,
      severity: anomalyData.severity || 'medium',
      description: anomalyData.description || '',
      duration: anomalyData.duration || 0,
      parameters: anomalyData.parameters || {},
      efficiencyBefore: anomalyData.efficiencyBefore,
      efficiencyAfter: anomalyData.efficiencyAfter,
      rootCause: anomalyData.rootCause || null,
      actionsTaken: anomalyData.actionsTaken || [],
      notes: anomalyData.notes || '',
      waveformCount: waveformData.length
    };
    const snapshotId = await anomalyStore.add(snapshotRecord);
    for (const point of waveformData) {
      await waveformStore.add({
        snapshotId,
        parameter: point.parameter,
        timestamp: point.timestamp,
        value: point.value,
        unit: point.unit || ''
      });
    }
    await tx.done;
    return snapshotId;
  }

  async getAnomalySnapshots(options = {}) {
    await this.ready;
    const { limit = 50, offset = 0, type, startDate, endDate } = options;
    const tx = this.db.transaction(STORES.ANOMALY_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORES.ANOMALY_SNAPSHOTS);
    const index = store.index('timestamp');
    let cursor = await index.openCursor(null, 'prev');
    const results = [];
    let count = 0;
    let skipped = 0;
    while (cursor && results.length < limit) {
      const value = cursor.value;
      if (type && value.anomalyType !== type) {
        cursor = await cursor.continue();
        continue;
      }
      if (startDate && value.timestamp < startDate) {
        cursor = await cursor.continue();
        continue;
      }
      if (endDate && value.timestamp > endDate) {
        cursor = await cursor.continue();
        continue;
      }
      if (skipped < offset) {
        skipped++;
        cursor = await cursor.continue();
        continue;
      }
      results.push({ id: cursor.primaryKey, ...value });
      cursor = await cursor.continue();
    }
    await tx.done;
    return results;
  }

  async getAnomalyById(id) {
    await this.ready;
    return this.db.get(STORES.ANOMALY_SNAPSHOTS, id);
  }

  async getWaveformBySnapshotId(snapshotId) {
    await this.ready;
    const tx = this.db.transaction(STORES.WAVEFORM_DATA, 'readonly');
    const store = tx.objectStore(STORES.WAVEFORM_DATA);
    const index = store.index('snapshotId');
    const results = await index.getAll(snapshotId);
    await tx.done;
    return results;
  }

  async deleteAnomalySnapshot(id) {
    await this.ready;
    const tx = this.db.transaction(
      [STORES.ANOMALY_SNAPSHOTS, STORES.WAVEFORM_DATA],
      'readwrite'
    );
    const anomalyStore = tx.objectStore(STORES.ANOMALY_SNAPSHOTS);
    const waveformStore = tx.objectStore(STORES.WAVEFORM_DATA);
    const waveformIndex = waveformStore.index('snapshotId');
    let cursor = await waveformIndex.openCursor(snapshotId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await anomalyStore.delete(id);
    await tx.done;
  }

  async saveOptimizationRecord(record) {
    await this.ready;
    return this.db.add(STORES.OPTIMIZATION_RECORDS, {
      timestamp: Date.now(),
      ...record
    });
  }

  async getOptimizationRecords(limit = 100) {
    await this.ready;
    const tx = this.db.transaction(STORES.OPTIMIZATION_RECORDS, 'readonly');
    const store = tx.objectStore(STORES.OPTIMIZATION_RECORDS);
    const index = store.index('timestamp');
    const results = [];
    let cursor = await index.openCursor(null, 'prev');
    while (cursor && results.length < limit) {
      results.push({ id: cursor.primaryKey, ...cursor.value });
      cursor = await cursor.continue();
    }
    await tx.done;
    return results;
  }

  async saveSyncLog(log) {
    await this.ready;
    return this.db.add(STORES.SYNC_LOGS, {
      timestamp: Date.now(),
      ...log
    });
  }

  async saveSystemEvent(event) {
    await this.ready;
    return this.db.add(STORES.SYSTEM_EVENTS, {
      timestamp: Date.now(),
      ...event
    });
  }

  async getSystemEvents(limit = 100) {
    await this.ready;
    const tx = this.db.transaction(STORES.SYSTEM_EVENTS, 'readonly');
    const store = tx.objectStore(STORES.SYSTEM_EVENTS);
    const index = store.index('timestamp');
    const results = [];
    let cursor = await index.openCursor(null, 'prev');
    while (cursor && results.length < limit) {
      results.push({ id: cursor.primaryKey, ...cursor.value });
      cursor = await cursor.continue();
    }
    await tx.done;
    return results;
  }

  async clearAllData() {
    await this.ready;
    const tx = this.db.transaction(
      Object.values(STORES),
      'readwrite'
    );
    for (const storeName of Object.values(STORES)) {
      await tx.objectStore(storeName).clear();
    }
    await tx.done;
  }

  async getStats() {
    await this.ready;
    const stats = {};
    for (const storeName of Object.values(STORES)) {
      const tx = this.db.transaction(storeName, 'readonly');
      const count = await tx.objectStore(storeName).count();
      stats[storeName] = count;
      await tx.done;
    }
    return stats;
  }

  async exportData() {
    await this.ready;
    const data = {};
    for (const storeName of Object.values(STORES)) {
      data[storeName] = await this.db.getAll(storeName);
    }
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString) {
    await this.ready;
    const data = JSON.parse(jsonString);
    const tx = this.db.transaction(
      Object.values(STORES),
      'readwrite'
    );
    for (const storeName of Object.values(STORES)) {
      if (data[storeName]) {
        const store = tx.objectStore(storeName);
        for (const record of data[storeName]) {
          await store.put(record);
        }
      }
    }
    await tx.done;
  }
}

export const anomalyDB = new AnomalyDatabase();
