export class QueueMetrics {
  constructor(
    public readonly arrivalRate: number,
    public readonly serviceRate: number,
    public readonly utilization: number,
    public readonly avgQueueLength: number,
    public readonly avgWaitingTime: number,
    public readonly probabilityOfWaiting: number
  ) {}

  static createEmpty(): QueueMetrics {
    return new QueueMetrics(0, 0, 0, 0, 0, 0)
  }

  get utilizationPercent(): number {
    return Math.round(this.utilization * 1000) / 10
  }

  get severity(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.utilization >= 0.95) return 'critical'
    if (this.utilization >= 0.85) return 'high'
    if (this.utilization >= 0.75) return 'medium'
    return 'low'
  }

  get isBottleneck(): boolean {
    return this.utilization >= 0.85
  }

  clone(): QueueMetrics {
    return new QueueMetrics(
      this.arrivalRate,
      this.serviceRate,
      this.utilization,
      this.avgQueueLength,
      this.avgWaitingTime,
      this.probabilityOfWaiting
    )
  }
}
