import { openDB, IDBPDatabase, StoreNames } from 'idb'
import type { FloorMap, SmokeField, EvacuationPath, SensorReading, Device } from '@/types'

const DB_NAME = 'firelink-db'
const DB_VERSION = 1

const STORES = {
  FLOOR_MAPS: 'floorMaps',
  SMOKE_FIELDS: 'smokeFields',
  PATHS: 'paths',
  SENSOR_READINGS: 'sensorReadings',
  DEVICES: 'devices',
  SYNC_QUEUE: 'syncQueue',
  OFFLINE_LOG: 'offlineLog'
} as const

type DBSchema = {
  floorMaps: {
    key: number
    value: FloorMap
    indexes: { 'by-floor': number }
  }
  smokeFields: {
    key: string
    value: SmokeField
    indexes: { 'by-floor': number; 'by-timestamp': number }
  }
  paths: {
    key: string
    value: EvacuationPath
    indexes: { 'by-start': string; 'by-floor': number }
  }
  sensorReadings: {
    key: string
    value: SensorReading
    indexes: { 'by-sensor': string; 'by-timestamp': number; 'by-floor': number }
  }
  devices: {
    key: string
    value: Device
    indexes: { 'by-type': string; 'by-floor': number }
  }
  syncQueue: {
    key: string
    value: {
      id: string
      type: 'create' | 'update' | 'delete'
      store: StoreNames<DBSchema>
      data: unknown
      timestamp: number
      retryCount: number
    }
    indexes: { 'by-timestamp': number; 'by-type': string }
  }
  offlineLog: {
    key: string
    value: {
      id: string
      action: string
      data: unknown
      timestamp: number
      success: boolean
    }
    indexes: { 'by-timestamp': number }
  }
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null

async function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbPromise) return dbPromise

  dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.FLOOR_MAPS)) {
        const floorMapStore = db.createObjectStore(STORES.FLOOR_MAPS, { keyPath: 'floor' })
        floorMapStore.createIndex('by-floor', 'floor', { unique: true })
      }

      if (!db.objectStoreNames.contains(STORES.SMOKE_FIELDS)) {
        const smokeStore = db.createObjectStore(STORES.SMOKE_FIELDS, { keyPath: 'id' })
        smokeStore.createIndex('by-floor', 'floor')
        smokeStore.createIndex('by-timestamp', 'timestamp')
      }

      if (!db.objectStoreNames.contains(STORES.PATHS)) {
        const pathStore = db.createObjectStore(STORES.PATHS, { keyPath: 'id' })
        pathStore.createIndex('by-start', 'startNodeId')
      }

      if (!db.objectStoreNames.contains(STORES.SENSOR_READINGS)) {
        const sensorStore = db.createObjectStore(STORES.SENSOR_READINGS, { keyPath: 'id' })
        sensorStore.createIndex('by-sensor', 'sensorId')
        sensorStore.createIndex('by-timestamp', 'timestamp')
        sensorStore.createIndex('by-floor', 'floor')
      }

      if (!db.objectStoreNames.contains(STORES.DEVICES)) {
        const deviceStore = db.createObjectStore(STORES.DEVICES, { keyPath: 'id' })
        deviceStore.createIndex('by-type', 'type')
        deviceStore.createIndex('by-floor', 'floor')
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('by-timestamp', 'timestamp')
        syncStore.createIndex('by-type', 'type')
      }

      if (!db.objectStoreNames.contains(STORES.OFFLINE_LOG)) {
        const logStore = db.createObjectStore(STORES.OFFLINE_LOG, { keyPath: 'id' })
        logStore.createIndex('by-timestamp', 'timestamp')
      }
    }
  })

  return dbPromise
}

export const floorMapDB = {
  async save(floorMap: FloorMap): Promise<void> {
    const db = await getDB()
    await db.put(STORES.FLOOR_MAPS, floorMap)
  },

  async get(floor: number): Promise<FloorMap | undefined> {
    const db = await getDB()
    return db.get(STORES.FLOOR_MAPS, floor)
  },

  async getAll(): Promise<FloorMap[]> {
    const db = await getDB()
    return db.getAll(STORES.FLOOR_MAPS)
  },

  async delete(floor: number): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.FLOOR_MAPS, floor)
  },

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear(STORES.FLOOR_MAPS)
  }
}

