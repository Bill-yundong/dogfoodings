import type { BoundingBox, LODLevel } from './pointcloud'

export type SnapshotType = 'fine-grained' | 'overview' | 'incremental'

export interface TopologySnapshot {
  id: string
  pointCloudId: string
  name: string
  description?: string
  type?: SnapshotType
  bounds?: BoundingBox
  boundingBox?: BoundingBox
  pointCount: number
  size?: number
  storageSize?: number
  dataHash?: string
  compressionRatio: number
  autoCreated?: boolean
  data?: {
    points: ArrayBuffer | Float32Array
    colors?: ArrayBuffer | Uint8Array
    intensities?: ArrayBuffer | Float32Array
    octree?: any
    [key: string]: any
  }
  lodLevels?: LODLevel[]
  createdAt: number
  expiresAt?: number
  isFavorite?: boolean
  tags?: string[]
  [key: string]: any
}

export interface SnapshotFilter {
  search?: string
  tags?: string[]
  favoriteOnly?: boolean
  dateRange?: [number, number]
  dateFrom?: number
  dateTo?: number
  pointCountRange?: [number, number]
  [key: string]: any
}

export interface CacheStrategy {
  maxStorageSize: number
  autoCleanup: boolean
  cleanupThreshold: number
  defaultExpiryDays: number
  preserveFavorites: boolean
  [key: string]: any
}

export interface StorageStats {
  totalSize?: number
  totalUsed?: number
  usedSize?: number
  availableSize?: number
  snapshotCount?: number
  objectCount?: number
  favoriteCount?: number
  expiredCount?: number
  quota?: number
  largestSnapshots?: {
    id: string
    name: string
    size: number
  }[]
  [key: string]: any
}
