<template>
  <div class="alert-center-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-select v-model="filterSeverity" placeholder="告警级别" class="w-40" clearable>
          <el-option label="提示" value="info" />
          <el-option label="警告" value="warning" />
          <el-option label="错误" value="error" />
          <el-option label="严重" value="critical" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="处理状态" class="w-40" clearable>
          <el-option label="待处理" value="pending" />
          <el-option label="已确认" value="acknowledged" />
          <el-option label="已解决" value="resolved" />
        </el-select>
        <el-button type="primary" @click="loadAlerts">
          <el-icon class="mr-1"><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">
          <span class="text-text-secondary text-sm">待处理:</span>
          <span class="text-status-critical font-bold font-mono">{{ pendingCount }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-text-secondary text-sm">今日告警:</span>
          <span class="text-status-warning font-bold font-mono">{{ todayCount }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="tech-card flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-status-normal/20 flex items-center justify-center">
          <el-icon :size="24" color="#00C853"><InfoFilled /></el-icon>
        </div>
        <div>
          <p class="text-2xl font-bold font-mono text-text-primary">{{ stats.info }}</p>
          <p class="text-xs text-text-secondary">提示</p>
        </div>
      </div>
      <div class="tech-card flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-status-warning/20 flex items-center justify-center">
          <el-icon :size="24" color="#FFD600"><Warning /></el-icon>
        </div>
        <div>
          <p class="text-2xl font-bold font-mono text-text-primary">{{ stats.warning }}</p>
          <p class="text-xs text-text-secondary">警告</p>
        </div>
      </div>
      <div class="tech-card flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-status-severe/20 flex items-center justify-center">
          <el-icon :size="24" color="#FF9100"><CircleClose /></el-icon>
        </div>
        <div>
          <p class="text-2xl font-bold font-mono text-text-primary">{{ stats.error }}</p>
          <p class="text-xs text-text-secondary">错误</p>
        </div>
      </div>
      <div class="tech-card flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-status-critical/20 flex items-center justify-center">
          <el-icon :size="24" color="#FF1744"><CircleCloseFilled /></el-icon>
        </div>
        <div>
          <p class="text-2xl font-bold font-mono text-text-primary">{{ stats.critical }}</p>
          <p class="text-xs text-text-secondary">严重</p>
        </div>
      </div>
    </div>

    <div class="tech-card">
      <el-table :data="filteredAlerts" stripe>
        <el-table-column width="60" align="center">
          <template #default="{ row }">
            <div class="w-2 h-2 rounded-full mx-auto"
                 :class="{
                   'bg-status-normal': row.severity === 'info',
                   'bg-status-warning': row.severity === 'warning',
                   'bg-status-severe': row.severity === 'error',
                   'bg-status-critical animate-pulse': row.severity === 'critical'
                 }"></div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <span class="text-text-primary">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deviceName" label="设备" width="150" />
        <el-table-column label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.severity)" size="small" effect="dark">
              {{ getSeverityText(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="250">
          <template #default="{ row }">
            <span class="text-text-secondary">{{ row.description }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            <span class="text-text-secondary font-mono text-sm">
              {{ formatTimestamp(row.timestamp) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="primary" size="small" @click="acknowledge(row.id)">
                确认
              </el-button>
            </template>
            <template v-else-if="row.status === 'acknowledged'">
              <el-button type="success" size="small" @click="resolve(row.id)">
                解决
              </el-button>
            </template>
            <el-button text size="small" @click="viewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="filteredAlerts.length === 0" class="text-center py-16 text-text-secondary">
        <el-icon :size="48"><Bell /></el-icon>
        <p class="mt-2">暂无告警数据</p>
      </div>

      <div class="mt-6 flex justify-center">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="alertStore.alerts.length"
          layout="prev, pager, next"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAlertStore } from '@/stores/alertStore'
import { getSeverityText, formatTimestamp } from '@/utils'
import type { Alert } from '@/types'

const alertStore = useAlertStore()

const filterSeverity = ref<Alert['severity'] | ''>('')
const filterStatus = ref<Alert['status'] | ''>('')
const currentPage = ref(1)
const pageSize = ref(20)

const stats = computed(() => {
  const alerts = alertStore.alerts
  return {
    info: alerts.filter(a => a.severity === 'info').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    error: alerts.filter(a => a.severity === 'error').length,
    critical: alerts.filter(a => a.severity === 'critical').length
  }
})

const pendingCount = computed(() => alertStore.alerts.filter(a => a.status === 'pending').length)
const todayCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return alertStore.alerts.filter(a => a.timestamp >= today.getTime()).length
})

const filteredAlerts = computed(() => {
  return alertStore.alerts.filter(a => {
    if (filterSeverity.value && a.severity !== filterSeverity.value) return false
    if (filterStatus.value && a.status !== filterStatus.value) return false
    return true
  })
})

function getSeverityTagType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger'
  }
  return map[severity] || 'info'
}

function getStatusTagType(status: string): 'success' | 'warning' | 'info' {
  const map: Record<string, any> = {
    pending: 'warning',
    acknowledged: 'info',
    resolved: 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    acknowledged: '已确认',
    resolved: '已解决'
  }
  return map[status] || status
}

async function loadAlerts() {
  await alertStore.loadAlerts()
}

async function acknowledge(id: string) {
  await alertStore.acknowledgeAlert(id, '管理员')
}

async function resolve(id: string) {
  await alertStore.resolveAlert(id)
}

function viewDetail(alertItem: Alert) {
  window.alert(`告警详情:\n${alertItem.title}\n${alertItem.description}`)
}

onMounted(async () => {
  await alertStore.loadAlerts()
})
</script>
