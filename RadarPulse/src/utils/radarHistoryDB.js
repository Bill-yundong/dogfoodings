export class RadarHistoryDB {
  constructor() {
    this.dbName = 'RadarPulseDB'
    this.version = 1
    this.db = null
    this.stores = [
      {
        name: 'radar_frames',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'type', keyPath: 'type', unique: false }
        ]
      },
      {
        name: 'forecast_history',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'accuracy', keyPath: 'accuracy', unique: false }
        ]
      }
    ]
  }

  init() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db)
        return
      }

      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        this.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath
            })
            
            storeConfig.indexes.forEach(index => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique
              })
            })
          }
        })
      }
    })
  }

  async save(storeName, data) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveBatch(storeName, dataList) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      let completed = 0
      let hasError = false

      dataList.forEach(data => {
        const request = store.put(data)
        request.onsuccess = () => {
          completed++
          if (completed === dataList.length && !hasError) {
            resolve()
          }
        }
        request.onerror = () => {
          hasError = true
          reject(request.error)
        }
      })
    })
  }

  async get(storeName, id) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async queryByTimeRange(storeName, startTime, endTime) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('timestamp')
      const results = []

      const request = index.openCursor(IDBKeyRange.bound(startTime, endTime))

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName, id) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearStore(storeName) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async count(storeName) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
