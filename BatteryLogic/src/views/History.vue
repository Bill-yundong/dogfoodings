<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { Search, Download, Play, Pause, SkipBack, SkipForward, Calendar, Database } from 'lucide-vue-next'
import type { ThermalSnapshot } from '@/types'

const { getSnapshotsByTimeRange, exportData } = useIndexedDB()

const snapshots = ref<ThermalSnapshot[]>([])
const selectedSnapshot = ref<ThermalSnapshot | null>(null)
const isLoading = ref(false)
const isPlaying = ref(false)
const currentIndex = ref(0)
const playbackSpeed = ref(1)
let playbackInterval: number | null = null

const timeRange = ref({
  start: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
  end: new Date().toISOString().slice(0, 16)
})

async function loadSnapshots() {
  isLoading.value = true
  try {
    const startTime = new Date(timeRange.value.start).getTime()
    const endTime = new Date(timeRange.value.end).getTime()
    snapshots.value = await getSnapshotsByTimeRange(startTime, endTime)
    currentIndex.value = 0
    if (snapshots.value.length > 0) {
      selectedSnapshot.value = snapshots.value[0]
    }
  } catch (error) {
    console.error('Failed to load snapshots:', error)
  } finally {
    isLoading.value = false
  }
}

function selectSnapshot(index: number) {
  currentIndex.value = index
  selectedSnapshot.value = snapshots.value[index]
}

function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

function startPlayback() {
  if (snapshots.value.length === 0) return
  isPlaying.value = true
  playbackInterval = window.setInterval(() => {
    if (currentIndex.value < snapshots.value.length - 1) {
      currentIndex.value++
      selectedSnapshot.value = snapshots.value[currentIndex.value]
    } else {
      stopPlayback()
    }
  }, 1000 / playbackSpeed.value)
}

function stopPlayback() {
  isPlaying.value = false
  if (playbackInterval) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
}

function goToFirst() {
  if (snapshots.value.length > 0) {
    selectSnapshot(0)
  }
}

function goToLast() {
  if (snapshots.value.length > 0) {
    selectSnapshot(snapshots.value.length - 1)
  }
}

