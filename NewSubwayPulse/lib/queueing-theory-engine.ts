import type { QueueParameters, QueueMetrics, CapacityPrediction, PassengerFlow, Station } from '@/types'

export class QueueingTheoryEngine {
  private async calculateMMcQueue(params: QueueParameters): Promise<QueueMetrics> {
    const { arrivalRate, serviceRate, serverCount } = params
    const rho = arrivalRate / (serviceRate * serverCount)

    if (rho >= 1) {
      return {
        averageQueueLength: Infinity,
        averageWaitingTime: Infinity,
        probabilityOfWaiting: 1,
        serverUtilization: 1,
        systemCapacity: serverCount * serviceRate
      }
    }

    let p0 = 0
    for (let n = 0; n < serverCount; n++) {
      p0 += Math.pow(arrivalRate / serviceRate, n) / this.factorial(n)
    }
    const lastTerm = Math.pow(arrivalRate / serviceRate, serverCount) / 
      (this.factorial(serverCount) * (1 - rho))
    p0 += lastTerm
    p0 = 1 / p0

    const pWait = (Math.pow(arrivalRate / serviceRate, serverCount) * p0) /
      (this.factorial(serverCount) * (1 - rho))

    const lq = pWait * rho / (1 - rho)
    const wq = lq / arrivalRate

    return {
      averageQueueLength: lq,
      averageWaitingTime: wq,
      probabilityOfWaiting: pWait,
      serverUtilization: rho,
      systemCapacity: serverCount * serviceRate
    }
  }

  private factorial(n: number): number {
    if (n <= 1) return 1
    let result = 1
    for (let i = 2; i <= n; i++) {
      result *= i
    }
    return result
  }

  async predictCapacity(
    flow: PassengerFlow,
    station: Station,
    forecastWindows: number[] = [5, 10, 15, 30]
  ): Promise<CapacityPrediction[]> {
    const predictions: CapacityPrediction[] = []

    for (const window of forecastWindows) {
      const predictedPassengers = flow.currentCount + 
        (flow.entryRate - flow.exitRate) * window * 60 +
        flow.transferRate * window * 60

      const entryServers = Math.max(1, Math.ceil(station.entranceCount * 0.8))
      const exitServers = Math.max(1, Math.ceil(station.exitCount * 0.8))
      const platformServers = station.platformCount

      const entryQueue = await this.calculateMMcQueue({
        arrivalRate: flow.entryRate,
        serviceRate: 0.5,
        serverCount: entryServers,
        queueCapacity: 100
      })

      const platformQueue = await this.calculateMMcQueue({
        arrivalRate: flow.entryRate + flow.transferRate,
        serviceRate: 0.3,
        serverCount: platformServers,
        queueCapacity: station.maxCapacity
      })

      const capacityUtilization = predictedPassengers / station.maxCapacity
      const capacityGap = Math.max(0, predictedPassengers - station.maxCapacity * 0.8)

      const trainCapacity = 1800
      const passengersPerTrain = trainCapacity * 0.85
      const requiredTrains = Math.ceil(capacityGap / passengersPerTrain)

      const confidence = this.calculateConfidence(flow, platformQueue, entryQueue)

      predictions.push({
        stationId: station.id,
        timestamp: Date.now(),
        forecastWindow: window,
        predictedPassengers,
        capacityUtilization,
        capacityGap,
        recommendedTrains: Math.max(0, requiredTrains),
        confidence
      })
    }

    return predictions
  }

  private calculateConfidence(
    flow: PassengerFlow,
    platformQueue: QueueMetrics,
    entryQueue: QueueMetrics
  ): number {
    let confidence = 0.8

    if (flow.congestionLevel === 'critical') confidence -= 0.1
    if (flow.congestionLevel === 'high') confidence -= 0.05

    if (platformQueue.serverUtilization > 0.9) confidence -= 0.1
    if (entryQueue.serverUtilization > 0.9) confidence -= 0.05

    if (platformQueue.averageWaitingTime > 300) confidence -= 0.1

    return Math.max(0.3, Math.min(0.95, confidence))
  }

  async analyzeSystemPerformance(stations: Station[], flows: Map<string, PassengerFlow>) {
    const results = new Map<string, {
      station: Station
      flow: PassengerFlow
      queueMetrics: QueueMetrics
      bottleneck: boolean
    }>()

    for (const station of stations) {
      const flow = flows.get(station.id)
      if (!flow) continue

      const platformServers = station.platformCount
      const queueMetrics = await this.calculateMMcQueue({
        arrivalRate: flow.entryRate + flow.transferRate,
        serviceRate: 0.3,
        serverCount: platformServers,
        queueCapacity: station.maxCapacity
      })

      const bottleneck = queueMetrics.serverUtilization > 0.85 || 
        queueMetrics.averageWaitingTime > 180

      results.set(station.id, {
        station,
        flow,
        queueMetrics,
        bottleneck
      })
    }

    return results
  }
}

export default QueueingTheoryEngine
