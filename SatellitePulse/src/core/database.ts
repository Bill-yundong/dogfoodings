import { openDB, IDBPDatabase } from 'idb'
import type { DBVisibilitySnapshot, VisibilityWindow } from './types'
import { DB_NAME, DB_VERSION, VISIBILITY_STORE } from './constants'

let db: IDBPDatabase | null = null

export async function initDatabase(): Promise<void> {
  if (db) return

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(VISIBILITY_STORE)) {
        const store = db.createObjectStore(VISIBILITY_STORE, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('stationIds', 'stationIds', { multiEntry: true })
        store.createIndex('satelliteIds', 'satelliteIds', { multiEntry: true })
      }
    }
  })
}

export async function saveVisibilitySnapshot(
  snapshot: Omit<DBVisibilitySnapshot, 'id'>
): Promise<string> {
  if (!db) throw new Error('Database not initialized')

  const id = await db.add(VISIBILITY_STORE, snapshot)
  return String(id)
}

export async function getVisibilitySnapshot(
  id: string
): Promise<DBVisibilitySnapshot | undefined> {
  if (!db) throw new Error('Database not initialized')

  return db.get(VISIBILITY_STORE, id)
}

export async function getVisibilitySnapshotsByTimeRange(
  startTime: number,
  endTime: number
): Promise<DBVisibilitySnapshot[]> {
  if (!db) throw new Error('Database not initialized')

  const index = db.transaction(VISIBILITY_STORE, 'readonly').store.index('timestamp')
  const snapshots: DBVisibilitySnapshot[] = []

  let cursor = await index.openCursor(IDBKeyRange.bound(startTime, endTime))
  while (cursor) {
    snapshots.push(cursor.value as DBVisibilitySnapshot)
    cursor = await cursor.continue()
  }

  return snapshots
}

export async function getLatestVisibilitySnapshot(): Promise<DBVisibilitySnapshot | undefined> {
  if (!db) throw new Error('Database not initialized')

  const index = db.transaction(VISIBILITY_STORE, 'readonly').store.index('timestamp')
  const cursor = await index.openCursor(null, 'prev')

  return cursor ? (cursor.value as DBVisibilitySnapshot) : undefined
}

export async function deleteVisibilitySnapshot(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  await db.delete(VISIBILITY_STORE, id)
}

export async function clearOldSnapshots(maxAgeDays: number = 7): Promise<number> {
  if (!db) throw new Error('Database not initialized')

  const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  const index = db.transaction(VISIBILITY_STORE, 'readwrite').store.index('timestamp')
  let count = 0

  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime))
  while (cursor) {
    await cursor.delete()
    count++
    cursor = await cursor.continue()
  }

  return count
}

export async function getAllSnapshots(): Promise<DBVisibilitySnapshot[]> {
  if (!db) throw new Error('Database not initialized')

  return db.getAll(VISIBILITY_STORE) as Promise<DBVisibilitySnapshot[]>
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function createVisibilitySnapshot(
  windows: VisibilityWindow[],
  stationIds: string[],
  satelliteIds: string[],
  timeRange: { start: number; end: number }
): Omit<DBVisibilitySnapshot, 'id'> {
  return {
    timestamp: Date.now(),
    windows,
    stationIds,
    satelliteIds,
    timeRange
  }
}
