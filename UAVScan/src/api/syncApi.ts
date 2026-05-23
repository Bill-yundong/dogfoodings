import type { SyncTask, IncrementalSyncRequest, IncrementalSyncResponse, SyncConfirmRequest, SyncConfirmResponse } from '@/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const syncApi = {
  async createSyncTask(task: Partial<SyncTask>): Promise<SyncTask> {
    await delay(500)
    return {
      id: `sync_${Date.now()}`,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      ...task
    } as SyncTask
  },

  async startSync(taskId: string): Promise<SyncTask> {
    await delay(300)
    return {
      id: taskId,
      status: 'syncing',
      progress: 0,
      createdAt: Date.now()
    } as SyncTask
  },

  async pauseSync(taskId: string): Promise<SyncTask> {
    await delay(200)
    return {
      id: taskId,
      status: 'paused',
      progress: 50,
      createdAt: Date.now()
    } as SyncTask
  },

  async resumeSync(taskId: string): Promise<SyncTask> {
    await delay(200)
    return {
      id: taskId,
      status: 'syncing',
      progress: 50,
      createdAt: Date.now()
    } as SyncTask
  },

  async cancelSync(taskId: string): Promise<SyncTask> {
    await delay(200)
    return {
      id: taskId,
      status: 'cancelled',
      progress: 0,
      createdAt: Date.now()
    } as SyncTask
  },

  async getIncrementalChanges(request: IncrementalSyncRequest): Promise<IncrementalSyncResponse> {
    await delay(800)
    return {
      changedChunks: [],
      syncToken: `token_${Date.now()}`,
      fullSyncRequired: false
    }
  },

  async confirmSync(request: SyncConfirmRequest): Promise<SyncConfirmResponse> {
    await delay(300)
    return {
      success: true,
      nextSyncToken: `token_${Date.now()}`
    }
  },

  async uploadChunk(chunkIndex: number, data: ArrayBuffer, hash: string): Promise<boolean> {
    await delay(100)
    return true
  }
}
