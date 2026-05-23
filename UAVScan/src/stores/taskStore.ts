import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProcessingTask, TaskStats, WorkerState } from '@/types'
import { taskDB, workerDB } from '@/utils/storage/indexedDB'
import { useTaskManager } from '@/composables/useTaskManager'

const taskManager = useTaskManager()

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<ProcessingTask[]>([])
  const activeTask = ref<ProcessingTask | null>(null)
  const workerStates = ref<Map<string, WorkerState>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const isLoaded = ref(false)
  const lastLoadTime = ref(0)
  const MIN_LOAD_INTERVAL = 5000

  const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending'))
  const runningTasks = computed(() => tasks.value.filter(t => t.status === 'running'))
  const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))
  const failedTasks = computed(() => tasks.value.filter(t => t.status === 'failed'))

  const stats = computed<TaskStats>(() => {
    const total = tasks.value.length
    const completed = completedTasks.value.length
    const failed = failedTasks.value.length
    const running = runningTasks.value.length
    const pending = pendingTasks.value.length
    const totalPointsProcessed = tasks.value
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.outputPoints || 0), 0)
    const averageProcessingTime = tasks.value
      .filter(t => t.status === 'completed' && t.endTime && t.startTime)
      .reduce((sum, t) => sum + ((t.endTime || 0) - (t.startTime || 0)), 0) / Math.max(1, completedTasks.value.length)

    return {
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      runningTasks: running,
      pendingTasks: pending,
      totalPointsProcessed,
      averageProcessingTime,
      successRate: total > 0 ? (completed / total) * 100 : 0
    }
  })

  async function loadTasks(force = false) {
    const now = Date.now()
    
    if (!force && loading.value) return
    
    if (!force && isLoaded.value && now - lastLoadTime.value < MIN_LOAD_INTERVAL) {
      return
    }
    
    loading.value = true
    error.value = null
    try {
      tasks.value = await taskDB.getAll()
      const workers = await workerDB.getAll()
      for (const ws of workers) {
        if (ws.currentTaskId) {
          workerStates.value.set(ws.currentTaskId, ws)
        }
      }
      isLoaded.value = true
      lastLoadTime.value = now
    } catch (e) {
      error.value = '加载任务列表失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function createTask(task: ProcessingTask) {
    try {
      await taskDB.add(task)
      tasks.value.unshift(task)
      return task
    } catch (e) {
      error.value = '创建任务失败'
      console.error(e)
      return null
    }
  }

  async function updateTask(taskId: string, updates: Partial<ProcessingTask>) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      Object.assign(task, updates)
      await taskDB.update(task)
    }
  }

  async function removeTask(taskId: string) {
    try {
      await taskDB.delete(taskId)
      tasks.value = tasks.value.filter(t => t.id !== taskId)
      if (activeTask.value?.id === taskId) {
        activeTask.value = null
      }
      workerStates.value.delete(taskId)
    } catch (e) {
      error.value = '删除任务失败'
      console.error(e)
    }
  }

  async function startTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'pending') return null

    try {
      const runningTask = await taskManager.createTask(
        task.type,
        task.inputData,
        task.config
      )
      if (runningTask) {
        activeTask.value = runningTask
        await updateTask(taskId, { status: 'running', startTime: Date.now() })
        
        runningTask.onProgress = (progress) => {
          updateTask(taskId, { progress })
        }
        
        runningTask.onComplete = (result) => {
          updateTask(taskId, {
            status: 'completed',
            progress: 100,
            endTime: Date.now(),
            outputData: result.data,
            outputPoints: result.pointCount
          })
          if (activeTask.value?.id === taskId) {
            activeTask.value = null
          }
        }
        
        runningTask.onError = (err) => {
          updateTask(taskId, {
            status: 'failed',
            errorMessage: err.message,
            endTime: Date.now()
          })
          if (activeTask.value?.id === taskId) {
            activeTask.value = null
          }
        }

        return runningTask
      }
    } catch (e) {
      await updateTask(taskId, {
        status: 'failed',
        errorMessage: e instanceof Error ? e.message : '未知错误',
        endTime: Date.now()
      })
    }
    return null
  }

  async function cancelTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task && task.status === 'running') {
      taskManager.cancelTask(taskId)
      await updateTask(taskId, { status: 'cancelled', endTime: Date.now() })
      if (activeTask.value?.id === taskId) {
        activeTask.value = null
      }
    }
  }

  async function updateWorkerState(taskId: string, state: WorkerState) {
    workerStates.value.set(taskId, state)
    await workerDB.update(state)
  }

  function clearCompleted() {
    const completedIds = completedTasks.value.map(t => t.id)
    completedIds.forEach(id => removeTask(id))
  }

  function clearAll() {
    tasks.value.forEach(t => taskDB.delete(t.id))
    tasks.value = []
    activeTask.value = null
    workerStates.value.clear()
  }

  return {
    tasks,
    activeTask,
    workerStates,
    loading,
    error,
    pendingTasks,
    runningTasks,
    completedTasks,
    failedTasks,
    stats,
    loadTasks,
    createTask,
    updateTask,
    removeTask,
    startTask,
    cancelTask,
    updateWorkerState,
    clearCompleted,
    clearAll
  }
})
