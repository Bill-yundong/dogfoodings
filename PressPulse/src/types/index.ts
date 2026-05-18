export interface LoadDataPoint {
  timestamp: number
  load: number
  sensorId: string
}

export interface RainflowCycle {
  range: number
  mean: number
  count: number
  startIndex: number
  endIndex: number
}

export interface StressAccumulation {
  totalCycles: number
  damageAccumulated: number
  maxStress: number
  minStress: number
  cycleHistory: RainflowCycle[]
}

export interface DieHealthRecord {
  id: string
  name: string
  model: string
  installDate: number
  lastMaintenanceDate: number
  currentHealth: number
  predictedRemainingLife: number
  failureProbability: number
  stressAccumulation: StressAccumulation
  sensorIds: string[]
  maintenanceHistory: MaintenanceRecord[]
  createdAt: number
  updatedAt: number
}

export interface MaintenanceRecord {
  id: string
  type: 'repair' | 'replacement' | 'inspection'
  date: number
  description: string
  technician: string
  cost: number
}

export interface SyncStatus {
  lastSyncTime: number
  pendingChanges: number
  syncState: 'idle' | 'syncing' | 'error'
}

export interface FatiguePrediction {
  dieId: string
  predictedFailureDate: number
  confidenceLevel: number
  criticalStressPoints: CriticalPoint[]
  recommendedMaintenanceDate: number
}

export interface CriticalPoint {
  location: string
  stressLevel: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface SemanticSyncMessage {
  type: 'stress_update' | 'maintenance_event' | 'health_alert'
  payload: any
  timestamp: number
  version: string
}
