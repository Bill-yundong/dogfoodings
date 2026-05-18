<template>
  <div class="device-detail-view" v-if="device">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-button text @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div>
          <h2 class="text-2xl font-bold text-text-primary flex items-center gap-3">
            {{ device.name }}
            <el-tag :type="getStatusTagType(device.currentStatus)" size="large">
              {{ getStatusText(device.currentStatus) }}
            </el-tag>
          </h2>
          <p class="text-text-secondary text-sm mt-1">
            {{ device.model }} · {{ device.location }} · 投产于 {{ device.installDate }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <el-button @click="generateNewSnapshot">
          <el-icon class="mr-1"><Camera /></el-icon>
          生成快照
        </el-button>
        <el-button type="primary">
          <el-icon class="mr-1"><TrendCharts /></el-icon>
          详细分析
        </el-button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <StatCard title="健康分数" :value="device.healthScore" icon="Odometer" 
                :color="device.healthScore >= 70 ? 'normal' : device.healthScore >= 40 ? 'warning' : 'critical'"
                suffix="分" />
      <StatCard title="额定功率" :value="device.ratedPower" icon="Lightning" color="accent" suffix=" kW" />
      <StatCard title="额定流量" :value="device.ratedFlow" icon="Watermelon" color="accent" suffix=" m³/h" />
      <StatCard title="额定扬程" :value="device.ratedHead" icon="ArrowUp" color="accent" suffix=" m" />
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="tech-card col-span-2">
        <h3 class="text-text-primary font-medium mb-4">实时振动波形</h3>
        <WaveformCanvas :data="currentWaveform" :sampling-rate="1024" title="" />
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">运行参数</h3>
        <div class="space-y-4">
          <div v-for="param in runningParams" :key="param.name">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-text-secondary">{{ param.name }}</span>
              <span class="text-sm font-mono" :style="{ color: param.status === 'normal' ? '#00C853' : '#FF9100' }">
                {{ param.value }} {{ param.unit }}
              </span>
            </div>
            <div class="h-2 bg-tech-bg rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500"
                   :style="{ 
                     width: `${param.percent}%`,
                     background: param.status === 'normal' 
                       ? 'linear-gradient(90deg, #00C853, #64FFDA)' 
                       : 'linear-gradient(90deg, #FF9100, #FFD600)'
                   }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6 mb-6">
      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">健康趋势 (最近7天)</h3>
        <ChartBase :option="healthTrendOption" height="250px" />
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">风险因子分布</h3>
        <ChartBase :option="riskFactorOption" height="250px" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">最近快照</h3>
        <div class="space-y-3 max-h-80 overflow-y-auto">
          <div v-for="snapshot in recentSnapshots" :key="snapshot.id"
               class="p-3 bg-tech-bg/50 rounded-lg flex items-center justify-between hover:bg-tech-bg transition-colors cursor-pointer"
               @click="$router.push('/snapshots')">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                   :style="{ background: getHealthBg(snapshot.healthScore) }">
                <span class="font-bold" :style="{ color: getHealthColor(snapshot.healthScore) }">
                  {{ snapshot.healthScore }}
                </span>
              </div>
              <div>
                <p class="text-text-primary text-sm">{{ formatTimestamp(snapshot.timestamp) }}</p>
                <p class="text-text-secondary text-xs">
                  气蚀风险: {{ getRiskText(snapshot.cavitationRisk.level) }}
                </p>
              </div>
            </div>
            <el-icon color="#8892B0"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">关联告警</h3>
        <div class="space-y-3 max-h-80 overflow-y-auto">
          <div v-for="alert in deviceAlerts" :key="alert.id"
               class="p-3 bg-tech-bg/50 rounded-lg flex items-center gap-3">
            <div class="w-2 h-2 rounded-full flex-shrink-0"
                 :class="{
                   'bg-status-normal': alert.severity === 'info',
                   'bg-status-warning': alert.severity === 'warning',
                   'bg-status-severe': alert.severity === 'error',
                   'bg-status-critical': alert.severity === 'critical'
                 }"></div>
            <div class="flex-1 min-w-0">
              <p class="text-text-primary text-sm truncate">{{ alert.title }}</p>
              <p class="text-text-secondary text-xs">{{ formatTimestamp(alert.timestamp) }}</p>
            </div>
            <el-tag :type="getAlertTagType(alert.severity)" size="small">
              {{ getSeverityText(alert.severity) }}
            </el-tag>
          </div>
          <div v-if="deviceAlerts.length === 0" class="text-center py-8 text-text-secondary">
            暂无相关告警
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-64">
    <el-icon :size="48" class="text-text-secondary"><Loading /></el-icon>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceStore } from '@/stores/deviceStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { useAlertStore } from '@/stores/alertStore'
