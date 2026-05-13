import { Workstation } from './Workstation'
import { Product } from './Product'
import { QueueMetrics } from '../value-objects/QueueMetrics'

export class ProductionLine {
  public id: string
  public name: string
  public workstations: Workstation[]
  public products: Product[]
  public targetTaktTime: number
  public actualTaktTime: number
  public throughput: number
  public efficiency: number
  public bottleneckStationId?: string
  public createdAt: Date
  public updatedAt: Date

  constructor(props: {
    id: string
    name: string
    targetTaktTime: number
    workstations: Workstation[]
  }) {
    this.id = props.id
    this.name = props.name
    this.targetTaktTime = props.targetTaktTime
    this.actualTaktTime = props.targetTaktTime
    this.workstations = props.workstations
    this.products = []
    this.throughput = 0
    this.efficiency = 1
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  get wipCount(): number {
    return this.products.filter(p => p.isInProgress()).length
  }

  get completedCount(): number {
    return this.products.filter(p => p.isCompleted()).length
  }

  get runningStationsCount(): number {
    return this.workstations.filter(w => w.isRunning).length
  }

  get bottleneckStation(): Workstation | undefined {
    return this.workstations.find(w => w.id === this.bottleneckStationId)
  }

  addProduct(product: Product): void {
    this.products.push(product)
    this.updatedAt = new Date()
  }

  getProductById(productId: string): Product | undefined {
    return this.products.find(p => p.id === productId)
  }

  getProductsInProcessing(): Product[] {
    return this.products.filter(p => p.isInProgress())
  }

  getWorkstationById(stationId: string): Workstation | undefined {
    return this.workstations.find(w => w.id === stationId)
  }

  updateBottleneck(stationId: string): void {
    this.bottleneckStationId = stationId
    this.updatedAt = new Date()
  }

  updateThroughput(throughput: number): void {
    this.throughput = throughput
    this.updatedAt = new Date()
  }

  updateEfficiency(efficiency: number): void {
    this.efficiency = efficiency
    this.updatedAt = new Date()
  }

  updateActualTaktTime(taktTime: number): void {
    this.actualTaktTime = taktTime
    this.updatedAt = new Date()
  }

  getOEE(): number {
    const availability = this.getAvailability()
    const performance = this.getPerformance()
    const quality = this.getQuality()
    return availability * performance * quality
  }

  getAvailability(): number {
    if (this.workstations.length === 0) return 0
    return this.runningStationsCount / this.workstations.length
  }

  getPerformance(): number {
    const totalTarget = this.workstations.reduce((sum, w) => sum + w.cycleTime, 0)
    const totalActual = this.workstations.reduce((sum, w) => sum + w.actualCycleTime, 0)
    return totalActual > 0 ? totalTarget / totalActual : 1
  }

  getQuality(): number {
    return 0.985
  }

  getAvgQueueLength(): number {
    const totalQueue = this.workstations.reduce((sum, w) => sum + w.queueLength, 0)
    return this.workstations.length > 0 ? totalQueue / this.workstations.length : 0
  }

  clone(): ProductionLine {
    const line = new ProductionLine({
      id: this.id,
      name: this.name,
      targetTaktTime: this.targetTaktTime,
      workstations: this.workstations.map(w => w.clone())
    })
    line.products = this.products.map(p => p.clone())
    line.actualTaktTime = this.actualTaktTime
    line.throughput = this.throughput
    line.efficiency = this.efficiency
    line.bottleneckStationId = this.bottleneckStationId
    line.createdAt = new Date(this.createdAt.getTime())
    line.updatedAt = new Date(this.updatedAt.getTime())
    return line
  }

  toSnapshot(): ProductionLineSnapshot {
    return {
      id: this.id,
      name: this.name,
      targetTaktTime: this.targetTaktTime,
      actualTaktTime: this.actualTaktTime,
      throughput: this.throughput,
      efficiency: this.efficiency,
      wipCount: this.wipCount,
      completedCount: this.completedCount,
      bottleneckStationId: this.bottleneckStationId,
      oee: this.getOEE(),
      availability: this.getAvailability(),
      performance: this.getPerformance(),
      quality: this.getQuality(),
      workstations: this.workstations.map(w => ({
        id: w.id,
        name: w.name,
        index: w.index,
        status: w.status.value,
        cycleTime: w.cycleTime,
        actualCycleTime: w.actualCycleTime,
        queueLength: w.queueLength,
        utilization: w.utilization,
        isBottleneck: w.isBottleneck
      })),
      timestamp: new Date()
    }
  }
}

export interface ProductionLineSnapshot {
  id: string
  name: string
  targetTaktTime: number
  actualTaktTime: number
  throughput: number
  efficiency: number
  wipCount: number
  completedCount: number
  bottleneckStationId?: string
  oee: number
  availability: number
  performance: number
  quality: number
  workstations: Array<{
    id: string
    name: string
    index: number
    status: string
    cycleTime: number
    actualCycleTime: number
    queueLength: number
    utilization: number
    isBottleneck: boolean
  }>
  timestamp: Date
}
