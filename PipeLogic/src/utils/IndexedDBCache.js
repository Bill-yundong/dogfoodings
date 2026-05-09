class IndexedDBCache {
  constructor(dbName) {
    this.dbName = dbName
    this.db = null
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      
      request.onerror = () => {
        reject('IndexedDB 初始化失败')
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('pipeline_data')) {
          db.createObjectStore('pipeline_data')
        }
      }
    })
  }
  
  async get(key) {
    if (!this.db) {
      await this.init()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('pipeline_data', 'readonly')
      const store = transaction.objectStore('pipeline_data')
      const request = store.get(key)
      
      request.onerror = () => {
        reject('获取数据失败')
      }
      
      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }
  
  async set(key, value) {
    if (!this.db) {
      await this.init()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('pipeline_data', 'readwrite')
      const store = transaction.objectStore('pipeline_data')
      const request = store.put(value, key)
      
      request.onerror = () => {
        reject('存储数据失败')
      }
      
      request.onsuccess = () => {
        resolve()
      }
    })
  }
  
  async delete(key) {
    if (!this.db) {
      await this.init()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('pipeline_data', 'readwrite')
      const store = transaction.objectStore('pipeline_data')
      const request = store.delete(key)
      
      request.onerror = () => {
        reject('删除数据失败')
      }
      
      request.onsuccess = () => {
        resolve()
      }
    })
  }
  
  async clear() {
    if (!this.db) {
      await this.init()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('pipeline_data', 'readwrite')
      const store = transaction.objectStore('pipeline_data')
      const request = store.clear()
      
      request.onerror = () => {
        reject('清空数据失败')
      }
      
      request.onsuccess = () => {
        resolve()
      }
    })
  }
}

export default IndexedDBCache