import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SyncTask, LinkStatus, IncrementalSyncResponse } from '@/types'
import { syncDB } from '@/utils/storage/indexedDB'
import { useSyncManager } from '@/composables/useSyncManager'
import { databaseApi } from '@/api/databaseApi'

const syncManager = useSyncManager()

export const useSyncStore = defineStore('sync', () => {
  const syncTasks = ref<SyncTask[]>([])
  const linkStatus = ref<LinkStatus>({
    id: 'main',
    name: '主链路',
    connected: false,
    latency: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
    signalStrength: 0,
    lastCheckTime: Date.now()
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const autoSync = ref(true)
  const syncInterval = ref(30000)

  const pendingSync = computed(() => syncTasks.value.filter(t => t.status === 'pending'))
  const syncingTasks = computed(() => syncTasks.value.filter(t => t.status === 'transferring' || t.status === 'syncing'))
  const completedSync = computed(() => syncTasks.value.filter(t => t.status === 'completed'))
  const failedSync = computed(() => syncTasks.value.filter(t => t.status === 'failed'))

  const totalSyncedPoints = computed(() => {
    return completedSync.value.reduce((sum, t) => sum + (t.pointsSynced || 0), 0)
  })

  const totalDataTransferred = computed(() => {
    return completedSync.value.reduce((sum, t) => sum + (t.bytesTransferred || 0), 0)
  })

  async function loadSyncTasks() {
    loading.value = true
    error.value = null
    try {
      syncTasks.value = await syncDB.getAll()
    } catch (e) {
      error.value = '加载同步任务失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function createSyncTask(syncTask: SyncTask) {
    try {
      await syncDB.add(syncTask)
      syncTasks.value.unshift(syncTask)
      return syncTask
    } catch (e) {
      error.value = '创建同步任务失败'
      console.error(e)
      return null
    }
  }

  async function updateSyncTask(taskId: string, updates: Partial<SyncTask>) {
    const task = syncTasks.value.find(t => t.id === taskId)
    if (task) {
      Object.assign(task, updates)
      await syncDB.update(task)
    }
  }

  async function removeSyncTask(taskId: string) {
    try {
      await syncDB.delete(taskId)
      syncTasks.value = syncTasks.value.filter(t => t.id !== taskId)
    } catch (e) {
      error.value = '删除同步任务失败'
      console.error(e)
    }
  }

  async function startSync(taskId: string) {
    const task = syncTasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'pending') return null

    try {
      await syncManager.startSync(taskId)
      await loadSyncTasks()
      return { success: true, changedChunks: [], syncToken: '', fullSyncRequired: false } as IncrementalSyncResponse
    } catch (e) {
      await updateSyncTask(taskId, {
        status: 'failed',
        errorMessage: e instanceof Error ? e.message : '同步失败',
        endTime: Date.now()
      })
      return { success: false, error: e instanceof Error ? e.message : '同步失败' } as unknown as IncrementalSyncResponse
    }
  }

  async function pauseSync(taskId: string) {
    const task = syncTasks.value.find(t => t.id === taskId)
    if (task && (task.status === 'transferring' || task.status === 'syncing')) {
      await syncManager.pauseSync(taskId)
      await loadSyncTasks()
    }
  }

  async function resumeSync(taskId: string) {
    const task = syncTasks.value.find(t => t.id === taskId)
    if (task && task.status === 'paused') {
      await syncManager.resumeSync(taskId)
      await loadSyncTasks()
    }
  }

  async function cancelSync(taskId: string) {
    const task = syncTasks.value.find(t => t.id === taskId)
    if (task && ['transferring', 'syncing', 'paused', 'pending'].includes(task.status)) {
      await syncManager.cancelSync(taskId)
      await loadSyncTasks()
    }
  }

  async function refreshLinkStatus() {
    try {
      const status = await databaseApi.getLinkStatus()
      linkStatus.value = status
    } catch (e) {
      error.value = '检查链路状态失败'
      console.error(e)
    }
  }

  function startLinkMonitoring() {
    syncManager.startLinkMonitoring()
  }

  function stopLinkMonitoring() {
    syncManager.stopLinkMonitoring()
  }

  function setAutoSync(enabled: boolean) {
    autoSync.value = enabled
  }

  function setSyncInterval(interval: number) {
    syncInterval.value = interval
  }

  function clearCompletedSync() {
    const completedIds = completedSync.value.map(t => t.id)
    completedIds.forEach(id => removeSyncTask(id))
  }

  return {
    syncTasks,
    linkStatus,
    loading,
    error,
    autoSync,
    syncInterval,
    pendingSync,
    syncingTasks,
    completedSync,
    failedSync,
    totalSyncedPoints,
    totalDataTransferred,
    loadSyncTasks,
    createSyncTask,
    updateSyncTask,
    removeSyncTask,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
    refreshLinkStatus,
    startLinkMonitoring,
    stopLinkMonitoring,
    setAutoSync,
    setSyncInterval,
    clearCompletedSync
  }
})
