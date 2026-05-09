import { openDB } from 'idb'

const DB_NAME = 'BridgeHealthDB'
const DB_VERSION = 2
const STORES = {
  STRAIN_DATA: 'strainData',
  HEALTH_RECORDS: 'healthRecords',
  ALERTS: 'alerts',
  CONFIG: 'config'
}

let dbInstance = null

export const initDatabase = async () => {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.STRAIN_DATA)) {
        const strainStore = db.createObjectStore(STORES.STRAIN_DATA, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        strainStore.createIndex('gaugeId', 'gaugeId', { unique: false })
        strainStore.createIndex('timestamp', 'timestamp', { unique: false })
        strainStore.createIndex('span', 'span', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.HEALTH_RECORDS)) {
        const healthStore = db.createObjectStore(STORES.HEALTH_RECORDS, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        healthStore.createIndex('date', 'date', { unique: false })
        healthStore.createIndex('status', 'status', { unique: false })
        healthStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.ALERTS)) {
        const alertStore = db.createObjectStore(STORES.ALERTS, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        alertStore.createIndex('level', 'level', { unique: false })
        alertStore.createIndex('timestamp', 'timestamp', { unique: false })
        alertStore.createIndex('gaugeId', 'gaugeId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG, { keyPath: 'key' })
      }
    }
  })

  return dbInstance
}

export const getDB = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase first.')
  }
  return dbInstance
}

export const saveStrainData = async (data) => {
  const db = getDB()
  const tx = db.transaction(STORES.STRAIN_DATA, 'readwrite')
  const store = tx.objectStore(STORES.STRAIN_DATA)

  const records = Object.entries(data).map(([gaugeId, gaugeData]) => ({
    gaugeId,
    value: gaugeData.value,
    unit: gaugeData.unit,
    timestamp: gaugeData.timestamp,
    span: gaugeData.span || 1,
    position: gaugeData.position || 0,
    type: gaugeData.type || 'bending',
    status: gaugeData.status || 'normal',
    createdAt: new Date().toISOString()
  }))

  for (const record of records) {
    await store.add(record)
  }

  await tx.done
  
  await createDailyHealthRecord(data)

  const count = await db.count(STORES.STRAIN_DATA)
  if (count > 100000) {
    await cleanupOldData()
  }

  return records.length
}

export const getStrainDataByGauge = async (gaugeId, limit = 1000) => {
  const db = getDB()
  const index = db.transaction(STORES.STRAIN_DATA).store.index('gaugeId')
  const records = []
  
  let cursor = await index.openCursor(IDBKeyRange.only(gaugeId), 'prev')
  while (cursor && records.length < limit) {
    records.unshift(cursor.value)
    cursor = await cursor.continue()
  }
  
  return records
}

export const getStrainDataByTimeRange = async (startTime, endTime) => {
  const db = getDB()
  const index = db.transaction(STORES.STRAIN_DATA).store.index('timestamp')
  const range = IDBKeyRange.bound(startTime, endTime)
  const records = []
  
  let cursor = await index.openCursor(range)
  while (cursor) {
    records.push(cursor.value)
    cursor = await cursor.continue()
  }
  
  return records
}

