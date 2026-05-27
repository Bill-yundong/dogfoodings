import { openDB, type IDBPDatabase } from 'idb'
import type { Facility, TopologyConnection, TopologySnapshot, AlertEvent, CoordinationOrder } from './types'

const DB_NAME = 'hydrogen-nexus-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('facilities')) {
        const facilityStore = db.createObjectStore('facilities', { keyPath: 'id' })
        facilityStore.createIndex('type', 'type', { unique: false })
        facilityStore.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains('leakEvents')) {
        const leakStore = db.createObjectStore('leakEvents', { keyPath: 'id' })
        leakStore.createIndex('facilityId', 'facilityId', { unique: false })
        leakStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains('topologySnapshots')) {
        const topoStore = db.createObjectStore('topologySnapshots', { keyPath: 'id' })
        topoStore.createIndex('version', 'version', { unique: false })
      }
      if (!db.objectStoreNames.contains('coordinationOrders')) {
        const orderStore = db.createObjectStore('coordinationOrders', { keyPath: 'id' })
        orderStore.createIndex('status', 'status', { unique: false })
        orderStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' })
        alertStore.createIndex('level', 'level', { unique: false })
        alertStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    },
  })
  return dbInstance
}

export async function saveFacilities(facilities: Facility[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('facilities', 'readwrite')
  for (const f of facilities) {
    await tx.store.put(f)
  }
  await tx.done
}

export async function loadFacilities(): Promise<Facility[]> {
  const db = await getDB()
  return db.getAll('facilities')
}

export async function saveTopologySnapshot(
  facilities: Facility[],
  connections: TopologyConnection[]
): Promise<void> {
  const db = await getDB()
  const snapshot: TopologySnapshot = {
    id: `topo-${Date.now()}`,
    facilities,
    connections,
    version: Date.now(),
    timestamp: Date.now(),
  }
  await db.put('topologySnapshots', snapshot)
}

export async function loadLatestTopology(): Promise<TopologySnapshot | undefined> {
  const db = await getDB()
  const all = await db.getAll('topologySnapshots')
  if (all.length === 0) return undefined
  return all.sort((a, b) => b.version - a.version)[0]
}

export async function saveAlert(alert: AlertEvent): Promise<void> {
  const db = await getDB()
  await db.put('alerts', alert)
}

export async function loadAlerts(limit: number = 50): Promise<AlertEvent[]> {
  const db = await getDB()
  const all = await db.getAll('alerts')
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

export async function saveCoordinationOrder(order: CoordinationOrder): Promise<void> {
  const db = await getDB()
  await db.put('coordinationOrders', order)
}

export async function loadCoordinationOrders(): Promise<CoordinationOrder[]> {
  const db = await getDB()
  const all = await db.getAll('coordinationOrders')
  return all.sort((a, b) => b.timestamp - a.timestamp)
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const storeNames = ['facilities', 'leakEvents', 'topologySnapshots', 'coordinationOrders', 'alerts']
  for (const name of storeNames) {
    await db.clear(name)
  }
}
