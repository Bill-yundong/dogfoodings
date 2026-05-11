import { openDB, IDBPDatabase } from 'idb'
import type { MonitoringStation, WeatherData } from '../types'

const DB_NAME = 'SmogLogicDB'
const DB_VERSION = 1

interface DBSchema {
  monitoring_stations: {
    key: string
    value: MonitoringStation
    indexes: { 'by-timestamp': number }
  }
  weather_data: {
    key: string
    value: WeatherData
    indexes: { 'by-timestamp': number }
  }
  simulation_results: {
    key: string
    value: {
      id: string
      timestamp: number
      particles: unknown
      config: unknown
    }
  }
}

export class DatabaseManager {
  private db: IDBPDatabase<DBSchema> | null = null

  async init(): Promise<void> {
    this.db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('monitoring_stations')) {
          const stationStore = db.createObjectStore('monitoring_stations', {
            keyPath: 'id'
          })
          stationStore.createIndex('by-timestamp', 'timestamp')
        }

        if (!db.objectStoreNames.contains('weather_data')) {
          const weatherStore = db.createObjectStore('weather_data', {
            keyPath: 'id'
          })
          weatherStore.createIndex('by-timestamp', 'timestamp')
        }

        if (!db.objectStoreNames.contains('simulation_results')) {
          db.createObjectStore('simulation_results', { keyPath: 'id' })
        }
      }
    })
  }

  async addStation(station: MonitoringStation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.put('monitoring_stations', station)
  }

  async addStations(stations: MonitoringStation[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    const tx = this.db.transaction('monitoring_stations', 'readwrite')
    await Promise.all([
      ...stations.map(s => tx.store.put(s)),
      tx.done
    ])
  }

  async getStationsByTimeRange(start: number, end: number): Promise<MonitoringStation[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAllFromIndex('monitoring_stations', 'by-timestamp', IDBKeyRange.bound(start, end))
  }

  async addWeatherData(data: WeatherData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.put('weather_data', data)
  }

  async addWeatherDatas(datas: WeatherData[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    const tx = this.db.transaction('weather_data', 'readwrite')
    await Promise.all([
      ...datas.map(d => tx.store.put(d)),
      tx.done
    ])
  }

  async getWeatherDataByTimeRange(start: number, end: number): Promise<WeatherData[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAllFromIndex('weather_data', 'by-timestamp', IDBKeyRange.bound(start, end))
  }

  async clearOldData(beforeTimestamp: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction(['monitoring_stations', 'weather_data'], 'readwrite')
    
    const stationRange = IDBKeyRange.upperBound(beforeTimestamp)
    await tx.objectStore('monitoring_stations').delete(stationRange)
    
    const weatherRange = IDBKeyRange.upperBound(beforeTimestamp)
    await tx.objectStore('weather_data').delete(weatherRange)
    
    await tx.done
  }

  async getAllStations(): Promise<MonitoringStation[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('monitoring_stations')
  }

  async getAllWeatherData(): Promise<WeatherData[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll('weather_data')
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const dbManager = new DatabaseManager()
