export const EARTH_RADIUS = 6371.0

export const DEG2RAD = Math.PI / 180.0
export const RAD2DEG = 180.0 / Math.PI

export const MINUTES_PER_DAY = 1440.0
export const SECONDS_PER_DAY = 86400.0

export const SATELLITE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1'
]

export const STATION_COLORS = [
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6'
]

export const DEFAULT_CONFIG = {
  timeSpeed: 1,
  trajectoryPoints: 180,
  predictionHours: 24,
  updateInterval: 100
}

export const DB_NAME = 'satellite-pulse-db'
export const DB_VERSION = 1
export const VISIBILITY_STORE = 'visibility-snapshots'
