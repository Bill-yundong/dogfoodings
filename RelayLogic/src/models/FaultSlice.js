export class FaultSlice {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.timestamp = data.timestamp || Date.now()
    this.deviceId = data.deviceId || ''
    this.deviceName = data.deviceName || ''
    this.faultType = data.faultType || 'unknown'
    this.faultPhase = data.faultPhase || 'none'
    this.tripTime = data.tripTime || 0
    this.clearTime = data.clearTime || 0
    this.voltage = data.voltage || []
    this.current = data.current || []
    this.status = data.status || 'detected'
    this.severity = data.severity || 'medium'
    this.location = data.location || { bay: '', feeder: '' }
    this.protectionSignals = data.protectionSignals || []
    this.breakerStatus = data.breakerStatus || {}
    this.metadata = data.metadata || {}
  }

  generateId() {
    return `FLT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      faultType: this.faultType,
      faultPhase: this.faultPhase,
      tripTime: this.tripTime,
      clearTime: this.clearTime,
      voltage: this.voltage,
      current: this.current,
      status: this.status,
      severity: this.severity,
      location: this.location,
      protectionSignals: this.protectionSignals,
      breakerStatus: this.breakerStatus,
      metadata: this.metadata
    }
  }

  static fromJSON(json) {
    return new FaultSlice(json)
  }

  getDuration() {
    return this.clearTime - this.tripTime
  }

  isCleared() {
    return this.status === 'cleared'
  }
}

export const FaultType = {
  PHASE_A_GROUND: 'phase_a_ground',
  PHASE_B_GROUND: 'phase_b_ground',
  PHASE_C_GROUND: 'phase_c_ground',
  PHASE_AB_SHORT: 'phase_ab_short',
  PHASE_BC_SHORT: 'phase_bc_short',
  PHASE_CA_SHORT: 'phase_ca_short',
  THREE_PHASE_SHORT: 'three_phase_short',
  TRANSFORMER_INRUSH: 'transformer_inrush',
  OVERLOAD: 'overload',
  OVERVOLTAGE: 'overvoltage',
  UNDERVOLTAGE: 'undervoltage',
  UNKNOWN: 'unknown'
}

export const FaultPhase = {
  A: 'A',
  B: 'B',
  C: 'C',
  AB: 'AB',
  BC: 'BC',
  CA: 'CA',
  ABC: 'ABC',
  NONE: 'none'
}

export const FaultStatus = {
  DETECTED: 'detected',
  TRIPPED: 'tripped',
  CLEARED: 'cleared',
  ARCHIVED: 'archived'
}

export const FaultSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}
