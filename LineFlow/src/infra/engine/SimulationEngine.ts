import { ProductionLine } from '@domain/entities/ProductionLine'
import { Workstation } from '@domain/entities/Workstation'
import { Product } from '@domain/entities/Product'
import { queueingEngine } from './QueueingTheoryEngine'

type SimulationEventType = 'ARRIVAL' | 'COMPLETION' | 'BREAKDOWN' | 'REPAIR'

interface SimulationEvent {
  type: SimulationEventType
  time: number
  stationIndex: number
  productId?: string
}

type SimulationCallback = (line: ProductionLine) => void
type AlertCallback = (alert: SimulationAlert) => void

export interface SimulationAlert {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'critical'
  stationId?: string
  message: string
  type: string
  acknowledged: boolean
}

export class SimulationEngine {
  private line: ProductionLine
  private eventQueue: SimulationEvent[] = []
  private currentTime: number = 0
  private isRunning: boolean = false
  private isPaused: boolean = false
  private speed: number = 1
  private productCounter: number = 0
  private onUpdate?: SimulationCallback
  private onAlert?: AlertCallback
  private animationFrameId?: number
  private lastTickTime: number = 0

  constructor(line: ProductionLine) {
    this.line = line
  }

  setUpdateCallback(callback: SimulationCallback): void {
    this.onUpdate = callback
  }

