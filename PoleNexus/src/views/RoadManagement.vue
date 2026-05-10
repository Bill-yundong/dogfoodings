<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import AppHeader from '@/components/AppHeader.vue'
import { usePoleStore } from '@/stores/poleStore'
import { useSyncService } from '@/services/syncService'
import { energyStore } from '@/services/indexedDB'
import type { EnergyData } from '@/types'
import { formatEnergy, formatPower } from '@/utils/helpers'

const poleStore = usePoleStore()
const syncService = useSyncService()

const energyChartRef = ref<HTMLDivElement | null>(null)
const statusChartRef = ref<HTMLDivElement | null>(null)
let energyChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null

const filterStatus = ref<'all' | 'online' | 'offline' | 'warning'>('all')
const selectedZone = ref<'all' | string>('all')

const zones = [
  { id: 'all', name: '全部区域' },
  { id: 'zone-1', name: '东区' },
  { id: 'zone-2', name: '西区' },
  { id: 'zone-3', name: '南区' },
  { id: 'zone-4', name: '北区' },
  { id: 'zone-5', name: '中心区' },
]

const filteredPoles = computed(() => {
  let result = poleStore.poles
  
  if (filterStatus.value !== 'all') {
    result = result.filter(p => p.status === filterStatus.value)
  }
  
  if (selectedZone.value !== 'all') {
    result = result.filter(p => p.zoneId === selectedZone.value)
  }
  
  return result
})

function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    online: 'status-online',
    offline: 'status-offline',
    warning: 'status-warning',
  }
  return classMap[status] || ''
}

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    warning: '告警',
  }
  return textMap[status] || status
}

function getModeText(mode: string): string {
  const textMap: Record<string, string> = {
    manual: '手动',
    auto: '自动',
    schedule: '定时',
    energy_saving: '节能',
  }
  return textMap[mode] || mode
}

function initEnergyChart(): void {
  if (!energyChartRef.value) return
  
  energyChart = echarts.init(energyChartRef.value)
  
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const data = params as Array<{ seriesName: string; value: number }>
        let result = `${data[0].axisValue}<br/>`
        data.forEach(item => {
          result += `${item.seriesName}: ${formatEnergy(item.value)}<br/>`
        })
        return result
      },
    },
    legend: {
      data: ['实际能耗', '理论能耗'],
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
    },
    series: [
      {
        name: '实际能耗',
        type: 'line',
        smooth: true,
        areaStyle: {},
        data: hours.map(() => Math.random() * 5 + 2),
      },
      {
        name: '理论能耗',
        type: 'line',
        smooth: true,
        lineStyle: { type: 'dashed' },
        data: hours.map(() => Math.random() * 8 + 5),
      },
    ],
  }
  
  energyChart.setOption(option)
}

function initStatusChart(): void {
  if (!statusChartRef.value) return
  
  statusChart = echarts.init(statusChartRef.value)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['在线', '离线', '告警'],
    },
    series: [
      {
        name: '灯杆状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        data: [
          { value: poleStore.statistics.onlinePoles, name: '在线', itemStyle: { color: '#52c41a' } },
          { value: poleStore.statistics.offlinePoles, name: '离线', itemStyle: { color: '#ff4d4f' } },
          { value: poleStore.statistics.warningPoles, name: '告警', itemStyle: { color: '#faad14' } },
        ],
      },
    ],
  }
  
  statusChart.setOption(option)
}

function updateCharts(): void {
  if (statusChart) {
    statusChart.setOption({
      series: [{
        data: [
          { value: poleStore.statistics.onlinePoles, name: '在线', itemStyle: { color: '#52c41a' } },
          { value: poleStore.statistics.offlinePoles, name: '离线', itemStyle: { color: '#ff4d4f' } },
          { value: poleStore.statistics.warningPoles, name: '告警', itemStyle: { color: '#faad14' } },
        ],
      }],
    })
  }
}

async function loadEnergyData(): Promise<void> {
  const today = dayjs().startOf('day').valueOf()
  const tomorrow = dayjs().add(1, 'day').startOf('day').valueOf()
  
  const data: EnergyData[] = await energyStore.getByTimeRange(today, tomorrow)
  
  if (energyChart) {
    const hourlyData = Array.from({ length: 24 }, () => 0)
    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours()
      hourlyData[hour] += d.energyConsumption
    })
    
    energyChart.setOption({
      series: [{
        data: hourlyData,
      }],
    })
  }
}

function handleResize(): void {
  energyChart?.resize()
  statusChart?.resize()
}

let syncUnsubscribe: (() => void) | null = null

onMounted(async () => {
  await poleStore.loadPoles()
  
  initEnergyChart()
  initStatusChart()
  loadEnergyData()
  
  window.addEventListener('resize', handleResize)
  
  syncUnsubscribe = syncService.on('energy_update', () => {
    loadEnergyData()
  })
})

onUnmounted(() => {
  energyChart?.dispose()
  statusChart?.dispose()
  window.removeEventListener('resize', handleResize)
  syncUnsubscribe?.()
})
</script>

<template>
  <div class="layout">
    <AppHeader />
    
    <main class="content">
      <div class="grid grid-4">
        <div class="stat-card">
          <div class="value">{{ poleStore.statistics.totalPoles }}</div>
          <div class="label">总灯杆数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ poleStore.statistics.onlinePoles }}</div>
          <div class="label">在线设备</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #ff4d4f">{{ poleStore.statistics.offlinePoles }}</div>
          <div class="label">离线设备</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ formatEnergy(poleStore.statistics.energySavedToday) }}</div>
          <div class="label">今日节电量</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top: 24px">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">24小时能耗趋势</h3>
          </div>
          <div ref="energyChartRef" class="chart-container"></div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">设备状态分布</h3>
          </div>
          <div ref="statusChartRef" class="chart-container"></div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <div class="card-header">
          <h3 class="card-title">灯杆节点列表</h3>
          <div style="display: flex; gap: 16px">
            <select
              v-model="filterStatus"
              style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px"
            >
              <option value="all">全部状态</option>
              <option value="online">在线</option>
              <option value="offline">离线</option>
              <option value="warning">告警</option>
            </select>
            <select
              v-model="selectedZone"
              style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px"
            >
              <option v-for="zone in zones" :key="zone.id" :value="zone.id">
                {{ zone.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div style="overflow-x: auto">
          <table class="table">
            <thead>
              <tr>
                <th>灯杆编号</th>
                <th>位置</th>
                <th>状态</th>
                <th>亮度</th>
                <th>功率</th>
                <th>温度</th>
                <th>湿度</th>
                <th>调光模式</th>
                <th>上次心跳</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pole in filteredPoles" :key="pole.id">
                <td>{{ pole.name }}</td>
                <td>{{ pole.location }}</td>
                <td>
                  <span :class="['status-badge', getStatusClass(pole.status)]">
                    {{ getStatusText(pole.status) }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <div class="progress-bar" style="width: 80px">
                      <div class="progress-bar-fill" :style="{ width: `${pole.brightness}%` }"></div>
                    </div>
                    {{ pole.brightness }}%
                  </div>
                </td>
                <td>{{ formatPower(pole.power) }}</td>
                <td>{{ pole.temperature.toFixed(1) }}°C</td>
                <td>{{ pole.humidity.toFixed(1) }}%</td>
                <td>{{ getModeText(pole.dimmingMode) }}</td>
                <td>{{ dayjs(pole.lastHeartbeat).format('HH:mm:ss') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="filteredPoles.length === 0" style="text-align: center; padding: 40px; color: #999">
          暂无符合条件的灯杆节点
        </div>
      </div>
    </main>
  </div>
</template>