import { STORAGE_CONFIG } from '../../core/constants';
import type { TrafficFeature, NormalizedTraffic, TrafficFingerprint, ClusterResult, Statistics } from '../../core/types';

type ObjectStoreName = 'trafficFeatures' | 'normalizedTraffic' | 'fingerprints' | 'clusterResults';

export class FingerprintStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, STORAGE_CONFIG.DB_VERSION);

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
      const store = db.createObjectStore('fingerprints', { keyPath: 'id' });
      store.createIndex('featureHash', 'featureHash', { unique: false });
      store.createIndex('firstSeen', 'firstSeen', { unique: false });
      store.createIndex('lastSeen', 'lastSeen', { unique: false });
      store.createIndex('avgRiskScore', 'avgRiskScore', { unique: false });
    }

    if (!db.objectStoreNames.contains('trafficFeatures')) {
      const store = db.createObjectStore('trafficFeatures', { keyPath: 'id' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('sourceIP', 'sourceIP', { unique: false });
      store.createIndex('destIP', 'destIP', { unique: false });
      store.createIndex('protocol', 'protocol', { unique: false });
    }

    if (!db.objectStoreNames.contains('normalizedTraffic')) {
      const store = db.createObjectStore('normalizedTraffic', { keyPath: 'featureId' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('classification', 'classification', { unique: false });
      store.createIndex('riskScore', 'riskScore', { unique: false });
    }

    if (!db.objectStoreNames.contains('clusterResults')) {
      const store = db.createObjectStore('clusterResults', { keyPath: 'clusterId' });
      store.createIndex('isAPT', 'isAPT', { unique: false });
      store.createIndex('confidence', 'confidence', { unique: false });
      store.createIndex('anomalyScore', 'anomalyScore', { unique: false });
    }
  }

  private async getStore(storeName: ObjectStoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
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

  async getTrafficFeatures(limit?: number): Promise<TrafficFeature[]> {
    const store = await this.getStore('trafficFeatures', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result.sort((a, b) => b.timestamp - a.timestamp);
        if (limit) results = results.slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getNormalizedTraffic(limit?: number): Promise<NormalizedTraffic[]> {
    const store = await this.getStore('normalizedTraffic', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result.sort((a, b) => b.timestamp - a.timestamp);
        if (limit) results = results.slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
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

  async getFingerprints(limit?: number): Promise<TrafficFingerprint[]> {
    const store = await this.getStore('fingerprints', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result.sort((a, b) => b.lastSeen - a.firstSeen);
        if (limit) results = results.slice(0, limit);
        resolve(results);
      };
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

  async getClusterResults(limit?: number): Promise<ClusterResult[]> {
    const store = await this.getStore('clusterResults', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result;
        if (limit) results = results.slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async countRecords(storeName: ObjectStoreName): Promise<number> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getHighRiskFingerprints(threshold: number): Promise<TrafficFingerprint[]> {
    const store = await this.getStore('fingerprints', 'readonly');
    const index = store.index('avgRiskScore');
    const range = IDBKeyRange.lowerBound(threshold);
    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStatistics(): Promise<Statistics> {
    const [features, fingerprints, clusters] = await Promise.all([
      this.countRecords('trafficFeatures'),
      this.countRecords('fingerprints'),
      this.getClusterResults(),
    ]);

    const highRisk = await this.getHighRiskFingerprints(60);
    const aptCount = clusters.filter(c => c.isAPT).length;

    return {
      totalFeatures: features,
      totalFingerprints: fingerprints,
      highRiskCount: highRisk.length,
      aptClusterCount: aptCount,
    };
  }

  async clearAll(): Promise<void> {
    const stores: ObjectStoreName[] = ['trafficFeatures', 'normalizedTraffic', 'fingerprints', 'clusterResults'];
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
