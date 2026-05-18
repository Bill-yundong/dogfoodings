import { SyncStatus } from '../types/amhs.js'
import { db } from '../db/IndexedDB.js'

const CHANGE_TYPES = {
  OHT_UPDATE: 'oht_update',
  TASK_UPDATE: 'task_update',
  WAFER_UPDATE: 'wafer_update',
  NETWORK_UPDATE: 'network_update',
  PATH_UPDATE: 'path_update'
}

export class SemanticSynchronizer {
  constructor(options = {}) {
    this.endpoints = new Map()
    this.localState = new Map()
    this.pendingChanges = []
    this.syncStatus = SyncStatus.OFFLINE
    this.lastSyncTime = 0
    this.syncInterval = options.syncInterval || 5000
    this.conflictResolver = options.conflictResolver || this._defaultConflictResolver
    this.onSyncCallbacks = []
    this.onConflictCallbacks = []
    this.isRunning = false
    this.syncTimer = null
  }

  registerEndpoint(id, endpoint) {
    this.endpoints.set(id, {
      ...endpoint,
      lastSync: 0,
      version: 0
    })
  }

  unregisterEndpoint(id) {
    this.endpoints.delete(id)
  }

  setLocalState(key, value, version) {
    this.localState.set(key, { value, version: version || Date.now() })
  }

  getLocalState(key) {
    const state = this.localState.get(key)
    return state ? state.value : null
  }

  recordChange(entityType, entityId, operation, data, semanticTags = []) {
    const change = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      entityType,
      entityId,
      operation,
      data,
      semanticTags,
      status: 'pending',
      version: data.version || Date.now()
    }

    this.pendingChanges.push(change)

    db.logSync(entityType, operation, {
      entityId,
      data,
      semanticTags
    }).catch(e => console.warn('Failed to log sync:', e))

    return change
  }

  async sync() {
    if (this.syncStatus === SyncStatus.SYNCING) return

    this.syncStatus = SyncStatus.SYNCING

    try {
      const results = await Promise.allSettled(
        Array.from(this.endpoints.entries()).map(([id, endpoint]) =>
          this._syncWithEndpoint(id, endpoint)
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed === 0) {
        this.syncStatus = SyncStatus.SYNCED
      } else if (successful > 0) {
        this.syncStatus = SyncStatus.SYNCED
      } else {
        this.syncStatus = SyncStatus.OFFLINE
      }

      this.lastSyncTime = Date.now()

      this.onSyncCallbacks.forEach(cb => {
        try {
          cb({
            status: this.syncStatus,
            timestamp: this.lastSyncTime,
            successful,
            failed
          })
        } catch (e) {
          console.error('Sync callback error:', e)
        }
      })
    } catch (e) {
      this.syncStatus = SyncStatus.OFFLINE
      console.error('Sync failed:', e)
    }
  }

  async _syncWithEndpoint(endpointId, endpoint) {
    const pending = this.pendingChanges.filter(c => c.status === 'pending')

    if (pending.length === 0) return { synced: 0 }

    try {
      const response = await endpoint.send(pending)

      if (response.conflicts && response.conflicts.length > 0) {
        await this._handleConflicts(response.conflicts, endpointId)
      }

      const ackIds = response.acknowledged || []
      ackIds.forEach(id => {
        const idx = this.pendingChanges.findIndex(c => c.id === id)
        if (idx > -1) {
          this.pendingChanges[idx].status = 'synced'
        }
      })

      this.pendingChanges = this.pendingChanges.filter(c => c.status === 'pending')

      if (response.stateUpdates) {
        await this._applyRemoteUpdates(response.stateUpdates, endpointId)
      }

      endpoint.lastSync = Date.now()
      endpoint.version = response.remoteVersion || endpoint.version + 1

      return { synced: ackIds.length }
    } catch (e) {
      console.warn(`Sync with endpoint ${endpointId} failed:`, e)
      throw e
    }
  }

  async _handleConflicts(conflicts, endpointId) {
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver(conflict)

      if (resolution === 'local') {
        const idx = this.pendingChanges.findIndex(c => c.id === conflict.changeId)
        if (idx > -1) {
          this.pendingChanges[idx].status = 'pending'
        }
      } else if (resolution === 'remote') {
        await this._applyRemoteUpdates([conflict.remoteData], endpointId)
        const idx = this.pendingChanges.findIndex(c => c.id === conflict.changeId)
        if (idx > -1) {
          this.pendingChanges.splice(idx, 1)
        }
      }

      this.onConflictCallbacks.forEach(cb => {
        try {
          cb({ conflict, resolution, endpointId })
        } catch (e) {
          console.error('Conflict callback error:', e)
        }
      })
    }
  }

  async _applyRemoteUpdates(updates, endpointId) {
    for (const update of updates) {
      const key = `${update.entityType}:${update.entityId}`
      const local = this.localState.get(key)

      if (!local || update.version > local.version) {
        this.localState.set(key, {
          value: update.data,
          version: update.version,
          source: endpointId
        })
      }
    }
  }

  _defaultConflictResolver(conflict) {
    const localTime = conflict.localVersion || 0
    const remoteTime = conflict.remoteVersion || 0
    return localTime >= remoteTime ? 'local' : 'remote'
  }

  onSync(callback) {
    this.onSyncCallbacks.push(callback)
  }

  onConflict(callback) {
    this.onConflictCallbacks.push(callback)
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.syncTimer = setInterval(() => this.sync(), this.syncInterval)
    this.sync()
  }

  stop() {
    this.isRunning = false
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  getStatus() {
    return {
      status: this.syncStatus,
      lastSync: this.lastSyncTime,
      pendingChanges: this.pendingChanges.length,
      endpoints: Array.from(this.endpoints.entries()).map(([id, ep]) => ({
        id,
        lastSync: ep.lastSync,
        version: ep.version
      }))
    }
  }
}

export { CHANGE_TYPES }
