import type { SensorData, SensorInfo, BridgePose } from '../types'
import { bridgeSensors } from '../data/sensorConfig'

export class DataSimulationService {
  private static instance: DataSimulationService
  private baseValues: Map<string, number>
  private anomalyProbability: number = 0.05

  private constructor() {
    this.baseValues = new Map()
    this.initializeBaseValues()
  }

  static getInstance(): DataSimulationService {
    if (!DataSimulationService.instance) {
      DataSimulationService.instance = new DataSimulationService()
    }
    return DataSimulationService.instance
  }

  private initializeBaseValues(): void {
    bridgeSensors.forEach(sensor => {
      const baseValue = this.getInitialBaseValue(sensor)
      this.baseValues.set(sensor.id, baseValue)
    })
  }

  private getInitialBaseValue(sensor: SensorInfo): number {
    switch (sensor.type) {
      case 'strain_gauge':
        return 20 + Math.random() * 30
      case 'displacement':
        return 5 + Math.random() * 10
      case 'acceleration':
        return 0.01 + Math.random() * 0.02
      case 'temperature':
        return 20 + Math.random() * 5
      default:
        return 0
    }
  }

  private generateValue(sensor: SensorInfo, timestamp: number): number {
    const baseValue = this.baseValues.get(sensor.id) || 0
    const timeOfDay = new Date(timestamp).getHours()
    const dayProgress = timeOfDay / 24

    let drift = 0
    if (sensor.type === 'temperature') {
      drift = Math.sin(dayProgress * Math.PI * 2) * 8
    } else if (sensor.type === 'strain_gauge') {
      drift = Math.sin(dayProgress * Math.PI * 2) * 20
    }

    const noise = (Math.random() - 0.5) * (sensor.thresholds.warning * 0.2)

    const isAnomaly = Math.random() < this.anomalyProbability
    let anomaly = 0
    if (isAnomaly) {
      const anomalyLevel = Math.random()
      if (anomalyLevel < 0.5) {
        anomaly = sensor.thresholds.warning + Math.random() * (sensor.thresholds.danger - sensor.thresholds.warning)
      } else if (anomalyLevel < 0.8) {
        anomaly = sensor.thresholds.danger + Math.random() * (sensor.thresholds.critical - sensor.thresholds.danger)
      } else {
        anomaly = sensor.thresholds.critical + Math.random() * sensor.thresholds.critical * 0.5
      }
    }

    const newValue = baseValue + drift + noise + anomaly

    if (Math.random() < 0.01) {
      this.baseValues.set(sensor.id, baseValue + (Math.random() - 0.5) * 2)
    }

    return Number(newValue.toFixed(3))
  }

  generateSensorData(sensorId: string, timestamp: number = Date.now()): SensorData | null {
    const sensor = bridgeSensors.find(s => s.id === sensorId)
    if (!sensor) return null

    return {
      id: `${sensor.id}-${timestamp}`,
      sensorId: sensor.id,
      type: sensor.type,
      bridgeStructureType: sensor.location.structureType,
      timestamp,
      value: this.generateValue(sensor, timestamp),
      unit: '',
      temperature: sensor.type === 'temperature' ? undefined : 20 + Math.random() * 10,
      metadata: {
        simulated: true,
        battery: 90 + Math.random() * 10,
        signal: 80 + Math.random() * 20
      }
    }
  }

  generateAllSensorData(timestamp: number = Date.now()): SensorData[] {
    return bridgeSensors
      .map(sensor => this.generateSensorData(sensor.id, timestamp))
      .filter((data): data is SensorData => data !== null)
  }

  generateHistoricalData(days: number, intervalMs: number = 60000): SensorData[][] {
    const now = Date.now()
    const startTime = now - days * 24 * 60 * 60 * 1000
    const historicalData: SensorData[][] = []

    for (let timestamp = startTime; timestamp <= now; timestamp += intervalMs) {
      historicalData.push(this.generateAllSensorData(timestamp))
    }

    return historicalData
  }

  generateBridgePose(timestamp: number = Date.now()): BridgePose {
    const deformations: BridgePose['deformations'] = {}
    const stresses: BridgePose['stresses'] = {}
    let totalHealth = 0
    let sensorCount = 0

    // 使用时间戳创建周期性变化，让变形更明显和规律
    const timePhase = (timestamp % 10000) / 10000 // 0-1 周期

    bridgeSensors.forEach(sensor => {
      const value = this.generateValue(sensor, timestamp)
      const normalizedValue = Math.abs(value) / sensor.thresholds.warning
      
      // 增强变形效果
      // 根据传感器位置和类型
      const positionFactor = sensor.location.x / 100 // 0-2
      
      // 周期性变化
      const wave = Math.sin(timePhase * Math.PI * 2 + sensor.id.length)
      
      deformations[sensor.id] = {
        dx: (Math.random() - 0.5) * normalizedValue * 2.0 + wave * 3.0,
        dy: -Math.min(normalizedValue * 3.0, 15.0) + wave * 2.0,
        dz: (Math.random() - 0.5) * normalizedValue * 1.5 + wave * 1.0
      }

      if (sensor.type === 'strain_gauge') {
        stresses[sensor.id] = value * 200e9 / 1e6
      }

      const healthContribution = Math.max(0, 100 - normalizedValue * 50)
      totalHealth += healthContribution
      sensorCount++
    })

    return {
      timestamp,
      deformations,
      stresses,
      overallHealthScore: sensorCount > 0 ? Math.round(totalHealth / sensorCount) : 100
    }
  }

  setAnomalyProbability(probability: number): void {
    this.anomalyProbability = Math.max(0, Math.min(1, probability))
  }

  resetBaseValues(): void {
    this.initializeBaseValues()
  }
}

export const dataSimulationService = DataSimulationService.getInstance()
