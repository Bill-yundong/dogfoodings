import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { DieHealthRecord, MaintenanceRecord, RainflowCycle } from '../types'

interface DieHealthDB extends DBSchema {
  dies: {
    key: string
    value: DieHealthRecord
    indexes: {
      'by-health': number
      'by-model': string
      'by-updatedAt': number
    }
  }
  maintenance: {
    key: string
    value: MaintenanceRecord
    indexes: {
      'by-dieId': string
      'by-date': number
    }
  }
  cycles: {
    key: string
    value: {
      id: string
      dieId: string
      cycles: RainflowCycle[]
      timestamp: number
    }
    indexes: {
      'by-dieId': string
      'by-timestamp': number
    }
  }
  syncQueue: {
    key: string
    value: {
      id: string
      type: string
      payload: any
      timestamp: number
      retries: number
    }
    indexes: {
      'by-timestamp': number
    }
  }
}

const DB_NAME = 'PressPulseDB'
const DB_VERSION = 1

let db: IDBPDatabase<DieHealthDB> | null = null

export async function initDB(): Promise<IDBPDatabase<DieHealthDB>> {
  if (db) return db

  db = await openDB<DieHealthDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const dieStore = database.createObjectStore('dies', { keyPath: 'id' })
      dieStore.createIndex('by-health', 'currentHealth')
      dieStore.createIndex('by-model', 'model')
      dieStore.createIndex('by-updatedAt', 'updatedAt')

      const maintenanceStore = database.createObjectStore('maintenance', { keyPath: 'id' })
      maintenanceStore.createIndex('by-dieId', 'dieId')
      maintenanceStore.createIndex('by-date', 'date')

      const cyclesStore = database.createObjectStore('cycles', { keyPath: 'id' })
      cyclesStore.createIndex('by-dieId', 'dieId')
      cyclesStore.createIndex('by-timestamp', 'timestamp')

      const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id' })
      syncStore.createIndex('by-timestamp', 'timestamp')
    },
  })

  return db
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}

export async function saveDieRecord(record: DieHealthRecord): Promise<void> {
  const database = await initDB()
  await database.put('dies', record)
}

export async function batchSaveDieRecords(records: DieHealthRecord[]): Promise<void> {
  const database = await initDB()
  const tx = database.transaction('dies', 'readwrite')
  
  for (const record of records) {
    tx.store.put(record)
  }
  
  await tx.done
}

export async function getDieRecord(id: string): Promise<DieHealthRecord | undefined> {
  const database = await initDB()
  return database.get('dies', id)
}

export async function getAllDieRecords(): Promise<DieHealthRecord[]> {
  const database = await initDB()
  return database.getAll('dies')
}

export async function getDieRecordsByHealthRange(
  minHealth: number,
  maxHealth: number
): Promise<DieHealthRecord[]> {
  const database = await initDB()
  const index = database.transaction('dies').store.index('by-health')
  const range = IDBKeyRange.bound(minHealth, maxHealth)
  return index.getAll(range)
}

export async function deleteDieRecord(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('dies', id)
}

export async function saveMaintenanceRecord(record: MaintenanceRecord & { dieId: string }): Promise<void> {
  const database = await initDB()
  await database.put('maintenance', record)
}

export async function getMaintenanceRecordsByDieId(dieId: string): Promise<MaintenanceRecord[]> {
  const database = await initDB()
  const index = database.transaction('maintenance').store.index('by-dieId')
  return index.getAll(dieId)
}

export async function saveCycles(dieId: string, cycles: RainflowCycle[]): Promise<void> {
  const database = await initDB()
  await database.put('cycles', {
    id: `${dieId}_${Date.now()}`,
    dieId,
    cycles,
    timestamp: Date.now(),
  })
}

export async function getCyclesByDieId(
  dieId: string,
  limit?: number
): Promise<RainflowCycle[]> {
  const database = await initDB()
  const index = database.transaction('cycles').store.index('by-dieId')
  const records = limit 
    ? await index.getAll(dieId, limit)
    : await index.getAll(dieId)
  
  return records.flatMap(r => r.cycles)
}

export async function enqueueSyncItem(type: string, payload: any): Promise<void> {
  const database = await initDB()
  await database.put('syncQueue', {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  })
}

export async function getSyncQueue(): Promise<any[]> {
  const database = await initDB()
  return database.getAll('syncQueue')
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('syncQueue', id)
}

export async function updateDieHealth(
  dieId: string,
  healthUpdate: Partial<Pick<DieHealthRecord, 'currentHealth' | 'predictedRemainingLife' | 'failureProbability' | 'stressAccumulation'>>
): Promise<void> {
  const database = await initDB()
  const record = await database.get('dies', dieId)
  
  if (record) {
    const updated: DieHealthRecord = {
      ...record,
      ...healthUpdate,
      updatedAt: Date.now(),
    }
    await database.put('dies', updated)
  }
}

export async function getDieCount(): Promise<number> {
  const database = await initDB()
  return database.count('dies')
}

export async function getDiesPaginated(
  offset: number,
  limit: number
): Promise<DieHealthRecord[]> {
  const database = await initDB()
  const index = database.transaction('dies').store.index('by-updatedAt')
  const records: DieHealthRecord[] = []
  let count = 0
  
  for await (const cursor of index.iterate(null, 'prev')) {
    if (count >= offset + limit) break
    if (count >= offset) {
      records.push(cursor.value)
    }
    count++
  }
  
  return records
}

export async function clearAllData(): Promise<void> {
  const database = await initDB()
  await Promise.all([
    database.clear('dies'),
    database.clear('maintenance'),
    database.clear('cycles'),
    database.clear('syncQueue'),
  ])
}
