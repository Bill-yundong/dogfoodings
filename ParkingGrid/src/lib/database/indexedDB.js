import { openDB } from 'idb'

const DB_NAME = 'ParkingGridDB'
const DB_VERSION = 1

const STORES = {
  parkingSpaces: 'parkingSpaces',
  occupancyHistory: 'occupancyHistory',
  syncQueue: 'syncQueue',
  predictions: 'predictions',
  zones: 'zones'
}

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORES.parkingSpaces)) {
      const spaceStore = db.createObjectStore(STORES.parkingSpaces, { keyPath: 'id' })
      spaceStore.createIndex('zoneId', 'zoneId', { unique: false })
      spaceStore.createIndex('status', 'status', { unique: false })
    }

    if (!db.objectStoreNames.contains(STORES.occupancyHistory)) {
      const historyStore = db.createObjectStore(STORES.occupancyHistory, { keyPath: ['spaceId', 'timestamp'] })
      historyStore.createIndex('spaceId', 'spaceId', { unique: false })
      historyStore.createIndex('timestamp', 'timestamp', { unique: false })
      historyStore.createIndex('zoneId', 'zoneId', { unique: false })
    }

    if (!db.objectStoreNames.contains(STORES.syncQueue)) {
      const queueStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true })
      queueStore.createIndex('type', 'type', { unique: false })
      queueStore.createIndex('status', 'status', { unique: false })
      queueStore.createIndex('createdAt', 'createdAt', { unique: false })
    }

    if (!db.objectStoreNames.contains(STORES.predictions)) {
      const predStore = db.createObjectStore(STORES.predictions, { keyPath: ['zoneId', 'predictionTime'] })
      predStore.createIndex('zoneId', 'zoneId', { unique: false })
      predStore.createIndex('predictionTime', 'predictionTime', { unique: false })
    }

    if (!db.objectStoreNames.contains(STORES.zones)) {
      db.createObjectStore(STORES.zones, { keyPath: 'id' })
    }
  }
})

export async function saveParkingSpace(space) {
  const db = await dbPromise
  return db.put(STORES.parkingSpaces, {
    ...space,
    updatedAt: Date.now()
  })
}

export async function getParkingSpace(id) {
  const db = await dbPromise
  return db.get(STORES.parkingSpaces, id)
}

export async function getAllParkingSpaces() {
  const db = await dbPromise
  return db.getAll(STORES.parkingSpaces)
}

export async function getParkingSpacesByZone(zoneId) {
  const db = await dbPromise
  return db.getAllFromIndex(STORES.parkingSpaces, 'zoneId', zoneId)
}

export async function saveOccupancyRecord(record) {
  const db = await dbPromise
  return db.put(STORES.occupancyHistory, {
    ...record,
    timestamp: record.timestamp || Date.now()
  })
}

export async function getOccupancyHistory(spaceId, startTime, endTime) {
  const db = await dbPromise
  const allRecords = await db.getAllFromIndex(STORES.occupancyHistory, 'spaceId', spaceId)
  
  if (!startTime && !endTime) return allRecords
  
  return allRecords.filter(record => {
    const ts = record.timestamp
    if (startTime && ts < startTime) return false
    if (endTime && ts > endTime) return false
    return true
  }).sort((a, b) => a.timestamp - b.timestamp)
}

export async function getZoneOccupancyHistory(zoneId, startTime, endTime) {
  const db = await dbPromise
  const allRecords = await db.getAllFromIndex(STORES.occupancyHistory, 'zoneId', zoneId)
  
  if (!startTime && !endTime) return allRecords
  
  return allRecords.filter(record => {
    const ts = record.timestamp
    if (startTime && ts < startTime) return false
    if (endTime && ts > endTime) return false
    return true
  }).sort((a, b) => a.timestamp - b.timestamp)
}

export async function addToSyncQueue(type, payload) {
  const db = await dbPromise
  return db.put(STORES.syncQueue, {
    type,
    payload,
    status: 'pending',
    createdAt: Date.now()
  })
}

export async function getPendingSyncItems() {
  const db = await dbPromise
  return db.getAllFromIndex(STORES.syncQueue, 'status', 'pending')
}

export async function markSyncComplete(id) {
  const db = await dbPromise
  const item = await db.get(STORES.syncQueue, id)
  if (item) {
    item.status = 'completed'
    item.completedAt = Date.now()
    return db.put(STORES.syncQueue, item)
  }
}

export async function savePrediction(prediction) {
  const db = await dbPromise
  return db.put(STORES.predictions, {
    ...prediction,
    createdAt: Date.now()
  })
}

export async function getPredictions(zoneId, predictionTime) {
  const db = await dbPromise
  if (predictionTime) {
    return db.get(STORES.predictions, [zoneId, predictionTime])
  }
  return db.getAllFromIndex(STORES.predictions, 'zoneId', zoneId)
}

export async function saveZone(zone) {
  const db = await dbPromise
  return db.put(STORES.zones, {
    ...zone,
    updatedAt: Date.now()
  })
}

export async function getAllZones() {
  const db = await dbPromise
  return db.getAll(STORES.zones)
}

export async function getZone(id) {
  const db = await dbPromise
  return db.get(STORES.zones, id)
}

export async function incrementalBackup() {
  const db = await dbPromise
  const lastSync = localStorage.getItem('lastSyncTimestamp') || '0'
  const lastSyncTime = parseInt(lastSync)
  
  const [spaces, history, predictions, zones] = await Promise.all([
    db.getAll(STORES.parkingSpaces),
    db.getAll(STORES.occupancyHistory),
    db.getAll(STORES.predictions),
    db.getAll(STORES.zones)
  ])
  
  const incrementalData = {
    timestamp: Date.now(),
    parkingSpaces: spaces.filter(s => s.updatedAt > lastSyncTime),
    occupancyHistory: history.filter(h => h.timestamp > lastSyncTime),
    predictions: predictions.filter(p => p.createdAt > lastSyncTime),
    zones: zones.filter(z => z.updatedAt > lastSyncTime)
  }
  
  return incrementalData
}

export async function restoreFromBackup(data) {
  const db = await dbPromise
  const tx = db.transaction([
    STORES.parkingSpaces,
    STORES.occupancyHistory,
    STORES.predictions,
    STORES.zones
  ], 'readwrite')
  
  for (const space of data.parkingSpaces || []) {
    await tx.store.put(space)
  }
  
  for (const record of data.occupancyHistory || []) {
    await tx.objectStore(STORES.occupancyHistory).put(record)
  }
  
  for (const prediction of data.predictions || []) {
    await tx.objectStore(STORES.predictions).put(prediction)
  }
  
  for (const zone of data.zones || []) {
    await tx.objectStore(STORES.zones).put(zone)
  }
  
  await tx.done
}

export async function clearOldData(daysToKeep = 30) {
  const db = await dbPromise
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
  
  const historyStore = db.transaction(STORES.occupancyHistory, 'readwrite').store
  const predictionStore = db.transaction(STORES.predictions, 'readwrite').store
  
  let count = 0
  let cursor = await historyStore.openCursor()
  while (cursor) {
    if (cursor.value.timestamp < cutoffTime) {
      await cursor.delete()
      count++
    }
    cursor = await cursor.continue()
  }
  
  cursor = await predictionStore.openCursor()
  while (cursor) {
    if (cursor.value.predictionTime < cutoffTime) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }
  
  return count
}

export { STORES }
