import type { PassengerFlow, Station, CapacityPrediction, FlowSnapshot, SecurityAction, DispatchAction } from '@/types'
import { QueueingTheoryEngine } from './queueing-theory-engine'
import { mockStations, generatePassengerFlow, updatePassengerFlow } from './mock-data'

interface SyncMessage {
  type: 'flow_update' | 'prediction_update' | 'security_action' | 'dispatch_action' | 'snapshot'
  timestamp: number
  payload: any
}

class DataSyncService {
  private flowData: Map<string, PassengerFlow> = new Map()
  private predictions: Map<string, CapacityPrediction[]> = new Map()
  private securityActions: Map<string, SecurityAction[]> = new Map()
  private dispatchActions: Map<string, DispatchAction[]> = new Map()
  private queueEngine: QueueingTheoryEngine
  private updateInterval: NodeJS.Timeout | null = null
  private listeners: Set<(message: SyncMessage) => void> = new Set()
  private stations: Station[]

  constructor() {
    this.queueEngine = new QueueingTheoryEngine()
    this.stations = [...mockStations]
    this.initializeFlowData()
  }

  private initializeFlowData(): void {
    for (const station of this.stations) {
      const baseDensity = 0.3 + Math.random() * 0.4
      const flow = generatePassengerFlow(station, baseDensity)
      this.flowData.set(station.id, flow)
      this.securityActions.set(station.id, [])
      this.dispatchActions.set(station.id, [])
    }
  }

  subscribe(listener: (message: SyncMessage) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(message: SyncMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }

  startUpdates(intervalMs: number = 3000): void {
    if (this.updateInterval) return

    this.updateInterval = setInterval(() => {
      this.updateAllStations()
    }, intervalMs)
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private async updateAllStations(): Promise<void> {
    for (const station of this.stations) {
      const prevFlow = this.flowData.get(station.id)
      if (!prevFlow) continue

      const newFlow = updatePassengerFlow(prevFlow, station, 3)
      this.flowData.set(station.id, newFlow)

      const predictions = await this.queueEngine.predictCapacity(newFlow, station)
      this.predictions.set(station.id, predictions)

      this.notifyListeners({
        type: 'flow_update',
        timestamp: Date.now(),
        payload: { flow: newFlow, predictions }
      })

      await this.checkAndGenerateActions(station, newFlow, predictions)
    }
  }

  private async checkAndGenerateActions(
    station: Station,
    flow: PassengerFlow,
    predictions: CapacityPrediction[]
  ): Promise<void> {
    if (flow.congestionLevel === 'high' || flow.congestionLevel === 'critical') {
      const criticalPrediction = predictions.find(p => p.capacityGap > 0)
      
      if (criticalPrediction) {
        const securityAction: SecurityAction = {
          id: `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          stationId: station.id,
          timestamp: Date.now(),
          actionType: flow.congestionLevel === 'critical' ? 'emergency_response' : 'platform_management',
          status: 'pending',
          priority: flow.congestionLevel,
          description: flow.congestionLevel === 'critical' 
            ? `紧急响应：${station.name}客流激增，预计${criticalPrediction.forecastWindow}分钟后运力缺口${Math.floor(criticalPrediction.capacityGap)}人`
            : `站台管理：${station.name}客流压力增大，请加强疏导`
        }

        this.securityActions.get(station.id)?.push(securityAction)
        this.notifyListeners({
          type: 'security_action',
          timestamp: Date.now(),
          payload: securityAction
        })

        if (criticalPrediction.recommendedTrains > 0) {
          const dispatchAction: DispatchAction = {
            id: `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            lineId: station.lineId,
            stationId: station.id,
            timestamp: Date.now(),
            actionType: 'train_addition',
            status: 'pending',
            priority: flow.congestionLevel,
            description: `调度建议：${station.name}需要增加${criticalPrediction.recommendedTrains}列列车，预计缺口${Math.floor(criticalPrediction.capacityGap)}人`
          }

          this.dispatchActions.get(station.id)?.push(dispatchAction)
          this.notifyListeners({
            type: 'dispatch_action',
            timestamp: Date.now(),
            payload: dispatchAction
          })
        }
      }
    }
  }

  createSnapshot(stationId: string): FlowSnapshot | null {
    const flow = this.flowData.get(stationId)
    const predictions = this.predictions.get(stationId)
    const securityActions = this.securityActions.get(stationId) || []
    const dispatchActions = this.dispatchActions.get(stationId) || []

    if (!flow) return null

    const snapshot: FlowSnapshot = {
      id: `SNAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stationId,
      timestamp: Date.now(),
      flowData: flow,
      predictions: predictions || [],
      securityActions: securityActions.slice(-10),
      dispatchActions: dispatchActions.slice(-10)
    }

    this.notifyListeners({
      type: 'snapshot',
      timestamp: Date.now(),
      payload: snapshot
    })

    return snapshot
  }

  getAllFlowData(): Map<string, PassengerFlow> {
    return new Map(this.flowData)
  }

  getFlowData(stationId: string): PassengerFlow | undefined {
    return this.flowData.get(stationId)
  }

  getPredictions(stationId: string): CapacityPrediction[] | undefined {
    return this.predictions.get(stationId)
  }

  getStations(): Station[] {
    return [...this.stations]
  }

  getStation(stationId: string): Station | undefined {
    return this.stations.find(s => s.id === stationId)
  }

  getSecurityActions(stationId: string): SecurityAction[] {
    return [...(this.securityActions.get(stationId) || [])]
  }

  getDispatchActions(stationId: string): DispatchAction[] {
    return [...(this.dispatchActions.get(stationId) || [])]
  }

  updateSecurityAction(actionId: string, status: SecurityAction['status']): boolean {
    const actionsList = Array.from(this.securityActions.values())
    for (const actions of actionsList) {
      const action = actions.find((a: SecurityAction) => a.id === actionId)
      if (action) {
        action.status = status
        return true
      }
    }
    return false
  }

  updateDispatchAction(actionId: string, status: DispatchAction['status']): boolean {
    const actionsList = Array.from(this.dispatchActions.values())
    for (const actions of actionsList) {
      const action = actions.find((a: DispatchAction) => a.id === actionId)
      if (action) {
        action.status = status
        return true
      }
    }
    return false
  }
}

const globalService = new DataSyncService()

export function getDataSyncService(): DataSyncService {
  return globalService
}

export default DataSyncService
