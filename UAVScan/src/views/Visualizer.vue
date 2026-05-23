<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-cyber-border bg-cyber-bg-light/50 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <component :is="icons.Box" class="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h2 class="font-semibold text-cyber-text">
              {{ pointCloudStore.currentPointCloud?.name || '点云可视化' }}
            </h2>
            <p v-if="pointCloudStore.currentPointCloud" class="text-xs text-cyber-text-secondary">
              {{ formatNumber(pointCloudStore.currentPointCloud.originalPoints) }} 原始点
              <span class="mx-1">→</span>
              <span class="text-success-green">{{ formatNumber(pointCloudStore.currentPointCloud.downsampledPoints) }} 采样点</span>
            </p>
          </div>
        </div>

        <div class="h-8 w-px bg-cyber-border"></div>

        <div class="flex items-center gap-2">
          <button
            @click="pointCloudStore.setViewMode('original')"
            class="px-3 py-1.5 text-sm rounded-lg transition-all"
            :class="pointCloudStore.viewMode === 'original'
              ? 'bg-warning-orange/20 text-warning-orange border border-warning-orange/30'
              : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter'"
          >
            原始数据
          </button>
          <button
            @click="pointCloudStore.setViewMode('downsampled')"
            class="px-3 py-1.5 text-sm rounded-lg transition-all"
            :class="pointCloudStore.viewMode === 'downsampled'
              ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
              : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter'"
          >
            降采样
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <select
          v-model="selectedPointCloudId"
          @change="handleSelectPointCloud"
          class="cyber-input text-sm w-64"
        >
          <option value="">选择点云数据...</option>
          <option v-for="pc in pointCloudStore.pointClouds" :key="pc.id" :value="pc.id">
            {{ pc.name }}
          </option>
        </select>

        <button
          @click="showUploadModal = true"
          class="cyber-btn-primary flex items-center gap-2"
        >
          <component :is="icons.Upload" class="w-4 h-4" />
          上传点云
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div
        v-if="showLeftPanel"
        class="w-80 bg-cyber-bg-light border-r border-cyber-border overflow-y-auto flex-shrink-0"
      >
        <div class="p-4 space-y-4">
          <div class="cyber-card">
            <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
              <component :is="icons.Info" class="w-4 h-4 text-electric-blue" />
              基本信息
            </h3>
            <div v-if="pointCloudStore.currentPointCloud" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">文件格式</span>
                <span class="font-mono text-cyber-text">{{ pointCloudStore.currentPointCloud.format }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">文件大小</span>
                <span class="font-mono text-cyber-text">{{ pointCloudStore.currentPointCloud.fileSize.toFixed(1) }} MB</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">压缩后</span>
                <span class="font-mono text-success-green">{{ pointCloudStore.currentPointCloud.compressedSize.toFixed(1) }} MB</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">压缩率</span>
                <span class="font-mono text-electric-blue">{{ pointCloudStore.compressionRatio.toFixed(1) }}%</span>
              </div>
              <div class="cyber-divider"></div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">创建时间</span>
                <span class="font-mono text-cyber-text">{{ formatDate(pointCloudStore.currentPointCloud.createdAt) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">更新时间</span>
                <span class="font-mono text-cyber-text">{{ formatDate(pointCloudStore.currentPointCloud.updatedAt) }}</span>
              </div>
            </div>
            <div v-else class="text-center py-4 text-cyber-text-secondary text-sm">
              请选择点云数据
            </div>
          </div>

          <div v-if="pointCloudStore.currentPointCloud?.metadata" class="cyber-card">
            <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
              <component :is="icons.Plane" class="w-4 h-4 text-electric-blue" />
              采集信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">航班号</span>
                <span class="font-mono text-cyber-text">{{ pointCloudStore.currentPointCloud.metadata.flightId || '-' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">无人机型号</span>
                <span class="text-cyber-text">{{ pointCloudStore.currentPointCloud.metadata.droneModel || '-' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">传感器</span>
                <span class="text-cyber-text">{{ pointCloudStore.currentPointCloud.metadata.sensorModel || '-' }}</span>
              </div>
              <div class="cyber-divider"></div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">纬度</span>
                <span class="font-mono text-cyber-text">{{ (pointCloudStore.currentPointCloud.metadata.location.lat || pointCloudStore.currentPointCloud.metadata.location.latitude).toFixed(4) }}°</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">经度</span>
                <span class="font-mono text-cyber-text">{{ (pointCloudStore.currentPointCloud.metadata.location.lng || pointCloudStore.currentPointCloud.metadata.location.longitude).toFixed(4) }}°</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">海拔</span>
                <span class="font-mono text-cyber-text">{{ pointCloudStore.currentPointCloud.metadata.location.altitude.toFixed(1) }}m</span>
              </div>
            </div>
          </div>

          <div v-if="selectedPoint" class="cyber-card border-electric-blue/50">
            <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
              <component :is="icons.MapPin" class="w-4 h-4 text-electric-blue" />
              选中点信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">索引</span>
                <span class="font-mono text-cyber-text">{{ selectedPoint.index }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">X 坐标</span>
                <span class="font-mono text-cyber-text">{{ selectedPoint.x.toFixed(3) }}m</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">Y 坐标</span>
                <span class="font-mono text-cyber-text">{{ selectedPoint.y.toFixed(3) }}m</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-cyber-text-secondary">Z 坐标</span>
                <span class="font-mono text-cyber-text">{{ selectedPoint.z.toFixed(3) }}m</span>
              </div>
            </div>
          </div>

          <div class="cyber-card">
            <h3 class="text-sm font-medium text-cyber-text mb-3 flex items-center gap-2">
              <component :is="icons.Square" class="w-4 h-4 text-electric-blue" />
              边界框
            </h3>
            <div v-if="boundingBox" class="space-y-2">
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="text-cyber-text-muted">轴</div>
                <div class="text-cyber-text-muted">最小</div>
                <div class="text-cyber-text-muted">最大</div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-sm font-mono">
                <span class="text-electric-blue">X</span>
                <span class="text-cyber-text">{{ boundingBox.min.x.toFixed(2) }}</span>
                <span class="text-cyber-text">{{ boundingBox.max.x.toFixed(2) }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-sm font-mono">
                <span class="text-success-green">Y</span>
                <span class="text-cyber-text">{{ boundingBox.min.y.toFixed(2) }}</span>
                <span class="text-cyber-text">{{ boundingBox.max.y.toFixed(2) }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-sm font-mono">
                <span class="text-warning-orange">Z</span>
                <span class="text-cyber-text">{{ boundingBox.min.z.toFixed(2) }}</span>
                <span class="text-cyber-text">{{ boundingBox.max.z.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 relative">
        <PointCloudViewer
          :point-cloud-data="displayData"
          :loading="loading"
          loading-text="正在加载点云数据..."
          @point-click="handlePointClick"
        />

        <button
          @click="toggleLeftPanel"
          class="absolute top-4 left-4 z-10 cyber-btn py-2 px-3"
        >
          <component :is="showLeftPanel ? icons.ChevronLeft : icons.ChevronRight" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showUploadModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showUploadModal = false"
      >
        <div class="w-full max-w-lg cyber-card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-cyber-text">上传点云文件</h2>
            <button
              @click="showUploadModal = false"
              class="p-1 rounded-md text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-colors"
            >
              <component :is="icons.X" class="w-5 h-5" />
            </button>
          </div>

          <div
            @dragover.prevent
            @drop.prevent="handleDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
            :class="uploadDragOver
              ? 'border-electric-blue bg-electric-blue/5'
              : 'border-cyber-border hover:border-cyber-text-muted bg-cyber-bg-lighter'"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".las,.laz,.ply,.xyz"
              class="hidden"
              @change="handleFileSelect"
            />
            
            <div v-if="!uploadFile">
              <component :is="icons.UploadCloud" class="w-12 h-12 text-cyber-text-muted mx-auto mb-4" />
              <p class="text-cyber-text mb-2">拖拽点云文件到此处</p>
              <p class="text-sm text-cyber-text-secondary mb-4">或点击选择文件</p>
              <button @click="fileInputRef?.click()" class="cyber-btn">
                选择文件
              </button>
              <p class="text-xs text-cyber-text-muted mt-4">支持 LAS, LAZ, PLY, XYZ 格式</p>
            </div>

            <div v-else class="space-y-4">
              <div class="flex items-center gap-3 p-3 rounded-lg bg-cyber-bg border border-cyber-border">
                <component :is="icons.File" class="w-8 h-8 text-electric-blue flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-cyber-text truncate">{{ uploadFile.name }}</p>
                  <p class="text-sm text-cyber-text-secondary">{{ formatBytes(uploadFile.size) }}</p>
                </div>
                <button
                  @click.stop="clearUpload"
                  class="p-1 rounded text-cyber-text-secondary hover:text-error-red transition-colors"
                >
                  <component :is="icons.X" class="w-4 h-4" />
                </button>
              </div>

              <div v-if="uploadProgress > 0" class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-cyber-text-secondary">上传进度</span>
                  <span class="font-mono text-cyber-text">{{ uploadProgress }}%</span>
                </div>
                <div class="cyber-progress-bar">
                  <div class="cyber-progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="cyber-divider"></div>

          <div class="flex justify-end gap-3">
            <button @click="showUploadModal = false" class="cyber-btn">
              取消
            </button>
            <button
              @click="handleUpload"
              :disabled="!uploadFile || uploadProgress > 0"
              class="cyber-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ uploadProgress > 0 ? '上传中...' : '开始上传' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Box,
  Upload,
  Info,
  Plane,
  MapPin,
  Square,
  ChevronLeft,
  ChevronRight,
  X,
  UploadCloud,
  File
} from 'lucide-vue-next'
import PointCloudViewer from '@/components/pointcloud/PointCloudViewer.vue'
import { usePointCloudStore, useUiStore } from '@/stores'
import { mockApi } from '@/api'
import type { PointCloudData } from '@/types'

const pointCloudStore = usePointCloudStore()
const uiStore = useUiStore()

const icons = {
  Box,
  Upload,
  Info,
  Plane,
  MapPin,
  Square,
  ChevronLeft,
  ChevronRight,
  X,
  UploadCloud,
  File
}

const showLeftPanel = ref(true)
const showUploadModal = ref(false)
const selectedPointCloudId = ref('')
const uploadDragOver = ref(false)
const uploadFile = ref<File | null>(null)
const uploadProgress = ref(0)
const loading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const selectedPoint = ref<{ x: number; y: number; z: number; index: number } | null>(null)

const boundingBox = computed(() => pointCloudStore.getBoundingBox())

const displayData = computed<PointCloudData | null>(() => {
  if (!pointCloudStore.currentData) return null
  if (pointCloudStore.viewMode === 'original') {
    return pointCloudStore.currentData
  }
  return pointCloudStore.currentData
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toggleLeftPanel() {
  showLeftPanel.value = !showLeftPanel.value
}

function handleSelectPointCloud() {
  if (selectedPointCloudId.value) {
    loading.value = true
    pointCloudStore.selectPointCloud(selectedPointCloudId.value)
      .finally(() => {
        loading.value = false
      })
  }
}

function handlePointClick(point: { x: number; y: number; z: number; index: number }) {
  selectedPoint.value = point
}

function handleDrop(e: DragEvent) {
  uploadDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile.value = files[0]
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    uploadFile.value = target.files[0]
  }
}

function clearUpload() {
  uploadFile.value = null
  uploadProgress.value = 0
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function handleUpload() {
  if (!uploadFile.value) return

  uploadProgress.value = 0
  uiStore.addNotification({
    type: 'info',
    title: '开始上传',
    message: `正在上传 ${uploadFile.value.name}...`
  })

  try {
    const result = await mockApi.uploadPointCloud(uploadFile.value, (progress) => {
      uploadProgress.value = progress
    })

    await pointCloudStore.addPointCloud(result)
    selectedPointCloudId.value = result.id
    
    uiStore.addNotification({
      type: 'success',
      title: '上传成功',
      message: `${uploadFile.value.name} 已成功上传`
    })

    setTimeout(() => {
      handleSelectPointCloud()
    }, 500)

    showUploadModal.value = false
    clearUpload()
  } catch (e) {
    uiStore.addNotification({
      type: 'error',
      title: '上传失败',
      message: e instanceof Error ? e.message : '未知错误'
    })
  }
}

let isInitialized = false

onMounted(() => {
  if (!isInitialized) {
    isInitialized = true
    pointCloudStore.loadPointClouds()
    
    setTimeout(() => {
      if (pointCloudStore.pointClouds.length > 0 && !pointCloudStore.currentPointCloud) {
        selectedPointCloudId.value = pointCloudStore.pointClouds[0].id
        handleSelectPointCloud()
      }
    }, 100)
  }
})

watch(() => pointCloudStore.currentPointCloud, (pc) => {
  if (pc) {
    selectedPoint.value = null
  }
})
</script>
