import { ref, reactive } from 'vue'
import type { WearSyncState, SyncQueueItem } from '@/types'
import { syncQueueRepository } from '@/database/repository'

class SyncService {
  private isOnline = ref(true)
  private isSyncing = ref(false)
  private syncInterval: ReturnType<typeof setInterval> | null = null

  syncState = reactive<WearSyncState>({
    lastSyncTimestamp: 0,
    pendingRecords: 0,
    syncProgress: 0,
    conflicts: []
  })

  constructor() {
    this.setupNetworkListener()
  }

  private setupNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.value = true
        this.performSync()
      })

      window.addEventListener('offline', () => {
        this.isOnline.value = false
      })

      this.isOnline.value = navigator.onLine
    }
  }

  async init() {
    await this.updatePendingCount()
    this.startAutoSync()
  }

  private startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline.value && !this.isSyncing.value) {
        this.performSync()
      }
    }, 30000)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async performSync(): Promise<boolean> {
    if (!this.isOnline.value || this.isSyncing.value) {
      return false
    }

    this.isSyncing.value = true
    this.syncState.syncProgress = 0

    try {
      const pendingItems = await syncQueueRepository.getPending()
      this.syncState.pendingRecords = pendingItems.length

      if (pendingItems.length === 0) {
        this.syncState.lastSyncTimestamp = Date.now()
        this.isSyncing.value = false
        return true
      }

      let syncedCount = 0

      for (const item of pendingItems) {
        const success = await this.syncItem(item)
        
        if (success) {
          await syncQueueRepository.updateStatus(item.id, 'completed')
        } else {
          await syncQueueRepository.updateStatus(item.id, 'failed')
        }

        syncedCount++
        this.syncState.syncProgress = Math.round((syncedCount / pendingItems.length) * 100)
      }

      await syncQueueRepository.clearCompleted()
      this.syncState.lastSyncTimestamp = Date.now()
      await this.updatePendingCount()

      return true
    } catch (error) {
      console.error('Sync failed:', error)
      return false
    } finally {
      this.isSyncing.value = false
    }
  }

  private async syncItem(_item: SyncQueueItem): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
    
    const successRate = 0.95
    return Math.random() < successRate
  }

  private async updatePendingCount() {
    const pending = await syncQueueRepository.getPending()
    this.syncState.pendingRecords = pending.length
  }

  async forceSync() {
    this.isOnline.value = true
    return this.performSync()
  }

  getOnlineStatus() {
    return this.isOnline
  }

  getSyncingStatus() {
    return this.isSyncing
  }

  async addToSyncQueue(_tableName: string, _recordId: string, _operation: 'create' | 'update' | 'delete', _data: any) {
    const pending = await syncQueueRepository.getPending()
    this.syncState.pendingRecords = pending.length + 1
  }

  resolveConflict(recordId: string, resolution: 'local' | 'remote') {
    const conflict = this.syncState.conflicts.find(c => c.recordId === recordId)
    if (conflict) {
      conflict.resolution = resolution
      this.syncState.conflicts = this.syncState.conflicts.filter(c => c.recordId !== recordId)
    }
  }
}

export const syncService = new SyncService()
