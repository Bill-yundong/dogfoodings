import type { WorkerMessage } from '@/types'

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
    const { points, colors, intensities, pointCount, compressionLevel } = payload

    const pointsData = new Float32Array(points)
    const colorsData = colors ? new Uint8Array(colors) : undefined
    const intensitiesData = intensities ? new Float32Array(intensities) : undefined

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 10,
      data: { stage: '分析数据特征' }
    })

    await sleep(50)

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    const level = compressionLevel || 6

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 30,
      data: { stage: '增量差分编码' }
    })

    const compressedPoints = deltaEncode(pointsData, 3, (progress) => {
      if (isCancelled) return
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 30 + progress * 0.3,
        data: { stage: '增量差分编码' }
      })
    })

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 65,
      data: { stage: '量化压缩' }
    })

    const quantizedPoints = quantizeData(compressedPoints, 3, level)
    let compressedColors: Uint8Array | undefined
    let compressedIntensities: Uint8Array | undefined

    if (colorsData) {
      compressedColors = compressColors(colorsData)
    }

    if (intensitiesData) {
      compressedIntensities = quantizeIntensities(intensitiesData, level)
    }

    if (isCancelled) {
      postCancelled(taskId)
      return
    }

    self.postMessage({
      type: 'progress',
      taskId,
      progress: 90,
      data: { stage: '计算数据哈希' }
    })

    const hash = calculateHash(quantizedPoints)

    const originalSize = pointsData.byteLength +
      (colorsData ? colorsData.byteLength : 0) +
      (intensitiesData ? intensitiesData.byteLength : 0)

    const compressedSize = quantizedPoints.byteLength +
      (compressedColors ? compressedColors.byteLength : 0) +
      (compressedIntensities ? compressedIntensities.byteLength : 0)

    const transferList: Transferable[] = [quantizedPoints.buffer]
    if (compressedColors) transferList.push(compressedColors.buffer)
    if (compressedIntensities) transferList.push(compressedIntensities.buffer)

    self.postMessage({
      type: 'complete',
      taskId,
      data: {
        points: quantizedPoints,
        colors: compressedColors,
        intensities: compressedIntensities,
        pointCount,
        hash,
        originalSize,
        compressedSize,
        compressionRatio: originalSize / compressedSize
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

function deltaEncode(data: Float32Array, stride: number, onProgress?: (p: number) => void): Float32Array {
  const result = new Float32Array(data.length)
  const pointCount = Math.floor(data.length / stride)

  for (let i = 0; i < stride; i++) {
    result[i] = data[i]
  }

  for (let i = 1; i < pointCount; i++) {
    for (let j = 0; j < stride; j++) {
      const idx = i * stride + j
      const prevIdx = (i - 1) * stride + j
      result[idx] = data[idx] - data[prevIdx]
    }

    if (onProgress && i % Math.floor(pointCount / 100) === 0) {
      onProgress(i / pointCount)
    }
  }

  return result
}

function quantizeData(data: Float32Array, stride: number, level: number): Uint8Array {
  const quantizationLevels = Math.pow(2, Math.min(level, 8))
  const result = new Uint8Array(data.length)

  let min = Infinity, max = -Infinity
  for (let i = 0; i < data.length; i++) {
    min = Math.min(min, data[i])
    max = Math.max(max, data[i])
  }

  const range = max - min || 1
  const scale = (quantizationLevels - 1) / range

  for (let i = 0; i < data.length; i++) {
    result[i] = Math.round((data[i] - min) * scale)
  }

  const meta = new Uint8Array(8)
  const minView = new Float32Array(meta.buffer, 0, 1)
  const scaleView = new Float32Array(meta.buffer, 4, 1)
  minView[0] = min
  scaleView[0] = scale

  const output = new Uint8Array(8 + result.length)
  output.set(meta, 0)
  output.set(result, 8)

  return output
}

function compressColors(colors: Uint8Array): Uint8Array {
  const pointCount = Math.floor(colors.length / 4)
  const compressed = new Uint8Array(pointCount * 3)

  for (let i = 0; i < pointCount; i++) {
    compressed[i * 3] = colors[i * 4]
    compressed[i * 3 + 1] = colors[i * 4 + 1]
    compressed[i * 3 + 2] = colors[i * 4 + 2]
  }

  return compressed
}

function quantizeIntensities(intensities: Float32Array, level: number): Uint8Array {
  const quantizationLevels = Math.pow(2, Math.min(level, 8))
  const result = new Uint8Array(intensities.length)
  const scale = quantizationLevels - 1

  for (let i = 0; i < intensities.length; i++) {
    result[i] = Math.round(Math.max(0, Math.min(1, intensities[i])) * scale)
  }

  return result
}

function calculateHash(data: Uint8Array): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i]
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36)
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
