import { statisticalOutlierRemoval } from '@/utils/algorithm/statisticalFilter'
import type { PointCloudData, WorkerMessage } from '@/types'

let isCancelled = false
let currentTaskId: string | null = null

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, taskId, data } = e.data

  if (type === 'cancel' && taskId === currentTaskId) {
    isCancelled = true
    return
  }

  if (type === 'start') {
    isCancelled = false
    currentTaskId = taskId
    processData(taskId, data)
  }
}

async function processData(taskId: string, payload: any): Promise<void> {
  try {
    const { points, colors, intensities, pointCount, bounds, k, stdThreshold } = payload

    const inputData: PointCloudData = {
      points: new Float32Array(points),
      colors: colors ? new Uint8Array(colors) : undefined,
      intensities: intensities ? new Float32Array(intensities) : undefined,
      pointCount,
      bounds
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 10,
      data: { stage: '计算点云统计特征' }
    })

    await sleep(50)

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    const result = statisticalOutlierRemoval(
      inputData,
      k || 5,
      stdThreshold || 2.0,
      (progress) => {
        if (isCancelled) return
        self.postMessage({
          type: 'progress',
          taskId,
          progress: 10 + progress * 0.85,
          data: { stage: '离群点检测与移除' }
        })
      }
    )

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 95,
      data: { stage: '数据序列化' }
    })

    const transferList: Transferable[] = [result.points.buffer]
    if (result.colors) transferList.push(result.colors.buffer)
    if (result.intensities) transferList.push(result.intensities.buffer)

    self.postMessage({
      type: 'complete',
      taskId,
      data: {
        points: result.points,
        colors: result.colors,
        intensities: result.intensities,
        pointCount: result.pointCount,
        bounds: result.bounds,
        removedPoints: inputData.pointCount - result.pointCount,
        removalRatio: 1 - result.pointCount / inputData.pointCount
      }
    }, transferList)

    currentTaskId = null
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      taskId,
      error: error.message || '未知错误'
    })
    currentTaskId = null
  }
}

function postCancelled(taskId: string): void {
  self.postMessage({
    type: 'error',
    taskId,
    error: '任务已取消'
  })
  currentTaskId = null
  isCancelled = false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export {}
