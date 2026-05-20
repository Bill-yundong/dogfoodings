<script setup lang="ts">
import { ref } from 'vue'
import { useBatteryStore } from '@/stores/battery'
import { Save, Database, Trash2, RefreshCw } from 'lucide-vue-next'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { ElMessage } from 'element-plus'

const batteryStore = useBatteryStore()
const { clearOldData, isReady } = useIndexedDB()

const settings = ref({
  autoSaveSnapshot: true,
  snapshotInterval: 5000,
  maxSnapshots: 10000,
  enableNotifications: true,
  autoStartSimulation: false,
  criticalTemperature: 180,
  warningTemperature: 55,
  dataRetentionDays: 30
})

function saveSettings() {
  localStorage.setItem('battery-logic-settings', JSON.stringify(settings.value))
  ElMessage.success('设置已保存')
}

function loadSettings() {
  const saved = localStorage.getItem('battery-logic-settings')
  if (saved) {
    settings.value = JSON.parse(saved)
  }
}

async function clearDatabase() {
  if (confirm('确定要清除所有历史数据吗？此操作不可恢复。')) {
    const cutoffTime = Date.now()
    await clearOldData(cutoffTime)
    ElMessage.success('历史数据已清除')
  }
}

function resetAllSettings() {
  if (confirm('确定要重置所有设置到默认值吗？')) {
    settings.value = {
      autoSaveSnapshot: true,
      snapshotInterval: 5000,
      maxSnapshots: 10000,
      enableNotifications: true,
      autoStartSimulation: false,
      criticalTemperature: 180,
      warningTemperature: 55,
      dataRetentionDays: 30
    }
    localStorage.removeItem('battery-logic-settings')
    ElMessage.success('设置已重置')
  }
}

function exportConfig() {
  const config = {
    settings: settings.value,
    arrheniusParams: batteryStore.arrheniusParams,
    mappingRules: batteryStore.mappingRules,
    exportedAt: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `battery-logic-config-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

loadSettings()
</script>

<template>
  <div class="h-full flex flex-col gap-6 overflow-y-auto">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-white">系统设置</h2>
      <button @click="saveSettings" class="btn-primary flex items-center gap-2">
        <Save class="w-4 h-4" />
        保存设置
      </button>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div class="glass-card p-5">
        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
          <Database class="w-5 h-5 text-primary" />
          数据存储设置
        </h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-dark-100">自动保存快照</div>
              <div class="text-xs text-dark-400">开启后将定期保存电芯数据快照</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="settings.autoSaveSnapshot" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm text-dark-100">快照保存间隔</div>
                <div class="text-xs text-dark-400">单位：毫秒</div>
              </div>
              <input
                v-model.number="settings.snapshotInterval"
                type="number"
                min="1000"
                max="60000"
                step="1000"
                class="w-24 bg-dark-600 border border-dark-500 rounded px-3 py-1.5 text-sm text-dark-100 text-right"
              />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm text-dark-100">最大快照数量</div>
                <div class="text-xs text-dark-400">超出后将自动删除最早的快照</div>
              </div>
              <input
                v-model.number="settings.maxSnapshots"
                type="number"
                min="100"
                max="100000"
                step="100"
                class="w-24 bg-dark-600 border border-dark-500 rounded px-3 py-1.5 text-sm text-dark-100 text-right"
              />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm text-dark-100">数据保留天数</div>
                <div class="text-xs text-dark-400">超出天数的数据将被自动清理</div>
              </div>
              <input
                v-model.number="settings.dataRetentionDays"
                type="number"
                min="1"
                max="365"
                class="w-24 bg-dark-600 border border-dark-500 rounded px-3 py-1.5 text-sm text-dark-100 text-right"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
          <RefreshCw class="w-5 h-5 text-warning" />
          预警阈值设置
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm text-dark-100">预警温度阈值</div>
                <div class="text-xs text-dark-400">超过此温度将触发预警</div>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="settings.warningTemperature"
                  type="number"
                  min="30"
                  max="80"
                  class="w-20 bg-dark-600 border border-dark-500 rounded px-3 py-1.5 text-sm text-dark-100 text-right"
                />
                <span class="text-sm text-dark-400">°C</span>
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm text-dark-100">临界温度阈值</div>
                <div class="text-xs text-dark-400">超过此温度视为热失控</div>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="settings.criticalTemperature"
                  type="number"
                  min="80"
                  max="300"
                  class="w-20 bg-dark-600 border border-dark-500 rounded px-3 py-1.5 text-sm text-dark-100 text-right"
                />
                <span class="text-sm text-dark-400">°C</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-dark-100">启用通知</div>
              <div class="text-xs text-dark-400">发生告警时发送系统通知</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="settings.enableNotifications" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-dark-100">自动启动模拟</div>
              <div class="text-xs text-dark-400">进入页面时自动开始模拟</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="settings.autoStartSimulation" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="text-white font-semibold mb-4">数据管理</h3>
        <div class="space-y-3">
          <button @click="exportConfig" class="w-full btn-ghost justify-center flex items-center gap-2">
            <Save class="w-4 h-4" />
            导出配置文件
          </button>
          <button @click="resetAllSettings" class="w-full btn-ghost justify-center flex items-center gap-2 text-warning hover:text-warning">
            <RefreshCw class="w-4 h-4" />
            重置所有设置
          </button>
          <button @click="clearDatabase" class="w-full btn-ghost justify-center flex items-center gap-2 text-danger hover:text-danger">
            <Trash2 class="w-4 h-4" />
            清除所有历史数据
          </button>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="text-white font-semibold mb-4">系统信息</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-dark-400">系统名称</span>
            <span class="text-dark-100 font-medium">BatteryLogic</span>
          </div>
          <div class="flex justify-between">
            <span class="text-dark-400">版本号</span>
            <span class="text-dark-100 font-mono">v0.1.0</span>
          </div>
          <div class="flex justify-between">
            <span class="text-dark-400">技术栈</span>
            <span class="text-dark-100">Vue 3 + TypeScript</span>
          </div>
          <div class="flex justify-between">
            <span class="text-dark-400">IndexedDB 状态</span>
            <span :class="isReady ? 'text-success' : 'text-warning'">
              {{ isReady ? '已连接' : '连接中...' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-dark-400">当前电芯数</span>
            <span class="text-dark-100 font-mono">{{ batteryStore.allCells.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-dark-400">映射规则数</span>
            <span class="text-dark-100 font-mono">{{ batteryStore.mappingRules.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-5">
      <h3 class="text-white font-semibold mb-4">关于 BatteryLogic</h3>
      <p class="text-sm text-dark-300 leading-relaxed">
        BatteryLogic 是一个基于 Vue 3 的储能电站电池包热失控蔓延模拟系统。
        利用异步阿伦尼乌斯热生成模型预测热连锁反应，配合 IndexedDB 存储电芯电压与温度的历史快照，
        构建了跨区域储能资产的安全运行总线。系统实现了 BMS 数据与消防联动模块间的语义对齐，
        为储能电站的安全运行提供全链路解决方案。
      </p>
    </div>
  </div>
</template>
