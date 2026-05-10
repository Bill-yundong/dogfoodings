import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { PoleNode, EnergyData, DimmingCommand, OperationLog } from '@/types'
import { chunk } from '@/utils/helpers'

interface PoleNexusSchema extends DBSchema {
  poles: {
    key: string
    value: PoleNode
    indexes: { 'by-zone': string; 'by-status': string }
  }
  energyData: {
    key: string
    value: EnergyData
    indexes: { 'by-pole': string; 'by-timestamp': number }
  }
  commands: {
    key: string
    value: DimmingCommand
    indexes: { 'by-status': string; 'by-created': number }
  }
  logs: {
    key: string
    value: OperationLog
    indexes: { 'by-pole': string; 'by-timestamp': number; 'by-synced': boolean; 'by-level': string }
  }
}

const DB_NAME = 'polenexus-db'
const DB_VERSION = 1
const BATCH_SIZE = 100

let dbInstance: IDBPDatabase<PoleNexusSchema> | null = null

export async function getDB(): Promise<IDBPDatabase<PoleNexusSchema>> {
  if (!dbInstance) {
    dbInstance = await openDB<PoleNexusSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('poles')) {
          const poleStore = db.createObjectStore('poles', { keyPath: 'id' })
          poleStore.createIndex('by-zone', 'zoneId')
          poleStore.createIndex('by-status', 'status')
        }

        if (!db.objectStoreNames.contains('energyData')) {
          const energyStore = db.createObjectStore('energyData', { keyPath: 'id' })
          energyStore.createIndex('by-pole', 'poleId')
          energyStore.createIndex('by-timestamp', 'timestamp')
        }

        if (!db.objectStoreNames.contains('commands')) {
          const commandStore = db.createObjectStore('commands', { keyPath: 'id' })
          commandStore.createIndex('by-status', 'status')
          commandStore.createIndex('by-created', 'createdAt')
        }

        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' })
          logStore.createIndex('by-pole', 'poleId')
          logStore.createIndex('by-timestamp', 'timestamp')
          logStore.createIndex('by-synced', 'synced')
          logStore.createIndex('by-level', 'level')
        }
      },
    })
  }
  return dbInstance
}

export const poleStore = {
  async getAll(): Promise<PoleNode[]> {
    const db = await getDB()
    return db.getAll('poles')
  },

  async getById(id: string): Promise<PoleNode | undefined> {
    const db = await getDB()
    return db.get('poles', id)
  },

  async getByZone(zoneId: string): Promise<PoleNode[]> {
    const db = await getDB()
    return db.getAllFromIndex('poles', 'by-zone', zoneId)
  },

  async getByStatus(status: string): Promise<PoleNode[]> {
    const db = await getDB()
    return db.getAllFromIndex('poles', 'by-status', status)
  },

  async put(pole: PoleNode): Promise<string> {
    const db = await getDB()
    return db.put('poles', pole)
  },

  async bulkPut(poles: PoleNode[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('poles', 'readwrite')
    const chunks = chunk(poles, BATCH_SIZE)
    for (const batch of chunks) {
      await Promise.all(batch.map(p => tx.store.put(p)))
    }
    await tx.done
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('poles', id)
  },

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('poles')
  },
}

export const energyStore = {
  async getAll(): Promise<EnergyData[]> {
    const db = await getDB()
    return db.getAll('energyData')
  },

  async getByPole(poleId: string, limit?: number): Promise<EnergyData[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex('energyData', 'by-pole', poleId)
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp)
    return limit ? sorted.slice(0, limit) : sorted
  },

  async getByTimeRange(start: number, end: number): Promise<EnergyData[]> {
    const db = await getDB()
    const range = IDBKeyRange.bound(start, end)
    return db.getAllFromIndex('energyData', 'by-timestamp', range)
  },

  async put(data: EnergyData): Promise<string> {
    const db = await getDB()
    return db.put('energyData', data)
  },

  async bulkPut(dataList: EnergyData[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('energyData', 'readwrite')
    const chunks = chunk(dataList, BATCH_SIZE)
    for (const batch of chunks) {
      await Promise.all(batch.map(d => tx.store.put(d)))
    }
    await tx.done
  },

  async deleteOld(before: number): Promise<number> {
    const db = await getDB()
    const range = IDBKeyRange.upperBound(before)
    const keys = await db.getAllKeysFromIndex('energyData', 'by-timestamp', range)
    for (const key of keys) {
      await db.delete('energyData', key)
    }
    return keys.length
  },

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('energyData')
  },
}

