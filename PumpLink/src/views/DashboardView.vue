<template>
  <div class="dashboard-view">
    <div class="grid grid-cols-4 gap-4 mb-6">
      <StatCard title="设备总数" :value="deviceStore.devices.length" icon="Cpu" color="accent" />
      <StatCard title="运行中" :value="deviceStore.runningCount" icon="VideoPlay" color="normal" :trend="2" trend-label="较昨日" />
      <StatCard title="预警设备" :value="deviceStore.warningCount" icon="Warning" color="warning" />
      <StatCard title="故障设备" :value="deviceStore.criticalCount" icon="CircleClose" color="critical" />
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="col-span-2 tech-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-text-primary font-medium">区域设备健康分布</h3>
          <el-radio-group v-model="mapViewMode" size="small">
            <el-radio-button value="health">健康分数</el-radio-button>
            <el-radio-button value="count">设备数量</el-radio-button>
          </el-radio-group>
        </div>
        <ChartBase :option="regionHeatmapOption" height="300px" />
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">健康状态分布</h3>
        <ChartBase :option="healthPieOption" height="300px" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="tech-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-text-primary font-medium">健康趋势</h3>
          <el-select v-model="trendDeviceId" size="small" class="w-40" placeholder="选择设备">
            <el-option v-for="d in deviceStore.devices.slice(0, 10)" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </div>
        <ChartBase :option="healthTrendOption" height="280px" />
      </div>

      <div class="col-span-2 tech-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-text-primary font-medium">实时告警</h3>
          <router-link to="/alerts" class="text-tech-accent text-sm hover:underline">查看全部</router-link>
        </div>
        <div class="space-y-3 max-h-72 overflow-y-auto">
          <div v-for="alert in recentAlerts" :key="alert.id" 
               class="flex items-center gap-3 p-3 rounded-lg bg-tech-bg/50 hover:bg-tech-bg transition-colors cursor-pointer"
               @click="$router.push(`/alerts`)">
            <div class="w-2 h-2 rounded-full flex-shrink-0"
                 :class="{
                   'bg-status-normal': alert.severity === 'info',
                   'bg-status-warning': alert.severity === 'warning',
                   'bg-status-severe': alert.severity === 'error',
                   'bg-status-critical animate-pulse': alert.severity === 'critical'
                 }"></div>
            <div class="flex-1 min-w-0">
              <p class="text-text-primary text-sm font-medium truncate">{{ alert.title }}</p>
              <p class="text-text-secondary text-xs truncate">{{ alert.deviceName }} · {{ formatTimestamp(alert.timestamp) }}</p>
            </div>
            <el-tag :type="getAlertTagType(alert.severity)" size="small" round>
              {{ getSeverityText(alert.severity) }}
            </el-tag>
          </div>
          <div v-if="recentAlerts.length === 0" class="text-center py-8 text-text-secondary">
            暂无告警信息
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useAlertStore } from '@/stores/alertStore'
import StatCard from '@/components/StatCard.vue'
import ChartBase from '@/components/ChartBase.vue'
import { formatTimestamp, getSeverityText } from '@/utils'

const deviceStore = useDeviceStore()
const alertStore = useAlertStore()

const mapViewMode = ref('health')
const trendDeviceId = ref('')

const recentAlerts = computed(() => alertStore.alerts.slice(0, 8))

const regionHeatmapOption = computed(() => {
  const data = deviceStore.regionStats.map(s => ({
    name: s.region,
    value: mapViewMode.value === 'health' ? s.avgHealthScore : s.deviceCount
  }))

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: mapViewMode.value === 'health' ? '健康分数' : '设备数',
      nameTextStyle: { color: '#8892B0' },
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0' },
      splitLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.1)' } }
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: d.value,
        itemStyle: {
          color: d.value >= 70 ? {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 255, 218, 0.8)' },
              { offset: 1, color: 'rgba(0, 200, 83, 0.6)' }
            ]
          } : d.value >= 40 ? {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 214, 0, 0.8)' },
              { offset: 1, color: 'rgba(255, 145, 0, 0.6)' }
            ]
          } : {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 145, 0, 0.8)' },
              { offset: 1, color: 'rgba(255, 23, 68, 0.6)' }
            ]
          }
        }
      })),
      barWidth: 40,
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(100, 255, 218, 0.5)'
        }
      }
    }]
  }
})

const healthPieOption = computed(() => {
  const stats = {
    优秀: deviceStore.devices.filter(d => d.healthScore >= 80).length,
    良好: deviceStore.devices.filter(d => d.healthScore >= 60 && d.healthScore < 80).length,
    警告: deviceStore.devices.filter(d => d.healthScore >= 40 && d.healthScore < 60).length,
    危险: deviceStore.devices.filter(d => d.healthScore < 40).length
  }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#8892B0' }
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#112240',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: { show: true, color: '#E6F1FF', fontSize: 14, fontWeight: 'bold' },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(100, 255, 218, 0.5)'
        }
      },
      data: [
        { value: stats.优秀, name: '优秀', itemStyle: { color: '#00C853' } },
        { value: stats.良好, name: '良好', itemStyle: { color: '#64FFDA' } },
        { value: stats.警告, name: '警告', itemStyle: { color: '#FFD600' } },
        { value: stats.危险, name: '危险', itemStyle: { color: '#FF1744' } }
      ]
    }]
  }
})

const healthTrendOption = computed(() => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const data = hours.map(() => 60 + Math.random() * 35)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0', fontSize: 10 }
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
      lineStyle: { color: '#64FFDA', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(100, 255, 218, 0.3)' },
            { offset: 1, color: 'rgba(100, 255, 218, 0)' }
          ]
        }
      },
      itemStyle: { color: '#64FFDA' },
      markLine: {
        silent: true,
        lineStyle: { color: '#FF1744', type: 'dashed' },
        data: [{ yAxis: 40, label: { formatter: '危险线', color: '#FF1744' } }]
      }
    }]
  }
})

function getAlertTagType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger'
  }
  return map[severity] || 'info'
}

onMounted(async () => {
  await deviceStore.loadAllDevices()
  await alertStore.loadAlerts(20)
  if (deviceStore.devices.length > 0) {
    trendDeviceId.value = deviceStore.devices[0].id
  }
})
</script>
