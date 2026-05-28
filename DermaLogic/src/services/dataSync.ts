import type { Device, SkinScan } from '../types'
import { dbService } from './database'

export type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'error'

export class DataSyncService {
  private status: SyncStatus = 'idle'
  private ws: WebSocket | null = null
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map()
  private mockDevices: Device[] = [
    {
      id: 'device-001',
      name: 'DermaScan Pro',
      type: 'scanner',
      status: 'disconnected',
      lastSync: new Date(Date.now() - 86400000),
      battery: 85
    },
    {
      id: 'device-002',
      name: 'SkinAnalyzer Mini',
      type: 'analyzer',
      status: 'disconnected',
      lastSync: new Date(Date.now() - 172800000),
      battery: 62
    }
  ]

  async connect(deviceId: string): Promise<boolean> {
    this.status = 'connecting'
    this.emit('statusChange', this.status)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const device = this.mockDevices.find(d => d.id === deviceId)
      if (device) {
        device.status = 'connected'
        device.lastSync = new Date()
        await dbService.saveDevice(device)
      }

      this.status = 'idle'
      this.emit('statusChange', this.status)
      this.emit('deviceConnected', device)
      
      return true
    } catch (error) {
      this.status = 'error'
      this.emit('statusChange', this.status)
      return false
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    const device = this.mockDevices.find(d => d.id === deviceId)
    if (device) {
      device.status = 'disconnected'
      await dbService.saveDevice(device)
    }
    this.emit('deviceDisconnected', deviceId)
  }

  async syncData(): Promise<void> {
    this.status = 'syncing'
    this.emit('statusChange', this.status)

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      this.emit('syncProgress', i)
    }

    this.status = 'idle'
    this.emit('statusChange', this.status)
    this.emit('syncComplete')
  }

  connectWebSocket(url: string): void {
    this.ws = new WebSocket(url)
    
    this.ws.onopen = () => {
      this.emit('wsConnected')
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.emit('wsData', data)
    }

    this.ws.onerror = (error) => {
      this.emit('wsError', error)
    }

    this.ws.onclose = () => {
      this.emit('wsClosed')
    }
  }

  sendData(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  getDevices(): Device[] {
    return this.mockDevices
  }

  getStatus(): SyncStatus {
    return this.status
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }
}

export const dataSyncService = new DataSyncService()
