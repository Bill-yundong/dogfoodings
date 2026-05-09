const DB_NAME = 'SignalLinkDB';
const DB_VERSION = 1;
const STORES = {
  SIGNAL_LOGS: 'signalLogs',
  GREEN_WAVE_PLANS: 'greenWavePlans',
  DEVICE_CONFIGS: 'deviceConfigs',
  SIMULATION_RESULTS: 'simulationResults'
};

class DatabaseService {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.SIGNAL_LOGS)) {
          const logStore = db.createObjectStore(STORES.SIGNAL_LOGS, { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('intersectionId', 'intersectionId', { unique: false });
          logStore.createIndex('timeSlot', 'timeSlot', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.GREEN_WAVE_PLANS)) {
          db.createObjectStore(STORES.GREEN_WAVE_PLANS, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORES.DEVICE_CONFIGS)) {
          db.createObjectStore(STORES.DEVICE_CONFIGS, { keyPath: 'deviceId' });
        }

        if (!db.objectStoreNames.contains(STORES.SIMULATION_RESULTS)) {
          const simStore = db.createObjectStore(STORES.SIMULATION_RESULTS, { keyPath: 'id', autoIncrement: true });
          simStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addSignalLog(logEntry) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SIGNAL_LOGS], 'readwrite');
      const store = transaction.objectStore(STORES.SIGNAL_LOGS);
      const request = store.add({
        ...logEntry,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSignalLogs(intersectionId, timeSlot) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SIGNAL_LOGS], 'readonly');
      const store = transaction.objectStore(STORES.SIGNAL_LOGS);
      const index = store.index('intersectionId');
      const request = index.getAll(intersectionId);

      request.onsuccess = () => {
        const logs = request.result;
        if (timeSlot) {
          resolve(logs.filter(log => log.timeSlot === timeSlot));
        } else {
          resolve(logs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSignalLogsByTimeRange(startTime, endTime) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SIGNAL_LOGS], 'readonly');
      const store = transaction.objectStore(STORES.SIGNAL_LOGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const logs = request.result;
        resolve(logs.filter(log => 
          log.timestamp >= startTime && log.timestamp <= endTime
        ));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveGreenWavePlan(plan) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.GREEN_WAVE_PLANS], 'readwrite');
      const store = transaction.objectStore(STORES.GREEN_WAVE_PLANS);
      const request = store.put(plan);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getGreenWavePlans() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.GREEN_WAVE_PLANS], 'readonly');
      const store = transaction.objectStore(STORES.GREEN_WAVE_PLANS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDeviceConfig(config) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DEVICE_CONFIGS], 'readwrite');
      const store = transaction.objectStore(STORES.DEVICE_CONFIGS);
      const request = store.put(config);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDeviceConfig(deviceId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DEVICE_CONFIGS], 'readonly');
      const store = transaction.objectStore(STORES.DEVICE_CONFIGS);
      const request = store.get(deviceId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSimulationResult(result) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SIMULATION_RESULTS], 'readwrite');
      const store = transaction.objectStore(STORES.SIMULATION_RESULTS);
      const request = store.add({
        ...result,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSimulationResults(limit = 10) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SIMULATION_RESULTS], 'readonly');
      const store = transaction.objectStore(STORES.SIMULATION_RESULTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(Object.values(STORES), 'readwrite');
      
      let completed = 0;
      const total = Object.values(STORES).length;

      Object.values(STORES).forEach(storeName => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }
}

export const database = new DatabaseService();
