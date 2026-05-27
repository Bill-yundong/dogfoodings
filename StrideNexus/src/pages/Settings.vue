<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDB } from '@/database'

const activeTab = ref('profile')

const userProfile = reactive({
  name: '跑者用户',
  email: 'runner@example.com',
  age: 28,
  gender: 'male',
  height: 175,
  weight: 68,
  runningExperience: 3,
  weeklyMileage: 30
})

const notificationSettings = reactive({
  riskAlert: true,
  fatigueWarning: true,
  shoesWearAlert: true,
  weeklyReport: true,
  pushNotification: true,
  emailNotification: false
})

const syncSettings = reactive({
  autoSync: true,
  syncOnWifi: true,
  syncInterval: 30,
  dataRetention: 90
})

const alertSettings = reactive({
  riskThreshold: 50,
  fatigueThreshold: 70,
  cadenceLow: 160,
  cadenceHigh: 190,
  pressureImbalance: 15
})

const deviceSettings = reactive({
  pressureSensor: true,
  accelerometer: true,
  gyroscope: true,
  heartRateMonitor: false,
  gps: true,
  samplingRate: 50
})

const dbStats = ref({
  totalSessions: 0,
  totalPressureData: 0,
  totalPostureData: 0,
  totalSize: '0 MB'
})

const genders = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' }
]

const syncIntervals = [
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' },
  { value: 180, label: '3小时' }
]

const dataRetentions = [
  { value: 30, label: '30天' },
  { value: 90, label: '90天' },
  { value: 180, label: '180天' },
  { value: 365, label: '1年' }
]

const samplingRates = [
  { value: 25, label: '25 Hz' },
  { value: 50, label: '50 Hz' },
  { value: 100, label: '100 Hz' }
]

async function loadDbStats() {
  try {
    const db = getDB()
    const sessions = await db.getAll('runSessions')
    const pressureData = await db.getAll('pressureData')
    const postureData = await db.getAll('postureData')
    
    dbStats.value = {
      totalSessions: sessions.length,
      totalPressureData: pressureData.length,
      totalPostureData: postureData.length,
      totalSize: ((sessions.length * 0.5 + pressureData.length * 0.01 + postureData.length * 0.02) / 1024).toFixed(2) + ' MB'
    }
  } catch (error) {
    console.error('Failed to load DB stats:', error)
  }
}

function saveProfile() {
  ElMessage.success('个人资料已保存')
}

function saveNotifications() {
  ElMessage.success('通知设置已保存')
}

function saveSync() {
  ElMessage.success('同步设置已保存')
}

function saveAlerts() {
  ElMessage.success('告警设置已保存')
}

function saveDevices() {
  ElMessage.success('设备设置已保存')
}

async function clearData() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有本地数据吗？此操作不可恢复。',
      '清除数据',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const db = getDB()
    await db.clear('runSessions')
    await db.clear('pressureData')
    await db.clear('cadenceData')
    await db.clear('postureData')
    await db.clear('riskAssessments')
    await db.clear('wearData')
    await db.clear('syncQueue')
    
    await loadDbStats()
    ElMessage.success('数据已清除')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清除数据失败')
    }
  }
}

