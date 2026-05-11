import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION, DBSchema as Schema } from './schema'

export type CarbonDB = IDBPDatabase<Schema>

let dbInstance: CarbonDB | null = null

export async function initDatabase(): Promise<CarbonDB> {
  if (dbInstance) return dbInstance

  const db = await openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('emissionFactors')) {
        const store = db.createObjectStore('emissionFactors', { keyPath: 'id' })
        store.createIndex('by-category', 'category')
      }

      if (!db.objectStoreNames.contains('productionLines')) {
        const store = db.createObjectStore('productionLines', { keyPath: 'id' })
        store.createIndex('by-department', 'department')
      }

      if (!db.objectStoreNames.contains('supplyChainNodes')) {
        const store = db.createObjectStore('supplyChainNodes', { keyPath: 'id' })
        store.createIndex('by-tier', 'tier')
        store.createIndex('by-parent', 'parentId')
      }

      if (!db.objectStoreNames.contains('carbonRecords')) {
        const store = db.createObjectStore('carbonRecords', { keyPath: 'id' })
        store.createIndex('by-timestamp', 'timestamp')
        store.createIndex('by-scope', 'scope')
        store.createIndex('by-sync', 'syncStatus')
      }

      if (!db.objectStoreNames.contains('carbonTargets')) {
        const store = db.createObjectStore('carbonTargets', { keyPath: 'id' })
        store.createIndex('by-year', 'targetYear')
      }

      if (!db.objectStoreNames.contains('lcaCalculations')) {
        const store = db.createObjectStore('lcaCalculations', { keyPath: 'id' })
        store.createIndex('by-product', 'productId')
        store.createIndex('by-timestamp', 'timestamp')
      }

      if (!db.objectStoreNames.contains('simulationResults')) {
        const store = db.createObjectStore('simulationResults', { keyPath: 'id' })
        store.createIndex('by-timestamp', 'timestamp')
      }

      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
        store.createIndex('by-status', 'status')
        store.createIndex('by-timestamp', 'timestamp')
      }
    }
  })

  dbInstance = db
  return db
}

export function getDB(): CarbonDB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase first.')
  }
  return dbInstance
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
