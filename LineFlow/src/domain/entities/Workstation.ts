import { WorkstationStatus } from '../value-objects/WorkstationStatus'
import { QueueMetrics } from '../value-objects/QueueMetrics'

export class Workstation {
  public id: string
  public name: string
  public index: number
  public status: WorkstationStatus
  public cycleTime: number
  public actualCycleTime: number
  public queueLength: number
  public capacity: number
  public queueMetrics: QueueMetrics
  public currentProductId?: string
  public lastUpdate: Date
  public operator?: string
  private cycleTimeHistory: number[] = []

  constructor(props: {
    id: string
    name: string
    index: number
    cycleTime: number
    capacity?: number
    operator?: string
  }) {
    this.id = props.id
    this.name = props.name
    this.index = props.index
    this.cycleTime = props.cycleTime
    this.actualCycleTime = props.cycleTime
    this.queueLength = 0
    this.capacity = props.capacity || 10
    this.status = WorkstationStatus.IDLE
    this.queueMetrics = QueueMetrics.createEmpty()
    this.lastUpdate = new Date()
    this.operator = props.operator
  }

  recordCycleTime(time: number): void {
    this.cycleTimeHistory.push(time)
    if (this.cycleTimeHistory.length > 50) {
      this.cycleTimeHistory.shift()
    }
    this.actualCycleTime = this.calculateAvgCycleTime()
  }

  get utilization(): number {
    return this.queueMetrics.utilization
  }

  get utilizationPercent(): number {
    return Math.round(this.utilization * 1000) / 10
  }

  get isBottleneck(): boolean {
    return this.queueMetrics.isBottleneck
  }

  get bottleneckSeverity(): string {
    return this.queueMetrics.severity
  }

  get isIdle(): boolean {
    return this.status.isIdle()
  }

  get isRunning(): boolean {
    return this.status.isActive()
  }

  get isFault(): boolean {
    return this.status.isFault()
  }

  get isBlocked(): boolean {
    return this.status.equals(WorkstationStatus.BLOCKED)
  }

  startProcessing(): void {
    this.status = WorkstationStatus.RUNNING
    this.lastUpdate = new Date()
  }

  completeProcessing(): void {
    this.status = WorkstationStatus.IDLE
    this.lastUpdate = new Date()
  }

  block(): void {
    this.status = WorkstationStatus.BLOCKED
    this.lastUpdate = new Date()
  }

  starve(): void {
    this.status = WorkstationStatus.STARVED
    this.lastUpdate = new Date()
  }

  triggerFault(): void {
    this.status = WorkstationStatus.ERROR
    this.lastUpdate = new Date()
  }

  repair(): void {
    this.status = this.queueLength > 0 ? WorkstationStatus.RUNNING : WorkstationStatus.IDLE
    this.lastUpdate = new Date()
  }

  enqueueProduct(): boolean {
    if (this.queueLength < this.capacity) {
      this.queueLength++
      return true
    }
    return false
  }

  dequeueProduct(): boolean {
    if (this.queueLength > 0) {
      this.queueLength--
      return true
    }
    return false
  }

  getQueueUtilization(): number {
    return this.queueLength / this.capacity
  }

  clone(): Workstation {
    const ws = new Workstation({
      id: this.id,
      name: this.name,
      index: this.index,
      cycleTime: this.cycleTime,
      capacity: this.capacity,
      operator: this.operator
    })
    ws.status = this.status
    ws.actualCycleTime = this.actualCycleTime
    ws.queueLength = this.queueLength
    ws.queueMetrics = this.queueMetrics.clone()
    ws.currentProductId = this.currentProductId
    ws.lastUpdate = new Date(this.lastUpdate.getTime())
    ws.setCycleTimeHistory([...this.cycleTimeHistory])
    return ws
  }

  setCycleTimeHistory(history: number[]): void {
    this.cycleTimeHistory = history
  }

  getCycleTimeHistory(): number[] {
    return [...this.cycleTimeHistory]
  }

  calculateAvgCycleTime(): number {
    if (this.cycleTimeHistory.length === 0) return this.cycleTime
    const sum = this.cycleTimeHistory.reduce((a, b) => a + b, 0)
    return sum / this.cycleTimeHistory.length
  }
}
