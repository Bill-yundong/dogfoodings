import { ref, computed, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import type { ProcessingTask, DownsamplingConfig, TaskStats, WorkerMessage } from '@/types'
import { taskDB, pointCloudDB, generateId, snapshotDB } from '@/utils/storage/indexedDB'
import { workerPool } from '@/utils/worker/workerPool'
import { parseLASFile, generateMockPointCloud, validateLASFile } from '@/utils/pointcloud/lasParser'

export function useTaskManager() {
  const instance = getCurrentInstance()
  const tasks = ref<ProcessingTask[]>([])
  const workerStates = ref(workerPool.getStates())
  const selectedTaskId = ref<string | null>(null)
  const isLoading = ref(false)

  let workerMonitorInterval: number | null = null

  const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending'))
  const processingTasks = computed(() => tasks.value.filter(t => t.status === 'processing'))
  const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))
  const failedTasks = computed(() => tasks.value.filter(t => t.status === 'failed'))

  const selectedTask = computed(() =>
    tasks.value.find(t => t.id === selectedTaskId.value) || null
  )

  const taskStats = computed<TaskStats>(() => {
    const total = tasks.value.length
    const pending = pendingTasks.value.length
    const processing = processingTasks.value.length
    const completed = completedTasks.value.length
    const failed = failedTasks.value.length

    const completedList = completedTasks.value
    let avgTime = 0
    let totalPoints = 0
    let avgRatio = 0

    if (completedList.length > 0) {
      avgTime = completedList.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt - t.startedAt)
        }
        return sum
      }, 0) / completedList.length

      totalPoints = completedList.reduce((sum, t) => sum + (t.downsampledPointCount || 0), 0)
      avgRatio = completedList.reduce((sum, t) => {
        if (t.originalPointCount && t.downsampledPointCount) {
          return sum + (t.originalPointCount / t.downsampledPointCount)
        }
        return sum
      }, 0) / completedList.length
    }

    return {
      totalTasks: total,
      pendingTasks: pending,
      processingTasks: processing,
      completedTasks: completed,
      failedTasks: failed,
      avgProcessingTime: avgTime,
      totalPointsProcessed: totalPoints,
      avgCompressionRatio: avgRatio
    }
  })

  async function loadTasks(): Promise<void> {
    isLoading.value = true
    try {
      tasks.value = await taskDB.getAll()
      workerStates.value = workerPool.getStates()
    } catch (error) {
      console.error('加载任务失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function createTask(
    file: File,
    config: DownsamplingConfig,
    priority: number = 1
  ): Promise<string> {
    if (!validateLASFile(file)) {
      throw new Error('不支持的文件格式，请上传LAS/LAZ/PCD文件')
    }

    const taskId = generateId()
    const task: ProcessingTask = {
      id: taskId,
      filename: file.name,
      fileSize: file.size,
      status: 'pending',
      progress: 0,
      priority,
      config,
      createdAt: Date.now()
    }

    await taskDB.add(task)
    await loadTasks()

    await processTask(taskId, file)

    return taskId
  }

  async function createMockTask(
    config: DownsamplingConfig,
    pointCount: number = 100000,
    type: 'powerline' | 'terrain' | 'building' = 'powerline',
    priority: number = 1
  ): Promise<string> {
    const taskId = generateId()
    const filename = `mock_${type}_${pointCount}_${Date.now()}.las`

    const task: ProcessingTask = {
      id: taskId,
      filename,
      fileSize: pointCount * 16,
      status: 'processing',
      progress: 0,
      priority,
      config,
      createdAt: Date.now(),
      startedAt: Date.now()
    }

    await taskDB.add(task)
    await loadTasks()

    setTimeout(() => {
      processMockData(taskId, pointCount, type, config)
    }, 100)

    return taskId
  }

  async function processTask(taskId: string, file: File): Promise<void> {
    const task = await taskDB.getById(taskId)
    if (!task) return

    try {
      task.status = 'uploading'
      task.progress = 0
      await taskDB.update(task)
      await loadTasks()

      const pointData = await parseLASFile(file, (progress) => {
        task.progress = progress * 0.3
        taskDB.update(task)
      })

      task.status = 'processing'
      task.startedAt = Date.now()
      task.originalPointCount = pointData.pointCount
      await taskDB.update(task)
      await loadTasks()

      await workerPool.init()

      await workerPool.submitTask({
        taskId,
        type: 'downsample',
        payload: {
          points: pointData.points,
          colors: pointData.colors,
          intensities: pointData.intensities,
          pointCount: pointData.pointCount,
          bounds: pointData.bounds,
          config: task.config
        },
        priority: task.priority
      }, async (message: WorkerMessage) => {
        await handleWorkerMessage(taskId, message)
      })

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message || '处理失败'
      await taskDB.update(task)
      await loadTasks()
    }
  }

  async function processMockData(
    taskId: string,
    pointCount: number,
    type: string,
    config: DownsamplingConfig
  ): Promise<void> {
    const task = await taskDB.getById(taskId)
    if (!task) return

    try {
      const mockData = generateMockPointCloud(pointCount, type as any)
      task.originalPointCount = mockData.pointCount
      await taskDB.update(task)

      await workerPool.init()

      await workerPool.submitTask({
        taskId,
        type: 'downsample',
        payload: {
          points: mockData.points,
          colors: mockData.colors,
          intensities: mockData.intensities,
          pointCount: mockData.pointCount,
          bounds: mockData.bounds,
          config
        },
        priority: task.priority
      }, async (message: WorkerMessage) => {
        await handleWorkerMessage(taskId, message)
      })

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message || '处理失败'
      await taskDB.update(task)
      await loadTasks()
    }
  }

  async function handleWorkerMessage(taskId: string, message: WorkerMessage): Promise<void> {
    const task = await taskDB.getById(taskId)
    if (!task) return

    if (message.type === 'progress') {
      task.progress = 30 + (message.progress || 0) * 0.7
      await taskDB.update(task)
      await loadTasks()
    } else if (message.type === 'complete') {
      const result = message.data

      task.status = 'completed'
      task.progress = 100
      task.completedAt = Date.now()
      task.downsampledPointCount = result.downsampledPointCount

      await taskDB.update(task)

      const pointCloudId = generateId()
      await pointCloudDB.add({
        id: pointCloudId,
        taskId,
        metadata: {
          filename: task.filename,
          originalSize: task.fileSize,
          compressedSize: result.points.byteLength + (result.colors?.byteLength || 0),
          originalPointCount: result.originalPointCount,
          downsampledPointCount: result.downsampledPointCount,
          voxelSize: task.config.voxelSize,
          compressionRatio: result.compressionRatio,
          acquisitionTime: Date.now(),
          droneId: 'DRONE-001',
          location: { latitude: 39.9, longitude: 116.4, altitude: 100 }
        },
        points: result.points,
        colors: result.colors,
        intensities: result.intensities,
        pointCount: result.downsampledPointCount,
        bounds: result.bounds,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const snapshotId = generateId()
      await snapshotDB.add({
        id: snapshotId,
        pointCloudId,
        name: `${task.filename.replace('.las', '')}_快照`,
        description: `体素下采样结果，降维比率 ${result.compressionRatio.toFixed(2)}:1`,
        bounds: result.bounds,
        pointCount: result.downsampledPointCount,
        dataHash: generateId(),
        storageSize: result.points.byteLength + (result.colors?.byteLength || 0),
        data: {
          points: result.points.buffer,
          colors: result.colors?.buffer,
          intensities: result.intensities?.buffer
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        isFavorite: false,
        tags: ['自动生成', '下采样']
      })

      await loadTasks()

    } else if (message.type === 'error') {
      task.status = 'failed'
      task.error = message.error || '处理失败'
      await taskDB.update(task)
      await loadTasks()
    }
  }

  async function retryTask(taskId: string): Promise<void> {
    const task = await taskDB.getById(taskId)
    if (!task) return

    task.status = 'pending'
    task.progress = 0
    task.error = undefined
    task.startedAt = undefined
    task.completedAt = undefined

    await taskDB.update(task)
    await loadTasks()
  }

  async function cancelTask(taskId: string): Promise<boolean> {
    const result = await workerPool.cancelTask(taskId)

    if (result) {
      const task = await taskDB.getById(taskId)
      if (task) {
        task.status = 'failed'
        task.error = '用户取消'
        await taskDB.update(task)
        await loadTasks()
      }
    }

    return result
  }

  async function deleteTask(taskId: string): Promise<void> {
    const pointCloud = await pointCloudDB.getByTaskId(taskId)
    if (pointCloud) {
      const snapshots = await snapshotDB.getByPointCloudId(pointCloud.id)
      for (const s of snapshots) {
        await snapshotDB.delete(s.id)
      }
      await pointCloudDB.delete(pointCloud.id)
    }

    await taskDB.delete(taskId)
    await loadTasks()
  }

  function selectTask(taskId: string | null): void {
    selectedTaskId.value = taskId
  }

  function startWorkerMonitor(): void {
    workerMonitorInterval = window.setInterval(() => {
      workerStates.value = workerPool.getStates()
    }, 1000)
  }

  function stopWorkerMonitor(): void {
    if (workerMonitorInterval) {
      clearInterval(workerMonitorInterval)
      workerMonitorInterval = null
    }
  }

  if (instance) {
    onMounted(() => {
      loadTasks()
      startWorkerMonitor()
    })

    onUnmounted(() => {
      stopWorkerMonitor()
    })
  }

  return {
    tasks,
    workerStates,
    selectedTaskId,
    selectedTask,
    isLoading,
    pendingTasks,
    processingTasks,
    completedTasks,
    failedTasks,
    taskStats,
    loadTasks,
    createTask,
    createMockTask,
    retryTask,
    cancelTask,
    deleteTask,
    selectTask
  }
}
