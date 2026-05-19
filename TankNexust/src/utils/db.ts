import { openDB, IDBPDatabase } from 'idb'
import type { Tank, Chemical } from '@/types/tank'
import type { WeatherRecord, SimulationRecord } from '@/types/simulation'
import type { EmergencyTerminal, Shelter, ResourceUnit, EvacuationTask } from '@/types/terminal'

const DB_NAME = 'tank_nexust_db'
const DB_VERSION = 1

export interface TankNexustDB extends IDBPDatabase {
  getFromStore: (storeName: string, key: string) => Promise<any>
  getAllFromStore: (storeName: string) => Promise<any[]>
  putInStore: (storeName: string, value: any) => Promise<IDBValidKey>
  deleteFromStore: (storeName: string, key: string) => Promise<void>
  clearStore: (storeName: string) => Promise<void>
}

let dbInstance: TankNexustDB | null = null

export async function initDB(): Promise<TankNexustDB> {
  if (dbInstance) return dbInstance

  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tanks')) {
        const tankStore = db.createObjectStore('tanks', { keyPath: 'id' })
        tankStore.createIndex('name', 'name', { unique: false })
        tankStore.createIndex('chemical', 'chemical', { unique: false })
        tankStore.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains('chemicals')) {
        const chemicalStore = db.createObjectStore('chemicals', { keyPath: 'id' })
        chemicalStore.createIndex('name', 'name', { unique: true })
        chemicalStore.createIndex('toxicity', 'toxicity', { unique: false })
      }

      if (!db.objectStoreNames.contains('weather_records')) {
        const weatherStore = db.createObjectStore('weather_records', { keyPath: 'id' })
        weatherStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains('simulation_records')) {
        const simStore = db.createObjectStore('simulation_records', { keyPath: 'id' })
        simStore.createIndex('startTime', 'startTime', { unique: false })
        simStore.createIndex('tankId', 'tankId', { unique: false })
        simStore.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains('terminals')) {
        const terminalStore = db.createObjectStore('terminals', { keyPath: 'id' })
        terminalStore.createIndex('type', 'type', { unique: false })
        terminalStore.createIndex('alertLevel', 'alertLevel', { unique: false })
      }

      if (!db.objectStoreNames.contains('shelters')) {
        const shelterStore = db.createObjectStore('shelters', { keyPath: 'id' })
        shelterStore.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains('resources')) {
        const resourceStore = db.createObjectStore('resources', { keyPath: 'id' })
        resourceStore.createIndex('type', 'type', { unique: false })
        resourceStore.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains('evacuation_tasks')) {
        const taskStore = db.createObjectStore('evacuation_tasks', { keyPath: 'id' })
        taskStore.createIndex('terminalId', 'terminalId', { unique: false })
        taskStore.createIndex('status', 'status', { unique: false })
      }
    }
  })

  dbInstance = db as TankNexustDB
  return dbInstance
}

export async function getDB(): Promise<TankNexustDB> {
  if (!dbInstance) {
    return initDB()
  }
  return dbInstance
}

export async function saveTank(tank: Tank): Promise<void> {
  const db = await getDB()
  await db.put('tanks', tank)
}

export async function getAllTanks(): Promise<Tank[]> {
  const db = await getDB()
  return db.getAll('tanks')
}

export async function getTank(id: string): Promise<Tank | undefined> {
  const db = await getDB()
  return db.get('tanks', id)
}

export async function deleteTank(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tanks', id)
}

export async function saveChemical(chemical: Chemical): Promise<void> {
  const db = await getDB()
  await db.put('chemicals', chemical)
}

export async function getAllChemicals(): Promise<Chemical[]> {
  const db = await getDB()
  return db.getAll('chemicals')
}

export async function saveWeatherRecord(record: WeatherRecord): Promise<void> {
  const db = await getDB()
  await db.put('weather_records', record)
}

export async function getRecentWeatherRecords(limit: number = 100): Promise<WeatherRecord[]> {
  const db = await getDB()
  const records = await db.getAll('weather_records')
  return records.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

export async function saveSimulationRecord(record: SimulationRecord): Promise<void> {
  const db = await getDB()
  await db.put('simulation_records', record)
}

export async function getAllSimulationRecords(): Promise<SimulationRecord[]> {
  const db = await getDB()
  const records = await db.getAll('simulation_records')
  return records.sort((a, b) => b.startTime - a.startTime)
}

export async function saveTerminal(terminal: EmergencyTerminal): Promise<void> {
  const db = await getDB()
  await db.put('terminals', terminal)
}

export async function getAllTerminals(): Promise<EmergencyTerminal[]> {
  const db = await getDB()
  return db.getAll('terminals')
}

export async function updateTerminalStatus(id: string, alertLevel: string, evacuationStatus: string): Promise<void> {
  const db = await getDB()
  const terminal = await db.get('terminals', id)
  if (terminal) {
    terminal.alertLevel = alertLevel
    terminal.evacuationStatus = evacuationStatus
    await db.put('terminals', terminal)
  }
}

export async function saveShelter(shelter: Shelter): Promise<void> {
  const db = await getDB()
  await db.put('shelters', shelter)
}

export async function getAllShelters(): Promise<Shelter[]> {
  const db = await getDB()
  return db.getAll('shelters')
}

export async function saveResource(resource: ResourceUnit): Promise<void> {
  const db = await getDB()
  await db.put('resources', resource)
}

export async function getAllResources(): Promise<ResourceUnit[]> {
  const db = await getDB()
  return db.getAll('resources')
}

export async function saveEvacuationTask(task: EvacuationTask): Promise<void> {
  const db = await getDB()
  await db.put('evacuation_tasks', task)
}

export async function getAllEvacuationTasks(): Promise<EvacuationTask[]> {
  const db = await getDB()
  const tasks = await db.getAll('evacuation_tasks')
  return tasks.sort((a, b) => b.startTime - a.startTime)
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const stores = ['tanks', 'chemicals', 'weather_records', 'simulation_records', 'terminals', 'shelters', 'resources', 'evacuation_tasks']
  for (const store of stores) {
    await db.clear(store)
  }
}
