import { openDB, IDBPDatabase, IDBPObjectStore } from 'idb'
import type { PointCloud, ProcessingTask, TopologySnapshot, SyncTask, WorkerState, CacheStrategy, StorageStats } from '@/types'

const DB_VERSION = 1
const DB_NAME = 'UAVScan_PointCloudDB'

interface DBSchema {
  pointClouds: {
    key: string
    value: PointCloud
    indexes: { 'taskId': string; 'filename': string; 'createdAt': number }
  }
  topologySnapshots: {
    key: string
    value: TopologySnapshot
    indexes: { 'pointCloudId': string; 'isFavorite': boolean; 'createdAt': number; 'expiresAt': number }
  }
  processingTasks: {
    key: string
    value: ProcessingTask
    indexes: { 'status': string; 'priority': number; 'createdAt': number }
  }
  syncTasks: {
    key: string
    value: SyncTask
    indexes: { 'snapshotId': string; 'status': string; 'direction': string }
  }
  workerStates: {
    key: number
    value: WorkerState
    indexes: { 'status': string; 'currentTaskId': string }
  }
}

let dbInstance: IDBPDatabase<DBSchema> | null = null

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const pointCloudStore = db.createObjectStore('pointClouds', { keyPath: 'id' })
        pointCloudStore.createIndex('taskId', 'taskId', { unique: true })
        pointCloudStore.createIndex('filename', 'filename', { unique: false })
        pointCloudStore.createIndex('createdAt', 'createdAt', { unique: false })

        const snapshotStore = db.createObjectStore('topologySnapshots', { keyPath: 'id' })
        snapshotStore.createIndex('pointCloudId', 'pointCloudId', { unique: false })
        snapshotStore.createIndex('isFavorite', 'isFavorite', { unique: false })
        snapshotStore.createIndex('createdAt', 'createdAt', { unique: false })
        snapshotStore.createIndex('expiresAt', 'expiresAt', { unique: false })

        const taskStore = db.createObjectStore('processingTasks', { keyPath: 'id' })
        taskStore.createIndex('status', 'status', { unique: false })
        taskStore.createIndex('priority', 'priority', { unique: false })
        taskStore.createIndex('createdAt', 'createdAt', { unique: false })

        const syncStore = db.createObjectStore('syncTasks', { keyPath: 'id' })
        syncStore.createIndex('snapshotId', 'snapshotId', { unique: false })
        syncStore.createIndex('status', 'status', { unique: false })
        syncStore.createIndex('direction', 'direction', { unique: false })

        const workerStore = db.createObjectStore('workerStates', { keyPath: 'workerId' })
        workerStore.createIndex('status', 'status', { unique: false })
        workerStore.createIndex('currentTaskId', 'currentTaskId', { unique: false })
      }
    }
  })

  return dbInstance
}

export async function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbInstance) {
    await initDB()
  }
  return dbInstance!
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export const pointCloudDB = {
  async getAll(): Promise<PointCloud[]> {
    const db = await getDB()
    return db.getAll('pointClouds')
  },

  async getById(id: string): Promise<PointCloud | undefined> {
    const db = await getDB()
    return db.get('pointClouds', id)
  },

  async getByTaskId(taskId: string): Promise<PointCloud | undefined> {
    const db = await getDB()
    return db.getFromIndex('pointClouds', 'taskId', taskId)
  },

  async add(pointCloud: PointCloud): Promise<string> {
    const db = await getDB()
    return db.add('pointClouds', pointCloud)
  },

  async update(pointCloud: PointCloud): Promise<string> {
    const db = await getDB()
    return db.put('pointClouds', pointCloud)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('pointClouds', id)
  },

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('pointClouds')
  }
}

