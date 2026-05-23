import { ref, computed, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import type { SyncTask, LinkStatus, DatabasePointCloudInfo, IncrementalSyncResponse } from '@/types'
import { syncDB, snapshotDB, generateId } from '@/utils/storage/indexedDB'
import { syncApi } from '@/api/syncApi'
import { databaseApi } from '@/api/databaseApi'

export function useSyncManager() {
  const instance = getCurrentInstance()
  const syncTasks = ref<SyncTask[]>([])
  const linkStatuses = ref<LinkStatus[]>([])
  const databasePointClouds = ref<DatabasePointCloudInfo[]>([])
  const isLoading = ref(false)
  const autoSyncEnabled = ref(true)

  let linkMonitorInterval: number | null = null
  let autoSyncInterval: number | null = null

  const pendingSync = computed(() => syncTasks.value.filter(t => t.status === 'pending'))
  const transferringSync = computed(() => syncTasks.value.filter(t => t.status === 'transferring'))
  const completedSync = computed(() => syncTasks.value.filter(t => t.status === 'completed'))
  const failedSync = computed(() => syncTasks.value.filter(t => t.status === 'failed'))

  const overallLinkStatus = computed(() => {
    if (linkStatuses.value.length === 0) return 'unknown'
    const connected = linkStatuses.value.filter(l => l.connected).length
    if (connected === linkStatuses.value.length) return 'connected'
    if (connected > 0) return 'degraded'
    return 'disconnected'
  })

  const averageSpeed = computed(() => {
    const active = transferringSync.value
    if (active.length === 0) return 0
    return active.reduce((sum, t) => sum + t.transferSpeed, 0) / active.length
  })

  async function loadSyncTasks(): Promise<void> {
    isLoading.value = true
    try {
      syncTasks.value = await syncDB.getAll()
    } catch (error) {
      console.error('加载同步任务失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadDatabasePointClouds(region?: string, date?: Date): Promise<void> {
    try {
      databasePointClouds.value = await databaseApi.getPointCloudList()
    } catch (error) {
      console.error('加载数据库点云列表失败:', error)
    }
  }

  async function checkLinks(): Promise<void> {
    try {
      const mockLinks: LinkStatus[] = [
        {
          id: 'main',
          name: '省电网主链路',
          connected: Math.random() > 0.1,
          latency: 20 + Math.random() * 50,
          uploadSpeed: 5 + Math.random() * 10,
          downloadSpeed: 10 + Math.random() * 20,
          signalStrength: 0.7 + Math.random() * 0.3,
          lastCheckTime: Date.now()
        },
        {
          id: 'backup',
          name: '4G备份链路',
          connected: Math.random() > 0.3,
          latency: 50 + Math.random() * 100,
          uploadSpeed: 2 + Math.random() * 5,
          downloadSpeed: 5 + Math.random() * 10,
          signalStrength: 0.5 + Math.random() * 0.4,
          lastCheckTime: Date.now()
        },
        {
          id: 'local',
          name: '本地缓存',
          connected: true,
          latency: 5,
          uploadSpeed: 100,
          downloadSpeed: 100,
          signalStrength: 1.0,
          lastCheckTime: Date.now()
        }
      ]

      linkStatuses.value = mockLinks
    } catch (error) {
      console.error('检查链路状态失败:', error)
    }
  }

  async function createUploadTask(snapshotId: string): Promise<string> {
    const snapshot = await snapshotDB.getById(snapshotId)
    if (!snapshot) throw new Error('快照不存在')

    const taskId = generateId()
    const task: SyncTask = {
      id: taskId,
      snapshotId,
      snapshotName: snapshot.name,
      direction: 'upload',
      status: 'pending',
      progress: 0,
      transferSpeed: 0,
      bytesTransferred: 0,
      totalBytes: snapshot.storageSize,
      createdAt: Date.now(),
      retryCount: 0
    }

    await syncDB.add(task)
    await loadSyncTasks()

    return taskId
  }

  async function createDownloadTask(pointCloudId: string, pointCloudName: string, size: number): Promise<string> {
    const taskId = generateId()
    const task: SyncTask = {
      id: taskId,
      snapshotId: pointCloudId,
      snapshotName: pointCloudName,
      direction: 'download',
      status: 'pending',
      progress: 0,
      transferSpeed: 0,
      bytesTransferred: 0,
      totalBytes: size,
      createdAt: Date.now(),
      retryCount: 0
    }

    await syncDB.add(task)
    await loadSyncTasks()

    return taskId
  }

  async function startSync(taskId: string): Promise<void> {
    const task = await syncDB.getById(taskId)
    if (!task) return

    task.status = 'transferring'
    task.startedAt = Date.now()
    task.progress = 0
    task.bytesTransferred = 0

    await syncDB.update(task)
    await loadSyncTasks()

    simulateTransfer(taskId)
  }

  function simulateTransfer(taskId: string): void {
    let progress = 0
    const chunkSize = 1024 * 1024

    const transfer = async () => {
      const task = await syncDB.getById(taskId)
      if (!task || task.status !== 'transferring') return

      const speed = 5 + Math.random() * 10
      const bytesThisTick = speed * 1024 * 1024 / 4
      const newTransferred = Math.min(task.bytesTransferred + bytesThisTick, task.totalBytes)

      task.bytesTransferred = newTransferred
      task.progress = (newTransferred / task.totalBytes) * 100
      task.transferSpeed = speed

      if (task.progress >= 100) {
        task.status = 'completed'
        task.completedAt = Date.now()

        if (task.direction === 'upload') {
          await syncApi.confirmSync({
            syncToken: task.syncToken || 'mock-token-' + taskId,
            successfulChunks: [],
            failedChunks: []
          })
        }

        await syncDB.update(task)
        await loadSyncTasks()
        return
      }

      await syncDB.update(task)
      await loadSyncTasks()

      setTimeout(transfer, 250)
    }

    setTimeout(transfer, 250)
  }

  async function incrementalSync(snapshotId: string): Promise<IncrementalSyncResponse | null> {
    try {
      const snapshot = await snapshotDB.getById(snapshotId)
      if (!snapshot) return null

      return await syncApi.getIncrementalChanges({
        snapshotId,
        lastSyncTime: 0,
        syncToken: ''
      })
    } catch (error) {
      console.error('增量同步失败:', error)
      return null
    }
  }

  async function pauseSync(taskId: string): Promise<void> {
    const task = await syncDB.getById(taskId)
    if (!task || task.status !== 'transferring') return

    task.status = 'paused'
    await syncDB.update(task)
    await loadSyncTasks()
  }

  async function resumeSync(taskId: string): Promise<void> {
    const task = await syncDB.getById(taskId)
    if (!task || task.status !== 'paused') return

    task.status = 'transferring'
    await syncDB.update(task)
    await loadSyncTasks()

    simulateTransfer(taskId)
  }

  async function retrySync(taskId: string): Promise<void> {
    const task = await syncDB.getById(taskId)
    if (!task) return

    task.status = 'pending'
    task.progress = 0
    task.bytesTransferred = 0
    task.transferSpeed = 0
    task.retryCount++
    task.error = undefined

    await syncDB.update(task)
    await loadSyncTasks()

    await startSync(taskId)
  }

  async function cancelSync(taskId: string): Promise<void> {
    const task = await syncDB.getById(taskId)
    if (!task) return

    if (task.status === 'transferring') {
      task.status = 'failed'
      task.error = '用户取消'
      await syncDB.update(task)
    }

    await loadSyncTasks()
  }

  async function deleteSyncTask(taskId: string): Promise<void> {
    await syncDB.delete(taskId)
    await loadSyncTasks()
  }

  async function processPendingQueue(): Promise<void> {
    if (!autoSyncEnabled.value) return

    const pending = pendingSync.value
    const transferring = transferringSync.value

    const maxConcurrent = 2
    const availableSlots = maxConcurrent - transferring.length

    if (availableSlots > 0 && pending.length > 0) {
      for (let i = 0; i < Math.min(availableSlots, pending.length); i++) {
        await startSync(pending[i].id)
      }
    }
  }

  async function syncAllSnapshots(): Promise<void> {
    const snapshots = await snapshotDB.getAll()
    for (const snapshot of snapshots) {
      const existing = syncTasks.value.find(t => t.snapshotId === snapshot.id)
      if (!existing || existing.status === 'failed') {
        await createUploadTask(snapshot.id)
      }
    }
  }

  function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
    if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
    return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  function startLinkMonitoring(): void {
    linkMonitorInterval = window.setInterval(() => {
      checkLinks()
    }, 5000)
  }

  function startLinkMonitor(): void {
    startLinkMonitoring()
  }

  function startAutoSync(): void {
    autoSyncInterval = window.setInterval(() => {
      processPendingQueue()
    }, 3000)
  }

  function stopLinkMonitoring(): void {
    if (linkMonitorInterval) {
      clearInterval(linkMonitorInterval)
      linkMonitorInterval = null
    }
  }

  function stopLinkMonitor(): void {
    stopLinkMonitoring()
  }

  function stopAutoSync(): void {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval)
      autoSyncInterval = null
    }
  }

  if (instance) {
    onMounted(() => {
      loadSyncTasks()
      checkLinks()
      loadDatabasePointClouds()
      startLinkMonitoring()
      startAutoSync()
    })

    onUnmounted(() => {
      stopLinkMonitoring()
      stopAutoSync()
    })
  }

  return {
    syncTasks,
    linkStatuses,
    databasePointClouds,
    isLoading,
    autoSyncEnabled,
    pendingSync,
    transferringSync,
    completedSync,
    failedSync,
    overallLinkStatus,
    averageSpeed,
    loadSyncTasks,
    loadDatabasePointClouds,
    checkLinks,
    createUploadTask,
    createDownloadTask,
    startSync,
    pauseSync,
    resumeSync,
    retrySync,
    cancelSync,
    deleteSyncTask,
    incrementalSync,
    processPendingQueue,
    syncAllSnapshots,
    formatSpeed,
    formatBytes,
    startLinkMonitoring,
    stopLinkMonitoring,
    startLinkMonitor,
    stopLinkMonitor,
    startAutoSync,
    stopAutoSync
  }
}
