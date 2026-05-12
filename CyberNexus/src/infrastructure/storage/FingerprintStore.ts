import { STORAGE_CONFIG, RISK_THRESHOLDS } from '../../shared/constants/app.constants';
import { generateFeatureHash } from '../../shared/utils/traffic.utils';
import type {
  TrafficFeature,
  NormalizedTraffic,
  TrafficFingerprint,
  ClusterResult,
  Statistics,
} from '../../domain/entities/traffic.entity';

export type ObjectStoreName = 'trafficFeatures' | 'normalizedTraffic' | 'fingerprints' | 'clusterResults' | 'syncEvents';

export class FingerprintStore {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;

  constructor(
    dbName = STORAGE_CONFIG.DB_NAME,
    dbVersion = STORAGE_CONFIG.DB_VERSION
  ) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('fingerprints')) {
      const fingerprintStore = db.createObjectStore('fingerprints', { keyPath: 'id' });
      fingerprintStore.createIndex('featureHash', 'featureHash', { unique: false });
      fingerprintStore.createIndex('firstSeen', 'firstSeen', { unique: false });
      fingerprintStore.createIndex('lastSeen', 'lastSeen', { unique: false });
      fingerprintStore.createIndex('avgRiskScore', 'avgRiskScore', { unique: false });
      fingerprintStore.createIndex('clusterLabel', 'clusterLabel', { unique: false });
    }

    if (!db.objectStoreNames.contains('trafficFeatures')) {
      const featureStore = db.createObjectStore('trafficFeatures', { keyPath: 'id' });
      featureStore.createIndex('timestamp', 'timestamp', { unique: false });
      featureStore.createIndex('sourceIP', 'sourceIP', { unique: false });
      featureStore.createIndex('destinationIP', 'destinationIP', { unique: false });
      featureStore.createIndex('protocol', 'protocol', { unique: false });
    }

    if (!db.objectStoreNames.contains('normalizedTraffic')) {
      const normalizedStore = db.createObjectStore('normalizedTraffic', { keyPath: 'featureId' });
      normalizedStore.createIndex('timestamp', 'timestamp', { unique: false });
      normalizedStore.createIndex('classification', 'classification', { unique: false });
      normalizedStore.createIndex('riskScore', 'riskScore', { unique: false });
    }

    if (!db.objectStoreNames.contains('clusterResults')) {
      const clusterStore = db.createObjectStore('clusterResults', { keyPath: 'clusterId' });
      clusterStore.createIndex('isAPT', 'isAPT', { unique: false });
      clusterStore.createIndex('confidence', 'confidence', { unique: false });
      clusterStore.createIndex('anomalyScore', 'anomalyScore', { unique: false });
    }

    if (!db.objectStoreNames.contains('syncEvents')) {
      const syncStore = db.createObjectStore('syncEvents', { keyPath: 'eventId' });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('source', 'source', { unique: false });
      syncStore.createIndex('type', 'type', { unique: false });
    }
  }

  private async getStore(
    storeName: ObjectStoreName,
    mode: IDBTransactionMode
  ): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  async addTrafficFeature(feature: TrafficFeature): Promise<void> {
    const store = await this.getStore('trafficFeatures', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(feature);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addNormalizedTraffic(normalized: NormalizedTraffic): Promise<void> {
    const store = await this.getStore('normalizedTraffic', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(normalized);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateOrCreateFingerprint(feature: TrafficFeature, normalized: NormalizedTraffic): Promise<void> {
    const featureHash = generateFeatureHash(feature);
    const existing = await this.getFingerprintByHash(featureHash);

    if (existing) {
      existing.lastSeen = Date.now();
      existing.occurrenceCount += 1;
      existing.avgRiskScore = (existing.avgRiskScore * (existing.occurrenceCount - 1) + normalized.riskScore) / existing.occurrenceCount;
      if (!existing.associatedIPs.includes(feature.sourceIP)) {
        existing.associatedIPs.push(feature.sourceIP);
      }
      await this.updateFingerprint(existing);
    } else {
      const fingerprint: TrafficFingerprint = {
        id: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        featureHash,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        occurrenceCount: 1,
        avgRiskScore: normalized.riskScore,
        associatedIPs: [feature.sourceIP],
      };
      await this.addFingerprint(fingerprint);
    }
  }

  async addFingerprint(fingerprint: TrafficFingerprint): Promise<void> {
    const store = await this.getStore('fingerprints', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(fingerprint);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateFingerprint(fingerprint: TrafficFingerprint): Promise<void> {
    const store = await this.getStore('fingerprints', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(fingerprint);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFingerprintByHash(featureHash: string): Promise<TrafficFingerprint | null> {
    const store = await this.getStore('fingerprints', 'readonly');
    const index = store.index('featureHash');

    return new Promise((resolve, reject) => {
      const request = index.get(featureHash);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async addClusterResult(result: ClusterResult): Promise<void> {
    const store = await this.getStore('clusterResults', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTrafficFeaturesByTimeRange(startTime: number, endTime: number): Promise<TrafficFeature[]> {
    const store = await this.getStore('trafficFeatures', 'readonly');
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getNormalizedTrafficByTimeRange(startTime: number, endTime: number): Promise<NormalizedTraffic[]> {
    const store = await this.getStore('normalizedTraffic', 'readonly');
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getHighRiskFingerprints(threshold: number = RISK_THRESHOLDS.MEDIUM): Promise<TrafficFingerprint[]> {
    const store = await this.getStore('fingerprints', 'readonly');
    const index = store.index('avgRiskScore');
    const range = IDBKeyRange.lowerBound(threshold);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAPTClusters(): Promise<ClusterResult[]> {
    const store = await this.getStore('clusterResults', 'readonly');
    const index = store.index('isAPT');
    const range = IDBKeyRange.only(true);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async syncWithDefenseHub(data: {
    type: 'features' | 'fingerprints' | 'clusters';
    payload: unknown[];
  }): Promise<{ success: boolean; syncedCount: number }> {
    const eventId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const syncEvent = {
      eventId,
      type: 'sync' as const,
      timestamp: Date.now(),
      source: 'audit-terminal' as const,
      payload: data,
      severity: 'medium' as const,
    };

    const store = await this.getStore('syncEvents', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.add(syncEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return {
      success: true,
      syncedCount: data.payload.length,
    };
  }

  async getStatistics(): Promise<Statistics> {
    const [features, fingerprints, highRisk, aptClusters] = await Promise.all([
      this.countRecords('trafficFeatures'),
      this.countRecords('fingerprints'),
      this.getHighRiskFingerprints(),
      this.getAPTClusters(),
    ]);

    return {
      totalFeatures: features,
      totalFingerprints: fingerprints,
      highRiskCount: highRisk.length,
      aptClusterCount: aptClusters.length,
    };
  }

  private async countRecords(storeName: ObjectStoreName): Promise<number> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupOldData(olderThan: number): Promise<number> {
    const store = await this.getStore('trafficFeatures', 'readwrite');
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(olderThan);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async clearAll(): Promise<void> {
    const stores: ObjectStoreName[] = ['trafficFeatures', 'normalizedTraffic', 'fingerprints', 'clusterResults', 'syncEvents'];
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}
