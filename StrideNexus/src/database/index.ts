import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type {
  User,
  RunSession,
  PressureData,
  CadenceData,
  PostureData,
  RiskAssessment,
  Shoes,
  WearData,
  SyncQueueItem
} from '@/types'

interface StrideNexusDB extends DBSchema {
  users: {
    key: string
    value: User
    indexes: { 'by-email': string }
  }
  runSessions: {
    key: string
    value: RunSession
    indexes: { 'by-user': string; 'by-startTime': number }
  }
  pressureData: {
    key: string
    value: PressureData
    indexes: { 'by-session': string; 'by-timestamp': number }
  }
  cadenceData: {
    key: string
    value: CadenceData
    indexes: { 'by-session': string; 'by-timestamp': number }
  }
  postureData: {
    key: string
    value: PostureData
    indexes: { 'by-session': string; 'by-timestamp': number }
  }
  riskAssessments: {
    key: string
    value: RiskAssessment
    indexes: { 'by-session': string; 'by-assessedAt': number }
  }
  shoes: {
    key: string
    value: Shoes
    indexes: { 'by-user': string; 'by-purchaseDate': number }
  }
  wearData: {
    key: string
    value: WearData
    indexes: { 'by-shoes': string; 'by-recordedAt': number }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: { 'by-table': string; 'by-status': string; 'by-createdAt': number }
  }
}

const DB_NAME = 'StrideNexusDB'
const DB_VERSION = 1

let db: IDBPDatabase<StrideNexusDB> | null = null

export async function initDB(): Promise<IDBPDatabase<StrideNexusDB>> {
  if (db) return db

  db = await openDB<StrideNexusDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const usersStore = db.createObjectStore('users', { keyPath: 'id' })
      usersStore.createIndex('by-email', 'email', { unique: true })

      const sessionsStore = db.createObjectStore('runSessions', { keyPath: 'id' })
      sessionsStore.createIndex('by-user', 'userId')
      sessionsStore.createIndex('by-startTime', 'startTime')

      const pressureStore = db.createObjectStore('pressureData', { keyPath: 'id' })
      pressureStore.createIndex('by-session', 'sessionId')
      pressureStore.createIndex('by-timestamp', 'timestamp')

      const cadenceStore = db.createObjectStore('cadenceData', { keyPath: 'id' })
      cadenceStore.createIndex('by-session', 'sessionId')
      cadenceStore.createIndex('by-timestamp', 'timestamp')

      const postureStore = db.createObjectStore('postureData', { keyPath: 'id' })
      postureStore.createIndex('by-session', 'sessionId')
      postureStore.createIndex('by-timestamp', 'timestamp')

      const riskStore = db.createObjectStore('riskAssessments', { keyPath: 'id' })
      riskStore.createIndex('by-session', 'sessionId')
      riskStore.createIndex('by-assessedAt', 'assessedAt')

      const shoesStore = db.createObjectStore('shoes', { keyPath: 'id' })
      shoesStore.createIndex('by-user', 'userId')
      shoesStore.createIndex('by-purchaseDate', 'purchaseDate')

      const wearStore = db.createObjectStore('wearData', { keyPath: 'id' })
      wearStore.createIndex('by-shoes', 'shoesId')
      wearStore.createIndex('by-recordedAt', 'recordedAt')

      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
      syncStore.createIndex('by-table', 'tableName')
      syncStore.createIndex('by-status', 'status')
      syncStore.createIndex('by-createdAt', 'createdAt')
    }
  })

  return db
}

export function getDB(): IDBPDatabase<StrideNexusDB> {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return db
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}
