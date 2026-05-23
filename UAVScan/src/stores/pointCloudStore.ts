import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PointCloud, PointCloudData, DownsamplingConfig, BoundingBox } from '@/types'
import { pointCloudDB } from '@/utils/storage/indexedDB'
import { usePointCloudProcessor } from '@/composables/usePointCloudProcessor'

const processor = usePointCloudProcessor()

export const usePointCloudStore = defineStore('pointCloud', () => {
  const pointClouds = ref<PointCloud[]>([])
  const currentPointCloud = ref<PointCloud | null>(null)
  const currentData = ref<PointCloudData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const downsamplingConfig = ref<DownsamplingConfig>(processor.getDefaultConfig())
  const viewMode = ref<'original' | 'downsampled'>('downsampled')

  const totalPoints = computed(() => {
    return pointClouds.value.reduce((sum, pc) => sum + pc.originalPoints, 0)
  })

  const totalSize = computed(() => {
    return pointClouds.value.reduce((sum, pc) => sum + pc.fileSize, 0)
  })

  const compressionRatio = computed(() => {
    if (!currentPointCloud.value) return 0
    return (1 - currentPointCloud.value.downsampledPoints / currentPointCloud.value.originalPoints) * 100
  })

  async function loadPointClouds() {
    loading.value = true
    error.value = null
    try {
      pointClouds.value = await pointCloudDB.getAll()
    } catch (e) {
      error.value = '加载点云列表失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function selectPointCloud(id: string) {
    loading.value = true
    error.value = null
    try {
      const pc = await pointCloudDB.getById(id)
      if (pc) {
        currentPointCloud.value = pc
        currentData.value = pc.data
      }
    } catch (e) {
      error.value = '加载点云数据失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addPointCloud(pc: PointCloud) {
    try {
      await pointCloudDB.add(pc)
      pointClouds.value.push(pc)
    } catch (e) {
      error.value = '保存点云失败'
      console.error(e)
    }
  }

  async function removePointCloud(id: string) {
    try {
      await pointCloudDB.delete(id)
      pointClouds.value = pointClouds.value.filter(pc => pc.id !== id)
      if (currentPointCloud.value?.id === id) {
        currentPointCloud.value = null
        currentData.value = null
      }
    } catch (e) {
      error.value = '删除点云失败'
      console.error(e)
    }
  }

  function updateDownsamplingConfig(config: Partial<DownsamplingConfig>) {
    downsamplingConfig.value = { ...downsamplingConfig.value, ...config }
  }

  function setViewMode(mode: 'original' | 'downsampled') {
    viewMode.value = mode
  }

  function getBoundingBox(): BoundingBox | null {
    if (!currentData.value) return null
    const positions = currentData.value.points
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i])
      minY = Math.min(minY, positions[i + 1])
      minZ = Math.min(minZ, positions[i + 2])
      maxX = Math.max(maxX, positions[i])
      maxY = Math.max(maxY, positions[i + 1])
      maxZ = Math.max(maxZ, positions[i + 2])
    }
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }
  }

  function clearCurrent() {
    currentPointCloud.value = null
    currentData.value = null
  }

  return {
    pointClouds,
    currentPointCloud,
    currentData,
    loading,
    error,
    downsamplingConfig,
    viewMode,
    totalPoints,
    totalSize,
    compressionRatio,
    loadPointClouds,
    selectPointCloud,
    addPointCloud,
    removePointCloud,
    updateDownsamplingConfig,
    setViewMode,
    getBoundingBox,
    clearCurrent
  }
})
