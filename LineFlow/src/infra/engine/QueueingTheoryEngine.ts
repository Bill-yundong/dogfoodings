import { Workstation } from '../../domain/entities/Workstation'
import { QueueMetrics } from '../../domain/value-objects/QueueMetrics'

export class QueueingTheoryEngine {
  private stations: Map<string, Workstation> = new Map()
  private historyWindow: number = 50

  setStations(stations: Workstation[]): void {
    this.stations.clear()
    stations.forEach(s => this.stations.set(s.id, s))
  }

  calculateStationMetrics(stationId: string): QueueMetrics {
    const station = this.stations.get(stationId)
    if (!station) return QueueMetrics.createEmpty()

    const serviceRate = this.calculateServiceRate(station)
    const arrivalRate = this.calculateArrivalRate(station)
    
    const utilization = Math.min(arrivalRate / serviceRate, 0.99)
    const avgQueueLength = (utilization * utilization) / (1 - utilization)
    const avgWaitingTime = avgQueueLength / arrivalRate
    const probabilityOfWaiting = utilization

    return new QueueMetrics(
      arrivalRate,
      serviceRate,
      utilization,
      avgQueueLength,
      avgWaitingTime,
      probabilityOfWaiting
    )
  }

  private calculateServiceRate(station: Workstation): number {
    return 3600 / station.actualCycleTime
  }

  private calculateArrivalRate(station: Workstation): number {
    if (station.index === 0) {
      return 3600 / station.cycleTime
    }

    const prevStation = Array.from(this.stations.values())
      .find(s => s.index === station.index - 1)
    
    if (!prevStation) return 60

    const prevMetrics = this.calculateStationMetrics(prevStation.id)
    const blockingProbability = this.calculateBlockingProbability(station)
    
    return prevMetrics.serviceRate * (1 - blockingProbability)
  }

  private calculateBlockingProbability(station: Workstation): number {
    const nextStation = Array.from(this.stations.values())
      .find(s => s.index === station.index + 1)
    
    if (!nextStation) return 0
    
    return Math.min(nextStation.queueLength / Math.max(nextStation.capacity, 1), 0.5)
  }

  identifyBottleneck(): string | null {
    if (this.stations.size === 0) return null

    const metricsList = Array.from(this.stations.values()).map(s => ({
      stationId: s.id,
      utilization: this.calculateStationMetrics(s.id).utilization
    }))

    const sorted = metricsList.sort((a, b) => b.utilization - a.utilization)
    return sorted[0]?.stationId || null
  }

  getAllStationMetrics(): Map<string, QueueMetrics> {
    const result = new Map<string, QueueMetrics>()
    this.stations.forEach((station, id) => {
      result.set(id, this.calculateStationMetrics(id))
    })
    return result
  }

  updateAndApplyMetrics(): void {
    this.stations.forEach(station => {
      const metrics = this.calculateStationMetrics(station.id)
      station.queueMetrics = metrics
    })
  }

  getBottleneckSeverity(stationId: string): 'low' | 'medium' | 'high' | 'critical' {
    const metrics = this.calculateStationMetrics(stationId)
    return metrics.severity
  }

  getOptimizationSuggestions(stationId: string): string[] {
    const station = this.stations.get(stationId)
    if (!station) return []

    const metrics = this.calculateStationMetrics(stationId)
    const suggestions: string[] = []

    if (metrics.utilization > 0.9) {
      suggestions.push('建议增加并行工位数，提升处理能力')
      suggestions.push('考虑优化工艺步骤，缩短单件工时')
    }
    
    if (metrics.avgQueueLength > 5) {
      suggestions.push('建议增加缓冲队列容量，减少阻塞概率')
    }

    if (station.actualCycleTime > station.cycleTime * 1.2) {
      suggestions.push('设备效率下降，建议进行预防性维护')
      suggestions.push('操作员技能水平可能需要培训提升')
    }

    if (metrics.utilization < 0.5) {
      suggestions.push('工位利用率较低，可考虑合并工序')
    }

    return suggestions.length > 0 ? suggestions : ['工位运行状态良好']
  }

  predictThroughput(timeHorizon: number): number[] {
    const predictions: number[] = []
    const stations = Array.from(this.stations.values())
    
    if (stations.length === 0) return predictions

    const avgCycleTime = stations.reduce((sum, s) => sum + s.actualCycleTime, 0) / stations.length
    const baseThroughput = 3600 / avgCycleTime

    for (let i = 0; i < timeHorizon; i++) {
      const noise = (Math.random() - 0.5) * 0.15
      predictions.push(Math.max(0, baseThroughput * (1 + noise)))
    }

    return predictions
  }

  calculateLineMetrics(): {
    oee: number
    availability: number
    performance: number
    quality: number
    throughput: number
    avgCycleTime: number
    bottleneckIndex: number
  } {
    const stations = Array.from(this.stations.values())
    
    const avgCycleTime = stations.reduce((sum, s) => sum + s.actualCycleTime, 0) / stations.length
    const throughput = 3600 / avgCycleTime

    const availability = stations.filter(s => s.isRunning).length / Math.max(stations.length, 1)
    const totalTarget = stations.reduce((sum, s) => sum + s.cycleTime, 0)
    const totalActual = stations.reduce((sum, s) => sum + s.actualCycleTime, 0)
    const performance = totalActual > 0 ? totalTarget / totalActual : 1
    const quality = 0.985

    const bottleneckId = this.identifyBottleneck()
    const bottleneckIndex = stations.findIndex(s => s.id === bottleneckId)

    return {
      oee: availability * performance * quality,
      availability,
      performance,
      quality,
      throughput,
      avgCycleTime,
      bottleneckIndex
    }
  }
}

export const queueingEngine = new QueueingTheoryEngine()
