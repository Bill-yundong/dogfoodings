import { openDB } from 'idb'

const DB_NAME = 'heatnexus-db'
const DB_VERSION = 1

let dbInstance = null

export async function getDB() {
  if (dbInstance) return dbInstance
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('heatNodes')) {
        const nodesStore = db.createObjectStore('heatNodes', { keyPath: 'id' })
        nodesStore.createIndex('zoneId', 'zoneId', { unique: false })
        nodesStore.createIndex('type', 'type', { unique: false })
      }
      
      if (!db.objectStoreNames.contains('nodeHistory')) {
        const historyStore = db.createObjectStore('nodeHistory', { keyPath: 'id' })
        historyStore.createIndex('nodeId', 'nodeId', { unique: false })
        historyStore.createIndex('timestamp', 'timestamp', { unique: false })
        historyStore.createIndex('nodeId_timestamp', ['nodeId', 'timestamp'], { unique: false })
      }
      
      if (!db.objectStoreNames.contains('zoneConfig')) {
        db.createObjectStore('zoneConfig', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
  
  return dbInstance
}

export async function saveHeatNodes(nodes) {
  const db = await getDB()
  const tx = db.transaction('heatNodes', 'readwrite')
  
  for (const node of nodes) {
    await tx.store.put(node)
  }
  
  await tx.done
}

export async function getAllHeatNodes() {
  const db = await getDB()
  return db.getAll('heatNodes')
}

export async function getHeatNodesByType(type) {
  const db = await getDB()
  const tx = db.transaction('heatNodes', 'readonly')
  const index = tx.store.index('type')
  const results = []
  
  let cursor = await index.openCursor(IDBKeyRange.only(type))
  while (cursor) {
    results.push(cursor.value)
    cursor = await cursor.continue()
  }
  
  return results
}

export async function getHeatNodeById(id) {
  const db = await getDB()
  return db.get('heatNodes', id)
}

export async function saveNodeHistory(historyRecords) {
  const db = await getDB()
  const tx = db.transaction('nodeHistory', 'readwrite')
  
  for (const record of historyRecords) {
    await tx.store.put(record)
  }
  
  await tx.done
}

export async function getNodeHistory(nodeId, startTime, endTime) {
  const db = await getDB()
  const tx = db.transaction('nodeHistory', 'readonly')
  const index = tx.store.index('nodeId_timestamp')
  const results = []
  
  const range = IDBKeyRange.bound([nodeId, startTime], [nodeId, endTime])
  let cursor = await index.openCursor(range)
  
  while (cursor) {
    results.push(cursor.value)
    cursor = await cursor.continue()
  }
  
  return results
}

export async function getLatestNodeHistory(nodeId, limit = 100) {
  const db = await getDB()
  const tx = db.transaction('nodeHistory', 'readonly')
  const index = tx.store.index('nodeId')
  const results = []
  
  let cursor = await index.openCursor(IDBKeyRange.only(nodeId), 'prev')
  
  while (cursor && results.length < limit) {
    results.unshift(cursor.value)
    cursor = await cursor.continue()
  }
  
  return results
}

export async function saveZoneConfig(config) {
  const db = await getDB()
  return db.put('zoneConfig', config)
}

export async function getZoneConfig(id) {
  const db = await getDB()
  return db.get('zoneConfig', id)
}

export async function clearAllData() {
  const db = await getDB()
  await Promise.all([
    db.clear('heatNodes'),
    db.clear('nodeHistory'),
    db.clear('zoneConfig'),
    db.clear('syncQueue')
  ])
}

export async function getDatabaseStats() {
  const db = await getDB()
  const nodeCount = await db.count('heatNodes')
  const historyCount = await db.count('nodeHistory')
  
  return { nodeCount, historyCount }
}

export default {
  getDB,
  saveHeatNodes,
  getAllHeatNodes,
  getHeatNodesByType,
  getHeatNodeById,
  saveNodeHistory,
  getNodeHistory,
  getLatestNodeHistory,
  saveZoneConfig,
  getZoneConfig,
  clearAllData,
  getDatabaseStats
}
