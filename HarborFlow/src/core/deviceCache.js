import { openDB } from 'idb'
import { DeviceStatus, DeviceType } from './types'

const DB_NAME = 'HarborFlowDB'
const DB_VERSION = 1
const DEVICE_STORE = 'device_status'
const SNAPSHOT_STORE = 'snapshots'
const INSTRUCTION_LOG_STORE = 'instruction_logs'

class DeviceCache {
  constructor() {
    this.db = null
    this.listeners = new Map()
    this.initPromise = null
  }

  async init() {
    if (this.initPromise) return this.initPromise
    
    this.initPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(DEVICE_STORE)) {
          const deviceStore = db.createObjectStore(DEVICE_STORE, { keyPath: 'id' })
          deviceStore.createIndex('type', 'type', { unique: false })
          deviceStore.createIndex('status', 'status', { unique: false })
          deviceStore.createIndex('lastUpdate', 'lastUpdate', { unique: false })
        }

        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id', autoIncrement: true })
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false })
          snapshotStore.createIndex('deviceId', 'deviceId', { unique: false })
        }

        if (!db.objectStoreNames.contains(INSTRUCTION_LOG_STORE)) {
          const logStore = db.createObjectStore(INSTRUCTION_LOG_STORE, { keyPath: 'id', autoIncrement: true })
          logStore.createIndex('instructionId', 'instructionId', { unique: false })
          logStore.createIndex('timestamp', 'timestamp', { unique: false })
          logStore.createIndex('deviceId', 'deviceId', { unique: false })
        }
      }
    })

    this.db = await this.initPromise
    return this.db
  }

  ensureInitialized() {
    if (!this.db) {
      throw new Error('DeviceCache not initialized. Call init() first.')
    }
  }

  async saveDeviceStatus(device) {
    await this.init()
    this.ensureInitialized()

    const deviceStatus = {
      ...device,
      lastUpdate: Date.now()
    }

    await this.db.put(DEVICE_STORE, deviceStatus)

    const snapshot = {
      deviceId: device.id,
      status: device.status,
      position: device.position,
      battery: device.battery,
      currentTask: device.currentTask,
      timestamp: Date.now()
    }
    await this.db.add(SNAPSHOT_STORE, snapshot)

    this.notifyListeners('device-updated', deviceStatus)
    return deviceStatus
  }

  async getDeviceStatus(deviceId) {
    await this.init()
    this.ensureInitialized()
    return this.db.get(DEVICE_STORE, deviceId)
  }

  async getAllDevices() {
    await this.init()
    this.ensureInitialized()
    return this.db.getAll(DEVICE_STORE)
  }

  async getDevicesByType(type) {
    await this.init()
    this.ensureInitialized()
    const index = this.db.transaction(DEVICE_STORE).store.index('type')
    return index.getAll(type)
  }

  async getDevicesByStatus(status) {
    await this.init()
    this.ensureInitialized()
    const index = this.db.transaction(DEVICE_STORE).store.index('status')
    return index.getAll(status)
  }

  async deleteDevice(deviceId) {
    await this.init()
    this.ensureInitialized()
    await this.db.delete(DEVICE_STORE, deviceId)
    this.notifyListeners('device-deleted', { deviceId })
  }

  async getDeviceSnapshots(deviceId, limit = 100) {
    await this.init()
    this.ensureInitialized()
    
    const index = this.db.transaction(SNAPSHOT_STORE).store.index('deviceId')
    const allSnapshots = await index.getAll(deviceId)
    
    return allSnapshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  async getSnapshotsInTimeRange(startTime, endTime) {
    await this.init()
    this.ensureInitialized()
    
    const tx = this.db.transaction(SNAPSHOT_STORE)
    const index = tx.store.index('timestamp')
    const range = IDBKeyRange.bound(startTime, endTime)
    
    const results = []
    let cursor = await index.openCursor(range)
    
    while (cursor) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp)
  }

  async logInstructionEvent(event) {
    await this.init()
    this.ensureInitialized()

    const logEntry = {
      ...event,
      timestamp: Date.now()
    }
    
    await this.db.add(INSTRUCTION_LOG_STORE, logEntry)
    this.notifyListeners('log-added', logEntry)
    return logEntry
  }

  async getInstructionLogs(instructionId) {
    await this.init()
    this.ensureInitialized()
    
    const index = this.db.transaction(INSTRUCTION_LOG_STORE).store.index('instructionId')
    return index.getAll(instructionId)
  }

  async clearOldSnapshots(olderThanDays = 7) {
    await this.init()
    this.ensureInitialized()
    
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    const tx = this.db.transaction(SNAPSHOT_STORE, 'readwrite')
    const index = tx.store.index('timestamp')
    const range = IDBKeyRange.upperBound(cutoffTime)
    
    let cursor = await index.openCursor(range)
    let deletedCount = 0
    
    while (cursor) {
      await cursor.delete()
      deletedCount++
      cursor = await cursor.continue()
    }
    
    return deletedCount
  }

  async createInitialDevices() {
    const devices = [
      { id: 'AGV-001', type: DeviceType.AGV, status: DeviceStatus.IDLE, position: { x: 0, y: 0 }, battery: 100 },
      { id: 'AGV-002', type: DeviceType.AGV, status: DeviceStatus.IDLE, position: { x: 5, y: 5 }, battery: 85 },
      { id: 'AGV-003', type: DeviceType.AGV, status: DeviceStatus.IDLE, position: { x: 10, y: 0 }, battery: 92 },
      { id: 'AGV-004', type: DeviceType.AGV, status: DeviceStatus.CHARGING, position: { x: 15, y: 15 }, battery: 30 },
      { id: 'RTG-001', type: DeviceType.RTG, status: DeviceStatus.IDLE, position: { x: 8, y: 8 }, battery: 100 },
      { id: 'STS-001', type: DeviceType.STS, status: DeviceStatus.IDLE, position: { x: 2, y: 18 }, battery: 100 }
    ]

    for (const device of devices) {
      await this.saveDeviceStatus(device)
    }

    return devices
  }

  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType).add(callback)
    return () => {
      this.listeners.get(eventType).delete(callback)
    }
  }

  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in device cache listener for ${eventType}:`, e)
        }
      })
    }
  }
}

export const deviceCache = new DeviceCache()
