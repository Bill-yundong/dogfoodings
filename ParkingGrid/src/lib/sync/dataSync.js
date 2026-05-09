import { 
  addToSyncQueue, 
  getPendingSyncItems, 
  markSyncComplete,
  saveParkingSpace,
  saveOccupancyRecord,
  savePrediction,
  saveZone,
  getParkingSpace,
  getAllParkingSpaces,
  getAllZones,
  getZoneOccupancyHistory
} from '../database/indexedDB.js'

class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e)
        }
      })
    }
  }
}

class Broadcaster {
  constructor() {
    this.emitter = new EventEmitter()
    this.channels = {}
    this.messageId = 0
  }

  subscribe(channel, callback) {
    if (!this.channels[channel]) {
      this.channels[channel] = new EventEmitter()
    }
    return this.channels[channel].on('message', callback)
  }

  broadcast(channel, message) {
    if (!this.channels[channel]) {
      this.channels[channel] = new EventEmitter()
    }
    
    const wrappedMessage = {
      id: this.messageId++,
      timestamp: Date.now(),
      channel,
      payload: message
    }
    
    this.channels[channel].emit('message', wrappedMessage)
    return wrappedMessage
  }

  clearChannel(channel) {
    if (this.channels[channel]) {
      delete this.channels[channel]
    }
  }
}

class ConflictResolver {
  constructor() {
    this.mergeStrategies = {
      'parking-space': this._mergeParkingSpace.bind(this),
      'occupancy': this._mergeOccupancy.bind(this),
      'prediction': this._mergePrediction.bind(this),
      'zone': this._mergeZone.bind(this)
    }
  }

  resolve(localData, remoteData, type) {
    const strategy = this.mergeStrategies[type]
    if (strategy) {
      return strategy(localData, remoteData)
    }
    return this._defaultMerge(localData, remoteData)
  }

  _defaultMerge(local, remote) {
    if (!local) return { data: remote, source: 'remote' }
    if (!remote) return { data: local, source: 'local' }
    
    const localTime = local.updatedAt || local.timestamp || local.createdAt || 0
    const remoteTime = remote.updatedAt || remote.timestamp || remote.createdAt || 0
    
    if (remoteTime >= localTime) {
      return { data: remote, source: 'remote' }
    }
    return { data: local, source: 'local' }
  }

  _mergeParkingSpace(local, remote) {
    if (!local) return { data: remote, source: 'remote' }
    if (!remote) return { data: local, source: 'local' }
    
    const merged = { ...local, ...remote }
    
    if (local.updatedAt > remote.updatedAt) {
      merged.status = local.status
      merged.updatedAt = local.updatedAt
      return { data: merged, source: 'local' }
    }
    
    return { data: merged, source: 'remote' }
  }

  _mergeOccupancy(local, remote) {
    if (!local) return { data: remote, source: 'remote' }
    if (!remote) return { data: local, source: 'local' }
    
    const localTime = local.timestamp || 0
    const remoteTime = remote.timestamp || 0
    
    if (remoteTime >= localTime) {
      return { data: remote, source: 'remote' }
    }
    return { data: local, source: 'local' }
  }

  _mergePrediction(local, remote) {
    if (!local) return { data: remote, source: 'remote' }
    if (!remote) return { data: local, source: 'local' }
    
    const localTime = local.createdAt || 0
    const remoteTime = remote.createdAt || 0
    
    if (remoteTime >= localTime) {
      return { data: remote, source: 'remote' }
    }
    return { data: local, source: 'local' }
  }

  _mergeZone(local, remote) {
    return this._defaultMerge(local, remote)
  }
}

class DataSyncManager {
  constructor() {
    this.broadcaster = new Broadcaster()
    this.conflictResolver = new ConflictResolver()
    this.isConnected = false
    this.syncInterval = null
    this.pendingMessages = new Map()
    this.systems = new Map()
    this.channels = {
      MUNICIPAL: 'municipal-updates',
      NAVIGATION: 'navigation-updates',
      BROADCAST: 'global-broadcast'
    }
    this.syncState = {
      municipal: { lastSync: 0, pendingItems: 0 },
      navigation: { lastSync: 0, pendingItems: 0 }
    }
    
    this._setupInternalListeners()
  }

