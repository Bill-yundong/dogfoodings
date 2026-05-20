import { openDB, IDBPDatabase, IDBPObjectStore } from 'idb'
import type { BlackBoxLog } from '@/types'
import { generateId } from '@/utils/math'

const DB_NAME = 'drone_blackbox_db'
const DB_VERSION = 1
const STORE_LOGS = 'blackbox_logs'
const STORE_SYNC_STATE = 'sync_state'

interface SyncState {
  id: string
  lastSyncTime: number
  lastSyncedLogId: string | null
  pendingCount: number
  failedCount: number
}

export class BlackBoxDatabase {
  private db: IDBPDatabase | null = null
  private syncInProgress: boolean = false
  private batchSize: number = 100

  public async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          const logsStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' })
          logsStore.createIndex('droneId', 'droneId')
          logsStore.createIndex('timestamp', 'timestamp')
          logsStore.createIndex('synced', 'synced')
          logsStore.createIndex('droneId_timestamp', ['droneId', 'timestamp'])
        }

        if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) {
          db.createObjectStore(STORE_SYNC_STATE, { keyPath: 'id' })
        }
      }
    })

    await this.ensureSyncState()
  }

  private async ensureSyncState(): Promise<void> {
    if (!this.db) return
    
    const state = await this.db.get(STORE_SYNC_STATE, 'global')
    if (!state) {
      await this.db.put(STORE_SYNC_STATE, {
        id: 'global',
        lastSyncTime: 0,
        lastSyncedLogId: null,
        pendingCount: 0,
        failedCount: 0
      } as SyncState)
    }
  }

  public async addLog(log: Omit<BlackBoxLog, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')
    
    const id = generateId()
    const fullLog: BlackBoxLog = { ...log, id, synced: false }
    
    await this.db.put(STORE_LOGS, fullLog)
    await this.incrementPendingCount()
    
    return id
  }

  public async addLogs(logs: Array<Omit<BlackBoxLog, 'id'>>): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const ids: string[] = []
    const tx = this.db.transaction(STORE_LOGS, 'readwrite')
    const store = tx.store
    
    for (const log of logs) {
      const id = generateId()
      const fullLog: BlackBoxLog = { ...log, id, synced: false }
      await store.put(fullLog)
      ids.push(id)
    }
    
    await tx.done
    await this.incrementPendingCount(logs.length)
    
    return ids
  }

  public async getLogs(
    droneId?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000,
    offset: number = 0
  ): Promise<BlackBoxLog[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(STORE_LOGS, 'readonly')
    const store = tx.store
    let index: IDBPObjectStore | IDBPDatabase = store
    
    if (droneId && startTime !== undefined) {
      const droneIndex = store.index('droneId_timestamp')
      const range = IDBKeyRange.bound([droneId, startTime], [droneId, endTime || Date.now()])
      const results: BlackBoxLog[] = []
      let count = 0
      let skipped = 0
      
      for await (const cursor of droneIndex.iterate(range, 'prev')) {
        if (skipped < offset) {
          skipped++
          continue
        }
        if (count >= limit) break
        results.push(cursor.value)
        count++
      }
      
      return results.reverse()
    } else if (droneId) {
      const droneIndex = store.index('droneId')
      const results: BlackBoxLog[] = []
      let count = 0
      let skipped = 0
      
      for await (const cursor of droneIndex.iterate(droneId, 'prev')) {
        if (skipped < offset) {
          skipped++
          continue
        }
        if (count >= limit) break
        results.push(cursor.value)
        count++
      }
      
      return results.reverse()
    } else {
      const timeIndex = store.index('timestamp')
      const range = startTime !== undefined || endTime !== undefined
        ? IDBKeyRange.bound(startTime || 0, endTime || Date.now())
        : undefined
      
      const results: BlackBoxLog[] = []
      let count = 0
      let skipped = 0
      
      for await (const cursor of timeIndex.iterate(range, 'prev')) {
        if (skipped < offset) {
          skipped++
          continue
        }
        if (count >= limit) break
        results.push(cursor.value)
        count++
      }
      
      return results.reverse()
    }
  }

  public async getUnsyncedLogs(limit: number = this.batchSize): Promise<BlackBoxLog[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(STORE_LOGS, 'readonly')
    const store = tx.store
    const syncedIndex = store.index('synced')
    
    const results: BlackBoxLog[] = []
    for await (const cursor of syncedIndex.iterate(false)) {
      if (results.length >= limit) break
      results.push(cursor.value)
    }
    
    return results
  }

  public async markAsSynced(logIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(STORE_LOGS, 'readwrite')
    const store = tx.store
    
    for (const id of logIds) {
      const log = await store.get(id)
      if (log) {
        log.synced = true
        await store.put(log)
      }
    }
    
    await tx.done
    await this.decrementPendingCount(logIds.length)
  }

  public async syncWithBackend(
    syncFn: (logs: BlackBoxLog[]) => Promise<boolean>
  ): Promise<{ synced: number; total: number; success: boolean }> {
    if (!this.db || this.syncInProgress) {
      return { synced: 0, total: 0, success: false }
    }
    
    this.syncInProgress = true
    let totalSynced = 0
    let success = true
    
    try {
      const state = await this.db.get(STORE_SYNC_STATE, 'global')
      const unsyncedCount = state?.pendingCount || 0
      
      while (true) {
        const logs = await this.getUnsyncedLogs(this.batchSize)
        if (logs.length === 0) break
        
        try {
          const batchSuccess = await syncFn(logs)
          if (batchSuccess) {
            await this.markAsSynced(logs.map(l => l.id))
            totalSynced += logs.length
          } else {
            success = false
            break
          }
        } catch (error) {
          success = false
          break
        }
      }
      
      await this.db.put(STORE_SYNC_STATE, {
        id: 'global',
        lastSyncTime: Date.now(),
        lastSyncedLogId: totalSynced > 0 ? (await this.getLastSyncedLogId()) : state?.lastSyncedLogId,
        pendingCount: unsyncedCount - totalSynced,
        failedCount: success ? 0 : (state?.failedCount || 0) + 1
      } as SyncState)
      
      return { synced: totalSynced, total: unsyncedCount, success }
    } finally {
      this.syncInProgress = false
    }
  }

  private async getLastSyncedLogId(): Promise<string | null> {
    if (!this.db) return null
    
    const tx = this.db.transaction(STORE_LOGS, 'readonly')
    const store = tx.store
    const syncedIndex = store.index('synced')
    
    let lastId: string | null = null
    for await (const cursor of syncedIndex.iterate(true, 'prev')) {
      lastId = cursor.value.id
      break
    }
    
    return lastId
  }

  private async incrementPendingCount(count: number = 1): Promise<void> {
    if (!this.db) return
    
    const state = await this.db.get(STORE_SYNC_STATE, 'global')
    if (state) {
      state.pendingCount += count
      await this.db.put(STORE_SYNC_STATE, state)
    }
  }

  private async decrementPendingCount(count: number = 1): Promise<void> {
    if (!this.db) return
    
    const state = await this.db.get(STORE_SYNC_STATE, 'global')
    if (state) {
      state.pendingCount = Math.max(0, state.pendingCount - count)
      await this.db.put(STORE_SYNC_STATE, state)
    }
  }

  public async getSyncState(): Promise<SyncState> {
    if (!this.db) throw new Error('Database not initialized')
    
    const state = await this.db.get(STORE_SYNC_STATE, 'global')
    return state || {
      id: 'global',
      lastSyncTime: 0,
      lastSyncedLogId: null,
      pendingCount: 0,
      failedCount: 0
    }
  }

  public async getStats(): Promise<{
    totalLogs: number
    syncedLogs: number
    unsyncedLogs: number
    oldestLogTime: number
    newestLogTime: number
  }> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(STORE_LOGS, 'readonly')
    const store = tx.store
    
    const totalLogs = await store.count()
    const syncedIndex = store.index('synced')
    const syncedLogs = await syncedIndex.count(true)
    
    const timeIndex = store.index('timestamp')
    let oldestLogTime = 0
    let newestLogTime = 0
    
    for await (const cursor of timeIndex.iterate(undefined, 'prev')) {
      newestLogTime = cursor.value.timestamp
      break
    }
    
    for await (const cursor of timeIndex.iterate(undefined, 'next')) {
      oldestLogTime = cursor.value.timestamp
      break
    }
    
    return {
      totalLogs,
      syncedLogs,
      unsyncedLogs: totalLogs - syncedLogs,
      oldestLogTime,
      newestLogTime
    }
  }

  public async deleteOldLogs(beforeTime: number): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(STORE_LOGS, 'readwrite')
    const store = tx.store
    const timeIndex = store.index('timestamp')
    
    let deletedCount = 0
    for await (const cursor of timeIndex.iterate(IDBKeyRange.upperBound(beforeTime))) {
      await cursor.delete()
      deletedCount++
    }
    
    return deletedCount
  }

  public async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    await this.db.clear(STORE_LOGS)
    await this.db.put(STORE_SYNC_STATE, {
      id: 'global',
      lastSyncTime: 0,
      lastSyncedLogId: null,
      pendingCount: 0,
      failedCount: 0
    } as SyncState)
  }

  public async exportLogs(droneId?: string, startTime?: number, endTime?: number): Promise<string> {
    const logs = await this.getLogs(droneId, startTime, endTime, 10000)
    return JSON.stringify(logs, null, 2)
  }

  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
