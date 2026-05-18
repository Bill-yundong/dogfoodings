<template>
  <div class="settings-view">
    <div class="grid grid-cols-3 gap-6">
      <div class="tech-card col-span-2">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="阈值配置" name="thresholds">
            <div class="space-y-6">
              <div v-for="(config, key) in thresholdConfigs" :key="key"
                   class="p-4 bg-tech-bg/50 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-text-primary font-medium">{{ config.name }}</h4>
                  <el-switch v-model="config.enabled" />
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="text-text-secondary text-xs mb-1 block">警告阈值</label>
                    <el-input-number v-model="config.warning" :min="0" :max="config.max" :step="config.step" class="w-full" />
                  </div>
                  <div>
                    <label class="text-text-secondary text-xs mb-1 block">严重阈值</label>
                    <el-input-number v-model="config.critical" :min="0" :max="config.max" :step="config.step" class="w-full" />
                  </div>
                  <div>
                    <label class="text-text-secondary text-xs mb-1 block">单位</label>
                    <el-input v-model="config.unit" disabled class="w-full" />
                  </div>
                </div>
              </div>

              <div class="flex justify-end gap-3">
                <el-button>重置默认</el-button>
                <el-button type="primary" @click="saveThresholds">保存配置</el-button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="用户管理" name="users">
            <div class="mb-4 flex justify-between">
              <el-input v-model="userSearch" placeholder="搜索用户..." class="w-64" clearable />
              <el-button type="primary">
                <el-icon class="mr-1"><Plus /></el-icon>
                添加用户
              </el-button>
            </div>
            <el-table :data="users" stripe>
              <el-table-column prop="name" label="用户名" width="150" />
              <el-table-column prop="email" label="邮箱" width="200" />
              <el-table-column label="角色" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                    {{ row.role === 'admin' ? '管理员' : '运维工程师' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="region" label="区域" width="120" />
              <el-table-column prop="lastLogin" label="最后登录" width="180" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                    {{ row.status === 'active' ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default>
                  <el-button text size="small">编辑</el-button>
                  <el-button text size="small" type="danger">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="区域管理" name="regions">
            <div class="mb-4 flex justify-between">
              <el-button type="primary">
                <el-icon class="mr-1"><Plus /></el-icon>
                添加区域
              </el-button>
            </div>
            <el-table :data="regions" stripe>
              <el-table-column prop="name" label="区域名称" width="150" />
              <el-table-column prop="description" label="描述" />
              <el-table-column prop="deviceCount" label="设备数量" width="120" align="center" />
              <el-table-column prop="manager" label="负责人" width="120" />
              <el-table-column label="操作" width="150">
                <template #default>
                  <el-button text size="small">编辑</el-button>
                  <el-button text size="small" type="danger">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="数据同步" name="sync">
            <div class="space-y-6">
              <div class="p-4 bg-tech-bg/50 rounded-lg">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="text-text-primary font-medium">自动同步</h4>
                    <p class="text-text-secondary text-sm">定期从边缘节点同步设备数据</p>
                  </div>
                  <el-switch v-model="syncConfig.autoSync" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-text-secondary text-xs mb-1 block">同步间隔</label>
                    <el-select v-model="syncConfig.interval" class="w-full">
                      <el-option label="5 分钟" value="5" />
                      <el-option label="15 分钟" value="15" />
                      <el-option label="30 分钟" value="30" />
                      <el-option label="1 小时" value="60" />
                    </el-select>
                  </div>
                  <div>
                    <label class="text-text-secondary text-xs mb-1 block">数据保留期</label>
                    <el-select v-model="syncConfig.retention" class="w-full">
                      <el-option label="7 天" value="7" />
                      <el-option label="30 天" value="30" />
                      <el-option label="90 天" value="90" />
                      <el-option label="1 年" value="365" />
                    </el-select>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <el-button type="primary" @click="syncNow">
                  <el-icon class="mr-1"><Refresh /></el-icon>
                  立即同步
                </el-button>
                <el-button>
                  <el-icon class="mr-1"><Download /></el-icon>
                  导出数据
                </el-button>
                <el-button type="danger">
                  <el-icon class="mr-1"><Delete /></el-icon>
                  清理历史数据
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="关于" name="about">
            <div class="text-center py-8">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-tech-accent to-tech-accent-dark flex items-center justify-center mx-auto mb-6">
                <el-icon :size="40" color="#0A192F"><Cpu /></el-icon>
              </div>
              <h3 class="text-2xl font-bold text-text-primary mb-2">PumpLink</h3>
              <p class="text-text-secondary mb-6">离心泵组智能预测性维护系统</p>
              <div class="space-y-2 text-sm text-text-secondary">
                <p>版本: v1.0.0</p>
                <p>构建时间: 2024-01-15</p>
                <p>技术栈: Vue 3 + TypeScript + ECharts + IndexedDB</p>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="space-y-6">
        <div class="tech-card">
          <h3 class="text-text-primary font-medium mb-4">系统状态</h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-text-secondary">数据库连接</span>
                <span class="text-status-normal text-sm flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-status-normal"></span>
                  正常
                </span>
              </div>
              <div class="h-2 bg-tech-bg rounded-full">
                <div class="h-full w-full rounded-full bg-status-normal/60"></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-text-secondary">数据同步状态</span>
                <span class="text-status-normal text-sm">已同步</span>
              </div>
              <p class="text-xs text-text-secondary">最后同步: 2分钟前</p>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-text-secondary">缓存使用</span>
                <span class="text-tech-accent text-sm font-mono">68%</span>
              </div>
              <div class="h-2 bg-tech-bg rounded-full overflow-hidden">
                <div class="h-full w-[68%] rounded-full bg-tech-accent/60"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="tech-card">
          <h3 class="text-text-primary font-medium mb-4">快捷操作</h3>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleFileImport"
          />
          <div class="action-buttons space-y-2">
            <el-button class="w-full justify-start" @click="clearCache">
              <el-icon class="mr-2"><Delete /></el-icon>
              清除缓存
            </el-button>
            <el-button class="w-full justify-start" @click="reloadData">
              <el-icon class="mr-2"><Refresh /></el-icon>
              重新加载数据
            </el-button>
            <el-button class="w-full justify-start" @click="exportConfig">
              <el-icon class="mr-2"><Download /></el-icon>
              导出配置
            </el-button>
            <el-button class="w-full justify-start" @click="importConfig">
              <el-icon class="mr-2"><Upload /></el-icon>
              导入配置
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { closeDB, clearAllData } from '@/database'
import { useDeviceStore } from '@/stores/deviceStore'
import { useAlertStore } from '@/stores/alertStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { checkAndInitData } from '@/mock/init'

const deviceStore = useDeviceStore()
const alertStore = useAlertStore()
const snapshotStore = useSnapshotStore()

const activeTab = ref('thresholds')
const userSearch = ref('')
const fileInputRef = ref<HTMLInputElement>()

const thresholdConfigs = reactive({
  vibration: { name: '振动有效值', enabled: true, warning: 5.0, critical: 10.0, max: 50, step: 0.5, unit: 'mm/s' },
  temperature: { name: '轴承温度', enabled: true, warning: 75, critical: 90, max: 150, step: 1, unit: '°C' },
  pressure: { name: '入口压力', enabled: true, warning: 0.15, critical: 0.08, max: 1, step: 0.01, unit: 'MPa' },
  current: { name: '电机电流', enabled: true, warning: 150, critical: 180, max: 250, step: 1, unit: 'A' },
  flow: { name: '运行流量', enabled: true, warning: 200, critical: 150, max: 1000, step: 10, unit: 'm³/h' }
})

const users = ref([
  { name: '张工', email: 'zhang@example.com', role: 'admin', region: '华东区', lastLogin: '2024-01-15 09:30', status: 'active' },
  { name: '李工', email: 'li@example.com', role: 'engineer', region: '华南区', lastLogin: '2024-01-14 16:45', status: 'active' },
  { name: '王工', email: 'wang@example.com', role: 'engineer', region: '华北区', lastLogin: '2024-01-13 08:20', status: 'active' },
  { name: '赵工', email: 'zhao@example.com', role: 'engineer', region: '西南区', lastLogin: '2024-01-10 14:10', status: 'disabled' }
])

const regions = ref([
  { name: '华东区', description: '覆盖上海、江苏、浙江等省市', deviceCount: 18, manager: '张工' },
  { name: '华南区', description: '覆盖广东、广西、福建等省市', deviceCount: 12, manager: '李工' },
  { name: '华北区', description: '覆盖北京、天津、河北等省市', deviceCount: 10, manager: '王工' },
  { name: '西南区', description: '覆盖四川、重庆、云南等省市', deviceCount: 7, manager: '赵工' },
  { name: '西北区', description: '覆盖陕西、甘肃、新疆等省市', deviceCount: 3, manager: '待定' }
])

const syncConfig = reactive({
  autoSync: true,
  interval: '15',
  retention: '30'
})

function saveThresholds() {
  const configData = JSON.stringify(thresholdConfigs)
  localStorage.setItem('pumplink_thresholds', configData)
  ElMessage.success('阈值配置已保存')
}

function syncNow() {
  ElMessage.info('数据同步已启动，请稍候...')
  setTimeout(() => {
    ElMessage.success('数据同步完成')
  }, 1500)
}

async function clearCache() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有缓存数据吗？此操作将清除本地存储的所有设备、快照和告警数据。',
      '清除缓存',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await closeDB()
    localStorage.clear()
    ElMessage.success('缓存已清除，页面即将刷新')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch {
    // 用户取消
  }
}

async function reloadData() {
  ElMessage.info('正在重新加载数据...')
  try {
    await closeDB()
    await clearAllData()
    await checkAndInitData()
    await deviceStore.loadAllDevices()
    await alertStore.loadAlerts()
    ElMessage.success('数据重新加载完成')
  } catch (error) {
    ElMessage.error('数据加载失败')
    console.error(error)
  }
}

function exportConfig() {
  const config = {
    thresholds: thresholdConfigs,
    sync: syncConfig,
    exportTime: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pumplink-config-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('配置文件已导出')
}

function importConfig() {
  fileInputRef.value?.click()
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string)
      if (config.thresholds) {
        Object.assign(thresholdConfigs, config.thresholds)
      }
      if (config.sync) {
        Object.assign(syncConfig, config.sync)
      }
      ElMessage.success('配置导入成功')
    } catch {
      ElMessage.error('配置文件格式错误')
    }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped lang="scss">
.action-buttons {
  .el-button {
    margin-left: 0 !important;
  }
  
  .el-button + .el-button {
    margin-left: 0 !important;
    margin-top: 0;
  }
}
</style>
