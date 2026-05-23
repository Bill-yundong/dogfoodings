import type { DownsamplingConfig } from './pointcloud'

export type TaskStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'running' | 'cancelled' | 'paused'
export type TaskType = 'downsampling' | 'denoise' | 'topology' | 'compression'

export interface ProcessingTask {
  id: string
  name?: string
  type?: TaskType | string
  filename?: string
  fileSize?: number
  status: TaskStatus
  progress: number
  workerId?: number
  priority: number | string
  config: DownsamplingConfig
  createdAt: number
  startedAt?: number
  startTime?: number
  completedAt?: number
  endTime?: number
  error?: string
  errorMessage?: string
  originalPointCount?: number
  downsampledPointCount?: number
  inputPoints?: number
  outputPoints?: number
  [key: string]: any
}

export interface WorkerState {
  workerId: number
  status: 'idle' | 'running' | 'error'
  cpuUsage: number
  memoryUsage: number
  currentTaskId?: string
  processedPoints: number
  lastActiveTime: number
  [key: string]: any
}

export interface WorkerMessage<T = any> {
  type: 'start' | 'progress' | 'complete' | 'error' | 'cancel'
  taskId: string
  data?: T
  progress?: number
  error?: string
  [key: string]: any
}

export interface WorkerTask {
  taskId: string
  type: 'downsample' | 'denoise' | 'topology' | 'compress'
  payload: any
  priority: number
  [key: string]: any
}

export interface TaskStats {
  totalTasks: number
  pendingTasks: number
  processingTasks: number
  completedTasks: number
  failedTasks: number
  avgProcessingTime: number
  totalPointsProcessed: number
  avgCompressionRatio: number
  [key: string]: any
}

export interface ChunkInfo {
  index: number
  offset: number
  size: number
  hash: string
  uploaded: boolean
  [key: string]: any
}
