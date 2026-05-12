import { openDB } from 'idb'
import { FaultSlice } from '../models/FaultSlice.js'

export class WaveformStorageService {
  constructor() {
    this.dbName = 'RelayWaveformDB'
    this.dbVersion = 1
    this.db = null
    this.maxRecords = 10000
  }

  async init() {
    if (this.db) return this.db

    this.db = await openDB(this.dbName, this.dbVersion, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains('waveforms')) {
          const waveformStore = db.createObjectStore('waveforms', {
            keyPath: 'id',
            autoIncrement: false
          })
          waveformStore.createIndex('timestamp', 'timestamp', { unique: false })
          waveformStore.createIndex('deviceId', 'deviceId', { unique: false })
          waveformStore.createIndex('faultType', 'faultType', { unique: false })
          waveformStore.createIndex('severity', 'severity', { unique: false })
        }

        if (!db.objectStoreNames.contains('deviceStatus')) {
          const deviceStore = db.createObjectStore('deviceStatus', {
            keyPath: 'deviceId'
          })
          deviceStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('alignedSlices')) {
          const alignedStore = db.createObjectStore('alignedSlices', {
            keyPath: 'id'
          })
          alignedStore.createIndex('timestamp', 'timestamp', { unique: false })
          alignedStore.createIndex('alignmentConfidence', 'alignmentConfidence', { unique: false })
        }
      }
    })

    return this.db
  }

  async saveWaveform(faultSlice) {
    await this.init()

    const count = await this.db.count('waveforms')
    if (count >= this.maxRecords) {
      await this.removeOldestWaveforms(count - this.maxRecords + 1)
    }

    const data = faultSlice instanceof FaultSlice ? faultSlice.toJSON() : faultSlice
    data.storedAt = Date.now()

    await this.db.put('waveforms', data)
    return data.id
  }

  async saveBatchWaveforms(faultSlices) {
    await this.init()

    const tx = this.db.transaction('waveforms', 'readwrite')
    const store = tx.store

    for (const slice of faultSlices) {
      const data = slice instanceof FaultSlice ? slice.toJSON() : slice
      data.storedAt = Date.now()
      await store.put(data)
    }

    await tx.done
    return faultSlices.length
  }

  async getWaveform(id) {
    await this.init()
    const data = await this.db.get('waveforms', id)
    return data ? new FaultSlice(data) : null
  }

  async getWaveformsByTimeRange(startTime, endTime) {
    await this.init()

    const range = IDBKeyRange.bound(startTime, endTime)
    const waveforms = await this.db.getAllFromIndex('waveforms', 'timestamp', range)

    return waveforms.map(data => new FaultSlice(data))
  }

  async getWaveformsByDevice(deviceId, limit = 100) {
    await this.init()

    const waveforms = await this.db.getAllFromIndex('waveforms', 'deviceId', deviceId, limit)
    return waveforms.map(data => new FaultSlice(data))
  }

  async getWaveformsByFaultType(faultType, limit = 100) {
    await this.init()

    const waveforms = await this.db.getAllFromIndex('waveforms', 'faultType', faultType, limit)
    return waveforms.map(data => new FaultSlice(data))
  }

  async getRecentWaveforms(limit = 50) {
    await this.init()

    const waveforms = await this.db.getAll('waveforms')
    return waveforms
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(data => new FaultSlice(data))
  }

  async searchWaveforms(query) {
    await this.init()

    const allWaveforms = await this.db.getAll('waveforms')

    return allWaveforms.filter(data => {
      if (query.deviceId && data.deviceId !== query.deviceId) return false
      if (query.faultType && data.faultType !== query.faultType) return false
      if (query.severity && data.severity !== query.severity) return false
      if (query.startTime && data.timestamp < query.startTime) return false
      if (query.endTime && data.timestamp > query.endTime) return false
      return true
    }).map(data => new FaultSlice(data))
  }

  async deleteWaveform(id) {
    await this.init()
    await this.db.delete('waveforms', id)
  }

  async removeOldestWaveforms(count) {
    await this.init()

    const waveforms = await this.db.getAll('waveforms')
    const sorted = waveforms.sort((a, b) => a.timestamp - b.timestamp)
    const toDelete = sorted.slice(0, count)

    const tx = this.db.transaction('waveforms', 'readwrite')
    for (const waveform of toDelete) {
      await tx.store.delete(waveform.id)
    }
    await tx.done
  }

  async clearAllWaveforms() {
    await this.init()
    await this.db.clear('waveforms')
  }

  async getWaveformCount() {
    await this.init()
    return await this.db.count('waveforms')
  }

  async getStorageStatistics() {
    await this.init()

    const totalCount = await this.db.count('waveforms')
    const waveforms = await this.db.getAll('waveforms')

    const faultTypeStats = {}
    const deviceStats = {}
    const severityStats = {}

    let oldestTimestamp = Infinity
    let newestTimestamp = 0

    for (const wf of waveforms) {
      faultTypeStats[wf.faultType] = (faultTypeStats[wf.faultType] || 0) + 1
      deviceStats[wf.deviceId] = (deviceStats[wf.deviceId] || 0) + 1
      severityStats[wf.severity] = (severityStats[wf.severity] || 0) + 1

      if (wf.timestamp < oldestTimestamp) oldestTimestamp = wf.timestamp
      if (wf.timestamp > newestTimestamp) newestTimestamp = wf.timestamp
    }

    return {
      totalCount,
      faultTypeStats,
      deviceStats,
      severityStats,
      timeRange: {
        oldest: oldestTimestamp === Infinity ? null : oldestTimestamp,
        newest: newestTimestamp === 0 ? null : newestTimestamp
      },
      storageLimit: this.maxRecords
    }
  }

  async saveAlignedSlice(alignedSlice) {
    await this.init()
    const data = alignedSlice instanceof FaultSlice ? alignedSlice.toJSON() : alignedSlice
    data.storedAt = Date.now()
    await this.db.put('alignedSlices', data)
    return data.id
  }

  async getAlignedSlices(limit = 100) {
    await this.init()
    const slices = await this.db.getAll('alignedSlices')
    return slices
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(data => new FaultSlice(data))
  }

  async saveDeviceStatus(deviceStatus) {
    await this.init()
    deviceStatus.timestamp = Date.now()
    await this.db.put('deviceStatus', deviceStatus)
    return deviceStatus.deviceId
  }

  async getDeviceStatus(deviceId) {
    await this.init()
    return await this.db.get('deviceStatus', deviceId)
  }

  async exportWaveforms(format = 'json') {
    await this.init()
    const waveforms = await this.db.getAll('waveforms')

    if (format === 'json') {
      return JSON.stringify(waveforms, null, 2)
    } else if (format === 'csv') {
      return this.convertToCSV(waveforms)
    }

    return waveforms
  }

  convertToCSV(waveforms) {
    const headers = ['id', 'timestamp', 'deviceId', 'deviceName', 'faultType', 'faultPhase', 'severity', 'tripTime', 'clearTime']
    const rows = waveforms.map(wf => [
      wf.id,
      wf.timestamp,
      wf.deviceId,
      wf.deviceName,
      wf.faultType,
      wf.faultPhase,
      wf.severity,
      wf.tripTime,
      wf.clearTime
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  async importWaveforms(data) {
    await this.init()
    const waveforms = typeof data === 'string' ? JSON.parse(data) : data

    return await this.saveBatchWaveforms(waveforms)
  }

  generateSampleWaveform(deviceId = 'CB-001') {
    const sampleCount = 1000
    const voltage = []
    const current = []

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount
      voltage.push({
        phaseA: Math.sin(2 * Math.PI * 50 * t) * 220 + (Math.random() - 0.5) * 10,
        phaseB: Math.sin(2 * Math.PI * 50 * t - 2 * Math.PI / 3) * 220 + (Math.random() - 0.5) * 10,
        phaseC: Math.sin(2 * Math.PI * 50 * t + 2 * Math.PI / 3) * 220 + (Math.random() - 0.5) * 10,
        time: t * 0.02
      })

      current.push({
        phaseA: Math.sin(2 * Math.PI * 50 * t) * 500 + (Math.random() - 0.5) * 50,
        phaseB: Math.sin(2 * Math.PI * 50 * t - 2 * Math.PI / 3) * 500 + (Math.random() - 0.5) * 50,
        phaseC: Math.sin(2 * Math.PI * 50 * t + 2 * Math.PI / 3) * 500 + (Math.random() - 0.5) * 50,
        time: t * 0.02
      })
    }

    return new FaultSlice({
      deviceId,
      deviceName: `断路器 ${deviceId}`,
      faultType: ['phase_a_ground', 'phase_b_ground', 'three_phase_short', 'overcurrent'][Math.floor(Math.random() * 4)],
      faultPhase: ['A', 'B', 'C', 'ABC'][Math.floor(Math.random() * 4)],
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      tripTime: Date.now() - 5000,
      clearTime: Date.now(),
      voltage,
      current,
      status: 'cleared',
      location: { bay: 'Bay-1', feeder: 'Feeder-A' },
      protectionSignals: ['主保护动作', '后备保护动作'],
      breakerStatus: { tripped: true, reclosed: false }
    })
  }

  async generateAndSaveSampleData(count = 100) {
    const deviceIds = ['CB-001', 'CB-002', 'CB-003', 'TR-001', 'TR-002', 'RL-001']
    const waveforms = []

    for (let i = 0; i < count; i++) {
      const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)]
      const waveform = this.generateSampleWaveform(deviceId)
      waveform.timestamp = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      waveforms.push(waveform)
    }

    return await this.saveBatchWaveforms(waveforms)
  }
}

export const waveformStorage = new WaveformStorageService()
