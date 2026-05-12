import { ref, reactive } from 'vue'
import type { SensorData, SyncStatus } from '../types'

export class SemanticSyncService {
  private static instance: SemanticSyncService
  private platformDataBuffer: SensorData[] = []
  private deicingDataBuffer: SensorData[] = []
  private syncInterval: number | null = null

  public syncStatus = reactive<SyncStatus>({
    lastSync: 0,
    platformConnected: false,
    deicingSystemConnected: false
  })

  public onDataSynced: ((data: SensorData[]) => void) | null = null

  private constructor() {}

  public static getInstance(): SemanticSyncService {
    if (!SemanticSyncService.instance) {
      SemanticSyncService.instance = new SemanticSyncService()
    }
    return SemanticSyncService.instance
  }

  public async connectPlatform(): Promise<boolean> {
    await this.simulateConnectionDelay()
    this.syncStatus.platformConnected = true
    return true
  }

  public async connectDeicingSystem(): Promise<boolean> {
    await this.simulateConnectionDelay()
    this.syncStatus.deicingSystemConnected = true
    return true
  }

  public startSync(intervalMs: number = 5000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    this.syncInterval = window.setInterval(() => {
      this.performSync()
    }, intervalMs)
  }

  public stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  public pushPlatformData(data: SensorData): void {
    this.platformDataBuffer.push(data)
  }

  public pushDeicingSystemData(data: SensorData): void {
    this.deicingDataBuffer.push(data)
  }

  private async performSync(): Promise<void> {
    if (!this.syncStatus.platformConnected || !this.syncStatus.deicingSystemConnected) {
      return
    }

    const mergedData = this.mergeSensorData(
      [...this.platformDataBuffer],
      [...this.deicingDataBuffer]
    )

    const semanticData = this.enhanceWithSemantics(mergedData)

    await this.syncToPlatform(semanticData)
    await this.syncToDeicingSystem(semanticData)

    this.platformDataBuffer = []
    this.deicingDataBuffer = []
    this.syncStatus.lastSync = Date.now()

    if (this.onDataSynced) {
      this.onDataSynced(semanticData)
    }
  }

  private mergeSensorData(platformData: SensorData[], deicingData: SensorData[]): SensorData[] {
    const allData = [...platformData, ...deicingData]
    const uniqueData = new Map<number, SensorData>()

    allData.forEach(data => {
      const roundedTime = Math.round(data.timestamp / 1000) * 1000
      const existing = uniqueData.get(roundedTime)
      if (existing) {
        uniqueData.set(roundedTime, {
          timestamp: roundedTime,
          temperature: (existing.temperature + data.temperature) / 2,
          humidity: (existing.humidity + data.humidity) / 2,
          windSpeed: (existing.windSpeed + data.windSpeed) / 2,
          altitude: (existing.altitude + data.altitude) / 2
        })
      } else {
        uniqueData.set(roundedTime, { ...data, timestamp: roundedTime })
      }
    })

    return Array.from(uniqueData.values()).sort((a, b) => a.timestamp - b.timestamp)
  }

  private enhanceWithSemantics(data: SensorData[]): SensorData[] {
    return data.map(item => ({
      ...item,
      temperature: this.roundToPrecision(item.temperature, 2),
      humidity: this.roundToPrecision(item.humidity, 2),
      windSpeed: this.roundToPrecision(item.windSpeed, 2),
      altitude: this.roundToPrecision(item.altitude, 0)
    }))
  }

  private async syncToPlatform(data: SensorData[]): Promise<void> {
    await this.simulateConnectionDelay(100)
    console.log(`[SemanticSync] Synced ${data.length} records to platform`)
  }

  private async syncToDeicingSystem(data: SensorData[]): Promise<void> {
    await this.simulateConnectionDelay(100)
    console.log(`[SemanticSync] Synced ${data.length} records to deicing system`)
  }

  private simulateConnectionDelay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision)
    return Math.round(value * factor) / factor
  }

  public destroy(): void {
    this.stopSync()
    SemanticSyncService.instance = null as any
  }
}

export const semanticSyncService = SemanticSyncService.getInstance()