export const snapshotDB = {
  async getAll(filter?: { favoriteOnly?: boolean; dateFrom?: number; dateTo?: number }): Promise<TopologySnapshot[]> {
    const db = await getDB()
    let snapshots: TopologySnapshot[]

    if (filter?.favoriteOnly) {
      snapshots = await db.getAllFromIndex('topologySnapshots', 'isFavorite', true)
    } else {
      snapshots = await db.getAll('topologySnapshots')
    }

    if (filter?.dateFrom) {
      snapshots = snapshots.filter(s => s.createdAt >= filter.dateFrom!)
    }
    if (filter?.dateTo) {
      snapshots = snapshots.filter(s => s.createdAt <= filter.dateTo!)
    }

    return snapshots.sort((a, b) => b.createdAt - a.createdAt)
  },

  async getById(id: string): Promise<TopologySnapshot | undefined> {
    const db = await getDB()
    return db.get('topologySnapshots', id)
  },

  async getByPointCloudId(pointCloudId: string): Promise<TopologySnapshot[]> {
    const db = await getDB()
    return db.getAllFromIndex('topologySnapshots', 'pointCloudId', pointCloudId)
  },

  async add(snapshot: TopologySnapshot): Promise<string> {
    const db = await getDB()
    return db.add('topologySnapshots', snapshot)
  },

  async update(snapshot: TopologySnapshot): Promise<string> {
    const db = await getDB()
    return db.put('topologySnapshots', snapshot)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('topologySnapshots', id)
  },

  async deleteExpired(): Promise<number> {
    const db = await getDB()
    const now = Date.now()
    const expired = await db.getAll('topologySnapshots')
    const toDelete = expired.filter(s => s.expiresAt && s.expiresAt < now && !s.isFavorite)

    for (const s of toDelete) {
      await db.delete('topologySnapshots', s.id)
    }

    return toDelete.length
  },

  async getStats(): Promise<StorageStats> {
    const db = await getDB()
    const snapshots = await db.getAll('topologySnapshots')

    let totalSize = 0
    let favoriteCount = 0
    let expiredCount = 0
    const now = Date.now()

    const sizeMap = snapshots.map(s => ({ id: s.id, name: s.name, size: s.storageSize }))
    sizeMap.sort((a, b) => b.size - a.size)

    for (const s of snapshots) {
      totalSize += s.storageSize
      if (s.isFavorite) favoriteCount++
      if (s.expiresAt && s.expiresAt < now) expiredCount++
    }

    const storageInfo = await navigator.storage.estimate()
    const quota = storageInfo.quota || 500 * 1024 * 1024
    const usage = storageInfo.usage || 0

    return {
      totalSize: quota,
      usedSize: usage,
      availableSize: quota - usage,
      snapshotCount: snapshots.length,
      favoriteCount,
      expiredCount,
      largestSnapshots: sizeMap.slice(0, 5)
    }
  },

  async cleanup(strategy: CacheStrategy): Promise<number> {
    if (!strategy.autoCleanup) return 0

    const stats = await this.getStats()
    const usagePercent = stats.usedSize / stats.totalSize

    if (usagePercent < strategy.cleanupThreshold) return 0

    const snapshots = await this.getAll()
    const toDelete: string[] = []
    let freedSpace = 0

    const sortedSnapshots = [...snapshots]
      .filter(s => strategy.preserveFavorites ? !s.isFavorite : true)
      .sort((a, b) => {
        if (a.expiresAt && b.expiresAt) return a.expiresAt - b.expiresAt
        if (a.expiresAt) return -1
        if (b.expiresAt) return 1
        return a.createdAt - b.createdAt
      })

    const targetUsage = strategy.cleanupThreshold * 0.8
    let currentUsagePercent = usagePercent

    for (const s of sortedSnapshots) {
      if (currentUsagePercent <= targetUsage) break
      if (s.expiresAt && s.expiresAt < Date.now()) {
        toDelete.push(s.id)
        freedSpace += s.storageSize
        currentUsagePercent = (stats.usedSize - freedSpace) / stats.totalSize
      }
    }

    for (const id of toDelete) {
      await this.delete(id)
    }

    return toDelete.length
  }
}

export const taskDB = {
  async getAll(status?: string): Promise<ProcessingTask[]> {
    const db = await getDB()
    let tasks: ProcessingTask[]

    if (status) {
      tasks = await db.getAllFromIndex('processingTasks', 'status', status)
    } else {
      tasks = await db.getAll('processingTasks')
    }

    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      return b.createdAt - a.createdAt
    })
  },

  async getById(id: string): Promise<ProcessingTask | undefined> {
    const db = await getDB()
    return db.get('processingTasks', id)
  },

  async getPendingTasks(): Promise<ProcessingTask[]> {
    const db = await getDB()
    const pending = await db.getAllFromIndex('processingTasks', 'status', 'pending')
    return pending.sort((a, b) => b.priority - a.priority)
  },

  async add(task: ProcessingTask): Promise<string> {
    const db = await getDB()
    return db.add('processingTasks', task)
  },

  async update(task: ProcessingTask): Promise<string> {
    const db = await getDB()
    return db.put('processingTasks', task)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('processingTasks', id)
  },

  async clearOld(beforeDate: number): Promise<number> {
    const db = await getDB()
    const all = await db.getAll('processingTasks')
    const toDelete = all.filter(t => t.createdAt < beforeDate && t.status === 'completed')

    for (const t of toDelete) {
      await db.delete('processingTasks', t.id)
    }

    return toDelete.length
  }
}

export const syncDB = {
  async getAll(direction?: string, status?: string): Promise<SyncTask[]> {
    const db = await getDB()
    let tasks = await db.getAll('syncTasks')

    if (direction) {
      tasks = tasks.filter(t => t.direction === direction)
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }

    return tasks.sort((a, b) => b.createdAt - a.createdAt)
  },

  async getById(id: string): Promise<SyncTask | undefined> {
    const db = await getDB()
    return db.get('syncTasks', id)
  },

  async add(task: SyncTask): Promise<string> {
    const db = await getDB()
    return db.add('syncTasks', task)
  },

  async update(task: SyncTask): Promise<string> {
    const db = await getDB()
    return db.put('syncTasks', task)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('syncTasks', id)
  }
}

export const workerDB = {
  async getAll(): Promise<WorkerState[]> {
    const db = await getDB()
    return db.getAll('workerStates')
  },

  async getById(workerId: number): Promise<WorkerState | undefined> {
    const db = await getDB()
    return db.get('workerStates', workerId)
  },

  async add(state: WorkerState): Promise<number> {
    const db = await getDB()
    return db.add('workerStates', state)
  },

  async update(state: WorkerState): Promise<number> {
    const db = await getDB()
    return db.put('workerStates', state)
  },

  async delete(workerId: number): Promise<void> {
    const db = await getDB()
    await db.delete('workerStates', workerId)
  },

  async initWorkerPool(count: number = 4): Promise<void> {
    const db = await getDB()
    const existing = await db.getAll('workerStates')

    for (let i = 0; i < count; i++) {
      if (!existing.find(w => w.workerId === i)) {
        await db.add('workerStates', {
          workerId: i,
          status: 'idle',
          cpuUsage: 0,
          memoryUsage: 0,
          processedPoints: 0,
          lastActiveTime: Date.now()
        })
      }
    }
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function calculateDataHash(data: ArrayBuffer): string {
  let hash = 0
  const view = new Uint8Array(data)
  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) - hash) + view[i]
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