  _setupInternalListeners() {
    this.broadcaster.subscribe(this.channels.MUNICIPAL, (message) => {
      this._handleMunicipalUpdate(message)
    })
    
    this.broadcaster.subscribe(this.channels.NAVIGATION, (message) => {
      this._handleNavigationUpdate(message)
    })
  }

  registerSystem(systemId, systemType, onUpdate) {
    const unsubscribe = this.broadcaster.subscribe(this.channels.BROADCAST, (message) => {
      if (message.payload.targetSystem === systemId || message.payload.targetSystem === 'all') {
        onUpdate(message.payload.data)
      }
    })
    
    const channelSub = this.broadcaster.subscribe(
      systemType === 'municipal' ? this.channels.NAVIGATION : this.channels.MUNICIPAL,
      (message) => {
        onUpdate(message.payload)
      }
    )
    
    this.systems.set(systemId, {
      type: systemType,
      unsubscribe: () => {
        unsubscribe()
        channelSub()
      }
    })
    
    return {
      send: (data, targetSystem = 'all') => {
        const channel = systemType === 'municipal' 
          ? this.channels.MUNICIPAL 
          : this.channels.NAVIGATION
        
        this.broadcaster.broadcast(channel, data)
        this.broadcaster.broadcast(this.channels.BROADCAST, {
          sourceSystem: systemId,
          targetSystem,
          data
        })
      },
      unregister: () => {
        const sys = this.systems.get(systemId)
        if (sys) {
          sys.unsubscribe()
          this.systems.delete(systemId)
        }
      }
    }
  }

  async _handleMunicipalUpdate(message) {
    const { payload } = message
    
    switch (payload.type) {
      case 'parking-update':
        await this._processParkingUpdate(payload.data, 'municipal')
        break
      case 'zone-update':
        await this._processZoneUpdate(payload.data)
        break
      case 'occupancy-snapshot':
        await this._processOccupancySnapshot(payload.data)
        break
      case 'prediction-update':
        await this._processPredictionUpdate(payload.data)
        break
    }
    
    this._emitStateChange()
  }

  async _handleNavigationUpdate(message) {
    const { payload } = message
    
    switch (payload.type) {
      case 'occupancy-request':
        await this._sendOccupancyToNavigation(payload.data)
        break
      case 'parking-request':
        await this._sendParkingStatusToNavigation(payload.data)
        break
      case 'route-update':
        await this._processRouteUpdate(payload.data)
        break
    }
  }

  async _processParkingUpdate(data, source) {
    if (Array.isArray(data)) {
      for (const space of data) {
        await this._processSingleParkingSpace(space, source)
      }
    } else {
      await this._processSingleParkingSpace(data, source)
    }
  }

  async _processSingleParkingSpace(data, source) {
    const existing = await getParkingSpace(data.id)
    const { data: mergedData } = this.conflictResolver.resolve(
      existing, 
      data, 
      'parking-space'
    )
    
    await saveParkingSpace(mergedData)
    await addToSyncQueue('parking-space', mergedData)
    
    await this._updateOccupancyHistory(mergedData)
    
    this.broadcaster.broadcast(this.channels.BROADCAST, {
      sourceSystem: source,
      targetSystem: 'all',
      data: {
        type: 'parking-updated',
        data: mergedData
      }
    })
  }

  async _updateOccupancyHistory(space) {
    const occupancyRate = space.totalSpaces > 0 
      ? (space.occupiedSpaces / space.totalSpaces) 
      : 0
    
    const record = {
      spaceId: space.id,
      zoneId: space.zoneId,
      occupancyRate,
      occupiedSpaces: space.occupiedSpaces,
      totalSpaces: space.totalSpaces,
      status: space.status,
      timestamp: Date.now()
    }
    
    await saveOccupancyRecord(record)
  }

