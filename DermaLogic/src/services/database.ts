import { openDB, type IDBPDatabase } from 'idb'
import type { SkinScan, SkinImage, CarePlan, Device } from '../types'

const DB_NAME = 'dermalogic-db'
const DB_VERSION = 1

export class DatabaseService {
  private db: IDBPDatabase | null = null

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('skinScans')) {
          const scanStore = db.createObjectStore('skinScans', { keyPath: 'id' })
          scanStore.createIndex('userId', 'userId')
          scanStore.createIndex('timestamp', 'timestamp')
        }

        if (!db.objectStoreNames.contains('skinImages')) {
          const imageStore = db.createObjectStore('skinImages', { keyPath: 'id' })
          imageStore.createIndex('scanId', 'scanId')
        }

        if (!db.objectStoreNames.contains('carePlans')) {
          const planStore = db.createObjectStore('carePlans', { keyPath: 'id' })
          planStore.createIndex('userId', 'userId')
        }

        if (!db.objectStoreNames.contains('devices')) {
          db.createObjectStore('devices', { keyPath: 'id' })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  async saveSkinScan(scan: SkinScan): Promise<void> {
    const db = await this.ensureDB()
    await db.put('skinScans', scan)
  }

  async getSkinScans(userId: string, limit?: number): Promise<SkinScan[]> {
    const db = await this.ensureDB()
    const scans = await db.getAllFromIndex('skinScans', 'userId', userId)
    scans.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return limit ? scans.slice(0, limit) : scans
  }

  async getSkinScan(id: string): Promise<SkinScan | undefined> {
    const db = await this.ensureDB()
    return db.get('skinScans', id)
  }

  async saveSkinImage(image: SkinImage): Promise<void> {
    const db = await this.ensureDB()
    await db.put('skinImages', image)
  }

  async getSkinImages(scanId: string): Promise<SkinImage[]> {
    const db = await this.ensureDB()
    return db.getAllFromIndex('skinImages', 'scanId', scanId)
  }

  async getSkinImage(id: string): Promise<SkinImage | undefined> {
    const db = await this.ensureDB()
    return db.get('skinImages', id)
  }

  async saveCarePlan(plan: CarePlan): Promise<void> {
    const db = await this.ensureDB()
    await db.put('carePlans', plan)
  }

  async getCarePlans(userId: string): Promise<CarePlan[]> {
    const db = await this.ensureDB()
    return db.getAllFromIndex('carePlans', 'userId', userId)
  }

  async saveDevice(device: Device): Promise<void> {
    const db = await this.ensureDB()
    await db.put('devices', device)
  }

  async getDevices(): Promise<Device[]> {
    const db = await this.ensureDB()
    return db.getAll('devices')
  }

  async deleteDevice(id: string): Promise<void> {
    const db = await this.ensureDB()
    await db.delete('devices', id)
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(['skinScans', 'skinImages', 'carePlans', 'devices'], 'readwrite')
    await Promise.all([
      tx.store.clear(),
      tx.objectStore('skinImages').clear(),
      tx.objectStore('carePlans').clear(),
      tx.objectStore('devices').clear()
    ])
    await tx.done
  }
}

export const dbService = new DatabaseService()
