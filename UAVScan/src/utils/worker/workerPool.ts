import type { WorkerTask, WorkerMessage, WorkerState } from '@/types'
import { workerDB } from '@/utils/storage/indexedDB'

type TaskCallback = (message: WorkerMessage) => void

interface WorkerInfo {
  worker: Worker
  state: WorkerState
  currentTask?: WorkerTask
  callbacks: Map<string, TaskCallback>
}

class WorkerPool {
  private workers: Map<number, WorkerInfo> = new Map()
  private taskQueue: WorkerTask[] = []
  private maxWorkers: number = 4
  private initialized: boolean = false

  async init(count: number = 4): Promise<void> {
    if (this.initialized) return

    this.maxWorkers = count
    await workerDB.initWorkerPool(count)

    const states = await workerDB.getAll()

    for (const state of states) {
      const worker = this.createWorker(state.workerId)
      this.workers.set(state.workerId, {
        worker,
        state,
        callbacks: new Map()
      })
    }

    this.initialized = true
    this.processQueue()
  }

  private createWorker(workerId: number): Worker {
    const workerTypes: Record<number, any> = {
      0: () => new Worker(new URL('@/workers/voxelDownsampler.worker.ts', import.meta.url), { type: 'module' }),
      1: () => new Worker(new URL('@/workers/denoiser.worker.ts', import.meta.url), { type: 'module' }),
      2: () => new Worker(new URL('@/workers/topologyBuilder.worker.ts', import.meta.url), { type: 'module' }),
      3: () => new Worker(new URL('@/workers/compressor.worker.ts', import.meta.url), { type: 'module' })
    }

    const worker = workerTypes[workerId]()

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      this.handleWorkerMessage(workerId, e.data)
    }

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(workerId, error)
    }

    return worker
  }

  private async handleWorkerMessage(workerId: number, message: WorkerMessage): Promise<void> {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) return

    if (message.type === 'progress' && workerInfo.currentTask) {
      const cb = workerInfo.callbacks.get(workerInfo.currentTask.taskId)
      if (cb) cb(message)
      return
    }

    if (message.type === 'complete' || message.type === 'error') {
      const task = workerInfo.currentTask
      if (task) {
        const cb = workerInfo.callbacks.get(task.taskId)
        if (cb) cb(message)
        workerInfo.callbacks.delete(task.taskId)
      }

      workerInfo.state.status = 'idle'
      workerInfo.state.lastActiveTime = Date.now()
      if (message.type === 'complete') {
        workerInfo.state.processedPoints += (message.data as any)?.pointCount || 0
      }
      await workerDB.update(workerInfo.state)

      workerInfo.currentTask = undefined

      this.processQueue()
    }
  }

  private async handleWorkerError(workerId: number, error: ErrorEvent): Promise<void> {
    console.error(`Worker ${workerId} error:`, error)

    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) return

    if (workerInfo.currentTask) {
      const cb = workerInfo.callbacks.get(workerInfo.currentTask.taskId)
      if (cb) {
        cb({
          type: 'error',
          taskId: workerInfo.currentTask.taskId,
          error: error.message
        })
      }
      workerInfo.callbacks.delete(workerInfo.currentTask.taskId)
    }

    workerInfo.state.status = 'error'
    await workerDB.update(workerInfo.state)

    const newWorker = this.createWorker(workerId)
    workerInfo.worker.terminate()
    workerInfo.worker = newWorker
    workerInfo.state.status = 'idle'
    await workerDB.update(workerInfo.state)

    this.processQueue()
  }

  private getWorkerForTask(taskType: string): WorkerInfo | undefined {
    const workerTypeMap: Record<string, number> = {
      'downsample': 0,
      'denoise': 1,
      'topology': 2,
      'compress': 3
    }

    const preferredId = workerTypeMap[taskType]
    const preferred = this.workers.get(preferredId)

    if (preferred && preferred.state.status === 'idle') {
      return preferred
    }

    for (const info of this.workers.values()) {
      if (info.state.status === 'idle') {
        return info
      }
    }

    return undefined
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return

    this.taskQueue.sort((a, b) => b.priority - a.priority)

    for (let i = 0; i < this.taskQueue.length; i++) {
      const task = this.taskQueue[i]
      const worker = this.getWorkerForTask(task.type)

      if (worker) {
        this.taskQueue.splice(i, 1)
        this.executeTask(worker, task)
        this.processQueue()
        break
      }
    }
  }

  private async executeTask(worker: WorkerInfo, task: WorkerTask): Promise<void> {
    worker.state.status = 'running'
    worker.state.currentTaskId = task.taskId
    worker.currentTask = task
    await workerDB.update(worker.state)

    worker.worker.postMessage({
      type: 'start',
      taskId: task.taskId,
      data: task.payload
    })
  }

  async submitTask(
    task: WorkerTask,
    callback: TaskCallback
  ): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }

    const worker = this.getWorkerForTask(task.type)
    if (worker) {
      const workerInfo = this.workers.get(worker.state.workerId)!
      workerInfo.callbacks.set(task.taskId, callback)
      this.executeTask(worker, task)
    } else {
      const pendingWorker = Array.from(this.workers.values())[0]
      if (pendingWorker) {
        pendingWorker.callbacks.set(task.taskId, callback)
      }
      this.taskQueue.push(task)
      this.taskQueue.sort((a, b) => b.priority - a.priority)
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const queueIndex = this.taskQueue.findIndex(t => t.taskId === taskId)
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1)
      return true
    }

    for (const info of this.workers.values()) {
      if (info.currentTask?.taskId === taskId) {
        info.worker.postMessage({ type: 'cancel', taskId })
        return true
      }
    }

    return false
  }

  getStates(): WorkerState[] {
    return Array.from(this.workers.values()).map(w => w.state)
  }

  getQueueLength(): number {
    return this.taskQueue.length
  }

  async shutdown(): Promise<void> {
    for (const info of this.workers.values()) {
      info.worker.terminate()
      info.state.status = 'idle'
      await workerDB.update(info.state)
    }
    this.workers.clear()
    this.initialized = false
  }
}

export const workerPool = new WorkerPool()

export default workerPool