export const commandStore = {
  async getAll(): Promise<DimmingCommand[]> {
    const db = await getDB()
    const all = await db.getAll('commands')
    return all.sort((a, b) => b.createdAt - a.createdAt)
  },

  async getById(id: string): Promise<DimmingCommand | undefined> {
    const db = await getDB()
    return db.get('commands', id)
  },

  async getByStatus(status: string): Promise<DimmingCommand[]> {
    const db = await getDB()
    return db.getAllFromIndex('commands', 'by-status', status)
  },

  async put(command: DimmingCommand): Promise<string> {
    const db = await getDB()
    return db.put('commands', command)
  },

  async updateStatus(id: string, status: string, extra?: Partial<DimmingCommand>): Promise<void> {
    const db = await getDB()
    const command = await db.get('commands', id)
    if (command) {
      await db.put('commands', { ...command, status: status as DimmingCommand['status'], ...extra })
    }
  },

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('commands')
  },
}

export const logStore = {
  async getAll(limit?: number): Promise<OperationLog[]> {
    const db = await getDB()
    const all = await db.getAll('logs')
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp)
    return limit ? sorted.slice(0, limit) : sorted
  },

  async getByPole(poleId: string, limit?: number): Promise<OperationLog[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex('logs', 'by-pole', poleId)
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp)
    return limit ? sorted.slice(0, limit) : sorted
  },

  async getByTimeRange(start: number, end: number): Promise<OperationLog[]> {
    const db = await getDB()
    const range = IDBKeyRange.bound(start, end)
    return db.getAllFromIndex('logs', 'by-timestamp', range)
  },

  async getUnsynced(): Promise<OperationLog[]> {
    const db = await getDB()
    return db.getAllFromIndex('logs', 'by-synced', false)
  },

  async getByLevel(level: string, limit?: number): Promise<OperationLog[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex('logs', 'by-level', level)
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp)
    return limit ? sorted.slice(0, limit) : sorted
  },

  async put(log: OperationLog): Promise<string> {
    const db = await getDB()
    return db.put('logs', log)
  },

  async bulkPut(logs: OperationLog[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('logs', 'readwrite')
    const chunks = chunk(logs, BATCH_SIZE)
    for (const batch of chunks) {
      await Promise.all(batch.map(l => tx.store.put(l)))
    }
    await tx.done
  },

  async markAsSynced(ids: string[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('logs', 'readwrite')
    for (const id of ids) {
      const log = await tx.store.get(id)
      if (log) {
        await tx.store.put({ ...log, synced: true })
      }
    }
    await tx.done
  },

  async deleteOld(before: number): Promise<number> {
    const db = await getDB()
    const range = IDBKeyRange.upperBound(before)
    const keys = await db.getAllKeysFromIndex('logs', 'by-timestamp', range)
    for (const key of keys) {
      await db.delete('logs', key)
    }
    return keys.length
  },

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('logs')
  },

  async countUnsynced(): Promise<number> {
    const db = await getDB()
    return db.countFromIndex('logs', 'by-synced', false)
  },
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['poles', 'energyData', 'commands', 'logs'], 'readwrite')
  await Promise.all([
    tx.objectStore('poles').clear(),
    tx.objectStore('energyData').clear(),
    tx.objectStore('commands').clear(),
    tx.objectStore('logs').clear(),
  ])
  await tx.done
}