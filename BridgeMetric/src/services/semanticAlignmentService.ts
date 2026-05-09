import type { SensorData, SensorInfo, NormalizedData, HealthStatus, SystemType } from '../types'
import { semanticMapping, recommendationRules } from '../data/semanticMapping'
import { bridgeSensors, sensorUnits } from '../data/sensorConfig'

export class SemanticAlignmentService {
  private static instance: SemanticAlignmentService

  private constructor() {}

  static getInstance(): SemanticAlignmentService {
    if (!SemanticAlignmentService.instance) {
      SemanticAlignmentService.instance = new SemanticAlignmentService()
    }
    return SemanticAlignmentService.instance
  }

  getSensorInfo(sensorId: string): SensorInfo | undefined {
    return bridgeSensors.find(s => s.id === sensorId)
  }

  getSemanticKey(sensorType: string, structureType: string): string {
    return `${sensorType}_${structureType}`
  }

  determineHealthStatus(value: number, thresholds: { warning: number; danger: number; critical: number }): HealthStatus {
    const absValue = Math.abs(value)
    if (absValue >= thresholds.critical) return 'critical'
    if (absValue >= thresholds.danger) return 'danger'
    if (absValue >= thresholds.warning) return 'warning'
    return 'normal'
  }

  normalizeForSystem(
    sensorData: SensorData,
    systemType: SystemType
  ): NormalizedData {
    const sensorInfo = this.getSensorInfo(sensorData.sensorId)
    if (!sensorInfo) {
      throw new Error(`Sensor ${sensorData.sensorId} not found`)
    }

    const semanticKey = this.getSemanticKey(sensorData.type, sensorData.bridgeStructureType)
    const semanticType = systemType === 'operation_center'
      ? semanticMapping.operationCenter[semanticKey] || semanticKey
      : semanticMapping.emergencyCommand[semanticKey] || semanticKey

    const healthStatus = this.determineHealthStatus(
      sensorData.value,
      sensorInfo.thresholds
    )

    const recommendations = recommendationRules[healthStatus]

    return {
      sensorId: sensorData.sensorId,
      timestamp: sensorData.timestamp,
      semanticType,
      value: sensorData.value,
      unit: sensorUnits[sensorData.type],
      healthStatus,
      description: sensorInfo.location.description,
      recommendations
    }
  }

  normalizeBatchForSystem(
    sensorDataList: SensorData[],
    systemType: SystemType
  ): NormalizedData[] {
    return sensorDataList.map(data => this.normalizeForSystem(data, systemType))
  }

  calculateStressFromStrain(strain: number, elasticModulus: number = 200e9): number {
    return strain * elasticModulus
  }

  calculateHealthScore(normalizedDataList: NormalizedData[]): number {
    if (normalizedDataList.length === 0) return 100

    const statusWeights: Record<HealthStatus, number> = {
      normal: 100,
      warning: 60,
      danger: 30,
      critical: 0
    }

    let totalWeight = 0
    let totalScore = 0

    normalizedDataList.forEach(data => {
      const weight = statusWeights[data.healthStatus]
      totalWeight += weight
      totalScore += weight
    })

    return Math.round((totalWeight / (normalizedDataList.length * 100)) * 100)
  }

  getStatusEmphasis(status: HealthStatus, systemType: SystemType): {
    level: string
    color: string
    priority: number
  } {
    if (systemType === 'emergency_command') {
      const emergencyMapping: Record<HealthStatus, { level: string; color: string; priority: number }> = {
        normal: { level: '正常', color: '#00ff88', priority: 4 },
        warning: { level: '预警', color: '#ffaa00', priority: 3 },
        danger: { level: '警报', color: '#ff6600', priority: 2 },
        critical: { level: '紧急', color: '#ff0000', priority: 1 }
      }
      return emergencyMapping[status]
    }

    const operationMapping: Record<HealthStatus, { level: string; color: string; priority: number }> = {
      normal: { level: '正常', color: '#00ff88', priority: 4 },
      warning: { level: '注意', color: '#ffaa00', priority: 3 },
      danger: { level: '异常', color: '#ff4444', priority: 2 },
      critical: { level: '严重', color: '#ff0000', priority: 1 }
    }
    return operationMapping[status]
  }
}

export const semanticAlignmentService = SemanticAlignmentService.getInstance()
