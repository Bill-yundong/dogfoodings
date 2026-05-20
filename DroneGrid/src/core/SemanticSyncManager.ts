import type { SemanticSyncMessage, DroneState, Mission, BlackBoxLog } from '@/types'
import { generateId } from '@/utils/math'

interface SyncSubscriber {
  id: string
  type: 'terminal' | 'regulatory'
  callback: (message: SemanticSyncMessage) => void
}

interface PendingMessage {
  message: SemanticSyncMessage
  timestamp: number
  retryCount: number
}

export class SemanticSyncManager {
  private subscribers: Map<string, SyncSubscriber> = new Map()
  private messageQueue: PendingMessage[] = []
  private messageHistory: SemanticSyncMessage[] = []
  private versionCounter: Map<string, number> = new Map()
  private maxHistorySize: number = 10000
  private retryInterval: number = 5000
  private maxRetries: number = 5
  private isRunning: boolean = false
  private lastSyncTime: number = 0

  constructor() {
    this.startSyncLoop()
  }

  private startSyncLoop(): void {
    this.isRunning = true
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      const now = Date.now()
      const toProcess: PendingMessage[] = []

      for (const pending of this.messageQueue) {
        if (now - pending.timestamp >= this.retryInterval || pending.retryCount === 0) {
          toProcess.push(pending)
        }
      }

      for (const pending of toProcess) {
        const success = await this.sendMessage(pending.message)
        if (success) {
          this.messageQueue = this.messageQueue.filter(
            p => p.message.id !== pending.message.id
          )
          this.addToHistory(pending.message)
        } else {
          pending.retryCount++
          pending.timestamp = now
          if (pending.retryCount >= this.maxRetries) {
            this.messageQueue = this.messageQueue.filter(
              p => p.message.id !== pending.message.id
            )
            console.warn(`Message ${pending.message.id} failed after ${this.maxRetries} retries`)
          }
        }
      }

      await this.delay(1000)
    }
  }

  private async sendMessage(message: SemanticSyncMessage): Promise<boolean> {
    const targetSubscribers: SyncSubscriber[] = []
    
    this.subscribers.forEach(sub => {
      if (sub.id !== message.source) {
        targetSubscribers.push(sub)
      }
    })

    if (targetSubscribers.length === 0) return true

    let allSuccess = true
    for (const subscriber of targetSubscribers) {
      try {
        subscriber.callback(message)
      } catch (error) {
        allSuccess = false
        console.error(`Failed to send message to ${subscriber.id}:`, error)
      }
    }

    this.lastSyncTime = Date.now()
    return allSuccess
  }

  private addToHistory(message: SemanticSyncMessage): void {
    this.messageHistory.push(message)
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift()
    }
  }

  private generateHash(message: Omit<SemanticSyncMessage, 'hash'>): string {
    const content = JSON.stringify({
      id: message.id,
      source: message.source,
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp,
      version: message.version
    })
    
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private getNextVersion(type: string): number {
    const current = this.versionCounter.get(type) || 0
    const next = current + 1
    this.versionCounter.set(type, next)
    return next
  }

  public createMessage(
    source: 'terminal' | 'regulatory',
    type: SemanticSyncMessage['type'],
    payload: any
  ): SemanticSyncMessage {
    const version = this.getNextVersion(type)
    const message: Omit<SemanticSyncMessage, 'hash'> = {
      id: generateId(),
      source,
      type,
      payload,
      timestamp: Date.now(),
      version
    }
    
    return {
      ...message,
      hash: this.generateHash(message)
    }
  }

  public send(message: SemanticSyncMessage): void {
    this.messageQueue.push({
      message,
      timestamp: 0,
      retryCount: 0
    })
  }

  public sendAsync(message: SemanticSyncMessage): Promise<boolean> {
    return new Promise(async (resolve) => {
      const success = await this.sendMessage(message)
      if (success) {
        this.addToHistory(message)
      }
      resolve(success)
    })
  }

  public subscribe(
    subscriberId: string,
    type: 'terminal' | 'regulatory',
    callback: (message: SemanticSyncMessage) => void
  ): () => void {
    this.subscribers.set(subscriberId, { id: subscriberId, type, callback })
    
    return () => {
      this.subscribers.delete(subscriberId)
    }
  }

  public createDroneStateMessage(source: 'terminal' | 'regulatory', state: DroneState): SemanticSyncMessage {
    return this.createMessage(source, 'position', {
      droneId: state.id,
      position: state.position,
      gps: state.gps,
      velocity: state.velocity,
      battery: state.battery,
      status: state.status,
      heading: state.heading
    })
  }

  public createMissionMessage(source: 'terminal' | 'regulatory', mission: Mission, action: 'create' | 'update' | 'complete'): SemanticSyncMessage {
    return this.createMessage(source, 'mission', {
      action,
      mission: {
        id: mission.id,
        name: mission.name,
        droneId: mission.droneId,
        status: mission.status,
        waypoints: mission.waypoints,
        startTime: mission.startTime
      }
    })
  }

  public createAlertMessage(
    source: 'terminal' | 'regulatory',
    droneId: string,
    alertType: string,
    severity: 'info' | 'warning' | 'danger',
    details: any
  ): SemanticSyncMessage {
    return this.createMessage(source, 'alert', {
      droneId,
      alertType,
      severity,
      details,
      timestamp: Date.now()
    })
  }

  public createCommandMessage(
    source: 'terminal' | 'regulatory',
    droneId: string,
    command: string,
    parameters: any
  ): SemanticSyncMessage {
    return this.createMessage(source, 'command', {
      droneId,
      command,
      parameters
    })
  }

  public validateMessage(message: SemanticSyncMessage): boolean {
    const { hash, ...withoutHash } = message
    const computedHash = this.generateHash(withoutHash)
    return computedHash === hash
  }

  public getMessageHistory(
    type?: SemanticSyncMessage['type'],
    source?: 'terminal' | 'regulatory',
    since?: number
  ): SemanticSyncMessage[] {
    return this.messageHistory.filter(msg => {
      if (type && msg.type !== type) return false
      if (source && msg.source !== source) return false
      if (since && msg.timestamp < since) return false
      return true
    })
  }

  public getSyncStatus(): {
    pendingMessages: number
    lastSyncTime: number
    totalSynced: number
    subscribers: number
  } {
    return {
      pendingMessages: this.messageQueue.length,
      lastSyncTime: this.lastSyncTime,
      totalSynced: this.messageHistory.length,
      subscribers: this.subscribers.size
    }
  }

  public broadcastBlackBoxLog(source: 'terminal' | 'regulatory', log: BlackBoxLog): void {
    const message = this.createMessage(source, 'position', {
      type: 'blackbox',
      log: {
        id: log.id,
        droneId: log.droneId,
        timestamp: log.timestamp,
        position: log.position,
        gps: log.gps,
        battery: log.battery,
        status: log.status,
        errorCode: log.errorCode
      }
    })
    this.send(message)
  }

  public requestFullSync(from: 'terminal' | 'regulatory'): void {
    const message = this.createMessage(from, 'command', {
      command: 'full_sync',
      timestamp: Date.now()
    })
    this.send(message)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public stop(): void {
    this.isRunning = false
  }

  public clearHistory(): void {
    this.messageHistory = []
  }
}
