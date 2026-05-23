import { buildOctree, generateLODLevels, estimateNormals } from '@/utils/algorithm/octree'
import type { PointCloudData, LODLevel, WorkerMessage } from '@/types'

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
    const { points, colors, intensities, pointCount, bounds, lodLevels } = payload

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
      data: { stage: '构建八叉树空间索引' }
    })

    await sleep(50)

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    const octree = buildOctree(inputData.points, inputData.bounds, (progress) => {
      if (isCancelled) return
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 10 + progress * 0.35,
        data: { stage: '构建八叉树空间索引' }
      })
    })

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 50,
      data: { stage: '生成LOD层级数据' }
    })

    const lod = generateLODLevels(inputData, octree, lodLevels || 4, (progress) => {
      if (isCancelled) return
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 50 + progress * 0.25,
        data: { stage: '生成LOD层级数据' }
      })
    })

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 80,
      data: { stage: '估计点云法向量' }
    })

    const normals = estimateNormals(inputData, 6, (progress) => {
      if (isCancelled) return
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 80 + progress * 0.15,
        data: { stage: '估计点云法向量' }
      })
    })

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 95,
      data: { stage: '序列化拓扑数据' }
    })

    const lodTransferList: Transferable[] = []
    const lodData = lod.map(level => {
      lodTransferList.push(level.points.buffer, level.colors.buffer)
      return {
        level: level.level,
        pointCount: level.pointCount,
        points: level.points,
        colors: level.colors,
        distanceRange: level.distanceRange
      }
    })

    const transferList: Transferable[] = [normals.buffer, ...lodTransferList]

    self.postMessage({
      type: 'complete',
      taskId,
      data: {
        octree: serializeOctree(octree),
        lodLevels: lodData,
        normals,
        bounds: inputData.bounds
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

function serializeOctree(node: any): any {
  return {
    bounds: node.bounds,
    level: node.level,
    points: node.points,
    children: node.children ? node.children.map(serializeOctree) : null
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
