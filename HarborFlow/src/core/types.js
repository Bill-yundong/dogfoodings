export const InstructionType = {
  LOAD: 'LOAD',
  UNLOAD: 'UNLOAD',
  TRANSFER: 'TRANSFER',
  PARK: 'PARK'
}

export const InstructionStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  ASSIGNED: 'ASSIGNED',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
}

export const DeviceStatus = {
  IDLE: 'IDLE',
  MOVING: 'MOVING',
  LOADING: 'LOADING',
  UNLOADING: 'UNLOADING',
  CHARGING: 'CHARGING',
  MAINTENANCE: 'MAINTENANCE',
  ERROR: 'ERROR'
}

export const DeviceType = {
  AGV: 'AGV',
  RTG: 'RTG',
  STS: 'STS'
}
