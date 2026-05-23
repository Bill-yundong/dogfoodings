import { ref, reactive } from 'vue'
import type { PointCloudData, DownsamplingConfig } from '@/types'
import { voxelDownsample } from '@/utils/algorithm/voxelGrid'
import { statisticalOutlierRemoval } from '@/utils/algorithm/statisticalFilter'
import { buildOctree, generateLODLevels, estimateNormals } from '@/utils/algorithm/octree'
import { workerPool } from '@/utils/worker/workerPool'

export function usePointCloudProcessor() {
  const isProcessing = ref(false)
  const currentStage = ref('')
  const progress = ref(0)

  const processingStats = reactive({
    originalPointCount: 0,
    processedPointCount: 0,
    processingTime: 0,
    compressionRatio: 0
  })

  async function processPointCloud(
    inputData: PointCloudData,
    config: DownsamplingConfig
  ): Promise<PointCloudData | null> {
    isProcessing.value = true
    progress.value = 0
    const startTime = Date.now()

    try {
      processingStats.originalPointCount = inputData.pointCount

      currentStage.value = '体素下采样'
      let result = voxelDownsample(inputData, config, (p) => {
        progress.value = p * 0.6
      })

      if (config.removeOutliers) {
        currentStage.value = '统计滤波去噪'
        result = statisticalOutlierRemoval(
          result,
          Math.max(3, Math.floor(config.outlierThreshold)),
          2.0,
          (p) => {
            progress.value = 60 + p * 0.3
          }
        )
      }

      processingStats.processedPointCount = result.pointCount
      processingStats.compressionRatio = inputData.pointCount / result.pointCount
      processingStats.processingTime = Date.now() - startTime

      progress.value = 100
      currentStage.value = '处理完成'

      return result
    } catch (error) {
      console.error('点云处理失败:', error)
      return null
    } finally {
      isProcessing.value = false
    }
  }

  async function processPointCloudAsync(
    inputData: PointCloudData,
    config: DownsamplingConfig,
    taskId: string,
    priority: number = 1
  ): Promise<void> {
    await workerPool.init()

    await workerPool.submitTask({
      taskId,
      type: 'downsample',
      priority,
      payload: {
        points: inputData.points,
        colors: inputData.colors,
        intensities: inputData.intensities,
        pointCount: inputData.pointCount,
        bounds: inputData.bounds,
        config
      }
    }, (message) => {
      if (message.type === 'progress') {
        progress.value = message.progress || 0
        currentStage.value = message.data?.stage || '处理中'
      } else if (message.type === 'complete') {
        isProcessing.value = false
        progress.value = 100
        currentStage.value = '处理完成'

        const result = message.data
        processingStats.originalPointCount = result.originalPointCount
        processingStats.processedPointCount = result.downsampledPointCount
        processingStats.compressionRatio = result.compressionRatio
        processingStats.processingTime = Date.now() - Date.now()
      } else if (message.type === 'error') {
        isProcessing.value = false
        currentStage.value = '处理失败: ' + message.error
      }
    })
  }

  async function buildTopology(
    inputData: PointCloudData,
    lodLevels: number = 4
  ): Promise<{ octree: any; lod: any[]; normals: Float32Array } | null> {
    isProcessing.value = true
    progress.value = 0

    try {
      currentStage.value = '构建八叉树索引'
      const octree = buildOctree(inputData.points, inputData.bounds, (p) => {
        progress.value = p * 0.4
      })

      currentStage.value = '生成LOD层级'
      const lod = generateLODLevels(inputData, octree, lodLevels, (p) => {
        progress.value = 40 + p * 0.3
      })

      currentStage.value = '估计法向量'
      const normals = estimateNormals(inputData, 6, (p) => {
        progress.value = 70 + p * 0.3
      })

      progress.value = 100
      currentStage.value = '拓扑构建完成'

      return { octree, lod, normals }
    } catch (error) {
      console.error('拓扑构建失败:', error)
      return null
    } finally {
      isProcessing.value = false
    }
  }

  async function compressData(
    inputData: PointCloudData,
    compressionLevel: number = 6
  ): Promise<{ compressed: any; hash: string; ratio: number } | null> {
    try {
      const taskId = 'compress_' + Date.now()
      await workerPool.init()

      return new Promise((resolve, reject) => {
        workerPool.submitTask({
          taskId,
          type: 'compress',
          priority: 1,
          payload: {
            points: inputData.points,
            colors: inputData.colors,
            intensities: inputData.intensities,
            pointCount: inputData.pointCount,
            compressionLevel
          }
        }, (message) => {
          if (message.type === 'complete') {
            resolve({
              compressed: message.data,
              hash: message.data.hash,
              ratio: message.data.compressionRatio
            })
          } else if (message.type === 'error') {
            reject(new Error(message.error))
          }
        })
      })
    } catch (error) {
      console.error('数据压缩失败:', error)
      return null
    }
  }

  function getDefaultConfig(): DownsamplingConfig {
    return {
      voxelSize: 0.1,
      distanceThreshold: 0.5,
      intensityFilter: { min: 0, max: 1 },
      removeOutliers: true,
      outlierThreshold: 5,
      compressionLevel: 6
    }
  }

  function estimateProcessingTime(pointCount: number, config: DownsamplingConfig): number {
    const baseTime = pointCount * 0.001
    let multiplier = 1.0

    if (config.removeOutliers) multiplier *= 1.5
    multiplier *= (1 + config.compressionLevel * 0.1)

    return baseTime * multiplier
  }

  function validateConfig(config: DownsamplingConfig): string[] {
    const errors: string[] = []

    if (config.voxelSize <= 0) {
      errors.push('体素尺寸必须大于0')
    }
    if (config.distanceThreshold <= 0) {
      errors.push('距离阈值必须大于0')
    }
    if (config.intensityFilter.min < 0 || config.intensityFilter.min > 1) {
      errors.push('强度过滤最小值必须在0-1之间')
    }
    if (config.intensityFilter.max < 0 || config.intensityFilter.max > 1) {
      errors.push('强度过滤最大值必须在0-1之间')
    }
    if (config.intensityFilter.min > config.intensityFilter.max) {
      errors.push('强度过滤最小值不能大于最大值')
    }
    if (config.removeOutliers && config.outlierThreshold < 3) {
      errors.push('离群点阈值不能小于3')
    }
    if (config.compressionLevel < 0 || config.compressionLevel > 9) {
      errors.push('压缩级别必须在0-9之间')
    }

    return errors
  }

  function reset(): void {
    isProcessing.value = false
    currentStage.value = ''
    progress.value = 0
    processingStats.originalPointCount = 0
    processingStats.processedPointCount = 0
    processingStats.processingTime = 0
    processingStats.compressionRatio = 0
  }

  return {
    isProcessing,
    currentStage,
    progress,
    processingStats,
    processPointCloud,
    processPointCloudAsync,
    buildTopology,
    compressData,
    getDefaultConfig,
    estimateProcessingTime,
    validateConfig,
    reset
  }
}
