export const SYSTEM_CONFIG = {
  ALGORITHM: {
    DIJKSTRA_CACHE_TTL: 5000,
    MAX_CACHE_SIZE: 1000,
    BATCH_SIZE: 10,
    COST_FACTORS: {
      LOAD: 2.0,
      PRIORITY: 1.5,
      INACTIVE: 1000
    }
  },
  ALIGNMENT: {
    THRESHOLD_MS: 50,
    MAX_RETRIES: 3,
    COMMAND_TIMEOUT: 1000,
    QUEUE_PROCESS_INTERVAL: 10
  },
  SNAPSHOT: {
    INTERVAL: 5000,
    MAX_SNAPSHOTS: 100,
    DB_NAME: 'sorting-nexus-db',
    DB_VERSION: 1
  },
  SIMULATION: {
    PACKAGE_GENERATION_INTERVAL: 800,
    PACKAGE_MOVE_INTERVAL: 500,
    METRICS_UPDATE_INTERVAL: 1000,
    MISALIGNMENT_RATE: 0.05
  },
  NODES: {
    CAPACITY: {
      ENTRY: 20,
      CROSS_BELT: 40,
      JUNCTION: 15,
      CHUTE: 50,
      EXIT: 100,
      RECOVERY: 30
    }
  }
} as const;

export const NODE_TYPES = {
  ENTRY: 'entry',
  CROSS_BELT: 'cross-belt',
  JUNCTION: 'junction',
  CHUTE: 'chute',
  EXIT: 'exit'
} as const;

export const PACKAGE_STATUS = {
  PENDING: 'pending',
  SORTING: 'sorting',
  SORTED: 'sorted',
  ERROR: 'error'
} as const;

export const COMMAND_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  EXECUTED: 'executed',
  FAILED: 'failed'
} as const;

export const COMMAND_ACTION = {
  ROUTE: 'route',
  HOLD: 'hold',
  REDIRECT: 'redirect',
  EJECT: 'eject'
} as const;

export const ERROR_TYPES = {
  MISALIGNMENT: 'MISALIGNMENT',
  NODE_FAILURE: 'NODE_FAILURE',
  PACKAGE_JAM: 'PACKAGE_JAM',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  SENSOR_ERROR: 'SENSOR_ERROR'
} as const;

export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const DESTINATIONS = ['北京', '上海', '广州', '深圳', '默认'] as const;
