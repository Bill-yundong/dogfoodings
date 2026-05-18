const DB_NAME = 'FabLogic_AMHS'
const DB_VERSION = 1

const STORES = {
  NETWORK_TILES: 'network_tiles',
  OHT_STATES: 'oht_states',
  TASKS: 'tasks',
  WAFERS: 'wafers',
  SYNC_LOG: 'sync_log',
  CONFIG: 'config'
}

export class IndexedDB {
  constructor() {
    this.db = null
    this.initPromise = null
  }

  init() {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        if (!db.objectStoreNames.contains(STORES.NETWORK_TILES)) {
          const tileStore = db.createObjectStore(STORES.NETWORK_TILES, { keyPath: 'id' })
          tileStore.createIndex('x', 'x', { unique: false })
          tileStore.createIndex('y', 'y', { unique: false })
          tileStore.createIndex('version', 'version', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.OHT_STATES)) {
          const ohtStore = db.createObjectStore(STORES.OHT_STATES, { keyPath: 'id' })
          ohtStore.createIndex('status', 'status', { unique: false })
          ohtStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' })
          taskStore.createIndex('status', 'status', { unique: false })
          taskStore.createIndex('ohtId', 'ohtId', { unique: false })
          taskStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.WAFERS)) {
          const waferStore = db.createObjectStore(STORES.WAFERS, { keyPath: 'id' })
          waferStore.createIndex('status', 'status', { unique: false })
          waferStore.createIndex('lotId', 'lotId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const syncStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'timestamp' })
          syncStore.createIndex('entityType', 'entityType', { unique: false })
          syncStore.createIndex('operation', 'operation', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG, { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  async _execute(storeName, mode, callback) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      const request = callback(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.onabort = () => reject(transaction.error)
    })
  }

  async _executeAll(storeName, mode, callback) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      const results = []

      const request = callback(store)
      request.onsuccess = () => {
        const cursor = request.result
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

  async saveTile(tile) {
    return this._execute(STORES.NETWORK_TILES, 'readwrite', (store) => store.put(tile))
  }

  async saveTiles(tiles) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.NETWORK_TILES, 'readwrite')
      const store = transaction.objectStore(STORES.NETWORK_TILES)

      tiles.forEach(tile => store.put(tile))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getTile(tileX, tileY) {
    const id = `${tileX},${tileY}`
    return this._execute(STORES.NETWORK_TILES, 'readonly', (store) => store.get(id))
  }

  async getTilesInRange(minX, minY, maxX, maxY) {
    const tiles = await this._executeAll(STORES.NETWORK_TILES, 'readonly', (store) => store.openCursor())
    return tiles.filter(t => t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY)
  }

  async getAllTiles() {
    return this._executeAll(STORES.NETWORK_TILES, 'readonly', (store) => store.openCursor())
  }

  async deleteTile(tileX, tileY) {
    const id = `${tileX},${tileY}`
    return this._execute(STORES.NETWORK_TILES, 'readwrite', (store) => store.delete(id))
  }

  async saveOHT(oht) {
    return this._execute(STORES.OHT_STATES, 'readwrite', (store) => store.put(oht))
  }

  async saveOHTs(ohts) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.OHT_STATES, 'readwrite')
      const store = transaction.objectStore(STORES.OHT_STATES)

      ohts.forEach(oht => store.put(oht))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getOHT(ohtId) {
    return this._execute(STORES.OHT_STATES, 'readonly', (store) => store.get(ohtId))
  }

  async getAllOHTs() {
    return this._executeAll(STORES.OHT_STATES, 'readonly', (store) => store.openCursor())
  }

  async saveTask(task) {
    return this._execute(STORES.TASKS, 'readwrite', (store) => store.put(task))
  }

  async saveTasks(tasks) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.TASKS, 'readwrite')
      const store = transaction.objectStore(STORES.TASKS)

      tasks.forEach(task => store.put(task))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getTask(taskId) {
    return this._execute(STORES.TASKS, 'readonly', (store) => store.get(taskId))
  }

  async getAllTasks() {
    return this._executeAll(STORES.TASKS, 'readonly', (store) => store.openCursor())
  }

  async saveWafer(wafer) {
    return this._execute(STORES.WAFERS, 'readwrite', (store) => store.put(wafer))
  }

  async getWafer(waferId) {
    return this._execute(STORES.WAFERS, 'readonly', (store) => store.get(waferId))
  }

  async getAllWafers() {
    return this._executeAll(STORES.WAFERS, 'readonly', (store) => store.openCursor())
  }

  async logSync(entityType, operation, data) {
    const log = {
      timestamp: Date.now(),
      entityType,
      operation,
      data
    }
    return this._execute(STORES.SYNC_LOG, 'readwrite', (store) => store.put(log))
  }

  async getSyncLogs(since = 0) {
    const logs = await this._executeAll(STORES.SYNC_LOG, 'readonly', (store) => store.openCursor())
    return logs.filter(l => l.timestamp >= since)
  }

  async saveConfig(key, value) {
    return this._execute(STORES.CONFIG, 'readwrite', (store) => store.put({ key, value }))
  }

  async getConfig(key) {
    const result = await this._execute(STORES.CONFIG, 'readonly', (store) => store.get(key))
    return result ? result.value : null
  }

  async clearStore(storeName) {
    return this._execute(storeName, 'readwrite', (store) => store.clear())
  }

  async clearAll() {
    const stores = Object.values(STORES)
    for (const store of stores) {
      await this.clearStore(store)
    }
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

export const db = new IndexedDB()
export { STORES }
