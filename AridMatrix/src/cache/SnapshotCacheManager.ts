import type { SiteSnapshot, TimeSeriesPoint } from '../types'

const DB_NAME = 'AridMatrixDB'
const DB_VERSION = 1
const SNAPSHOT_STORE = 'snapshots'
const TIMESERIES_STORE = 'timeseries'

export class SnapshotCacheManager {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' })
          snapshotStore.createIndex('siteId', 'siteId', { unique: false })
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(TIMESERIES_STORE)) {
          const tsStore = db.createObjectStore(TIMESERIES_STORE, { keyPath: 'id' })
          tsStore.createIndex('siteId', 'siteId', { unique: false })
          tsStore.createIndex('metric', 'metric', { unique: false })
          tsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async saveSnapshot(snapshot: SiteSnapshot): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SNAPSHOT_STORE], 'readwrite')
      const store = transaction.objectStore(SNAPSHOT_STORE)
      const request = store.add(snapshot)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getSnapshotsBySite(siteId: string, limit = 100): Promise<SiteSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SNAPSHOT_STORE], 'readonly')
      const store = transaction.objectStore(SNAPSHOT_STORE)
      const index = store.index('siteId')
      const request = index.getAll(siteId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        resolve(results.slice(0, limit))
      }
    })
  }

  async saveTimeSeriesPoint(point: TimeSeriesPoint): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const pointWithId = {
      ...point,
      id: `${point.siteId}-${point.metric}-${point.timestamp}`
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TIMESERIES_STORE], 'readwrite')
      const store = transaction.objectStore(TIMESERIES_STORE)
      const request = store.put(pointWithId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getTimeSeries(
    siteId: string,
    metric: string,
    startTime?: number,
    endTime?: number
  ): Promise<TimeSeriesPoint[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TIMESERIES_STORE], 'readonly')
      const store = transaction.objectStore(TIMESERIES_STORE)
      const index = store.index('siteId')
      const request = index.getAll(siteId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let results = request.result.filter((p: TimeSeriesPoint) => p.metric === metric)

        if (startTime !== undefined) {
          results = results.filter(p => p.timestamp >= startTime)
        }
        if (endTime !== undefined) {
          results = results.filter(p => p.timestamp <= endTime)
        }

        results.sort((a, b) => a.timestamp - b.timestamp)
        resolve(results)
      }
    })
  }

  async clearOldData(beforeDate: Date): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const timestamp = beforeDate.getTime()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [SNAPSHOT_STORE, TIMESERIES_STORE],
        'readwrite'
      )

      const snapshotStore = transaction.objectStore(SNAPSHOT_STORE)
      const snapshotIndex = snapshotStore.index('timestamp')
      const snapshotRequest = snapshotIndex.openCursor(
        IDBKeyRange.upperBound(timestamp)
      )

      snapshotRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      const tsStore = transaction.objectStore(TIMESERIES_STORE)
      const tsIndex = tsStore.index('timestamp')
      const tsRequest = tsIndex.openCursor(IDBKeyRange.upperBound(timestamp))

      tsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}