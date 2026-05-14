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
    COMMAND_TIMEOUT: 1000
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

export const DESTINATIONS = ['北京', '上海', '广州', '深圳', '默认'] as const;

export const NODE_COLORS: Record<string, string> = {
  entry: '#48bb78',
  'cross-belt': '#667eea',
  junction: '#9f7aea',
  chute: '#ed8936',
  exit: '#f56565',
  inactive: '#a0aec0'
};

export const PACKAGE_COLORS: Record<string, string> = {
  pending: '#68d391',
  sorting: '#63b3ed',
  sorted: '#48bb78',
  error: '#fc8181'
};
