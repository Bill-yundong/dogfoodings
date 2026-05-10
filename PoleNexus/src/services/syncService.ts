import type { SyncEvent, EnergyData, PoleNode, DimmingCommand, OperationLog } from '@/types'

type EventHandler = (event: SyncEvent) => void
type Unsubscribe = () => void

class SyncService {
  private handlers: Map<string, EventHandler[]> = new Map()
  private isInitialized = false
  private broadcastChannel: BroadcastChannel | null = null

  initialize(): void {
    if (this.isInitialized) return
    
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('polenexus-sync')
      this.broadcastChannel.onmessage = (event) => {
        this.processEvent(event.data as SyncEvent)
      }
    }
    
    this.isInitialized = true
    console.log('[SyncService] Initialized')
  }

  on(type: SyncEvent['type'], handler: EventHandler): Unsubscribe {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
    
    return () => {
      const handlers = this.handlers.get(type)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  emit(event: SyncEvent): void {
    this.processEvent(event)
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event)
    }
  }

  private processEvent(event: SyncEvent): void {
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('[SyncService] Handler error:', error)
        }
      })
    }
  }

  emitEnergyUpdate(data: EnergyData): void {
    this.emit({
      type: 'energy_update',
      payload: data,
      timestamp: Date.now(),
    })
  }

  emitCommandSent(command: DimmingCommand): void {
    this.emit({
      type: 'command_sent',
      payload: command,
      timestamp: Date.now(),
    })
  }

  emitStatusChange(pole: PoleNode): void {
    this.emit({
      type: 'status_change',
      payload: pole,
      timestamp: Date.now(),
    })
  }

  emitLogCreated(log: OperationLog): void {
    this.emit({
      type: 'log_created',
      payload: log,
      timestamp: Date.now(),
    })
  }

  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.handlers.clear()
    this.isInitialized = false
    console.log('[SyncService] Destroyed')
  }
}

let instance: SyncService | null = null

export function useSyncService(): SyncService {
  if (!instance) {
    instance = new SyncService()
  }
  return instance
}