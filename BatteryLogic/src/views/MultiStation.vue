<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MapPin, Battery, AlertTriangle, Zap, Activity, Building2 } from 'lucide-vue-next'
import type { PowerStation } from '@/types'

const stations = ref<PowerStation[]>([
  {
    id: 'station_001',
    name: '深圳龙岗储能电站',
    location: {
      lat: 22.7241,
      lng: 114.3522,
      address: '广东省深圳市龙岗区'
    },
    capacity: 100,
    packCount: 50,
    status: 'online',
    lastUpdate: Date.now()
  },
  {
    id: 'station_002',
    name: '广州黄埔储能电站',
    location: {
      lat: 23.1846,
      lng: 113.5684,
      address: '广东省广州市黄埔区'
    },
    capacity: 200,
    packCount: 100,
    status: 'warning',
    lastUpdate: Date.now() - 60000
  },
  {
    id: 'station_003',
    name: '东莞松山湖储能电站',
    location: {
      lat: 22.8902,
      lng: 113.9136,
      address: '广东省东莞市松山湖'
    },
    capacity: 150,
    packCount: 75,
    status: 'online',
    lastUpdate: Date.now() - 120000
  },
  {
    id: 'station_004',
    name: '佛山顺德储能电站',
    location: {
      lat: 22.8303,
      lng: 113.2598,
      address: '广东省佛山市顺德区'
    },
    capacity: 80,
    packCount: 40,
    status: 'critical',
    lastUpdate: Date.now() - 30000
  },
  {
    id: 'station_005',
    name: '惠州大亚湾储能电站',
    location: {
      lat: 22.7016,
      lng: 114.5388,
      address: '广东省惠州市大亚湾'
    },
    capacity: 120,
    packCount: 60,
    status: 'offline',
    lastUpdate: Date.now() - 3600000
  }
])

const selectedStation = ref<PowerStation | null>(null)

const stats = computed(() => {
  const totalCapacity = stations.value.reduce((sum, s) => sum + s.capacity, 0)
  const totalPacks = stations.value.reduce((sum, s) => sum + s.packCount, 0)
  const onlineCount = stations.value.filter(s => s.status === 'online').length
  const warningCount = stations.value.filter(s => s.status === 'warning').length
  const criticalCount = stations.value.filter(s => s.status === 'critical').length
  return { totalCapacity, totalPacks, onlineCount, warningCount, criticalCount }
})

function getStatusColor(status: PowerStation['status']): string {
  switch (status) {
    case 'online': return 'text-success'
    case 'warning': return 'text-warning'
    case 'critical': return 'text-danger'
    case 'offline': return 'text-dark-400'
  }
}

function getStatusBg(status: PowerStation['status']): string {
  switch (status) {
    case 'online': return 'bg-success/20 border-success/30'
    case 'warning': return 'bg-warning/20 border-warning/30'
    case 'critical': return 'bg-danger/20 border-danger/30'
    case 'offline': return 'bg-dark-500/50 border-dark-400/30'
  }
}

function getStatusText(status: PowerStation['status']): string {
  switch (status) {
    case 'online': return '运行中'
    case 'warning': return '预警'
    case 'critical': return '严重告警'
    case 'offline': return '离线'
  }
}

function selectStation(station: PowerStation) {
  selectedStation.value = station
}