import { useSignalStore } from '@/stores/signalStore'
import StatCard from '@/components/StatCard.vue'
import WaveformCanvas from '@/components/WaveformCanvas.vue'
import ChartBase from '@/components/ChartBase.vue'
import { getStatusText, getHealthColor, getRiskText, getSeverityText, formatTimestamp } from '@/utils'

const route = useRoute()
const deviceStore = useDeviceStore()
const snapshotStore = useSnapshotStore()
const alertStore = useAlertStore()
const signalStore = useSignalStore()

const deviceId = computed(() => route.params.id as string)
const device = computed(() => deviceStore.devices.find(d => d.id === deviceId.value))
const currentWaveform = ref<Float32Array>(new Float32Array())

const runningParams = ref([
  { name: '入口压力', value: 0.32, unit: 'MPa', percent: 64, status: 'normal' },
  { name: '出口压力', value: 2.85, unit: 'MPa', percent: 71, status: 'normal' },
  { name: '运行流量', value: 420, unit: 'm³/h', percent: 84, status: 'normal' },
  { name: '电机电流', value: 128, unit: 'A', percent: 76, status: 'normal' },
  { name: '轴承温度', value: 68, unit: '°C', percent: 68, status: 'warning' },
  { name: '振动烈度', value: 4.2, unit: 'mm/s', percent: 52, status: 'normal' }
])

const recentSnapshots = computed(() => {
  return snapshotStore.snapshots.filter(s => s.deviceId === deviceId.value).slice(0, 5)
})

const deviceAlerts = computed(() => {
  return alertStore.alerts.filter(a => a.deviceId === deviceId.value).slice(0, 5)
})

const healthTrendOption = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const data = days.map(() => 60 + Math.random() * 35)
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0' }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0' },
      splitLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.1)' } }
    },
    series: [{
      type: 'line',
      data,
      smooth: true,
      lineStyle: { color: '#64FFDA', width: 3 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(100, 255, 218, 0.3)' },
            { offset: 1, color: 'rgba(100, 255, 218, 0)' }
          ]
        }
      },
      itemStyle: { color: '#64FFDA' }
    }]
  }
})

const riskFactorOption = computed(() => {
  const factors = [
    { name: '振动', value: 35 },
    { name: '温度', value: 25 },
    { name: '压力', value: 15 },
    { name: '流量', value: 15 },
    { name: '电流', value: 10 }
  ]

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      itemStyle: {
        borderRadius: 6,
        borderColor: '#112240',
        borderWidth: 2
      },
      label: {
        show: true,
        color: '#8892B0',
        fontSize: 11
      },
      data: factors.map((f, i) => ({
        value: f.value,
        name: f.name,
        itemStyle: {
          color: ['#64FFDA', '#00C853', '#FFD600', '#FF9100', '#FF1744'][i]
        }
      }))
    }]
  }
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

function getAlertTagType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger'
  }
  return map[severity] || 'info'
}

function getHealthBg(score: number): string {
  if (score >= 80) return 'rgba(0, 200, 83, 0.15)'
  if (score >= 60) return 'rgba(255, 214, 0, 0.15)'
  if (score >= 40) return 'rgba(255, 145, 0, 0.15)'
  return 'rgba(255, 23, 68, 0.15)'
}

function generateNewSnapshot() {
  currentWaveform.value = signalStore.generateMockSignal(1024, 2, Math.random() > 0.7)
}

onMounted(async () => {
  await deviceStore.loadAllDevices()
  await snapshotStore.loadSnapshots(deviceId.value, 10)
  await alertStore.loadAlerts()
  currentWaveform.value = signalStore.generateMockSignal(1024, 2, false)
})
</script>
