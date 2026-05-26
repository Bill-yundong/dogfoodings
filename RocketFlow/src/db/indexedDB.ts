import { openDB, IDBPDatabase } from 'idb'
import type { PropellantRecord, EventLog, SimulationSession } from '@/types'

const DB_NAME = 'RocketFlowDB'
const DB_VERSION = 1

const STORES = {
  PROPELLANT: 'propellant_records',
  EVENTS: 'event_logs',
  SESSIONS: 'simulation_sessions'
} as const

export class TimeSeriesDB {
  private db: IDBPDatabase | null = null
  
  async open(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.PROPELLANT)) {
          const store = db.createObjectStore(STORES.PROPELLANT, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('timestamp', 'timestamp', { unique: true })
          store.createIndex('phase', 'phase', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.EVENTS)) {
          const store = db.createObjectStore(STORES.EVENTS, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('eventTimestamp', 'eventTimestamp', { unique: false })
          store.createIndex('eventSeverity', 'eventSeverity', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const store = db.createObjectStore(STORES.SESSIONS, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('startTime', 'startTime', { unique: false })
          store.createIndex('status', 'status', { unique: false })
        }
      }
    })
  }
  
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
  
  private initPromise: Promise<void> | null = null
  
  private async ensureOpen(): Promise<void> {
    if (this.db) return
    
    if (this.initPromise) {
      await this.initPromise
      return
    }
    
    this.initPromise = this.open()
    await this.initPromise
  }
  
  async insertRecord(record: PropellantRecord): Promise<number> {
    await this.ensureOpen()
    return this.db!.add(STORES.PROPELLANT, record) as Promise<number>
  }
  
  async insertRecordsBatch(records: PropellantRecord[]): Promise<number[]> {
    await this.ensureOpen()
    const tx = this.db!.transaction(STORES.PROPELLANT, 'readwrite')
    const promises = records.map(r => tx.store.add(r))
    const results = await Promise.all([...promises, tx.done])
    return results.slice(0, -1) as number[]
  }
  
  async queryByTimeRange(start: number, end: number): Promise<PropellantRecord[]> {
    await this.ensureOpen()
    const index = this.db!.transaction(STORES.PROPELLANT, 'readonly')
      .store.index('timestamp')
    return index.getAll(IDBKeyRange.bound(start, end))
  }
  
  async queryByPhase(phase: string): Promise<PropellantRecord[]> {
    await this.ensureOpen()
    const index = this.db!.transaction(STORES.PROPELLANT, 'readonly')
      .store.index('phase')
    return index.getAll(phase)
  }
  
  async getLatestRecord(): Promise<PropellantRecord | null> {
    await this.ensureOpen()
    const index = this.db!.transaction(STORES.PROPELLANT, 'readonly')
      .store.index('timestamp')
    const cursor = await index.openCursor(null, 'prev')
    return cursor ? cursor.value : null
  }
  
  async getRecordCount(): Promise<number> {
    await this.ensureOpen()
    return this.db!.count(STORES.PROPELLANT)
  }
  
  async exportToJSON(start?: number, end?: number): Promise<string> {
    await this.ensureOpen()
    let records: PropellantRecord[]
    
    if (start !== undefined && end !== undefined) {
      records = await this.queryByTimeRange(start, end)
    } else {
      records = await this.db!.getAll(STORES.PROPELLANT)
    }
    
    return JSON.stringify({
      exportTime: Date.now(),
      recordCount: records.length,
      records: records
    }, null, 2)
  }
  
  async clearOldData(beforeTimestamp: number): Promise<number> {
    await this.ensureOpen()
    const tx = this.db!.transaction(STORES.PROPELLANT, 'readwrite')
    const index = tx.store.index('timestamp')
    let count = 0
    
    for await (const cursor of index.iterate(IDBKeyRange.upperBound(beforeTimestamp))) {
      cursor.delete()
      count++
    }
    
    await tx.done
    return count
  }
  
  async insertEvent(event: EventLog): Promise<number> {
    await this.ensureOpen()
    return this.db!.add(STORES.EVENTS, event) as Promise<number>
  }
  
  async queryEvents(start?: number, end?: number, severity?: string): Promise<EventLog[]> {
    await this.ensureOpen()
    let events = await this.db!.getAll(STORES.EVENTS)
    
    if (start !== undefined) {
      events = events.filter(e => e.eventTimestamp >= start)
    }
    if (end !== undefined) {
      events = events.filter(e => e.eventTimestamp <= end)
    }
    if (severity !== undefined) {
      events = events.filter(e => e.eventSeverity === severity)
    }
    
    return events.sort((a, b) => a.eventTimestamp - b.eventTimestamp)
  }
  
  async acknowledgeEvent(eventId: number): Promise<void> {
    await this.ensureOpen()
    const tx = this.db!.transaction(STORES.EVENTS, 'readwrite')
    const event = await tx.store.get(eventId)
    if (event) {
      event.acknowledged = true
      tx.store.put(event)
    }
    await tx.done
  }
  
  async createSession(session: Omit<SimulationSession, 'id'>): Promise<number> {
    await this.ensureOpen()
    return this.db!.add(STORES.SESSIONS, session) as Promise<number>
  }
  
  async updateSession(sessionId: number, updates: Partial<SimulationSession>): Promise<void> {
    await this.ensureOpen()
    const tx = this.db!.transaction(STORES.SESSIONS, 'readwrite')
    const session = await tx.store.get(sessionId)
    if (session) {
      Object.assign(session, updates)
      tx.store.put(session)
    }
    await tx.done
  }
  
  async getSessions(): Promise<SimulationSession[]> {
    await this.ensureOpen()
    return this.db!.getAll(STORES.SESSIONS)
  }
  
  async deleteSession(sessionId: number): Promise<void> {
    await this.ensureOpen()
    const tx = this.db!.transaction(STORES.SESSIONS, 'readwrite')
    tx.store.delete(sessionId)
    await tx.done
  }
  
  async clearAll(): Promise<void> {
    await this.ensureOpen()
    const tx = this.db!.transaction([STORES.PROPELLANT, STORES.EVENTS, STORES.SESSIONS], 'readwrite')
    await Promise.all([
      tx.objectStore(STORES.PROPELLANT).clear(),
      tx.objectStore(STORES.EVENTS).clear(),
      tx.objectStore(STORES.SESSIONS).clear(),
      tx.done
    ])
  }
}

export const timeSeriesDB = new TimeSeriesDB()