function formatLastUpdate(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="grid grid-cols-5 gap-4">
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Building2 class="w-4 h-4" />
          <span class="text-sm">电站总数</span>
        </div>
        <div class="text-2xl font-bold text-white">{{ stations.length }}</div>
      </div>
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Zap class="w-4 h-4" />
          <span class="text-sm">总容量</span>
        </div>
        <div class="text-2xl font-bold text-primary">{{ stats.totalCapacity }} <span class="text-sm">MWh</span></div>
      </div>
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Battery class="w-4 h-4" />
          <span class="text-sm">电池包总数</span>
        </div>
        <div class="text-2xl font-bold text-white">{{ stats.totalPacks }}</div>
      </div>
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Activity class="w-4 h-4" />
          <span class="text-sm">在线电站</span>
        </div>
        <div class="text-2xl font-bold text-success">{{ stats.onlineCount }}</div>
      </div>
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <AlertTriangle class="w-4 h-4" />
          <span class="text-sm">告警电站</span>
        </div>
        <div class="text-2xl font-bold text-warning">{{ stats.warningCount + stats.criticalCount }}</div>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-3 gap-4 min-h-0">
      <div class="col-span-2 glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">区域分布</h3>
        <div class="flex-1 relative bg-dark-600/50 rounded-lg overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center text-dark-400">
              <MapPin class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p class="text-sm">地图组件占位</p>
              <p class="text-xs mt-1">接入高德地图 API 后可显示真实地图</p>
            </div>
          </div>
          <div class="absolute inset-0 p-4">
            <div class="relative w-full h-full">
              <div
                v-for="station in stations"
                :key="station.id"
                class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                :style="{
                  left: `${20 + (station.location.lng - 113) * 60}%`,
                  top: `${30 + (23 - station.location.lat) * 100}%`
                }"
                @click="selectStation(station)"
              >
                <div
                  class="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  :class="{
                    'bg-success': station.status === 'online',
                    'bg-warning animate-pulse': station.status === 'warning',
                    'bg-danger animate-pulse': station.status === 'critical',
                    'bg-dark-400': station.status === 'offline'
                  }"
                ></div>
                <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-dark-700 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {{ station.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">电站列表</h3>
        <div class="flex-1 overflow-y-auto space-y-2">
          <div
            v-for="station in stations"
            :key="station.id"
            @click="selectStation(station)"
            class="p-3 rounded-lg cursor-pointer transition-colors"
            :class="[
              selectedStation?.id === station.id 
                ? 'bg-primary/20 border border-primary/50' 
                : 'bg-dark-600/50 hover:bg-dark-500/50 border border-transparent'
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-dark-100 truncate">{{ station.name }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded border"
                :class="getStatusBg(station.status)"
              >
                <span :class="getStatusColor(station.status)">{{ getStatusText(station.status) }}</span>
              </span>
            </div>
            <div class="flex items-center gap-4 text-xs text-dark-400">
              <span class="flex items-center gap-1">
                <Battery class="w-3 h-3" />
                {{ station.packCount }} 包
              </span>
              <span class="flex items-center gap-1">
                <Zap class="w-3 h-3" />
                {{ station.capacity }} MWh
              </span>
            </div>
            <div class="text-xs text-dark-500 mt-1">
              更新于 {{ formatLastUpdate(station.lastUpdate) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedStation" class="glass-card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-white font-semibold">{{ selectedStation.name }}</h3>
        <span
          class="text-xs px-3 py-1 rounded-full border"
          :class="getStatusBg(selectedStation.status)"
        >
          <span :class="getStatusColor(selectedStation.status)">{{ getStatusText(selectedStation.status) }}</span>
        </span>
      </div>
      <div class="grid grid-cols-4 gap-4">
        <div>
          <div class="text-xs text-dark-400 mb-1">地址</div>
          <div class="text-sm text-dark-100">{{ selectedStation.location.address }}</div>
        </div>
        <div>
          <div class="text-xs text-dark-400 mb-1">坐标</div>
          <div class="text-sm font-mono text-dark-100">
            {{ selectedStation.location.lat.toFixed(4) }}, {{ selectedStation.location.lng.toFixed(4) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-dark-400 mb-1">容量</div>
          <div class="text-sm text-dark-100">{{ selectedStation.capacity }} MWh</div>
        </div>
        <div>
          <div class="text-xs text-dark-400 mb-1">电池包数量</div>
          <div class="text-sm text-dark-100">{{ selectedStation.packCount }} 个</div>
        </div>
      </div>
    </div>
  </div>
</template>