async function exportData() {
  try {
    const db = getDB()
    const sessions = await db.getAll('runSessions')
    const assessments = await db.getAll('riskAssessments')
    const shoes = await db.getAll('shoes')
    
    const exportData = {
      exportDate: new Date().toISOString(),
      sessions,
      assessments,
      shoes
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stride-nexus-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
  } catch (error) {
    ElMessage.error('数据导出失败')
  }
}

onMounted(() => {
  loadDbStats()
})
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="font-display">系统设置</h1>
    </div>

    <el-tabs v-model="activeTab" class="settings-tabs">
      <el-tab-pane label="个人资料" name="profile">
        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><User /></el-icon> 基本信息</h3>
          </div>
          <div class="settings-content">
            <el-form :model="userProfile" label-width="120px">
              <el-form-item label="姓名">
                <el-input v-model="userProfile.name" placeholder="请输入姓名" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="userProfile.email" placeholder="请输入邮箱" />
              </el-form-item>
              <el-form-item label="年龄">
                <el-input-number v-model="userProfile.age" :min="10" :max="100" />
              </el-form-item>
              <el-form-item label="性别">
                <el-select v-model="userProfile.gender" placeholder="请选择">
                  <el-option v-for="g in genders" :key="g.value" :label="g.label" :value="g.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="身高">
                <el-input-number v-model="userProfile.height" :min="100" :max="250" suffix="cm" />
              </el-form-item>
              <el-form-item label="体重">
                <el-input-number v-model="userProfile.weight" :min="30" :max="200" suffix="kg" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><DataAnalysis /></el-icon> 运动背景</h3>
          </div>
          <div class="settings-content">
            <el-form :model="userProfile" label-width="120px">
              <el-form-item label="跑步年限">
                <el-input-number v-model="userProfile.runningExperience" :min="0" :max="50" suffix="年" />
              </el-form-item>
              <el-form-item label="周跑量">
                <el-input-number v-model="userProfile.weeklyMileage" :min="0" :max="200" suffix="km" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="actions-bar">
          <el-button type="primary" @click="saveProfile">保存设置</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="通知设置" name="notifications">
        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Bell /></el-icon> 通知偏好</h3>
          </div>
          <div class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">风险告警</span>
                  <span class="setting-desc">当检测到高损伤风险时发送通知</span>
                </div>
                <el-switch v-model="notificationSettings.riskAlert" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">疲劳预警</span>
                  <span class="setting-desc">当身体疲劳程度过高时发送提醒</span>
                </div>
                <el-switch v-model="notificationSettings.fatigueWarning" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">跑鞋磨损提醒</span>
                  <span class="setting-desc">当跑鞋磨损达到阈值时发送提醒</span>
                </div>
                <el-switch v-model="notificationSettings.shoesWearAlert" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">周报推送</span>
                  <span class="setting-desc">每周一推送上周运动分析报告</span>
                </div>
                <el-switch v-model="notificationSettings.weeklyReport" />
              </div>
            </div>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Iphone /></el-icon> 通知渠道</h3>
          </div>
          <div class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">推送通知</span>
                  <span class="setting-desc">接收浏览器/应用推送通知</span>
                </div>
                <el-switch v-model="notificationSettings.pushNotification" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">邮件通知</span>
                  <span class="setting-desc">通过邮件接收重要通知</span>
                </div>
                <el-switch v-model="notificationSettings.emailNotification" />
              </div>
            </div>
          </div>
        </div>

        <div class="actions-bar">
          <el-button type="primary" @click="saveNotifications">保存设置</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="同步设置" name="sync">
        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Refresh /></el-icon> 数据同步</h3>
          </div>
          <div class="settings-content">
            <el-form :model="syncSettings" label-width="140px">
              <el-form-item label="自动同步">
                <el-switch v-model="syncSettings.autoSync" />
              </el-form-item>
              <el-form-item label="仅在WiFi下同步">
                <el-switch v-model="syncSettings.syncOnWifi" />
              </el-form-item>
              <el-form-item label="同步间隔">
                <el-select v-model="syncSettings.syncInterval" style="width: 200px;">
                  <el-option v-for="interval in syncIntervals" :key="interval.value" :label="interval.label" :value="interval.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="数据保留时间">
                <el-select v-model="syncSettings.dataRetention" style="width: 200px;">
                  <el-option v-for="retention in dataRetentions" :key="retention.value" :label="retention.label" :value="retention.value" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Coin /></el-icon> 数据统计</h3>
          </div>
          <div class="settings-content">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">运动记录</span>
                <span class="stat-value font-display">{{ dbStats.totalSessions }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">压力数据点</span>
                <span class="stat-value font-display">{{ dbStats.totalPressureData }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">姿态数据点</span>
                <span class="stat-value font-display">{{ dbStats.totalPostureData }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">占用空间</span>
                <span class="stat-value font-display">{{ dbStats.totalSize }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><FolderOpened /></el-icon> 数据管理</h3>
          </div>
          <div class="settings-content">
            <div class="action-buttons">
              <el-button type="primary" @click="exportData">
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
              <el-button type="danger" @click="clearData">
                <el-icon><Delete /></el-icon>
                清除本地数据
              </el-button>
            </div>
          </div>
        </div>

        <div class="actions-bar">
          <el-button type="primary" @click="saveSync">保存设置</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="告警阈值" name="alerts">
        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Warning /></el-icon> 风险与疲劳</h3>
          </div>
          <div class="settings-content">
            <el-form :model="alertSettings" label-width="140px">
              <el-form-item label="风险阈值">
                <el-slider v-model="alertSettings.riskThreshold" :min="10" :max="90" :step="5" show-input />
                <div class="slider-hint">超过此值将触发高风险告警</div>
              </el-form-item>
              <el-form-item label="疲劳阈值">
                <el-slider v-model="alertSettings.fatigueThreshold" :min="30" :max="100" :step="5" show-input />
                <div class="slider-hint">超过此值将触发疲劳提醒</div>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><TrendCharts /></el-icon> 步态参数</h3>
          </div>
          <div class="settings-content">
            <el-form :model="alertSettings" label-width="140px">
              <el-form-item label="步频下限">
                <el-slider v-model="alertSettings.cadenceLow" :min="130" :max="170" :step="5" show-input />
                <div class="slider-hint">低于此值将触发步频过低提醒</div>
              </el-form-item>
              <el-form-item label="步频上限">
                <el-slider v-model="alertSettings.cadenceHigh" :min="180" :max="220" :step="5" show-input />
                <div class="slider-hint">高于此值将触发步频过高提醒</div>
              </el-form-item>
              <el-form-item label="压力失衡阈值">
                <el-slider v-model="alertSettings.pressureImbalance" :min="5" :max="30" :step="1" show-input />
                <div class="slider-hint">左右脚压力差超过此百分比将触发告警</div>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="actions-bar">
          <el-button type="primary" @click="saveAlerts">保存设置</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="设备设置" name="devices">
        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Connection /></el-icon> 传感器配置</h3>
          </div>
          <div class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">足底压力传感器</span>
                  <span class="setting-desc">采集足底压力分布数据</span>
                </div>
                <el-switch v-model="deviceSettings.pressureSensor" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">加速度计</span>
                  <span class="setting-desc">采集运动加速度数据</span>
                </div>
                <el-switch v-model="deviceSettings.accelerometer" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">陀螺仪</span>
                  <span class="setting-desc">采集姿态角度数据</span>
                </div>
                <el-switch v-model="deviceSettings.gyroscope" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">心率监测</span>
                  <span class="setting-desc">连接心率带监测心率</span>
                </div>
                <el-switch v-model="deviceSettings.heartRateMonitor" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">GPS定位</span>
                  <span class="setting-desc">记录跑步轨迹和距离</span>
                </div>
                <el-switch v-model="deviceSettings.gps" />
              </div>
            </div>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3><el-icon><Setting /></el-icon> 采样配置</h3>
          </div>
          <div class="settings-content">
            <el-form :model="deviceSettings" label-width="140px">
              <el-form-item label="采样频率">
                <el-select v-model="deviceSettings.samplingRate" style="width: 200px;">
                  <el-option v-for="rate in samplingRates" :key="rate.value" :label="rate.label" :value="rate.value" />
                </el-select>
                <div class="form-hint">更高的采样率会提供更精确的数据，但会增加电池消耗和存储占用</div>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="actions-bar">
          <el-button type="primary" @click="saveDevices">保存设置</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  h1 {
    margin: 0;
    font-size: 24px;
    color: var(--text-primary);
  }
}

.settings-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid var(--border-color);
    
    .el-tabs__nav-wrap::after {
      background: var(--border-color);
    }
    
    .el-tabs__item {
      color: var(--text-secondary);
      
      &.is-active {
        color: var(--primary-color);
      }
      
      &:hover {
        color: var(--text-primary);
      }
    }
    
    .el-tabs__active-bar {
      background: var(--primary-color);
    }
  }
  
  :deep(.el-tabs__content) {
    padding-top: 20px;
  }
}

.card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.settings-content {
  padding: 20px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  
  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.slider-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.actions-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
</style>