export const smokeFieldDB = {
  async save(smokeField: SmokeField): Promise<void> {
    const db = await getDB()
    await db.put(STORES.SMOKE_FIELDS, smokeField)
  },

  async get(id: string): Promise<SmokeField | undefined> {
    const db = await getDB()
    return db.get(STORES.SMOKE_FIELDS, id)
  },

  async getByFloor(floor: number, limit = 10): Promise<SmokeField[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SMOKE_FIELDS, 'by-floor', floor, limit)
  },

  async getLatestByFloor(floor: number): Promise<SmokeField | undefined> {
    const db = await getDB()
    const results = await db.getAllFromIndex(STORES.SMOKE_FIELDS, 'by-floor', floor, 1)
    return results[0]
  },

  async deleteOldOlderThan(timestamp: number): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(STORES.SMOKE_FIELDS, 'readwrite')
    const index = tx.store.index('by-timestamp')
    const keys = await index.getAllKeys(IDBKeyRange.upperBound(timestamp))
    await Promise.all(keys.map(key => tx.store.delete(key)))
    await tx.done
  }
}

export const pathDB = {
  async save(path: EvacuationPath): Promise<void> {
    const db = await getDB()
    await db.put(STORES.PATHS, path)
  },

  async get(id: string): Promise<EvacuationPath | undefined> {
    const db = await getDB()
    return db.get(STORES.PATHS, id)
  },

  async getByStartNode(startNodeId: string): Promise<EvacuationPath[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.PATHS, 'by-start', startNodeId)
  },

  async getAll(): Promise<EvacuationPath[]> {
    const db = await getDB()
    return db.getAll(STORES.PATHS)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.PATHS, id)
  }
}

export const sensorReadingDB = {
  async save(reading: SensorReading): Promise<void> {
    const db = await getDB()
    await db.put(STORES.SENSOR_READINGS, reading)
  },

  async get(id: string): Promise<SensorReading | undefined> {
    const db = await getDB()
    return db.get(STORES.SENSOR_READINGS, id)
  },

  async getBySensor(sensorId: string, limit = 100): Promise<SensorReading[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SENSOR_READINGS, 'by-sensor', sensorId, limit)
  },

  async getByFloor(floor: number, limit = 100): Promise<SensorReading[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SENSOR_READINGS, 'by-floor', floor, limit)
  }
}

export const deviceDB = {
  async save(device: Device): Promise<void> {
    const db = await getDB()
    await db.put(STORES.DEVICES, device)
  },

  async get(id: string): Promise<Device | undefined> {
    const db = await getDB()
    return db.get(STORES.DEVICES, id)
  },

  async getByType(type: Device['type']): Promise<Device[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.DEVICES, 'by-type', type)
  },

  async getByFloor(floor: number): Promise<Device[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.DEVICES, 'by-floor', floor)
  },

  async getAll(): Promise<Device[]> {
    const db = await getDB()
    return db.getAll(STORES.DEVICES)
  }
}

export const syncQueueDB = {
  async enqueue(item: {
    type: 'create' | 'update' | 'delete'
    store: StoreNames<DBSchema>
    data: unknown
  }): Promise<void> {
    const db = await getDB()
    const queueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      timestamp: Date.now(),
      retryCount: 0
    }
    await db.put(STORES.SYNC_QUEUE, queueItem)
  },

  async dequeue(batchSize = 10): Promise<Array<{
    id: string
    type: 'create' | 'update' | 'delete'
    store: StoreNames<DBSchema>
    data: unknown
    timestamp: number
    retryCount: number
  }>> {
    const db = await getDB()
    const items = await db.getAllFromIndex(STORES.SYNC_QUEUE, 'by-timestamp', undefined, batchSize)
    return items
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.SYNC_QUEUE, id)
  },

  async updateRetry(id: string): Promise<void> {
    const db = await getDB()
    const item = await db.get(STORES.SYNC_QUEUE, id)
    if (item) {
      item.retryCount++
      await db.put(STORES.SYNC_QUEUE, item)
    }
  },

  async getCount(): Promise<number> {
    const db = await getDB()
    return db.count(STORES.SYNC_QUEUE)
  }
}

export const offlineLogDB = {
  async log(action: string, data: unknown, success: boolean): Promise<void> {
    const db = await getDB()
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: Date.now(),
      success
    }
    await db.put(STORES.OFFLINE_LOG, logEntry)
  },

  async getRecent(limit = 100): Promise<Array<{
    id: string
    action: string
    data: unknown
    timestamp: number
    success: boolean
  }>> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.OFFLINE_LOG, 'by-timestamp', undefined, limit)
  }
}

export async function initializeOfflineData(floorMaps: FloorMap[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.FLOOR_MAPS, 'readwrite')
  await Promise.all(floorMaps.map(map => tx.store.put(map)))
  await tx.done
}

export async function isDataAvailable(): Promise<boolean> {
  try {
    const maps = await floorMapDB.getAll()
    return maps.length > 0
  } catch {
    return false
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const stores = Object.values(STORES)
  for (const store of stores) {
    await db.clear(store)
  }
}