async function handleExport() {
  const startTime = new Date(timeRange.value.start).getTime()
  const endTime = new Date(timeRange.value.end).getTime()
  const data = await exportData(startTime, endTime)
  
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `battery-snapshots-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function getStatsForSnapshot(snapshot: ThermalSnapshot) {
  const temps = snapshot.cellsData.map(c => c.temperature)
  const volts = snapshot.cellsData.map(c => c.voltage)
  return {
    avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
    maxTemp: Math.max(...temps).toFixed(1),
    minTemp: Math.min(...temps).toFixed(1),
    avgVolt: (volts.reduce((a, b) => a + b, 0) / volts.length).toFixed(3),
    warningCount: snapshot.cellsData.filter(c => c.status === 'warning').length,
    runawayCount: snapshot.cellsData.filter(c => c.status === 'thermal_runaway').length
  }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  loadSnapshots()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-dark-500 rounded-lg p-1">
          <div class="flex items-center gap-2 px-3">
            <Calendar class="w-4 h-4 text-dark-300" />
            <input
              v-model="timeRange.start"
              type="datetime-local"
              class="bg-transparent text-dark-100 text-sm outline-none"
            />
          </div>
          <span class="text-dark-400">至</span>
          <div class="flex items-center gap-2 px-3">
            <input
              v-model="timeRange.end"
              type="datetime-local"
              class="bg-transparent text-dark-100 text-sm outline-none"
            />
          </div>
        </div>
        <button @click="loadSnapshots" class="btn-primary flex items-center gap-2">
          <Search class="w-4 h-4" />
          查询
        </button>
      </div>
      <button
        @click="handleExport"
        :disabled="snapshots.length === 0"
        class="btn-ghost flex items-center gap-2"
      >
        <Download class="w-4 h-4" />
        导出数据
      </button>
    </div>

    <div v-if="snapshots.length > 0" class="glass-card p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-white font-semibold">时间轴回放</h3>
        <div class="text-sm text-dark-300">
          快照数量: <span class="text-primary font-medium">{{ snapshots.length }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <button
          @click="goToFirst"
          class="p-2 rounded-lg hover:bg-dark-500 text-dark-300 hover:text-white transition-colors"
        >
          <SkipBack class="w-5 h-5" />
        </button>
        <button
          @click="togglePlayback"
          class="p-3 rounded-full bg-primary hover:bg-primary/90 text-white transition-colors"
        >
          <component :is="isPlaying ? Pause : Play" class="w-5 h-5" />
        </button>
        <button
          @click="goToLast"
          class="p-2 rounded-lg hover:bg-dark-500 text-dark-300 hover:text-white transition-colors"
        >
          <SkipForward class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <input
            v-model.number="currentIndex"
            type="range"
            min="0"
            :max="snapshots.length - 1"
            @input="selectSnapshot(currentIndex)"
            class="w-full accent-primary"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-dark-400">速度:</span>
          <select
            v-model.number="playbackSpeed"
            class="bg-dark-600 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100"
          >
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="2">2x</option>
            <option :value="5">5x</option>
          </select>
        </div>
      </div>
      <div class="text-center text-sm text-dark-300 mt-2">
        {{ currentIndex + 1 }} / {{ snapshots.length }}
        <span v-if="selectedSnapshot" class="ml-4">
          {{ formatTime(selectedSnapshot.timestamp) }}
        </span>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-3 gap-4 min-h-0">
      <div class="glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">快照列表</h3>
        <div class="flex-1 overflow-y-auto space-y-2">
          <div
            v-for="(snapshot, index) in snapshots"
            :key="snapshot.id"
            @click="selectSnapshot(index)"
            class="p-3 rounded-lg cursor-pointer transition-colors"
            :class="currentIndex === index 
              ? 'bg-primary/20 border border-primary/50' 
              : 'bg-dark-600/50 hover:bg-dark-500/50 border border-transparent'"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-mono text-dark-100">{{ formatTime(snapshot.timestamp) }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded"
                :class="{
                  'bg-success/20 text-success': snapshot.status === 'normal',
                  'bg-warning/20 text-warning': snapshot.status === 'warning',
                  'bg-danger/20 text-danger': snapshot.status === 'critical'
                }"
              >
                {{ snapshot.status }}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-dark-400">
              <span>电芯: {{ snapshot.cellsData.length }}</span>
              <span>最高温: {{ getStatsForSnapshot(snapshot).maxTemp }}°C</span>
            </div>
          </div>
          <div v-if="snapshots.length === 0 && !isLoading" class="text-center py-8 text-dark-400">
            <Database class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">暂无快照数据</p>
            <p class="text-xs mt-1">请选择时间范围并查询</p>
          </div>
        </div>
      </div>

      <div class="col-span-2 glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">快照详情</h3>
        <div v-if="selectedSnapshot" class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-5 gap-3 mb-4">
            <div class="p-3 rounded-lg bg-dark-600/50">
              <div class="text-xs text-dark-400 mb-1">平均温度</div>
              <div class="text-xl font-bold font-mono text-white">
                {{ getStatsForSnapshot(selectedSnapshot).avgTemp }}°C
              </div>
            </div>
            <div class="p-3 rounded-lg bg-dark-600/50">
              <div class="text-xs text-dark-400 mb-1">最高温度</div>
              <div class="text-xl font-bold font-mono text-warning">
                {{ getStatsForSnapshot(selectedSnapshot).maxTemp }}°C
              </div>
            </div>
            <div class="p-3 rounded-lg bg-dark-600/50">
              <div class="text-xs text-dark-400 mb-1">最低温度</div>
              <div class="text-xl font-bold font-mono text-success">
                {{ getStatsForSnapshot(selectedSnapshot).minTemp }}°C
              </div>
            </div>
            <div class="p-3 rounded-lg bg-dark-600/50">
              <div class="text-xs text-dark-400 mb-1">平均电压</div>
              <div class="text-xl font-bold font-mono text-primary">
                {{ getStatsForSnapshot(selectedSnapshot).avgVolt }}V
              </div>
            </div>
            <div class="p-3 rounded-lg bg-dark-600/50">
              <div class="text-xs text-dark-400 mb-1">异常电芯</div>
              <div class="text-xl font-bold font-mono text-danger">
                {{ getStatsForSnapshot(selectedSnapshot).warningCount + getStatsForSnapshot(selectedSnapshot).runawayCount }}
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium text-dark-200 mb-2">电芯数据</h4>
            <div class="grid grid-cols-6 gap-1">
              <div
                v-for="cell in selectedSnapshot.cellsData"
                :key="cell.id"
                class="aspect-square rounded flex flex-col items-center justify-center text-xs"
                :class="{
                  'bg-success/20 border border-success/30': cell.status === 'normal',
                  'bg-warning/20 border border-warning/30': cell.status === 'warning',
                  'bg-danger/20 border border-danger/30 animate-pulse': cell.status === 'thermal_runaway'
                }"
              >
                <span class="font-mono text-[10px] text-dark-300">{{ cell.id.split('_').slice(1).join('_') }}</span>
                <span class="font-mono text-white">{{ cell.temperature.toFixed(0) }}°</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-dark-400">
          <p>选择一个快照查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>
