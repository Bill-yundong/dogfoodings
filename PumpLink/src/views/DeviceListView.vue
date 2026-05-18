<template>
  <div class="devices-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-input v-model="searchQuery" placeholder="搜索设备名称、型号..." class="w-80" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterRegion" placeholder="区域" class="w-40" clearable>
          <el-option label="华东区" value="华东区" />
          <el-option label="华南区" value="华南区" />
          <el-option label="华北区" value="华北区" />
          <el-option label="西南区" value="西南区" />
          <el-option label="西北区" value="西北区" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态" class="w-40" clearable>
          <el-option label="运行中" value="running" />
          <el-option label="待机" value="standby" />
          <el-option label="维护中" value="maintenance" />
          <el-option label="故障" value="fault" />
        </el-select>
      </div>
      <div class="flex items-center gap-2">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="card">卡片视图</el-radio-button>
          <el-radio-button value="list">列表视图</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div v-if="viewMode === 'card'" class="grid grid-cols-4 gap-4">
      <div v-for="device in filteredDevices" :key="device.id"
           class="tech-card cursor-pointer hover:scale-[1.02] transition-transform"
           @click="$router.push(`/devices/${device.id}`)">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-tech-accent/20 to-tech-accent/5 flex items-center justify-center">
              <el-icon :size="24" color="#64FFDA"><Cpu /></el-icon>
            </div>
            <div>
              <h4 class="text-text-primary font-medium">{{ device.name }}</h4>
              <p class="text-xs text-text-secondary">{{ device.model }}</p>
            </div>
          </div>
          <span class="status-dot"
                :class="{
                  'status-normal': device.currentStatus === 'running',
                  'bg-tech-accent': device.currentStatus === 'standby',
                  'status-severe': device.currentStatus === 'maintenance',
                  'status-critical': device.currentStatus === 'fault'
                }"></span>
        </div>

        <div class="space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-text-secondary">健康分数</span>
              <span class="text-sm font-mono font-bold" :style="{ color: getHealthColor(device.healthScore) }">
                {{ device.healthScore }}
              </span>
            </div>
            <div class="h-1.5 bg-tech-bg rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                   :style="{ 
                     width: `${device.healthScore}%`,
                     background: getHealthColor(device.healthScore)
                   }"></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-text-secondary">位置:</span>
              <span class="text-text-primary ml-1">{{ device.location }}</span>
            </div>
            <div>
              <span class="text-text-secondary">功率:</span>
              <span class="text-text-primary ml-1 font-mono">{{ device.ratedPower }} kW</span>
            </div>
            <div>
              <span class="text-text-secondary">流量:</span>
              <span class="text-text-primary ml-1 font-mono">{{ device.ratedFlow }} m³/h</span>
            </div>
            <div>
              <span class="text-text-secondary">扬程:</span>
              <span class="text-text-primary ml-1 font-mono">{{ device.ratedHead }} m</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-tech-accent/10 flex items-center justify-between">
          <span class="text-xs text-text-secondary">
            最后快照: {{ formatDate(device.lastSnapshotTime) }}
          </span>
          <el-button size="small" type="primary" text>
            查看详情
            <el-icon class="ml-1"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <el-table v-else :data="filteredDevices" class="tech-card" stripe>
      <el-table-column prop="name" label="设备名称" min-width="150">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <el-icon color="#64FFDA"><Cpu /></el-icon>
            <span class="text-text-primary">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="model" label="型号" width="120" />
      <el-table-column prop="region" label="区域" width="100" />
      <el-table-column prop="location" label="位置" width="150" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.currentStatus)" size="small">
            {{ getStatusText(row.currentStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="健康分数" width="150">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-tech-bg rounded-full overflow-hidden">
              <div class="h-full rounded-full" 
                   :style="{ 
                     width: `${row.healthScore}%`,
                     background: getHealthColor(row.healthScore)
                   }"></div>
            </div>
            <span class="text-sm font-mono" :style="{ color: getHealthColor(row.healthScore) }">
              {{ row.healthScore }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="ratedPower" label="功率 (kW)" width="120">
        <template #default="{ row }">
          <span class="font-mono">{{ row.ratedPower }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="ratedFlow" label="流量 (m³/h)" width="120">
        <template #default="{ row }">
          <span class="font-mono">{{ row.ratedFlow }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="$router.push(`/devices/${row.id}`)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="filteredDevices.length === 0" class="tech-card text-center py-16 text-text-secondary">
      <el-icon :size="48"><Search /></el-icon>
      <p class="mt-2">没有找到匹配的设备</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { getHealthColor, getStatusText, formatDate } from '@/utils'

const deviceStore = useDeviceStore()

const searchQuery = ref('')
const filterRegion = ref('')
const filterStatus = ref('')
const viewMode = ref<'card' | 'list'>('card')

const filteredDevices = computed(() => {
  return deviceStore.devices.filter(d => {
    if (searchQuery.value && !d.name.includes(searchQuery.value) && !d.model.includes(searchQuery.value)) {
      return false
    }
    if (filterRegion.value && d.region !== filterRegion.value) {
      return false
    }
    if (filterStatus.value && d.currentStatus !== filterStatus.value) {
      return false
    }
    return true
  })
})

function getStatusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, any> = {
    running: 'success',
    standby: 'info',
    maintenance: 'warning',
    fault: 'danger'
  }
  return map[status] || 'info'
}

onMounted(async () => {
  await deviceStore.loadAllDevices()
})
</script>
