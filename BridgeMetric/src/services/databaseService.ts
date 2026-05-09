import type { HealthRecord, DailyHealthReport, SensorData } from '../types'

const DB_NAME = 'BridgeMetricDB'
const DB_VERSION = 1

const OBJECT_STORES = {
  healthRecords: 'healthRecords',
  dailyReports: 'dailyReports',
  rawSensorData: 'rawSensorData',
  bridgePoses: 'bridgePoses'
}

export class DatabaseService {
  private static instance: DatabaseService
  private db: IDBDatabase | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async init(): Promise<IDBDatabase> {
    if (this.isInitialized && this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(new Error('Failed to open database'))

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        this.initializeObjectStores(db)
      }
    })
  }

  private initializeObjectStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(OBJECT_STORES.healthRecords)) {
      const healthStore = db.createObjectStore(OBJECT_STORES.healthRecords, {
        keyPath: 'id'
      })
      healthStore.createIndex('timestamp', 'timestamp', { unique: false })
      healthStore.createIndex('sensorId', 'sensorId', { unique: false })
      healthStore.createIndex('structureType', 'structureType', { unique: false })
      healthStore.createIndex('healthStatus', 'healthStatus', { unique: false })
      healthStore.createIndex('sensorType_structureType', ['sensorType', 'structureType'], { unique: false })
    }

    if (!db.objectStoreNames.contains(OBJECT_STORES.dailyReports)) {
      const reportStore = db.createObjectStore(OBJECT_STORES.dailyReports, {
        keyPath: 'date'
      })
      reportStore.createIndex('bridgeId', 'bridgeId', { unique: false })
      reportStore.createIndex('averageHealthScore', 'averageHealthScore', { unique: false })
    }

    if (!db.objectStoreNames.contains(OBJECT_STORES.rawSensorData)) {
      const rawStore = db.createObjectStore(OBJECT_STORES.rawSensorData, {
        keyPath: 'id'
      })
      rawStore.createIndex('sensorId', 'sensorId', { unique: false })
      rawStore.createIndex('timestamp', 'timestamp', { unique: false })
    }

    if (!db.objectStoreNames.contains(OBJECT_STORES.bridgePoses)) {
      const poseStore = db.createObjectStore(OBJECT_STORES.bridgePoses, {
        keyPath: 'timestamp'
      })
      poseStore.createIndex('overallHealthScore', 'overallHealthScore', { unique: false })
    }
  }

  private async getTransaction(
    storeNames: string | string[],
    mode: IDBTransactionMode
  ): Promise<IDBTransaction> {
    const db = await this.init()
    return db.transaction(storeNames, mode)
  }

  async addHealthRecord(record: HealthRecord): Promise<void> {
    const transaction = await this.getTransaction(OBJECT_STORES.healthRecords, 'readwrite')
    const store = transaction.objectStore(OBJECT_STORES.healthRecords)

    return new Promise((resolve, reject) => {
      const request = store.add(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async addHealthRecords(records: HealthRecord[]): Promise<void> {
    const transaction = await this.getTransaction(OBJECT_STORES.healthRecords, 'readwrite')
    const store = transaction.objectStore(OBJECT_STORES.healthRecords)

    return new Promise((resolve, reject) => {
      records.forEach(record => store.add(record))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getHealthRecordsBySensor(sensorId: string, limit: number = 100): Promise<HealthRecord[]> {
    const transaction = await this.getTransaction(OBJECT_STORES.healthRecords, 'readonly')
    const store = transaction.objectStore(OBJECT_STORES.healthRecords)
    const index = store.index('sensorId')

    return new Promise((resolve, reject) => {
      const records: HealthRecord[] = []
      const request = index.openCursor(IDBKeyRange.only(sensorId), 'prev')

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && records.length < limit) {
          records.push(cursor.value)
          cursor.continue()
        } else {
          resolve(records)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getHealthRecordsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<HealthRecord[]> {
    const transaction = await this.getTransaction(OBJECT_STORES.healthRecords, 'readonly')
    const store = transaction.objectStore(OBJECT_STORES.healthRecords)
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const records: HealthRecord[] = []
      const request = index.openCursor(IDBKeyRange.bound(startTime, endTime))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          records.push(cursor.value)
          cursor.continue()
        } else {
          resolve(records)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getHealthRecordsByStatus(status: string): Promise<HealthRecord[]> {
    const transaction = await this.getTransaction(OBJECT_STORES.healthRecords, 'readonly')
    const store = transaction.objectStore(OBJECT_STORES.healthRecords)
    const index = store.index('healthStatus')

    return new Promise((resolve, reject) => {
      const records: HealthRecord[] = []
      const request = index.openCursor(IDBKeyRange.only(status))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          records.push(cursor.value)
          cursor.continue()
        } else {
          resolve(records)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async addRawSensorData(data: SensorData): Promise<void> {
    const transaction = await this.getTransaction(OBJECT_STORES.rawSensorData, 'readwrite')
    const store = transaction.objectStore(OBJECT_STORES.rawSensorData)

    return new Promise((resolve, reject) => {
      const request = store.add(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async addRawSensorDataBatch(dataList: SensorData[]): Promise<void> {
    const transaction = await this.getTransaction(OBJECT_STORES.rawSensorData, 'readwrite')
    const store = transaction.objectStore(OBJECT_STORES.rawSensorData)

    return new Promise((resolve, reject) => {
      dataList.forEach(data => store.add(data))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async addDailyReport(report: DailyHealthReport): Promise<void> {
    const transaction = await this.getTransaction(OBJECT_STORES.dailyReports, 'readwrite')
    const store = transaction.objectStore(OBJECT_STORES.dailyReports)

    return new Promise((resolve, reject) => {
      const request = store.put(report)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getDailyReports(days: number = 7): Promise<DailyHealthReport[]> {
    const transaction = await this.getTransaction(OBJECT_STORES.dailyReports, 'readonly')
    const store = transaction.objectStore(OBJECT_STORES.dailyReports)

    return new Promise((resolve, reject) => {
      const reports: DailyHealthReport[] = []
      const request = store.openCursor(null, 'prev')

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && reports.length < days) {
          reports.push(cursor.value)
          cursor.continue()
        } else {
          resolve(reports)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async generateDailyReport(date: string): Promise<DailyHealthReport> {
    const dateObj = new Date(date)
    const startTime = dateObj.getTime()
    const endTime = startTime + 24 * 60 * 60 * 1000

    const records = await this.getHealthRecordsByTimeRange(startTime, endTime)

    const sensorStats = new Map<string, {
      maxValue: number
      status: string
      structureType: string
    }>()

    records.forEach(record => {
      const existing = sensorStats.get(record.sensorId)
      if (!existing || Math.abs(record.value) > Math.abs(existing.maxValue)) {
        sensorStats.set(record.sensorId, {
          maxValue: record.value,
          status: record.healthStatus,
          structureType: record.structureType
        })
      }
    })

    const statusOrder: Record<string, number> = {
      critical: 0,
      danger: 1,
      warning: 2,
      normal: 3
    }

    const topConcerns = Array.from(sensorStats.entries())
      .map(([sensorId, stats]) => ({
        sensorId,
        maxValue: stats.maxValue,
        status: stats.status as any,
        structureType: stats.structureType as any
      }))
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
      .slice(0, 5)

    const healthScores: Record<string, number> = {
      normal: 100,
      warning: 60,
      danger: 30,
      critical: 0
    }

    const totalScore = records.reduce((sum, r) => sum + (healthScores[r.healthStatus] || 0), 0)
    const averageScore = records.length > 0 ? totalScore / records.length : 100

    const anomalyCount = records.filter(r => r.healthStatus !== 'normal').length
    const criticalAlerts = records.filter(r => r.healthStatus === 'critical').length

    const report: DailyHealthReport = {
      date,
      bridgeId: 'main-bridge-001',
      averageHealthScore: Math.round(averageScore),
      sensorCount: sensorStats.size,
      anomalyCount,
      criticalAlerts,
      topConcerns
    }

    await this.addDailyReport(report)

    return report
  }

  async cleanOldData(daysToKeep: number = 90): Promise<number> {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
    let deletedCount = 0

    for (const storeName of [OBJECT_STORES.healthRecords, OBJECT_STORES.rawSensorData, OBJECT_STORES.bridgePoses]) {
      const transaction = await this.getTransaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('timestamp')

      await new Promise<void>((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => reject(request.error)
      })
    }

    return deletedCount
  }

  async getDatabaseStats(): Promise<{
    healthRecordCount: number
    rawDataCount: number
    reportCount: number
    oldestRecord?: number
    newestRecord?: number
  }> {
    const stats = {
      healthRecordCount: 0,
      rawDataCount: 0,
      reportCount: 0
    }

    for (const [storeName, statKey] of [
      [OBJECT_STORES.healthRecords, 'healthRecordCount'],
      [OBJECT_STORES.rawSensorData, 'rawDataCount'],
      [OBJECT_STORES.dailyReports, 'reportCount']
    ] as [string, keyof typeof stats][]) {
      const transaction = await this.getTransaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)

      stats[statKey] = await new Promise((resolve, reject) => {
        const request = store.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }

    return stats
  }

  async clearAll(): Promise<void> {
    for (const storeName of Object.values(OBJECT_STORES)) {
      const transaction = await this.getTransaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

export const databaseService = DatabaseService.getInstance()