  setAlertCallback(callback: AlertCallback): void {
    this.onAlert = callback
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed))
  }

  getSpeed(): number {
    return this.speed
  }

  start(): void {
    console.log('【SimulationEngine】start 被调用, 当前状态 isRunning:', this.isRunning, 'isPaused:', this.isPaused)
    if (this.isRunning && !this.isPaused) {
      console.log('【SimulationEngine】已经在运行中，跳过')
      return
    }
    
    this.isRunning = true
    this.isPaused = false
    this.lastTickTime = performance.now()
    this.scheduleNextArrival()
    console.log('【SimulationEngine】调度第一个产品到达，事件队列长度:', this.eventQueue.length)
    this.runLoop()
    console.log('【SimulationEngine】runLoop 已启动')
  }

  pause(): void {
    this.isPaused = true
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false
    this.lastTickTime = performance.now()
    this.runLoop()
  }

  stop(): void {
    this.isRunning = false
    this.isPaused = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.eventQueue = []
  }

  reset(): void {
    this.stop()
    this.currentTime = 0
    this.productCounter = 0
    this.eventQueue = []
  }

  private runLoop(): void {
    if (!this.isRunning || this.isPaused) return

    const now = performance.now()
    const deltaTime = (now - this.lastTickTime) * this.speed
    this.lastTickTime = now

    this.currentTime += deltaTime / 16
    this.processEvents()

    if (this.onUpdate) {
      this.onUpdate(this.line)
    }

    this.animationFrameId = requestAnimationFrame(() => this.runLoop())
  }

  private processEvents(): void {
    const eventsToProcess = this.eventQueue.filter(e => e.time <= this.currentTime)
    this.eventQueue = this.eventQueue.filter(e => e.time > this.currentTime)

    eventsToProcess.sort((a, b) => a.time - b.time)
    
    for (const event of eventsToProcess) {
      this.processEvent(event)
    }
  }

  private processEvent(event: SimulationEvent): void {
    switch (event.type) {
      case 'ARRIVAL':
        this.handleArrival(event.stationIndex)
        break
      case 'COMPLETION':
        this.handleCompletion(event.stationIndex)
        break
      case 'BREAKDOWN':
        this.handleBreakdown(event.stationIndex)
        break
      case 'REPAIR':
        this.handleRepair(event.stationIndex)
        break
    }
  }

  private handleArrival(stationIndex: number): void {
    const station = this.line.workstations[stationIndex]
    if (!station) return

    if (station.isFault) {
      station.enqueueProduct()
      return
    }

    if (station.isIdle) {
      station.startProcessing()
      const processTime = this.calculateProcessTime(station)
      this.scheduleCompletion(stationIndex, processTime)
      station.recordCycleTime(processTime)
    } else {
      const enqueued = station.enqueueProduct()
      if (!enqueued) {
        station.block()
        this.triggerAlert(
          'warning',
          station.id,
          `工位 ${station.name} 队列溢出，请检查下游瓶颈`
        )
      }
    }

    if (stationIndex === 0) {
      const product = this.createProduct()
      this.line.addProduct(product)
      this.scheduleNextArrival()
    }

    this.updateMetrics()
  }

  private handleCompletion(stationIndex: number): void {
    const station = this.line.workstations[stationIndex]
    if (!station) return

    if (station.queueLength > 0) {
      station.dequeueProduct()
      const processTime = this.calculateProcessTime(station)
      this.scheduleCompletion(stationIndex, processTime)
      station.recordCycleTime(processTime)
      station.startProcessing()
    } else {
      station.completeProcessing()
    }

    if (stationIndex < this.line.workstations.length - 1) {
      const nextStation = this.line.workstations[stationIndex + 1]
      if (nextStation) {
        if (nextStation.isIdle) {
          nextStation.startProcessing()
          const processTime = this.calculateProcessTime(nextStation)
          this.scheduleCompletion(stationIndex + 1, processTime)
        } else {
          nextStation.enqueueProduct()
        }
      }
    }

    if (Math.random() < 0.002) {
      this.scheduleBreakdown(stationIndex)
    }

    this.updateMetrics()
  }

  private handleBreakdown(stationIndex: number): void {
    const station = this.line.workstations[stationIndex]
    if (!station) return

    station.triggerFault()
    this.triggerAlert(
      'critical',
      station.id,
      `工位 ${station.name} 发生故障！请立即处理`
    )

    const repairTime = station.cycleTime * (2 + Math.random() * 3)
    this.scheduleRepair(stationIndex, repairTime)

    this.updateMetrics()
  }

  private handleRepair(stationIndex: number): void {
    const station = this.line.workstations[stationIndex]
    if (!station) return

    station.repair()
    this.triggerAlert(
      'info',
      station.id,
      `工位 ${station.name} 已恢复正常运行`
    )

    if (station.isRunning && station.queueLength > 0) {
      station.dequeueProduct()
      const processTime = this.calculateProcessTime(station)
      this.scheduleCompletion(stationIndex, processTime)
    }

    this.updateMetrics()
  }

  private scheduleNextArrival(): void {
    const interArrivalTime = this.line.targetTaktTime
    const arrivalTime = this.currentTime + interArrivalTime
    this.eventQueue.push({
      type: 'ARRIVAL',
      time: arrivalTime,
      stationIndex: 0
    })
  }

  private scheduleCompletion(stationIndex: number, processTime: number): void {
    this.eventQueue.push({
      type: 'COMPLETION',
      time: this.currentTime + processTime,
      stationIndex
    })
  }

  private scheduleBreakdown(stationIndex: number): void {
    this.eventQueue.push({
      type: 'BREAKDOWN',
      time: this.currentTime,
      stationIndex
    })
  }

  private scheduleRepair(stationIndex: number, repairTime: number): void {
    this.eventQueue.push({
      type: 'REPAIR',
      time: this.currentTime + repairTime,
      stationIndex
    })
  }

  private calculateProcessTime(station: Workstation): number {
    const baseTime = station.cycleTime
    const variation = (Math.random() - 0.5) * 0.2 * baseTime
    return Math.max(baseTime * 0.5, baseTime + variation)
  }

  private createProduct(): Product {
    return new Product({
      id: `P-${Date.now()}-${this.productCounter++}`,
      serialNumber: `SN-${String(this.productCounter).padStart(6, '0')}`
    })
  }

  private updateMetrics(): void {
    queueingEngine.setStations(this.line.workstations)
    queueingEngine.updateAndApplyMetrics()

    const bottleneckId = queueingEngine.identifyBottleneck()
    if (bottleneckId) {
      this.line.updateBottleneck(bottleneckId)
    }

    const lineMetrics = queueingEngine.calculateLineMetrics()
    this.line.updateThroughput(lineMetrics.throughput)
    this.line.updateEfficiency(lineMetrics.performance)
    this.line.updateActualTaktTime(lineMetrics.avgCycleTime)
  }

  triggerStationBreakdown(stationIndex: number): void {
    this.scheduleBreakdown(stationIndex)
  }

  getCurrentState(): ProductionLine {
    return this.line.clone()
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getIsRunning(): boolean {
    return this.isRunning
  }

  getIsPaused(): boolean {
    return this.isPaused
  }

  getEventQueueLength(): number {
    return this.eventQueue.length
  }

  private triggerAlert(level: 'info' | 'warning' | 'critical', stationId: string, message: string): void {
    const alert: SimulationAlert = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      stationId,
      message,
      type: level === 'critical' ? 'breakdown' : level === 'warning' ? 'warning' : 'info',
      acknowledged: false
    }
    if (this.onAlert) {
      this.onAlert(alert)
    }
  }
}
