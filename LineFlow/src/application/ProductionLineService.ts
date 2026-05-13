import { ProductionLine, ProductionLineSnapshot } from '../domain/entities/ProductionLine'
import { Workstation } from '../domain/entities/Workstation'
import { SimulationEngine, SimulationAlert } from '../infra/engine/SimulationEngine'
import { queueingEngine } from '../infra/engine/QueueingTheoryEngine'
import { indexedDBStore } from '../infra/storage/IndexedDBStore'

export class ProductionLineService {
  private productionLine: ProductionLine | null = null
  private simulationEngine: SimulationEngine | null = null
  private snapshotInterval: number | null = null
  private alertListeners: Set<(alert: SimulationAlert) => void> = new Set()
  private updateListeners: Set<(line: ProductionLine) => void> = new Set()
  private isInitialized: boolean = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    await indexedDBStore.init()
    
    this.productionLine = this.createDefaultProductionLine()
    this.simulationEngine = new SimulationEngine(this.productionLine)
    
    this.simulationEngine.setUpdateCallback((line) => {
      this.productionLine = line
      this.notifyUpdateListeners()
    })

    this.simulationEngine.setAlertCallback((alert) => {
      this.handleAlert(alert)
    })

    this.isInitialized = true
  }

  private createDefaultProductionLine(): ProductionLine {
    const workstations = [
      new Workstation({ id: 'WS-001', name: '上料工位', index: 0, cycleTime: 45, capacity: 15 }),
      new Workstation({ id: 'WS-002', name: '装配工位 A', index: 1, cycleTime: 55, capacity: 12 }),
      new Workstation({ id: 'WS-003', name: '装配工位 B', index: 2, cycleTime: 50, capacity: 12 }),
      new Workstation({ id: 'WS-004', name: '焊接工位', index: 3, cycleTime: 60, capacity: 10 }),
      new Workstation({ id: 'WS-005', name: '检测工位', index: 4, cycleTime: 40, capacity: 8 }),
      new Workstation({ id: 'WS-006', name: '包装工位', index: 5, cycleTime: 35, capacity: 6 })
    ]

    return new ProductionLine({
      id: 'LINE-001',
      name: '总装生产线 A',
      targetTaktTime: 60,
      workstations
    })
  }

  startSimulation(): void {
    if (!this.simulationEngine) return
    
    this.simulationEngine.start()
    this.startSnapshotCapture()
  }

  pauseSimulation(): void {
    if (!this.simulationEngine) return
    this.simulationEngine.pause()
  }

  resumeSimulation(): void {
    if (!this.simulationEngine) return
    this.simulationEngine.resume()
  }

  stopSimulation(): void {
    if (!this.simulationEngine) return
    this.simulationEngine.stop()
    this.stopSnapshotCapture()
  }

  setSimulationSpeed(speed: number): void {
    if (!this.simulationEngine) return
    this.simulationEngine.setSpeed(speed)
  }

  getSimulationSpeed(): number {
    return this.simulationEngine?.getSpeed() || 1
  }

  isSimulationRunning(): boolean {
    return this.simulationEngine?.getIsRunning() || false
  }

  isSimulationPaused(): boolean {
    return this.simulationEngine?.getIsPaused() || false
  }

  triggerStationBreakdown(stationIndex: number): void {
    if (!this.simulationEngine) return
    this.simulationEngine.triggerStationBreakdown(stationIndex)
  }

  getProductionLine(): ProductionLine | null {
    return this.productionLine
  }

  getProductionLineSnapshot(): ProductionLineSnapshot | null {
    return this.productionLine?.toSnapshot() || null
  }

  getOptimizationSuggestions(stationId: string): string[] {
    return queueingEngine.getOptimizationSuggestions(stationId)
  }

  getBottleneckSeverity(stationId: string): string {
    return queueingEngine.getBottleneckSeverity(stationId)
  }

  async getHistoricalSnapshots(hours: number = 1): Promise<ProductionLineSnapshot[]> {
    if (!this.productionLine) return []

    const end = new Date()
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
    
    const snapshots = await indexedDBStore.getSnapshotsInTimeRange(
      this.productionLine.id,
      start,
      end
    )

    return snapshots.map(s => s.snapshot)
  }

  async getLatestSnapshots(limit: number = 50): Promise<ProductionLineSnapshot[]> {
    if (!this.productionLine) return []

    const snapshots = await indexedDBStore.getSnapshotsByLine(this.productionLine.id, limit)
    return snapshots.map(s => s.snapshot)
  }

  async getSnapshotCount(): Promise<number> {
    return indexedDBStore.getSnapshotCount()
  }

  private startSnapshotCapture(): void {
    if (this.snapshotInterval) return

    this.snapshotInterval = window.setInterval(async () => {
      if (!this.productionLine) return

      const snapshot = this.productionLine.toSnapshot()
      await indexedDBStore.saveSnapshot(this.productionLine.id, snapshot)
    }, 2000)
  }

  private stopSnapshotCapture(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval)
      this.snapshotInterval = null
    }
  }

  private async handleAlert(alert: SimulationAlert): Promise<void> {
    await indexedDBStore.saveAlert(alert)
    this.alertListeners.forEach(listener => listener(alert))
  }

  async getAlerts(limit: number = 100): Promise<Array<{
    id: string
    timestamp: Date
    level: string
    stationId?: string
    message: string
    type: string
    acknowledged: boolean
  }>> {
    return indexedDBStore.getAlerts(limit)
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await indexedDBStore.acknowledgeAlert(alertId)
  }

  addUpdateListener(listener: (line: ProductionLine) => void): void {
    this.updateListeners.add(listener)
  }

  removeUpdateListener(listener: (line: ProductionLine) => void): void {
    this.updateListeners.delete(listener)
  }

  private notifyUpdateListeners(): void {
    if (!this.productionLine) return
    this.updateListeners.forEach(listener => listener(this.productionLine!))
  }

  addAlertListener(listener: (alert: SimulationAlert) => void): void {
    this.alertListeners.add(listener)
  }

  removeAlertListener(listener: (alert: SimulationAlert) => void): void {
    this.alertListeners.delete(listener)
  }

  async exportData(): Promise<{
    snapshots: unknown[]
    alerts: unknown[]
  }> {
    return indexedDBStore.exportAll()
  }

  async clearAllData(): Promise<void> {
    await indexedDBStore.clearAll()
  }

  dispose(): void {
    this.stopSnapshotCapture()
    this.stopSimulation()
    this.updateListeners.clear()
    this.alertListeners.clear()
    indexedDBStore.close()
    this.isInitialized = false
  }
}

export const productionLineService = new ProductionLineService()
