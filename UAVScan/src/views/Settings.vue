<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-cyber-border bg-cyber-bg-light/50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
          <component :is="icons.Settings" class="w-5 h-5 text-electric-blue" />
        </div>
        <div>
          <h2 class="font-semibold text-cyber-text">系统设置</h2>
          <p class="text-xs text-cyber-text-secondary">配置点云处理系统参数</p>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4 grid-bg">
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="cyber-card">
          <h3 class="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
            <component :is="icons.Cpu" class="w-5 h-5 text-electric-blue" />
            处理引擎配置
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">Worker 线程数</label>
              <input
                v-model.number="settings.workerCount"
                type="range"
                min="1"
                max="8"
                class="w-full h-2 bg-cyber-bg-lighter rounded-lg appearance-none cursor-pointer accent-electric-blue"
              />
              <div class="flex justify-between text-xs text-cyber-text-muted mt-1">
                <span>1</span>
                <span class="font-mono text-electric-blue">{{ settings.workerCount }} 线程</span>
                <span>8</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">默认体素大小 (m)</label>
              <input
                v-model.number="settings.defaultVoxelSize"
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                class="cyber-input"
              />
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">去噪邻域点数</label>
              <input
                v-model.number="settings.denoiseKNeighbors"
                type="number"
                min="5"
                max="100"
                class="cyber-input"
              />
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">去噪标准差倍数</label>
              <input
                v-model.number="settings.denoiseStdMul"
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                class="cyber-input"
              />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.enableAdaptiveVoxel"
                  type="checkbox"
                  id="adaptive-voxel"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="adaptive-voxel" class="text-sm text-cyber-text">启自适应体素下采样</label>
              </div>
              <p class="text-xs text-cyber-text-muted ml-6">根据点云密度自动调整体素大小</p>
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.enableLOD"
                  type="checkbox"
                  id="enable-lod"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="enable-lod" class="text-sm text-cyber-text">启用LOD层级渲染</label>
              </div>
              <p class="text-xs text-cyber-text-muted ml-6">根据视距动态调整点云显示密度</p>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
            <component :is="icons.Database" class="w-5 h-5 text-electric-blue" />
            存储配置
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">最大缓存大小 (GB)</label>
              <input
                v-model.number="settings.maxCacheSize"
                type="number"
                min="1"
                max="100"
                class="cyber-input"
              />
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">默认快照保留天数</label>
              <input
                v-model.number="settings.defaultRetentionDays"
                type="number"
                min="1"
                max="365"
                class="cyber-input"
              />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.autoCleanExpired"
                  type="checkbox"
                  id="auto-clean"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="auto-clean" class="text-sm text-cyber-text">自动清理过期快照</label>
              </div>
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.enableCompression"
                  type="checkbox"
                  id="enable-compression"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="enable-compression" class="text-sm text-cyber-text">启用数据压缩</label>
              </div>
              <p class="text-xs text-cyber-text-muted ml-6">使用Draco压缩算法减少存储占用</p>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
            <component :is="icons.Network" class="w-5 h-5 text-electric-blue" />
            网络配置
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="block text-sm text-cyber-text-secondary mb-2">省电网数据库端点</label>
              <input
                v-model="settings.gridDbEndpoint"
                type="text"
                placeholder="https://grid-db.province.com/api"
                class="cyber-input"
              />
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">同步间隔 (秒)</label>
              <input
                v-model.number="settings.syncInterval"
                type="number"
                min="10"
                max="3600"
                class="cyber-input"
              />
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">分块大小 (MB)</label>
              <input
                v-model.number="settings.chunkSize"
                type="number"
                min="1"
                max="100"
                class="cyber-input"
              />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.enableChecksum"
                  type="checkbox"
                  id="enable-checksum"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="enable-checksum" class="text-sm text-cyber-text">启用数据校验</label>
              </div>
              <p class="text-xs text-cyber-text-muted ml-6">使用SHA-256校验数据完整性</p>
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.autoSync"
                  type="checkbox"
                  id="auto-sync-setting"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="auto-sync-setting" class="text-sm text-cyber-text">自动同步处理结果</label>
              </div>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
            <component :is="icons.Monitor" class="w-5 h-5 text-electric-blue" />
            可视化配置
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">默认点大小</label>
              <input
                v-model.number="settings.defaultPointSize"
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                class="w-full h-2 bg-cyber-bg-lighter rounded-lg appearance-none cursor-pointer accent-electric-blue"
              />
              <div class="flex justify-between text-xs text-cyber-text-muted mt-1">
                <span>0.1</span>
                <span class="font-mono text-electric-blue">{{ settings.defaultPointSize }}</span>
                <span>10</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">背景颜色</label>
              <div class="flex gap-2">
                <button
                  v-for="color in bgColors"
                  :key="color.value"
                  @click="settings.bgColor = color.value"
                  class="w-10 h-10 rounded-lg border-2 transition-all"
                  :class="settings.bgColor === color.value ? 'border-electric-blue' : 'border-transparent'"
                  :style="{ backgroundColor: color.value }"
                  :title="color.label"
                ></button>
              </div>
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">颜色映射</label>
              <select v-model="settings.colorMapping" class="cyber-input">
                <option value="height">高度映射</option>
                <option value="intensity">强度映射</option>
                <option value="classification">分类映射</option>
                <option value="normal">法向量映射</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-cyber-text-secondary mb-2">目标帧率 (FPS)</label>
              <input
                v-model.number="settings.targetFps"
                type="number"
                min="30"
                max="120"
                class="cyber-input"
              />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.showGrid"
                  type="checkbox"
                  id="show-grid"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="show-grid" class="text-sm text-cyber-text">显示网格</label>
              </div>
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="settings.showAxes"
                  type="checkbox"
                  id="show-axes"
                  class="w-4 h-4 accent-electric-blue"
                />
                <label for="show-axes" class="text-sm text-cyber-text">显示坐标轴</label>
              </div>
            </div>
          </div>
        </div>

        <div class="cyber-card">
          <h3 class="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
            <component :is="icons.Info" class="w-5 h-5 text-electric-blue" />
            关于系统
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="flex justify-between">
              <span class="text-cyber-text-secondary">系统版本</span>
              <span class="font-mono text-cyber-text">v1.0.0</span>
            </div>
            <div class="flex justify-between">
              <span class="text-cyber-text-secondary">Vue版本</span>
              <span class="font-mono text-cyber-text">v3.4.0</span>
            </div>
            <div class="flex justify-between">
              <span class="text-cyber-text-secondary">Three.js版本</span>
              <span class="font-mono text-cyber-text">v0.160.0</span>
            </div>
            <div class="flex justify-between">
              <span class="text-cyber-text-secondary">构建时间</span>
              <span class="font-mono text-cyber-text">{{ buildTime }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button @click="resetToDefaults" class="cyber-btn">
            恢复默认
          </button>
          <button @click="saveSettings" class="cyber-btn-primary">
            保存设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Settings' })
import { ref, reactive, onMounted } from 'vue'
import {
  Settings,
  Cpu,
  Database,
  Network,
  Monitor,
  Info
} from 'lucide-vue-next'
import { useUiStore } from '@/stores'

const uiStore = useUiStore()

const icons = {
  Settings,
  Cpu,
  Database,
  Network,
  Monitor,
  Info
}

const buildTime = ref(new Date().toLocaleString('zh-CN'))

const bgColors = [
  { value: '#0a0e17', label: '深空灰' },
  { value: '#000000', label: '纯黑' },
  { value: '#1a1a2e', label: '深蓝紫' },
  { value: '#2d3436', label: '石墨灰' }
]

const settings = reactive({
  workerCount: 4,
  defaultVoxelSize: 0.1,
  denoiseKNeighbors: 50,
  denoiseStdMul: 1.0,
  enableAdaptiveVoxel: true,
  enableLOD: true,
  maxCacheSize: 10,
  defaultRetentionDays: 30,
  autoCleanExpired: true,
  enableCompression: true,
  gridDbEndpoint: 'https://grid-db.province.com/api',
  syncInterval: 30,
  chunkSize: 10,
  enableChecksum: true,
  autoSync: true,
  defaultPointSize: 2.0,
  bgColor: '#0a0e17',
  colorMapping: 'height',
  targetFps: 60,
  showGrid: true,
  showAxes: true
})

const defaultSettings = { ...settings }

function saveSettings() {
  localStorage.setItem('uavscan-settings', JSON.stringify(settings))
  
  uiStore.addNotification({
    type: 'success',
    title: '设置已保存',
    message: '系统配置已更新并保存到本地'
  })
}

function resetToDefaults() {
  Object.assign(settings, defaultSettings)
  
  uiStore.addNotification({
    type: 'info',
    title: '已恢复默认',
    message: '所有设置已恢复为默认值'
  })
}

onMounted(() => {
  const saved = localStorage.getItem('uavscan-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings, parsed)
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }
})
</script>
