import type { FlowSnapshot, PassengerFlow, CapacityPrediction, Station, SecurityAction, DispatchAction } from '@/types'

const DB_NAME = 'SubwayPulseDB'
const DB_VERSION = 1
const STORES = {
  SNAPSHOTS: 'snapshots',
  STATIONS: 'stations',
  SECURITY_ACTIONS: 'security_actions',
  DISPATCH_ACTIONS: 'dispatch_actions',
  CAPACITY_PREDICTIONS: 'capacity_predictions'
}

export class IndexedDBStore {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is only available in browser'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'id' })
          snapshotStore.createIndex('stationId', 'stationId', { unique: false })
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false })
          snapshotStore.createIndex('stationId_timestamp', ['stationId', 'timestamp'], { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.STATIONS)) {
          db.createObjectStore(STORES.STATIONS, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.SECURITY_ACTIONS)) {
          const securityStore = db.createObjectStore(STORES.SECURITY_ACTIONS, { keyPath: 'id' })
          securityStore.createIndex('stationId', 'stationId', { unique: false })
          securityStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.DISPATCH_ACTIONS)) {
          const dispatchStore = db.createObjectStore(STORES.DISPATCH_ACTIONS, { keyPath: 'id' })
          dispatchStore.createIndex('stationId', 'stationId', { unique: false })
          dispatchStore.createIndex('lineId', 'lineId', { unique: false })
          dispatchStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CAPACITY_PREDICTIONS)) {
          const predictionStore = db.createObjectStore(STORES.CAPACITY_PREDICTIONS, { 
            keyPath: 'id',
            autoIncrement: true 
          })
          predictionStore.createIndex('stationId', 'stationId', { unique: false })
          predictionStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const transaction = this.db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  async saveSnapshot(snapshot: FlowSnapshot): Promise<void> {
    const store = await this.getStore(STORES.SNAPSHOTS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(snapshot)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSnapshot(id: string): Promise<FlowSnapshot | null> {
    const store = await this.getStore(STORES.SNAPSHOTS)
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getSnapshotsByStation(
    stationId: string, 
    startTime?: number, 
    endTime?: number
  ): Promise<FlowSnapshot[]> {
    const store = await this.getStore(STORES.SNAPSHOTS)
    const index = store.index('stationId')
    
    return new Promise((resolve, reject) => {
      const range = startTime && endTime 
        ? IDBKeyRange.bound([stationId, startTime], [stationId, endTime])
        : IDBKeyRange.only(stationId)

      const request = index.openCursor(range)
      const snapshots: FlowSnapshot[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          snapshots.push(cursor.value)
          cursor.continue()
        } else {
          resolve(snapshots)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getRecentSnapshots(limit: number = 100): Promise<FlowSnapshot[]> {
    const store = await this.getStore(STORES.SNAPSHOTS)
    const index = store.index('timestamp')
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev')
      const snapshots: FlowSnapshot[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < limit) {
          snapshots.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(snapshots)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async deleteOldSnapshots(olderThan: number): Promise<number> {
    const store = await this.getStore(STORES.SNAPSHOTS, 'readwrite')
    const index = store.index('timestamp')
    
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(olderThan)
      const request = index.openCursor(range)
      let deletedCount = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async saveStation(station: Station): Promise<void> {
    const store = await this.getStore(STORES.STATIONS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(station)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getStation(id: string): Promise<Station | null> {
    const store = await this.getStore(STORES.STATIONS)
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllStations(): Promise<Station[]> {
    const store = await this.getStore(STORES.STATIONS)
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveSecurityAction(action: SecurityAction): Promise<void> {
    const store = await this.getStore(STORES.SECURITY_ACTIONS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(action)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSecurityActions(stationId: string, limit: number = 50): Promise<SecurityAction[]> {
    const store = await this.getStore(STORES.SECURITY_ACTIONS)
    const index = store.index('stationId')
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(stationId), 'prev')
      const actions: SecurityAction[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < limit) {
          actions.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(actions)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async saveDispatchAction(action: DispatchAction): Promise<void> {
    const store = await this.getStore(STORES.DISPATCH_ACTIONS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(action)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getDispatchActions(stationId: string, limit: number = 50): Promise<DispatchAction[]> {
    const store = await this.getStore(STORES.DISPATCH_ACTIONS)
    const index = store.index('stationId')
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(stationId), 'prev')
      const actions: DispatchAction[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < limit) {
          actions.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(actions)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async savePrediction(prediction: CapacityPrediction & { id?: number }): Promise<void> {
    const store = await this.getStore(STORES.CAPACITY_PREDICTIONS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(prediction)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPredictions(stationId: string, limit: number = 20): Promise<CapacityPrediction[]> {
    const store = await this.getStore(STORES.CAPACITY_PREDICTIONS)
    const index = store.index('stationId')
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(stationId), 'prev')
      const predictions: CapacityPrediction[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < limit) {
          predictions.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(predictions)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async clearAll(): Promise<void> {
    const stores = Object.values(STORES)
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite')
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

export default IndexedDBStore
