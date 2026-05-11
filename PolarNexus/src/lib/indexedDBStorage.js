export class PolarClimateDB {
  constructor() {
    this.dbName = 'PolarNexusDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('iceConcentration')) {
          const iceStore = db.createObjectStore('iceConcentration', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          iceStore.createIndex('year', 'year', { unique: false });
          iceStore.createIndex('region', 'region', { unique: false });
          iceStore.createIndex('year-region', ['year', 'region'], { unique: false });
        }

        if (!db.objectStoreNames.contains('seaLevel')) {
          const seaLevelStore = db.createObjectStore('seaLevel', { 
            keyPath: 'year' 
          });
          seaLevelStore.createIndex('year', 'year', { unique: true });
        }

        if (!db.objectStoreNames.contains('albedo')) {
          const albedoStore = db.createObjectStore('albedo', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          albedoStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('satelliteImages')) {
          const imageStore = db.createObjectStore('satelliteImages', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          imageStore.createIndex('captureDate', 'captureDate', { unique: false });
          imageStore.createIndex('region', 'region', { unique: false });
        }
      };
    });
  }

  async saveIceConcentrationData(data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['iceConcentration'], 'readwrite');
      const store = transaction.objectStore('iceConcentration');
      
      data.forEach(item => store.add(item));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getIceConcentrationByYear(year, region = 'arctic') {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['iceConcentration'], 'readonly');
      const store = transaction.objectStore('iceConcentration');
      const index = store.index('year-region');
      const request = index.getAll([year, region]);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getIceConcentrationRange(startYear, endYear, region = 'arctic') {
    if (!this.db) await this.init();
    
    const results = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearData = await this.getIceConcentrationByYear(year, region);
      results.push(...yearData);
    }
    return results;
  }

  async saveSeaLevelData(year, level) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['seaLevel'], 'readwrite');
      const store = transaction.objectStore('seaLevel');
      store.put({ year, level });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSeaLevelTrend(startYear = 1990, endYear = 2024) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['seaLevel'], 'readonly');
      const store = transaction.objectStore('seaLevel');
      const results = [];
      
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.year >= startYear && cursor.value.year <= endYear) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results.sort((a, b) => a.year - b.year));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAlbedoData(data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['albedo'], 'readwrite');
      const store = transaction.objectStore('albedo');
      store.add(data);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAlbedoHistory(startDate, endDate) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['albedo'], 'readonly');
      const store = transaction.objectStore('albedo');
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData() {
    if (!this.db) await this.init();
    
    const stores = ['iceConcentration', 'seaLevel', 'albedo', 'satelliteImages'];
    
    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getStats() {
    if (!this.db) await this.init();
    
    const stats = {};
    const stores = ['iceConcentration', 'seaLevel', 'albedo', 'satelliteImages'];
    
    for (const storeName of stores) {
      await new Promise((resolve) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        
        request.onsuccess = () => {
          stats[storeName] = request.result;
          resolve();
        };
      });
    }
    
    return stats;
  }
}

export const climateDB = new PolarClimateDB();
