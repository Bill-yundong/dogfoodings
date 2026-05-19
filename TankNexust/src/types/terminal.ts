export type TerminalType = 'enterprise' | 'residential' | 'school' | 'hospital' | 'fire-station' | 'police-station'

export type AlertLevel = 'normal' | 'alert' | 'evacuate' | 'shelter'

export type EvacuationStatus = 'idle' | 'preparing' | 'evacuating' | 'completed' | 'sheltering'

export interface RoutePoint {
  x: number
  y: number
  type: 'start' | 'waypoint' | 'shelter' | 'danger' | 'checkpoint'
  name?: string
}

export interface EmergencyTerminal {
  id: string
  name: string
  type: TerminalType
  position: {
    x: number
    y: number
  }
  population: number
  alertLevel: AlertLevel
  evacuationStatus: EvacuationStatus
  receivedTime?: number
  completedTime?: number
  evacuationRoute?: RoutePoint[]
  shelterId?: string
  contactPerson?: string
  contactPhone?: string
  notes?: string
}

export interface Shelter {
  id: string
  name: string
  position: {
    x: number
    y: number
  }
  capacity: number
  currentOccupancy: number
  type: 'permanent' | 'temporary'
  facilities: string[]
  status: 'available' | 'full' | 'closed'
}

export interface ResourceUnit {
  id: string
  name: string
  type: 'fire-truck' | 'ambulance' | 'hazardous-material' | 'police' | 'rescue-team'
  position: {
    x: number
    y: number
  }
  status: 'standby' | 'deployed' | 'returning' | 'maintenance'
  personnel: number
  equipment: string[]
  currentTaskId?: string
}

export interface EvacuationTask {
  id: string
  terminalId: string
  terminalName: string
  startTime: number
  estimatedCompletionTime?: number
  actualCompletionTime?: number
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  populationCount: number
  shelterId: string
  assignedResources: string[]
  progress: number
}