export const createDailyHealthRecord = async (data) => {
  const db = getDB()
  
  const today = new Date().toISOString().split('T')[0]
  
  let maxStrain = 0
  let warningCount = 0
  let criticalCount = 0
  
  Object.values(data).forEach(gaugeData => {
    const absValue = Math.abs(gaugeData.value)
    if (absValue > maxStrain) {
      maxStrain = absValue
    }
    if (absValue > 70) {
      warningCount++
    }
    if (absValue > 100) {
      criticalCount++
    }
  })

  let status = '良好'
  if (criticalCount > 0) {
    status = '危急'
  } else if (warningCount > 0) {
    status = '警告'
  } else if (maxStrain > 40) {
    status = '关注'
  }

  const existingRecord = await getHealthRecordByDate(today)
  
  const tx = db.transaction(STORES.HEALTH_RECORDS, 'readwrite')
  const store = tx.objectStore(STORES.HEALTH_RECORDS)
  
  if (existingRecord) {
    const updatedRecord = {
      ...existingRecord,
      maxStrain: Math.max(existingRecord.maxStrain, maxStrain),
      warningCount: existingRecord.warningCount + warningCount,
      criticalCount: existingRecord.criticalCount + criticalCount,
      status,
      updatedAt: new Date().toISOString()
    }
    await store.put(updatedRecord)
  } else {
    await store.add({
      date: today,
      maxStrain,
      avgStrain: maxStrain * 0.3,
      warningCount,
      criticalCount,
      status,
      summary: generateHealthSummary(maxStrain, warningCount, criticalCount),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  await tx.done
}

export const getHealthRecordByDate = async (date) => {
  const db = getDB()
  const allRecords = await db.getAll(STORES.HEALTH_RECORDS)
  return allRecords.find(record => record.date === date) || null
}

export const getHealthRecords = async (limit = 30) => {
  const db = getDB()
  const allRecords = await db.getAll(STORES.HEALTH_RECORDS)
  
  const sortedRecords = allRecords
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
  
  return sortedRecords
}

export const saveAlert = async (alert) => {
  const db = getDB()
  const tx = db.transaction(STORES.ALERTS, 'readwrite')
  const store = tx.objectStore(STORES.ALERTS)
  
  const record = {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
  
  const id = await store.add(record)
  await tx.done
  
  return id
}

export const getAlertsByLevel = async (level, limit = 100) => {
  const db = getDB()
  const index = db.transaction(STORES.ALERTS).store.index('level')
  const records = []
  
  let cursor = await index.openCursor(IDBKeyRange.only(level), 'prev')
  while (cursor && records.length < limit) {
    records.unshift(cursor.value)
    cursor = await cursor.continue()
  }
  
  return records
}

export const saveConfig = async (key, value) => {
  const db = getDB()
  const tx = db.transaction(STORES.CONFIG, 'readwrite')
  const store = tx.objectStore(STORES.CONFIG)
  
  await store.put({ key, value, updatedAt: new Date().toISOString() })
  await tx.done
}

export const getConfig = async (key) => {
  const db = getDB()
  const record = await db.get(STORES.CONFIG, key)
  return record ? record.value : null
}

const cleanupOldData = async () => {
  const db = getDB()
  const tx = db.transaction(STORES.STRAIN_DATA, 'readwrite')
  const store = tx.objectStore(STORES.STRAIN_DATA)
  const index = store.index('timestamp')
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const range = IDBKeyRange.upperBound(thirtyDaysAgo.toISOString())
  let cursor = await index.openCursor(range)
  
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  
  await tx.done
}

const generateHealthSummary = (maxStrain, warningCount, criticalCount) => {
  if (criticalCount > 0) {
    return `检测到 ${criticalCount} 个危急警报，最大应变值 ${maxStrain.toFixed(2)} με，需要立即处理。`
  }
  if (warningCount > 0) {
    return `检测到 ${warningCount} 个警告，最大应变值 ${maxStrain.toFixed(2)} με，建议密切关注。`
  }
  if (maxStrain > 40) {
    return `最大应变值 ${maxStrain.toFixed(2)} με，处于关注范围，建议定期检查。`
  }
  return `桥梁结构健康状况良好，最大应变值 ${maxStrain.toFixed(2)} με，在正常范围内。`
}

export const exportHealthData = async (startDate, endDate) => {
  const strainData = await getStrainDataByTimeRange(startDate, endDate)
  const healthRecords = await getHealthRecords(365)
  
  return {
    strainData,
    healthRecords,
    metadata: {
      exportDate: new Date().toISOString(),
      dateRange: { start: startDate, end: endDate },
      totalRecords: strainData.length
    }
  }
}

export const clearDatabase = async () => {
  const db = getDB()
  const tx = db.transaction(Object.values(STORES), 'readwrite')
  
  for (const storeName of Object.values(STORES)) {
    await tx.objectStore(storeName).clear()
  }
  
  await tx.done
}
