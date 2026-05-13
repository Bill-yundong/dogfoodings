import { openDB, IDBPDatabase, DBSchema } from 'idb'
import { ProductionLineSnapshot } from '../../domain/entities/ProductionLine'

interface LineFlowDB extends DBSchema {
  snapshots: {
    key: string
    value: StoredSnapshot
    indexes: {
      'by-timestamp': Date
      'by-line': string
      'by-sync': string
    }
  }
  productionLines: {
    key: string
    value: {
      id: string
      name: string
      config: unknown
      createdAt: Date
      updatedAt: Date
    }
  }
  alerts: {
    key: string
    value: {
      id: string
      timestamp: Date
      level: string
      stationId?: string
      message: string
      type: string
      acknowledged: boolean
    }
    indexes: {
      'by-timestamp': Date
      'by-level': string
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-timestamp': Date
      'by-retry': number
    }
  }
}

export interface StoredSnapshot {
  id: string
  lineId: string
  snapshot: ProductionLineSnapshot
  timestamp: Date
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT'
}

export interface SyncQueueItem {
  id: string
  type: 'snapshot' | 'line' | 'alert'
  data: unknown
  timestamp: Date
  retryCount: number
  priority: number
}

export class IndexedDBStore {
  private db: IDBPDatabase<LineFlowDB> | null = null
  private readonly DB_NAME = 'LineFlowDB'
  private readonly DB_VERSION = 1
  private readonly MAX_SNAPSHOTS = 50000

  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB<LineFlowDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db) => {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' })
        snapshotStore.createIndex('by-timestamp', 'timestamp')
        snapshotStore.createIndex('by-line', 'lineId')
        snapshotStore.createIndex('by-sync', 'syncStatus')

        db.createObjectStore('productionLines', { keyPath: 'id' })

        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' })
        alertStore.createIndex('by-timestamp', 'timestamp')
        alertStore.createIndex('by-level', 'level')

        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncQueueStore.createIndex('by-timestamp', 'timestamp')
        syncQueueStore.createIndex('by-retry', 'retryCount')
      }
    })
  }

  async saveSnapshot(lineId: string, snapshot: ProductionLineSnapshot): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    const id = `SNAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const stored: StoredSnapshot = {
      id,
      lineId,
      snapshot,
      timestamp: new Date(),
      syncStatus: 'PENDING'
    }

    await this.db.add('snapshots', stored)
    await this.cleanupOldSnapshots()

    return id
  }

  async getSnapshot(id: string): Promise<StoredSnapshot | undefined> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.get('snapshots', id)
  }

  async getLatestSnapshot(lineId: string): Promise<StoredSnapshot | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction('snapshots', 'readonly')
    const index = tx.store.index('by-timestamp')
    const cursor = await index.openCursor(null, 'prev')
    await tx.done

    if (!cursor) return undefined

    return cursor.value.lineId === lineId ? cursor.value : undefined
  }

  async getSnapshotsByLine(lineId: string, limit: number = 100): Promise<StoredSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction('snapshots', 'readonly')
    const index = tx.store.index('by-line')
    const snapshots: StoredSnapshot[] = []

    let cursor = await index.openCursor(IDBKeyRange.only(lineId), 'prev')
    while (cursor && snapshots.length < limit) {
      snapshots.push(cursor.value)
      cursor = await cursor.continue()
    }

    await tx.done
    return snapshots
  }

  async getSnapshotsInTimeRange(lineId: string, start: Date, end: Date): Promise<StoredSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction('snapshots', 'readonly')
    const index = tx.store.index('by-timestamp')
    const snapshots: StoredSnapshot[] = []

    let cursor = await index.openCursor(IDBKeyRange.bound(start, end))
    while (cursor) {
      if (cursor.value.lineId === lineId) {
        snapshots.push(cursor.value)
      }
      cursor = await cursor.continue()
    }

    await tx.done
    return snapshots
  }

  async getPendingSyncSnapshots(limit: number = 100): Promise<StoredSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction('snapshots', 'readonly')
    const index = tx.store.index('by-sync')
    const snapshots: StoredSnapshot[] = []

    let cursor = await index.openCursor(IDBKeyRange.only('PENDING'), 'prev')
    while (cursor && snapshots.length < limit) {
      snapshots.push(cursor.value)
      cursor = await cursor.continue()
    }

    await tx.done
    return snapshots
  }

  async updateSnapshotSyncStatus(id: string, status: StoredSnapshot['syncStatus']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const snapshot = await this.db.get('snapshots', id)
    if (snapshot) {
      snapshot.syncStatus = status
      await this.db.put('snapshots', snapshot)
    }
  }

  async getSnapshotCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.count('snapshots')
  }

  private async cleanupOldSnapshots(): Promise<void> {
    if (!this.db) return

    const count = await this.db.count('snapshots')
    if (count <= this.MAX_SNAPSHOTS) return

    const excess = count - this.MAX_SNAPSHOTS
    if (excess <= 0) return

    const tx = this.db.transaction('snapshots', 'readwrite')
    const index = tx.store.index('by-timestamp')

    let deleted = 0
    let cursor = await index.openCursor(null, 'next')

    while (cursor && deleted < excess) {
      await cursor.delete()
      deleted++
      cursor = await cursor.continue()
    }

    await tx.done
  }

  async saveAlert(alert: {
    id: string
    timestamp: Date
    level: string
    stationId?: string
    message: string
    type: string
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.add('alerts', { ...alert, acknowledged: false })
  }

  async getAlerts(limit: number = 100): Promise<Array<{
    id: string
    timestamp: Date
    level: string
    stationId?: string
    message: string
    type: string
    acknowledged: boolean
  }>> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction('alerts', 'readonly')
    const index = tx.store.index('by-timestamp')
    const alerts: Array<{
      id: string
      timestamp: Date
      level: string
      stationId?: string
      message: string
      type: string
      acknowledged: boolean
    }> = []

    let cursor = await index.openCursor(null, 'prev')
    while (cursor && alerts.length < limit) {
      alerts.push(cursor.value)
      cursor = await cursor.continue()
    }

    await tx.done
    return alerts
  }

  async acknowledgeAlert(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const alert = await this.db.get('alerts', id)
    if (alert) {
      alert.acknowledged = true
      await this.db.put('alerts', alert)
    }
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'retryCount' | 'priority'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const queueItem: SyncQueueItem = {
      ...item,
      retryCount: 0,
      priority: 1
    }
    await this.db.add('syncQueue', queueItem)
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAllFromIndex('syncQueue', 'by-timestamp')
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete('syncQueue', id)
  }

  async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const item = await this.db.get('syncQueue', id)
    if (item) {
      item.retryCount++
      await this.db.put('syncQueue', item)
    }
  }

  async saveProductionLine(line: {
    id: string
    name: string
    config: unknown
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const existing = await this.db.get('productionLines', line.id)
    const now = new Date()

    await this.db.put('productionLines', {
      ...line,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    })
  }

  async getProductionLine(id: string) {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.get('productionLines', id)
  }

  async getAllProductionLines() {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('productionLines')
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(
      ['snapshots', 'productionLines', 'alerts', 'syncQueue'],
      'readwrite'
    )

    await Promise.all([
      tx.objectStore('snapshots').clear(),
      tx.objectStore('productionLines').clear(),
      tx.objectStore('alerts').clear(),
      tx.objectStore('syncQueue').clear()
    ])

    await tx.done
  }

  async exportAll(): Promise<{
    snapshots: StoredSnapshot[]
    alerts: unknown[]
  }> {
    if (!this.db) throw new Error('Database not initialized')

    const [snapshots, alerts] = await Promise.all([
      this.db.getAll('snapshots'),
      this.db.getAll('alerts')
    ])

    return { snapshots, alerts }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  getDb(): IDBPDatabase<LineFlowDB> | null {
    return this.db
  }
}

export const indexedDBStore = new IndexedDBStore()
