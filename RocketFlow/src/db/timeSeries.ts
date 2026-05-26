import { timeSeriesDB } from './indexedDB'
import type { PropellantRecord, EventLog, FillingPhase, EventSeverity } from '@/types'

interface WaveformBuffer {
  timestamps: number[]
  values: Record<string, number[]>
  maxSize: number
}

export class WaveformDataManager {
  private buffer: WaveformBuffer
  private writeInterval: number | null = null
  private writeIntervalMs: number = 500
  private pendingRecords: PropellantRecord[] = []
  
  constructor(bufferSize: number = 10000) {
    this.buffer = {
      timestamps: [],
      values: {},
      maxSize: bufferSize
    }
  }
  
  async init(): Promise<void> {
    await timeSeriesDB.open()
  }
  
  startAutoWrite(): void {
    if (this.writeInterval) return
    this.writeInterval = window.setInterval(() => {
      this.flushPendingRecords()
    }, this.writeIntervalMs)
  }
  
  stopAutoWrite(): void {
    if (this.writeInterval) {
      clearInterval(this.writeInterval)
      this.writeInterval = null
    }
    this.flushPendingRecords()
  }
  
  addRecord(record: PropellantRecord): void {
    this.pendingRecords.push(record)
    this.addToBuffer(record)
    
    if (this.pendingRecords.length > 100) {
      this.flushPendingRecords()
    }
  }
  
  private addToBuffer(record: PropellantRecord): void {
    const { timestamps, values, maxSize } = this.buffer
    
    timestamps.push(record.timestamp)
    
    const recordValues: Record<string, number> = {
      oxygenTankPressure: record.oxygenTankPressure,
      hydrogenTankPressure: record.hydrogenTankPressure,
      oxygenLinePressure: record.oxygenLinePressure,
      hydrogenLinePressure: record.hydrogenLinePressure,
      oxygenTemperature: record.oxygenTemperature,
      hydrogenTemperature: record.hydrogenTemperature,
      oxygenFlowRate: record.oxygenFlowRate,
      hydrogenFlowRate: record.hydrogenFlowRate,
      oxygenFillLevel: record.oxygenFillLevel,
      hydrogenFillLevel: record.hydrogenFillLevel,
      waterHammerRisk: record.waterHammerRisk,
      temperatureGradient: record.temperatureGradient,
      pressureDifference: record.pressureDifference
    }
    
    for (const [key, value] of Object.entries(recordValues)) {
      if (!values[key]) {
        values[key] = []
      }
      values[key].push(value)
    }
    
    if (timestamps.length > maxSize) {
      timestamps.shift()
      for (const key of Object.keys(values)) {
        values[key].shift()
      }
    }
  }
  
  private async flushPendingRecords(): Promise<void> {
    if (this.pendingRecords.length === 0) return
    
    const records = [...this.pendingRecords]
    this.pendingRecords = []
    
    try {
      await timeSeriesDB.insertRecordsBatch(records)
    } catch (error) {
      console.error('Failed to write records:', error)
      this.pendingRecords.unshift(...records)
    }
  }
  
  getWaveformData(paramName: string, startTime?: number, endTime?: number): { x: number[], y: number[] } {
    const { timestamps, values } = this.buffer
    const paramValues = values[paramName] || []
    
    if (startTime === undefined && endTime === undefined) {
      return { x: [...timestamps], y: [...paramValues] }
    }
    
    const x: number[] = []
    const y: number[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i]
      if ((startTime === undefined || t >= startTime) && 
          (endTime === undefined || t <= endTime)) {
        x.push(t)
        y.push(paramValues[i])
      }
    }
    
    return { x, y }
  }
  
  getAvailableParameters(): string[] {
    return Object.keys(this.buffer.values)
  }
  
  async getHistoricalData(startTime: number, endTime: number): Promise<PropellantRecord[]> {
    return timeSeriesDB.queryByTimeRange(startTime, endTime)
  }
  
  async getPhaseData(phase: FillingPhase): Promise<PropellantRecord[]> {
    return timeSeriesDB.queryByPhase(phase)
  }
  
  async addEvent(
    eventType: string,
    severity: EventSeverity,
    description: string,
    relatedParams?: Record<string, number>
  ): Promise<number> {
    const event: EventLog = {
      eventTimestamp: Date.now(),
      eventType,
      eventSeverity: severity,
      eventDescription: description,
      relatedParameters: relatedParams ? JSON.stringify(relatedParams) : '{}',
      acknowledged: false
    }
    
    return timeSeriesDB.insertEvent(event)
  }
  
  async getEvents(startTime?: number, endTime?: number, severity?: string): Promise<EventLog[]> {
    return timeSeriesDB.queryEvents(startTime, endTime, severity)
  }
  
  async acknowledgeEvent(eventId: number): Promise<void> {
    return timeSeriesDB.acknowledgeEvent(eventId)
  }
  
  async createSession(name: string, config: Record<string, any>): Promise<number> {
    return timeSeriesDB.createSession({
      sessionName: name,
      startTime: Date.now(),
      status: 'RUNNING',
      configJson: JSON.stringify(config)
    })
  }
  
  async endSession(sessionId: number, status: 'COMPLETED' | 'ABORTED'): Promise<void> {
    return timeSeriesDB.updateSession(sessionId, {
      endTime: Date.now(),
      status
    })
  }
  
  async getSessions() {
    return timeSeriesDB.getSessions()
  }
  
  async exportData(startTime?: number, endTime?: number): Promise<string> {
    return timeSeriesDB.exportToJSON(startTime, endTime)
  }
  
  async clearDataBefore(timestamp: number): Promise<number> {
    return timeSeriesDB.clearOldData(timestamp)
  }
  
  async clearAll(): Promise<void> {
    await timeSeriesDB.clearAll()
    this.buffer.timestamps = []
    this.buffer.values = {}
    this.pendingRecords = []
  }
  
  getBufferSize(): number {
    return this.buffer.timestamps.length
  }
  
  getPendingCount(): number {
    return this.pendingRecords.length
  }
  
  destroy(): void {
    this.stopAutoWrite()
    timeSeriesDB.close()
  }
}

export const waveformManager = new WaveformDataManager()