  async _processZoneUpdate(data) {
    if (Array.isArray(data)) {
      for (const zone of data) {
        await saveZone(zone)
        await addToSyncQueue('zone', zone)
      }
    } else {
      await saveZone(data)
      await addToSyncQueue('zone', data)
    }
  }

  async _processOccupancySnapshot(data) {
    for (const record of data) {
      await saveOccupancyRecord(record)
    }
  }

  async _processPredictionUpdate(data) {
    if (Array.isArray(data)) {
      for (const prediction of data) {
        await savePrediction(prediction)
      }
    } else {
      await savePrediction(data)
    }
  }

  async _sendOccupancyToNavigation(request) {
    const { zoneId, startTime, endTime } = request
    const history = await getZoneOccupancyHistory(zoneId, startTime, endTime)
    
    this.broadcaster.broadcast(this.channels.NAVIGATION, {
      type: 'occupancy-response',
      requestId: request.requestId,
      data: history
    })
  }

  async _sendParkingStatusToNavigation(request) {
    const { zoneId } = request
    let spaces
    
    if (zoneId) {
      spaces = await getAllParkingSpaces()
      spaces = spaces.filter(s => s.zoneId === zoneId)
    } else {
      spaces = await getAllParkingSpaces()
    }
    
    this.broadcaster.broadcast(this.channels.NAVIGATION, {
      type: 'parking-status-response',
      requestId: request.requestId,
      data: spaces
    })
  }

  async _processRouteUpdate(data) {
    const { destination, estimatedArrival, vehicleId } = data
    
    this.broadcaster.broadcast(this.channels.BROADCAST, {
      sourceSystem: 'navigation',
      targetSystem: 'all',
      data: {
        type: 'route-planned',
        data: { destination, estimatedArrival, vehicleId, timestamp: Date.now() }
      }
    })
  }

  async processPendingQueue() {
    const pending = await getPendingSyncItems()
    let processed = 0
    
    for (const item of pending) {
      try {
        await markSyncComplete(item.id)
        processed++
      } catch (e) {
        console.error('Error processing sync item:', e)
      }
    }
    
    if (processed > 0) {
      localStorage.setItem('lastSyncTimestamp', Date.now().toString())
    }
    
    return processed
  }

  startAutoSync(intervalMs = 5000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    this.isConnected = true
    this.syncInterval = setInterval(async () => {
      await this.processPendingQueue()
      this._emitStateChange()
    }, intervalMs)
    
    this.processPendingQueue()
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isConnected = false
    this._emitStateChange()
  }

  getSyncState() {
    return {
      isConnected: this.isConnected,
      systems: this.systems.size,
      channels: Object.keys(this.channels),
      municipal: this.syncState.municipal,
      navigation: this.syncState.navigation
    }
  }

  onStateChange(callback) {
    return this.broadcaster.emitter.on('state-change', callback)
  }

  _emitStateChange() {
    this.broadcaster.emitter.emit('state-change', this.getSyncState())
  }

  async syncAllData() {
    const [spaces, zones] = await Promise.all([
      getAllParkingSpaces(),
      getAllZones()
    ])
    
    this.broadcaster.broadcast(this.channels.BROADCAST, {
      sourceSystem: 'sync-manager',
      targetSystem: 'all',
      data: {
        type: 'full-sync',
        data: { spaces, zones, timestamp: Date.now() }
      }
    })
    
    await this.processPendingQueue()
    this._emitStateChange()
    
    return { spaces: spaces.length, zones: zones.length }
  }

  destroy() {
    this.stopAutoSync()
    this.systems.forEach((sys, id) => {
      sys.unsubscribe()
    })
    this.systems.clear()
  }
}

export const dataSync = new DataSyncManager()
export { EventEmitter, Broadcaster, ConflictResolver }
