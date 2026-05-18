export const OHTStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  UNLOADING: 'unloading',
  MOVING: 'moving',
  PARKED: 'parked',
  ERROR: 'error',
  MAINTENANCE: 'maintenance'
})

export const TaskStatus = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
})

export const WaferStatus = Object.freeze({
  IN_PROCESS: 'in_process',
  IN_TRANSIT: 'in_transit',
  WAITING: 'waiting',
  COMPLETED: 'completed'
})

export const NodeType = Object.freeze({
  LOAD_PORT: 'load_port',
  STORAGE: 'storage',
  INTERSECTION: 'intersection',
  PARKING: 'parking',
  BRANCH: 'branch'
})

export const PathType = Object.freeze({
  NORMAL: 'normal',
  BYPASS: 'bypass',
  MAINTENANCE: 'maintenance',
  PRIORITY: 'priority'
})

export const SyncStatus = Object.freeze({
  SYNCED: 'synced',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  CONFLICT: 'conflict'
})
