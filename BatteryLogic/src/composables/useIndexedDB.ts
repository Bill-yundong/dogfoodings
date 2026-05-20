import { ref, onMounted } from 'vue'
import { openDB, IDBPDatabase } from 'idb'
import type { ThermalSnapshot, Alarm, CellData } from '@/types'
import { generateId } from '@/utils/arrhenius'

const DB_NAME = 'battery-logic-db'
const DB_VERSION = 1

interface DBSchema {
  thermalSnapshots: {
    key: string
    value: ThermalSnapshot
    indexes: { 'by-timestamp': number; 'by-pack': string }
  }
  alarms: {
    key: string
    value: Alarm
    indexes: { 'by-time': number; 'by-level': string }
  }
  settings: {
    key: string
    value: any
  }
}

let dbInstance: IDBPDatabase<DBSchema> | null = null

export function useIndexedDB() {
  const isReady = ref(false)
  const error = ref<Error | null>(null)

  async function initDB() {
    try {
      dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('thermalSnapshots')) {
            const snapshotStore = db.createObjectStore('thermalSnapshots', { keyPath: 'id' })
            snapshotStore.createIndex('by-timestamp', 'timestamp')
            snapshotStore.createIndex('by-pack', 'packId')
          }

          if (!db.objectStoreNames.contains('alarms')) {
            const alarmStore = db.createObjectStore('alarms', { keyPath: 'id' })
            alarmStore.createIndex('by-time', 'timestamp')
            alarmStore.createIndex('by-level', 'level')
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }
        }
      })
      isReady.value = true
    } catch (e) {
      error.value = e as Error
      console.error('IndexedDB initialization failed:', e)
    }
  }

  async function getDB(): Promise<IDBPDatabase<DBSchema>> {
    if (!dbInstance) {
      await initDB()
    }
    if (!dbInstance) {
      throw new Error('IndexedDB not initialized')
    }
    return dbInstance
  }

  async function saveSnapshot(packId: string, cells: CellData[], status: ThermalSnapshot['status']): Promise<string> {
    const db = await getDB()
    const snapshot: ThermalSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      packId,
      cellsData: JSON.parse(JSON.stringify(cells)),
      status
    }
    await db.put('thermalSnapshots', snapshot)
    return snapshot.id
  }

  async function getSnapshotsByTimeRange(
    startTime: number,
    endTime: number,
    packId?: string
  ): Promise<ThermalSnapshot[]> {
    const db = await getDB()
    const tx = db.transaction('thermalSnapshots', 'readonly')
    const index = tx.store.index('by-timestamp')
    const range = IDBKeyRange.bound(startTime, endTime)

    const snapshots: ThermalSnapshot[] = []
    let cursor = await index.openCursor(range)

    while (cursor) {
      if (!packId || cursor.value.packId === packId) {
        snapshots.push(cursor.value)
      }
      cursor = await cursor.continue()
    }

    await tx.done
    return snapshots.sort((a, b) => a.timestamp - b.timestamp)
  }

  async function getLatestSnapshot(packId: string): Promise<ThermalSnapshot | null> {
    const db = await getDB()
    const tx = db.transaction('thermalSnapshots', 'readonly')
    const index = tx.store.index('by-timestamp')
    let cursor = await index.openCursor(null, 'prev')

    while (cursor) {
      if (cursor.value.packId === packId) {
        return cursor.value
      }
      cursor = await cursor.continue()
    }

    await tx.done
    return null
  }

  async function saveAlarm(alarm: Alarm): Promise<void> {
    const db = await getDB()
    await db.put('alarms', alarm)
  }

  async function getAlarms(
    startTime?: number,
    endTime?: number,
    level?: Alarm['level']
  ): Promise<Alarm[]> {
    const db = await getDB()
    const tx = db.transaction('alarms', 'readonly')
    let index
    let range: IDBKeyRange | null = null

    if (startTime !== undefined && endTime !== undefined) {
      index = tx.store.index('by-time')
      range = IDBKeyRange.bound(startTime, endTime)
    } else if (level) {
      index = tx.store.index('by-level')
      range = IDBKeyRange.only(level)
    } else {
      index = tx.store.index('by-time')
    }

    const alarms: Alarm[] = []
    let cursor = await index.openCursor(range, 'prev')

    while (cursor) {
      alarms.push(cursor.value)
      cursor = await cursor.continue()
    }

    await tx.done
    return alarms
  }

  async function acknowledgeAlarm(alarmId: string, userId: string = 'system'): Promise<void> {
    const db = await getDB()
    const alarm = await db.get('alarms', alarmId)
    if (alarm) {
      alarm.acknowledged = true
      alarm.acknowledgedAt = Date.now()
      alarm.acknowledgedBy = userId
      await db.put('alarms', alarm)
    }
  }

  async function saveSetting(key: string, value: any): Promise<void> {
    const db = await getDB()
    await db.put('settings', { key, value })
  }

  async function getSetting(key: string): Promise<any> {
    const db = await getDB()
    const result = await db.get('settings', key)
    return result?.value
  }

  async function clearOldData(beforeTimestamp: number): Promise<void> {
    const db = await getDB()

    const snapshotTx = db.transaction('thermalSnapshots', 'readwrite')
    const snapshotIndex = snapshotTx.store.index('by-timestamp')
    const snapshotRange = IDBKeyRange.upperBound(beforeTimestamp)
    let snapshotCursor = await snapshotIndex.openCursor(snapshotRange)
    while (snapshotCursor) {
      await snapshotCursor.delete()
      snapshotCursor = await snapshotCursor.continue()
    }
    await snapshotTx.done

    const alarmTx = db.transaction('alarms', 'readwrite')
    const alarmIndex = alarmTx.store.index('by-time')
    const alarmRange = IDBKeyRange.upperBound(beforeTimestamp)
    let alarmCursor = await alarmIndex.openCursor(alarmRange)
    while (alarmCursor) {
      await alarmCursor.delete()
      alarmCursor = await alarmCursor.continue()
    }
    await alarmTx.done
  }

  async function exportData(startTime: number, endTime: number): Promise<string> {
    const snapshots = await getSnapshotsByTimeRange(startTime, endTime)
    const alarms = await getAlarms(startTime, endTime)

    const exportData = {
      exportedAt: Date.now(),
      timeRange: { startTime, endTime },
      snapshots,
      alarms
    }

    return JSON.stringify(exportData, null, 2)
  }

  async function closeDB() {
    if (dbInstance) {
      dbInstance.close()
      dbInstance = null
      isReady.value = false
    }
  }

  onMounted(() => {
    initDB()
  })

  return {
    isReady,
    error,
    initDB,
    saveSnapshot,
    getSnapshotsByTimeRange,
    getLatestSnapshot,
    saveAlarm,
    getAlarms,
    acknowledgeAlarm,
    saveSetting,
    getSetting,
    clearOldData,
    exportData,
    closeDB
  }
}
