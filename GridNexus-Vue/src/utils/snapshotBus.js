import { openDB } from 'idb'

const DB_NAME = 'GridNexusDB'
const DB_VERSION = 1
const SNAPSHOT_STORE = 'snapshots'
const EVENT_STORE = 'events'
const TOPOLOGY_STORE = 'topology'

class SnapshotBus {
  constructor() {
    this.db = null
    this.listeners = new Map()
  }

  async init() {
    if (this.db) return this.db

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id', autoIncrement: true })
          snapshotStore.createIndex('timestamp', 'timestamp')
          snapshotStore.createIndex('substationId', 'substationId')
          snapshotStore.createIndex('type', 'type')
        }

        if (!db.objectStoreNames.contains(EVENT_STORE)) {
          const eventStore = db.createObjectStore(EVENT_STORE, { keyPath: 'id', autoIncrement: true })
          eventStore.createIndex('timestamp', 'timestamp')
          eventStore.createIndex('snapshotId', 'snapshotId')
        }

        if (!db.objectStoreNames.contains(TOPOLOGY_STORE)) {
          db.createObjectStore(TOPOLOGY_STORE, { keyPath: 'id' })
        }
      }
    })

    return this.db
  }

  async saveSnapshot(snapshot) {
    await this.init()
    const timestamp = snapshot.timestamp || Date.now()
    const snapshotData = {
      ...snapshot,
      timestamp,
      createdAt: timestamp
    }

    const id = await this.db.put(SNAPSHOT_STORE, snapshotData)
    this.emit('snapshot:created', { id, ...snapshotData })
    return id
  }

  async getSnapshot(id) {
    await this.init()
    return this.db.get(SNAPSHOT_STORE, id)
  }

  async getSnapshots(options = {}) {
    await this.init()
    const { startTime, endTime, substationId, type, limit = 100, offset = 0 } = options

    const tx = this.db.transaction(SNAPSHOT_STORE, 'readonly')
    const store = tx.store
    const index = store.index('timestamp')

    let results = []
    let cursor = await index.openCursor(null, 'prev')
    let count = 0

    while (cursor && count < limit + offset) {
      const value = cursor.value
      let match = true

      if (startTime && value.timestamp < startTime) match = false
      if (endTime && value.timestamp > endTime) match = false
      if (substationId && value.substationId !== substationId) match = false
      if (type && value.type !== type) match = false

      if (match && count >= offset) {
        results.push(value)
      }
      if (match) count++

      cursor = await cursor.continue()
    }

    await tx.done
    return results
  }

  async getLatestSnapshot(substationId) {
    await this.init()
    const snapshots = await this.getSnapshots({
      substationId,
      limit: 1
    })
    return snapshots[0] || null
  }

  async deleteSnapshot(id) {
    await this.init()
    await this.db.delete(SNAPSHOT_STORE, id)
    this.emit('snapshot:deleted', { id })
  }

  async clearOldSnapshots(retentionDays = 90) {
    await this.init()
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const tx = this.db.transaction(SNAPSHOT_STORE, 'readwrite')
    const index = tx.store.index('timestamp')

    let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime))
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.done
  }

  async saveEvent(event) {
    await this.init()
    const eventData = {
      ...event,
      timestamp: event.timestamp || Date.now()
    }
    return this.db.put(EVENT_STORE, eventData)
  }

  async getEventsBySnapshot(snapshotId) {
    await this.init()
    const tx = this.db.transaction(EVENT_STORE, 'readonly')
    const index = tx.store.index('snapshotId')
    return index.getAll(snapshotId)
  }

  async saveTopology(topology) {
    await this.init()
    return this.db.put(TOPOLOGY_STORE, {
      ...topology,
      id: 'current',
      updatedAt: Date.now()
    })
  }

  async getTopology() {
    await this.init()
    return this.db.get(TOPOLOGY_STORE, 'current')
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data)
        } catch (err) {
          console.error('SnapshotBus listener error:', err)
        }
      })
    }
  }
}

export const snapshotBus = new SnapshotBus()
export default snapshotBus
