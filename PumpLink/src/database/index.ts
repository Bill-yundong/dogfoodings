import { openDB, IDBPDatabase } from 'idb'
import type { PumpDevice, VibrationSignal, HealthSnapshot, Alert, FaultChain } from '@/types'

const DB_NAME = 'PumpLinkDB'
const DB_VERSION = 1

export interface PumpLinkDB {
  devices: {
    key: string
    value: PumpDevice
    indexes: { 'by-region': string; 'by-status': string; 'by-health': number }
  }
  vibration_signals: {
    key: string
    value: VibrationSignal
    indexes: { 'by-device': string; 'by-timestamp': number }
  }
  health_snapshots: {
    key: string
    value: HealthSnapshot
    indexes: { 'by-device': string; 'by-timestamp': number; 'by-health': number }
  }
  alerts: {
    key: string
    value: Alert
    indexes: { 'by-device': string; 'by-severity': string; 'by-status': string; 'by-timestamp': number }
  }
  fault_chains: {
    key: string
    value: FaultChain
    indexes: { 'by-device': string; 'by-severity': string }
  }
}

let db: IDBPDatabase<PumpLinkDB> | null = null

export async function initDB(): Promise<IDBPDatabase<PumpLinkDB>> {
  if (db) return db

  db = await openDB<PumpLinkDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('devices')) {
        const deviceStore = database.createObjectStore('devices', { keyPath: 'id' })
        deviceStore.createIndex('by-region', 'region')
        deviceStore.createIndex('by-status', 'currentStatus')
        deviceStore.createIndex('by-health', 'healthScore')
      }

      if (!database.objectStoreNames.contains('vibration_signals')) {
        const signalStore = database.createObjectStore('vibration_signals', { keyPath: 'id' })
        signalStore.createIndex('by-device', 'deviceId')
        signalStore.createIndex('by-timestamp', 'timestamp')
      }

      if (!database.objectStoreNames.contains('health_snapshots')) {
        const snapshotStore = database.createObjectStore('health_snapshots', { keyPath: 'id' })
        snapshotStore.createIndex('by-device', 'deviceId')
        snapshotStore.createIndex('by-timestamp', 'timestamp')
        snapshotStore.createIndex('by-health', 'healthScore')
      }

      if (!database.objectStoreNames.contains('alerts')) {
        const alertStore = database.createObjectStore('alerts', { keyPath: 'id' })
        alertStore.createIndex('by-device', 'deviceId')
        alertStore.createIndex('by-severity', 'severity')
        alertStore.createIndex('by-status', 'status')
        alertStore.createIndex('by-timestamp', 'timestamp')
      }

      if (!database.objectStoreNames.contains('fault_chains')) {
        const chainStore = database.createObjectStore('fault_chains', { keyPath: 'id' })
        chainStore.createIndex('by-device', 'deviceId')
        chainStore.createIndex('by-severity', 'severity')
      }
    }
  })

  return db
}

export async function getDB(): Promise<IDBPDatabase<PumpLinkDB>> {
  if (!db) {
    return initDB()
  }
  return db
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}

export async function clearAllData(): Promise<void> {
  const database = await getDB()
  const tx = database.transaction(['devices', 'vibration_signals', 'health_snapshots', 'alerts', 'fault_chains'], 'readwrite')
  await Promise.all([
    tx.objectStore('devices').clear(),
    tx.objectStore('vibration_signals').clear(),
    tx.objectStore('health_snapshots').clear(),
    tx.objectStore('alerts').clear(),
    tx.objectStore('fault_chains').clear()
  ])
  await tx.done
}
