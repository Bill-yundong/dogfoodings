import { db } from './indexedDB'

export const SYSTEMS = {
  RND: 'rnd_center',
  PRODUCTION: 'production_scheduler',
  QUALITY: 'quality_control'
}

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error'
}

export class DataSyncManager {
  constructor() {
    this.queues = {
      [SYSTEMS.RND]: [],
      [SYSTEMS.PRODUCTION]: [],
      [SYSTEMS.QUALITY]: []
    }
    this.syncCallbacks = []
    this.isSyncing = false
    this.lastSyncTime = {}
    this.conflicts = []
  }

  addSyncCallback(callback) {
    this.syncCallbacks.push(callback)
  }

  async queueForSync(data, targetSystem, priority = 'normal') {
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      targetSystem,
      priority,
      status: SYNC_STATUS.PENDING,
      createdAt: Date.now(),
      attempts: 0
    }

    this.queues[targetSystem].push(syncItem)
    this.sortQueue(targetSystem)
    
    for (const callback of this.syncCallbacks) {
      callback({ type: 'queued', item: syncItem })
    }

    return syncItem.id
  }

  sortQueue(system) {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    this.queues[system].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.createdAt - b.createdAt
    })
  }

  async syncToRndCenter(snapshotData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1
        if (success) {
          this.lastSyncTime[SYSTEMS.RND] = Date.now()
          resolve({
            success: true,
            message: '数据已同步至研发中心',
            system: SYSTEMS.RND,
            timestamp: Date.now()
          })
        } else {
          resolve({
            success: false,
            message: '研发中心连接超时',
            system: SYSTEMS.RND
          })
        }
      }, 500 + Math.random() * 500)
    })
  }

  async syncToProduction(snapshotData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.05
        if (success) {
          this.lastSyncTime[SYSTEMS.PRODUCTION] = Date.now()
          resolve({
            success: true,
            message: '数据已同步至生产调度系统',
            system: SYSTEMS.PRODUCTION,
            timestamp: Date.now()
          })
        } else {
          resolve({
            success: false,
            message: '生产调度系统响应错误',
            system: SYSTEMS.PRODUCTION
          })
        }
      }, 300 + Math.random() * 400)
    })
  }

  async syncToQuality(snapshotData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.08
        if (success) {
          this.lastSyncTime[SYSTEMS.QUALITY] = Date.now()
          resolve({
            success: true,
            message: '数据已同步至质量控制系统',
            system: SYSTEMS.QUALITY,
            timestamp: Date.now()
          })
        } else {
          resolve({
            success: false,
            message: '质量控制系统认证失败',
            system: SYSTEMS.QUALITY
          })
        }
      }, 400 + Math.random() * 300)
    })
  }

  async processQueue(targetSystem) {
    if (this.isSyncing) return
    
    this.isSyncing = true
    const queue = this.queues[targetSystem]
    const results = []

    while (queue.length > 0) {
      const item = queue.shift()
      
      try {
        let result
        
        switch (targetSystem) {
          case SYSTEMS.RND:
            result = await this.syncToRndCenter(item.data)
            break
          case SYSTEMS.PRODUCTION:
            result = await this.syncToProduction(item.data)
            break
          case SYSTEMS.QUALITY:
            result = await this.syncToQuality(item.data)
            break
          default:
            throw new Error(`Unknown system: ${targetSystem}`)
        }

        if (result.success) {
          item.status = SYNC_STATUS.SYNCED
          item.syncedAt = Date.now()
          results.push({ item, result })
          
          for (const callback of this.syncCallbacks) {
            callback({ type: 'synced', item, result })
          }
        } else {
          item.attempts++
          if (item.attempts < 3) {
            item.status = SYNC_STATUS.PENDING
            queue.push(item)
            this.sortQueue(targetSystem)
          } else {
            item.status = SYNC_STATUS.ERROR
            this.conflicts.push(item)
            results.push({ item, result, error: true })
            
            for (const callback of this.syncCallbacks) {
              callback({ type: 'error', item, result })
            }
          }
        }
      } catch (error) {
        item.attempts++
        if (item.attempts >= 3) {
          item.status = SYNC_STATUS.ERROR
          this.conflicts.push(item)
        }
        results.push({ item, error: true, errorMessage: error.message })
      }
    }

    this.isSyncing = false
    return results
  }

  async syncAllSystems() {
    const results = []
    
    for (const system of Object.values(SYSTEMS)) {
      const result = await this.processQueue(system)
      results.push(...result)
    }
    
    return results
  }

  async broadcastSnapshot(snapshot) {
    const syncData = {
      snapshotId: snapshot.id,
      timestamp: snapshot.timestamp,
      fluidId: snapshot.fluidId,
      mixingQuality: snapshot.mixingQuality,
      deadZoneRatio: snapshot.deadZoneRatio,
      concentration: Array.from(snapshot.concentration),
      velocity: {
        vx: Array.from(snapshot.velocityX),
        vy: Array.from(snapshot.velocityY)
      },
      parameters: snapshot.parameters
    }

    const ids = []
    
    ids.push(await this.queueForSync(syncData, SYSTEMS.RND, 'high'))
    ids.push(await this.queueForSync(syncData, SYSTEMS.PRODUCTION, 'normal'))
    
    if (snapshot.mixingQuality >= 0.9) {
      ids.push(await this.queueForSync(syncData, SYSTEMS.QUALITY, 'low'))
    }

    this.syncAllSystems()
    
    return ids
  }

  async syncHistoricalData() {
    const snapshots = await db.getSnapshots(null, 50)
    const results = []

    for (const snapshot of snapshots) {
      const syncData = {
        snapshotId: snapshot.id,
        timestamp: snapshot.timestamp,
        fluidId: snapshot.fluidId,
        mixingQuality: snapshot.mixingQuality,
        deadZoneRatio: snapshot.deadZoneRatio,
        parameters: snapshot.parameters,
        isHistorical: true
      }

      await this.queueForSync(syncData, SYSTEMS.RND, 'low')
      await this.queueForSync(syncData, SYSTEMS.PRODUCTION, 'low')
    }

    const syncResults = await this.syncAllSystems()
    results.push(...syncResults)

    return results
  }

  getQueueStatus() {
    return {
      [SYSTEMS.RND]: {
        pending: this.queues[SYSTEMS.RND].filter(i => i.status === SYNC_STATUS.PENDING).length,
        lastSync: this.lastSyncTime[SYSTEMS.RND] || null
      },
      [SYSTEMS.PRODUCTION]: {
        pending: this.queues[SYSTEMS.PRODUCTION].filter(i => i.status === SYNC_STATUS.PENDING).length,
        lastSync: this.lastSyncTime[SYSTEMS.PRODUCTION] || null
      },
      [SYSTEMS.QUALITY]: {
        pending: this.queues[SYSTEMS.QUALITY].filter(i => i.status === SYNC_STATUS.PENDING).length,
        lastSync: this.lastSyncTime[SYSTEMS.QUALITY] || null
      },
      conflicts: this.conflicts.length,
      isSyncing: this.isSyncing
    }
  }

  getConflicts() {
    return this.conflicts
  }

  resolveConflict(syncId, action = 'retry') {
    const index = this.conflicts.findIndex(c => c.id === syncId)
    if (index === -1) return false

    const item = this.conflicts[index]
    
    if (action === 'retry') {
      this.conflicts.splice(index, 1)
      item.attempts = 0
      item.status = SYNC_STATUS.PENDING
      this.queues[item.targetSystem].push(item)
      this.processQueue(item.targetSystem)
      return true
    } else if (action === 'discard') {
      this.conflicts.splice(index, 1)
      return true
    }
    
    return false
  }

  clearAllQueues() {
    for (const system of Object.values(SYSTEMS)) {
      this.queues[system] = []
    }
  }

  async exportSyncLog() {
    const allItems = [
      ...this.queues[SYSTEMS.RND],
      ...this.queues[SYSTEMS.PRODUCTION],
      ...this.queues[SYSTEMS.QUALITY],
      ...this.conflicts
    ]

    return {
      exportedAt: Date.now(),
      queues: this.queues,
      conflicts: this.conflicts,
      lastSyncTime: this.lastSyncTime,
      allItems
    }
  }
}

export const syncManager = new DataSyncManager()

export function getSystemName(systemKey) {
  const names = {
    [SYSTEMS.RND]: '研发中心',
    [SYSTEMS.PRODUCTION]: '生产调度系统',
    [SYSTEMS.QUALITY]: '质量控制系统'
  }
  return names[systemKey] || systemKey
}

export function formatSyncTime(timestamp) {
  if (!timestamp) return '未同步'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
