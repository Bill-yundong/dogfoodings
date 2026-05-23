export type SyncDirection = 'upload' | 'download'
export type SyncStatus = 'pending' | 'syncing' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type SyncPriority = 'high' | 'normal' | 'low'

export interface SyncTask {
  id: string
  pointCloudId?: string
  snapshotId?: string
  name?: string
  snapshotName?: string
  direction?: SyncDirection
  targetEndpoint?: string
  status: SyncStatus
  priority?: SyncPriority
  progress: number
  incremental?: boolean
  checksum?: boolean
  transferSpeed?: number
  pointsSynced?: number
  bytesTransferred?: number
  totalBytes?: number
  createdAt: number
  startTime?: number
  startedAt?: number
  endTime?: number
  completedAt?: number
  syncToken?: string
  error?: string
  errorMessage?: string
  retryCount?: number
  [key: string]: any
}

export interface ChunkData {
  index: number
  data: ArrayBuffer
  hash: string
  [key: string]: any
}

export interface IncrementalSyncRequest {
  snapshotId: string
  lastSyncTime: number
  [key: string]: any
}

export interface IncrementalSyncResponse {
  changedChunks: ChunkInfo[]
  syncToken: string
  fullSyncRequired: boolean
  [key: string]: any
}

export interface ChunkInfo {
  index: number
  offset: number
  size: number
  hash: string
  status: 'new' | 'modified' | 'unchanged' | 'deleted'
  [key: string]: any
}

export interface SyncConfirmRequest {
  syncToken: string
  successfulChunks: number[]
  failedChunks: number[]
  [key: string]: any
}

export interface SyncConfirmResponse {
  success: boolean
  nextSyncToken?: string
  [key: string]: any
}

export interface LinkStatus {
  id?: string
  name?: string
  droneConnected?: boolean
  databaseConnected?: boolean
  connected?: boolean
  latency?: number
  networkLatency?: number
  bandwidth?: number
  uploadSpeed?: number
  downloadSpeed?: number
  signalStrength?: number
  lastCheckTime?: number
  [key: string]: any
}

export interface DatabasePointCloudInfo {
  id: string
  name: string
  description: string
  pointCount: number
  fileSize: number
  acquisitionTime: number
  uploadTime: number
  region: string
  droneId: string
  status: 'available' | 'processing' | 'archived'
  [key: string]: any
}
