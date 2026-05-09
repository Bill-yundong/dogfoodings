export interface Station {
  id: string
  name: string
  lineId: string
  maxCapacity: number
  platformCount: number
  entranceCount: number
  exitCount: number
}

export interface PassengerFlow {
  stationId: string
  timestamp: number
  currentCount: number
  entryRate: number
  exitRate: number
  transferRate: number
  platformDensity: number
  congestionLevel: CongestionLevel
}

export type CongestionLevel = 'low' | 'medium' | 'high' | 'critical'

export interface CapacityPrediction {
  stationId: string
  timestamp: number
  forecastWindow: number
  predictedPassengers: number
  capacityUtilization: number
  capacityGap: number
  recommendedTrains: number
  confidence: number
}

export interface FlowSnapshot {
  id: string
  stationId: string
  timestamp: number
  flowData: PassengerFlow
  predictions: CapacityPrediction[]
  securityActions: SecurityAction[]
  dispatchActions: DispatchAction[]
}

export interface SecurityAction {
  id: string
  stationId: string
  timestamp: number
  actionType: 'entrance_control' | 'platform_management' | 'emergency_response' | 'staff_deployment'
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

export interface DispatchAction {
  id: string
  lineId: string
  stationId: string
  timestamp: number
  actionType: 'train_addition' | 'route_adjustment' | 'speed_adjustment' | 'platform_assignment'
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  trainId?: string
}

export interface QueueParameters {
  arrivalRate: number
  serviceRate: number
  serverCount: number
  queueCapacity: number
}

export interface QueueMetrics {
  averageQueueLength: number
  averageWaitingTime: number
  probabilityOfWaiting: number
  serverUtilization: number
  systemCapacity: number
}
