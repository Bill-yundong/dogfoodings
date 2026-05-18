import { getDB } from './index'
import type { HealthSnapshot } from '@/types'

export async function addSnapshot(snapshot: HealthSnapshot): Promise<string> {
  const db = await getDB()
  return db.put('health_snapshots', snapshot) as Promise<string>
}

export async function addSnapshots(snapshots: HealthSnapshot[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('health_snapshots', 'readwrite')
  await Promise.all(snapshots.map(s => tx.store.put(s)))
  await tx.done
}

export async function getSnapshotById(id: string): Promise<HealthSnapshot | undefined> {
  const db = await getDB()
  return db.get('health_snapshots', id)
}

export async function getSnapshotsByDevice(
  deviceId: string,
  limit?: number,
  offset?: number
): Promise<HealthSnapshot[]> {
  const db = await getDB()
  const tx = db.transaction('health_snapshots', 'readonly')
  const index = tx.store.index('by-device')
  const range = IDBKeyRange.only(deviceId)
  
  let snapshots: HealthSnapshot[] = []
  let count = 0
  let skip = offset || 0

  let cursor = await index.openCursor(range, 'prev')
  while (cursor) {
    if (skip > 0) {
      skip--
      cursor = await cursor.continue()
      continue
    }
    snapshots.push(cursor.value)
    count++
    if (limit && count >= limit) break
    cursor = await cursor.continue()
  }

  await tx.done
  return snapshots
}

export async function getSnapshotsByTimeRange(
  deviceId: string,
  startTime: number,
  endTime: number
): Promise<HealthSnapshot[]> {
  const db = await getDB()
  const tx = db.transaction('health_snapshots', 'readonly')
  const index = tx.store.index('by-timestamp')
  const range = IDBKeyRange.bound(startTime, endTime)

  const snapshots: HealthSnapshot[] = []
  let cursor = await index.openCursor(range, 'prev')
  
  while (cursor) {
    if (cursor.value.deviceId === deviceId) {
      snapshots.push(cursor.value)
    }
    cursor = await cursor.continue()
  }

  await tx.done
  return snapshots
}

export async function getLatestSnapshot(deviceId: string): Promise<HealthSnapshot | undefined> {
  const snapshots = await getSnapshotsByDevice(deviceId, 1)
  return snapshots[0]
}

export async function getSnapshotCount(deviceId?: string): Promise<number> {
  const db = await getDB()
  if (deviceId) {
    const tx = db.transaction('health_snapshots', 'readonly')
    const index = tx.store.index('by-device')
    const count = await index.count(deviceId)
    await tx.done
    return count
  }
  return db.count('health_snapshots')
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('health_snapshots', id)
}

export async function getSnapshotsWithLowHealth(threshold: number = 60): Promise<HealthSnapshot[]> {
  const db = await getDB()
  const tx = db.transaction('health_snapshots', 'readonly')
  const index = tx.store.index('by-health')
  const range = IDBKeyRange.upperBound(threshold)

  const snapshots: HealthSnapshot[] = []
  let cursor = await index.openCursor(range, 'prev')
  
  while (cursor) {
    snapshots.push(cursor.value)
    cursor = await cursor.continue()
  }

  await tx.done
  return snapshots
}
