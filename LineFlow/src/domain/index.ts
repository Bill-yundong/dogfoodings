// Entities
export * from './entities/Workstation'
export * from './entities/Product'
export * from './entities/ProductionLine'

// Value Objects
export * from './value-objects/WorkstationStatus'
export * from './value-objects/QueueMetrics'

// Interfaces
export interface IWorkstation {
  id: string
  name: string
  index: number
  status: any
  cycleTime: number
  actualCycleTime: number
  queueLength: number
  capacity: number
  queueMetrics: any
  currentProductId?: string
  lastUpdate: Date
  operator?: string
  utilization: number
  utilizationPercent: number
  isRunning: boolean
  isIdle: boolean
  isFault: boolean
  isBlocked: boolean
  isBottleneck: boolean
  bottleneckSeverity?: string
}
