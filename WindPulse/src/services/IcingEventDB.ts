import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { IcingEvent } from '../types'

interface WindPulseDB extends DBSchema {
  icingEvents: {
    key: number
    value: IcingEvent
    indexes: {
      'by-windFarm': string
      'by-severity': string
      'by-time': number
    }
  }
  sensorDataCache: {
    key: number
    value: { timestamp: number; data: any }
  }
}

export class IcingEventDB {
  private static instance: IcingEventDB
  private db: IDBPDatabase<WindPulseDB> | null = null
  private readonly DB_NAME = 'windpulse-db'
  private readonly DB_VERSION = 1

  private constructor() {}

  public static getInstance(): IcingEventDB {
    if (!IcingEventDB.instance) {
      IcingEventDB.instance = new IcingEventDB()
    }
    return IcingEventDB.instance
  }

  public async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB<WindPulseDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains('icingEvents')) {
          const eventStore = db.createObjectStore('icingEvents', {
            keyPath: 'id',
            autoIncrement: true
          })
          eventStore.createIndex('by-windFarm', 'windFarmId')
          eventStore.createIndex('by-severity', 'severity')
          eventStore.createIndex('by-time', 'startTime')
        }

        if (!db.objectStoreNames.contains('sensorDataCache')) {
          db.createObjectStore('sensorDataCache', { keyPath: 'timestamp' })
        }
      }
    })

    console.log('[IndexedDB] Database initialized successfully')
  }

  public async addEvent(event: Omit<IcingEvent, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.add('icingEvents', event as IcingEvent)
  }

  public async getEvent(id: number): Promise<IcingEvent | undefined> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.get('icingEvents', id)
  }

  public async getAllEvents(): Promise<IcingEvent[]> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.getAll('icingEvents')
  }

  public async getEventsBySeverity(severity: IcingEvent['severity']): Promise<IcingEvent[]> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.getAllFromIndex('icingEvents', 'by-severity', severity)
  }

  public async getEventsByWindFarm(windFarmId: string): Promise<IcingEvent[]> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.getAllFromIndex('icingEvents', 'by-windFarm', windFarmId)
  }

  public async getEventsInTimeRange(startTime: number, endTime: number): Promise<IcingEvent[]> {
    if (!this.db) throw new Error('Database not initialized')

    const events = await this.db.getAll('icingEvents')
    return events.filter(event =>
      event.startTime >= startTime && event.endTime <= endTime
    )
  }

  public async updateEvent(event: IcingEvent): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    if (!event.id) throw new Error('Event ID is required for update')
    return await this.db.put('icingEvents', event)
  }

  public async deleteEvent(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete('icingEvents', id)
  }

  public async clearAllEvents(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.clear('icingEvents')
  }

  public async getEventCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    return await this.db.count('icingEvents')
  }

  public async calculateCostSavings(): Promise<number> {
    const events = await this.getAllEvents()
    if (events.length === 0) return 0

    const totalMaintenanceCost = events.reduce((sum, event) => sum + event.maintenanceCost, 0)
    const averageCost = totalMaintenanceCost / events.length

    const preventedEvents = Math.floor(events.length * 0.3)
    return preventedEvents * averageCost
  }

  public async getSeverityStats(): Promise<Record<IcingEvent['severity'], number>> {
    const events = await this.getAllEvents()
    const stats: Record<string, number> = {
      minor: 0,
      moderate: 0,
      severe: 0,
      extreme: 0
    }

    events.forEach(event => {
      stats[event.severity]++
    })

    return stats as Record<IcingEvent['severity'], number>
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  public destroy(): void {
    this.close()
    IcingEventDB.instance = null as any
  }
}

export const icingEventDB = IcingEventDB.getInstance()
