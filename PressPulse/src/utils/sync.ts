import { createSignal, createEffect, onCleanup } from 'solid-js'
import { SemanticSyncMessage, DieHealthRecord, SyncStatus } from '../types'
import { enqueueSyncItem, getSyncQueue, removeFromSyncQueue } from '../db'

const SYNC_VERSION = '1.0.0'
const SYNC_INTERVAL = 30000

class SemanticSynchronizer {
  private subscribers = new Map<string, Set<(message: SemanticSyncMessage) => void>>()
  private syncStatusSignal = createSignal<SyncStatus>({
    lastSyncTime: 0,
    pendingChanges: 0,
    syncState: 'idle',
  })

  get syncStatus() {
    return this.syncStatusSignal[0]
  }

  subscribe(topic: string, callback: (message: SemanticSyncMessage) => void): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic)!.add(callback)

    return () => {
      this.subscribers.get(topic)?.delete(callback)
    }
  }

  async publish(topic: string, payload: any): Promise<void> {
    const message: SemanticSyncMessage = {
      type: topic as any,
      payload,
      timestamp: Date.now(),
      version: SYNC_VERSION,
    }

    await enqueueSyncItem(topic, message)
    this.updatePendingCount()
    this.notifySubscribers(topic, message)
  }

  private notifySubscribers(topic: string, message: SemanticSyncMessage): void {
    const subscribers = this.subscribers.get(topic)
    if (subscribers) {
      subscribers.forEach(callback => callback(message))
    }

    const wildcardSubscribers = this.subscribers.get('*')
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(callback => callback(message))
    }
  }

  async processSyncQueue(): Promise<void> {
    const [, setSyncStatus] = this.syncStatusSignal
    setSyncStatus(prev => ({ ...prev, syncState: 'syncing' }))

    try {
      const queue = await getSyncQueue()
      
      for (const item of queue) {
        try {
          await this.syncItem(item)
          await removeFromSyncQueue(item.id)
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
          if (item.retries < 3) {
            item.retries++
            await enqueueSyncItem(item.type, item.payload)
          }
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
        syncState: 'idle',
      }))
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, syncState: 'error' }))
      console.error('Sync queue processing failed:', error)
    }

    this.updatePendingCount()
  }

  private async syncItem(item: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('Syncing item:', item)
  }

  private async updatePendingCount(): Promise<void> {
    const queue = await getSyncQueue()
    const [, setSyncStatus] = this.syncStatusSignal
    setSyncStatus(prev => ({ ...prev, pendingChanges: queue.length }))
  }

  startAutoSync(): void {
    this.processSyncQueue()
    const interval = setInterval(() => this.processSyncQueue(), SYNC_INTERVAL)
    onCleanup(() => clearInterval(interval))
  }
}

export const synchronizer = new SemanticSynchronizer()

export async function publishStressUpdate(dieId: string, stressData: any): Promise<void> {
  await synchronizer.publish('stress_update', { dieId, ...stressData })
}

export async function publishMaintenanceEvent(dieId: string, maintenanceData: any): Promise<void> {
  await synchronizer.publish('maintenance_event', { dieId, ...maintenanceData })
}

export async function publishHealthAlert(dieId: string, alertData: any): Promise<void> {
  await synchronizer.publish('health_alert', { dieId, ...alertData })
}

export function useSyncStatus() {
  return synchronizer.syncStatus
}

export function useSemanticSync(topic: string, callback: (message: SemanticSyncMessage) => void) {
  createEffect(() => {
    const unsubscribe = synchronizer.subscribe(topic, callback)
    onCleanup(unsubscribe)
  })
}

export function createDieSyncState(initialRecord: DieHealthRecord) {
  const [record, setRecord] = createSignal<DieHealthRecord>(initialRecord)

  useSemanticSync('stress_update', (message) => {
    if (message.payload.dieId === record().id) {
      setRecord(prev => ({
        ...prev,
        stressAccumulation: message.payload.stressAccumulation,
        updatedAt: message.timestamp,
      }))
    }
  })

  useSemanticSync('maintenance_event', (message) => {
    if (message.payload.dieId === record().id) {
      setRecord(prev => ({
        ...prev,
        lastMaintenanceDate: message.timestamp,
        maintenanceHistory: [...prev.maintenanceHistory, message.payload.maintenance],
        updatedAt: message.timestamp,
      }))
    }
  })

  useSemanticSync('health_alert', (message) => {
    if (message.payload.dieId === record().id) {
      setRecord(prev => ({
        ...prev,
        currentHealth: message.payload.currentHealth,
        predictedRemainingLife: message.payload.predictedRemainingLife,
        failureProbability: message.payload.failureProbability,
        updatedAt: message.timestamp,
      }))
    }
  })

  return {
    record,
    setRecord,
  }
}
