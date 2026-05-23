import { voxelDownsample } from '@/utils/algorithm/voxelGrid'
import { statisticalOutlierRemoval } from '@/utils/algorithm/statisticalFilter'
import type { PointCloudData, DownsamplingConfig, WorkerMessage } from '@/types'

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
    const { points, colors, intensities, pointCount, bounds, config } = payload

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
      progress: 5,
      data: { stage: '坐标归一化' }
    })

    await sleep(50)

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    let result = voxelDownsample(inputData, config, (progress) => {
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 5 + progress * 0.45,
        data: { stage: '体素下采样' }
      })
    })

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    if (config.removeOutliers) {
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 55,
        data: { stage: '统计滤波去噪' }
      })

      result = statisticalOutlierRemoval(
        result,
        Math.max(3, Math.floor(config.outlierThreshold)),
        2.0,
        (progress) => {
          self.postMessage({
            type: 'progress',
            taskId,
            progress: 55 + progress * 0.4,
            data: { stage: '统计滤波去噪' }
          })
        }
      )
    }

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
        originalPointCount: inputData.pointCount,
        downsampledPointCount: result.pointCount,
        compressionRatio: inputData.pointCount / result.pointCount
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
