class IndexedDB {
  constructor() {
    this.dbName = 'NucleNexusDB'
    this.dbVersion = 1
    this.db = null
    this.stores = {
      ecologicalData: 'ecologicalData',
      productionData: 'productionData',
      safetyData: 'safetyData',
      syncLog: 'syncLog'
    }
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        if (!db.objectStoreNames.contains(this.stores.ecologicalData)) {
          const ecologicalStore = db.createObjectStore(this.stores.ecologicalData, { keyPath: 'id', autoIncrement: true })
          ecologicalStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(this.stores.productionData)) {
          const productionStore = db.createObjectStore(this.stores.productionData, { keyPath: 'id', autoIncrement: true })
          productionStore.createIndex('timestamp', 'timestamp', { unique: false })
          productionStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains(this.stores.safetyData)) {
          const safetyStore = db.createObjectStore(this.stores.safetyData, { keyPath: 'id', autoIncrement: true })
          safetyStore.createIndex('timestamp', 'timestamp', { unique: false })
          safetyStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains(this.stores.syncLog)) {
          const syncLogStore = db.createObjectStore(this.stores.syncLog, { keyPath: 'id', autoIncrement: true })
          syncLogStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async saveEcologicalData(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.ecologicalData], 'readwrite')
      const store = transaction.objectStore(this.stores.ecologicalData)
      const record = {
        ...data,
        timestamp: new Date().toISOString()
      }
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getLatestEcologicalData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.ecologicalData], 'readonly')
      const store = transaction.objectStore(this.stores.ecologicalData)
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev')

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          resolve(cursor.value)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getEcologicalDataHistory(hours = 24) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.ecologicalData], 'readonly')
      const store = transaction.objectStore(this.stores.ecologicalData)
      const request = store.getAll()

      request.onsuccess = () => {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
        const filtered = request.result.filter(item => item.timestamp >= cutoff)
        resolve(filtered)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveProductionData(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.productionData], 'readwrite')
      const store = transaction.objectStore(this.stores.productionData)
      const record = {
        ...data,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending'
      }
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveSafetyData(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.safetyData], 'readwrite')
      const store = transaction.objectStore(this.stores.safetyData)
      const record = {
        ...data,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending'
      }
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingProductionData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.productionData], 'readonly')
      const store = transaction.objectStore(this.stores.productionData)
      const index = store.index('syncStatus')
      const request = index.getAll('pending')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingSafetyData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.safetyData], 'readonly')
      const store = transaction.objectStore(this.stores.safetyData)
      const index = store.index('syncStatus')
      const request = index.getAll('pending')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async markAsSynced(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        const data = request.result
        if (data) {
          data.syncStatus = 'synced'
          data.syncedAt = new Date().toISOString()
          const updateRequest = store.put(data)
          updateRequest.onsuccess = () => resolve(true)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(false)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveSyncLog(log) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.syncLog], 'readwrite')
      const store = transaction.objectStore(this.stores.syncLog)
      const record = {
        ...log,
        timestamp: new Date().toISOString()
      }
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export default IndexedDB