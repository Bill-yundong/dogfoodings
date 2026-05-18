<template>
  <div class="snapshot-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-select v-model="selectedDeviceId" placeholder="选择设备" class="w-64" @change="loadSnapshots">
          <el-option v-for="d in deviceStore.devices" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          size="default"
        />
        <el-button type="primary" @click="loadSnapshots">查询</el-button>
      </div>
      <div class="flex items-center gap-2">
        <el-button @click="compareMode = !compareMode" :type="compareMode ? 'primary' : 'default'">
          <el-icon class="mr-1"><CopyDocument /></el-icon>
          {{ compareMode ? '退出对比' : '对比模式' }}
        </el-button>
        <el-button @click="createSnapshot">
          <el-icon class="mr-1"><Camera /></el-icon>
          生成快照
        </el-button>
      </div>
    </div>

    <div v-if="compareMode" class="mb-6 p-4 bg-tech-accent/10 rounded-lg border border-tech-accent/30">
      <p class="text-tech-accent text-sm">
        <el-icon class="mr-1"><InfoFilled /></el-icon>
        对比模式：请选择两个快照进行对比分析
        <span v-if="selectedForCompare.length > 0" class="ml-2">
          已选择 {{ selectedForCompare.length }} 个
          <el-button v-if="selectedForCompare.length === 2" size="small" @click="showCompareDialog = true">
            开始对比
          </el-button>
          <el-button size="small" text @click="selectedForCompare = []">清空选择</el-button>
        </span>
      </p>
    </div>

    <div class="tech-card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-text-primary font-medium">健康快照列表</h3>
        <span class="text-text-secondary text-sm">共 {{ snapshotStore.totalCount }} 条记录</span>
      </div>

      <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        <div v-for="snapshot in snapshotStore.snapshots" :key="snapshot.id"
             class="p-4 rounded-lg border transition-all duration-200 cursor-pointer"
             :class="[
               selectedSnapshot?.id === snapshot.id 
                 ? 'border-tech-accent bg-tech-accent/10' 
                 : 'border-tech-accent/20 bg-tech-bg/50 hover:border-tech-accent/40',
               selectedForCompare.includes(snapshot.id) ? 'ring-2 ring-tech-accent' : ''
             ]"
             @click="onSnapshotClick(snapshot)">
          <div class="grid grid-cols-12 gap-4 items-start">
            <div class="col-span-2 flex-shrink-0">
              <div class="w-full min-h-[100px] rounded-lg flex flex-col items-center justify-center p-3"
                   :style="{ background: getHealthBg(snapshot.healthScore) }">
                <span class="text-3xl font-bold leading-tight" :style="{ color: getHealthColor(snapshot.healthScore) }">
                  {{ snapshot.healthScore }}
                </span>
                <span class="text-xs text-text-secondary mt-2">健康分</span>
              </div>
            </div>
            <div class="col-span-7 min-w-0">
              <p class="text-text-primary font-medium truncate">
                {{ formatTimestamp(snapshot.timestamp) }}
              </p>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span class="text-xs text-text-secondary whitespace-nowrap">
                  气蚀风险: 
                  <span :style="{ color: getRiskColor(snapshot.cavitationRisk.level) }" class="font-medium">
                    {{ getRiskText(snapshot.cavitationRisk.level) }}
                  </span>
                  ({{ snapshot.cavitationRisk.probability.toFixed(1) }}%)
                </span>
                <span class="text-xs text-text-secondary whitespace-nowrap">
                  RMS: {{ snapshot.vibrationFeatures.rms.toFixed(2) }} mm/s
                </span>
                <span class="text-xs text-text-secondary whitespace-nowrap">
                  峭度: {{ snapshot.vibrationFeatures.kurtosis.toFixed(2) }}
                </span>
              </div>
            </div>
            <div class="col-span-3 flex flex-wrap justify-end items-center gap-2">
              <el-tag v-if="snapshot.cavitationRisk.trend === 'deteriorating'" type="danger" size="small">
                劣化
              </el-tag>
              <el-tag v-else-if="snapshot.cavitationRisk.trend === 'improving'" type="success" size="small">
                改善
              </el-tag>
              <el-tag v-else type="info" size="small">稳定</el-tag>
            </div>
          </div>

          <div v-if="selectedSnapshot?.id === snapshot.id" class="mt-4 pt-4 border-t border-tech-accent/20">
            <div class="grid grid-cols-6 gap-4">
              <div v-for="(value, key) in snapshot.vibrationFeatures" :key="key"
                   class="text-center">
                <p class="text-text-secondary text-xs mb-1">{{ featureLabels[key as keyof typeof featureLabels] }}</p>
                <p class="text-lg font-mono text-tech-accent">{{ Number(value).toFixed(3) }}</p>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-text-secondary text-xs mb-2">建议措施:</p>
              <div class="flex flex-wrap gap-2">
                <el-tag v-for="(rec, idx) in snapshot.recommendations" :key="idx" size="small">
                  {{ rec }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <div v-if="snapshotStore.snapshots.length === 0" class="text-center py-16 text-text-secondary">
          <el-icon :size="48"><DataLine /></el-icon>
          <p class="mt-2">暂无快照数据</p>
        </div>
      </div>

      <div class="mt-6 flex justify-center">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="snapshotStore.totalCount"
          layout="prev, pager, next"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <el-dialog v-model="showCompareDialog" title="快照对比分析" width="900px" top="5vh">
      <div v-if="compareSnapshots.length === 2" class="compare-dialog">
        <div class="grid grid-cols-2 gap-6">
          <div v-for="(snap, idx) in compareSnapshots" :key="snap.id" class="tech-card">
            <h4 class="text-text-primary font-medium mb-4 text-center">
              {{ idx === 0 ? '快照 A' : '快照 B' }}
              <br>
              <span class="text-xs text-text-secondary font-normal">
                {{ formatTimestamp(snap.timestamp) }}
              </span>
            </h4>
            <div class="text-center mb-4">
              <div class="inline-flex items-center justify-center w-24 h-24 rounded-full"
                   :style="{ background: getHealthBg(snap.healthScore) }">
                <span class="text-4xl font-bold" :style="{ color: getHealthColor(snap.healthScore) }">
                  {{ snap.healthScore }}
                </span>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="(value, key) in snap.vibrationFeatures" :key="key">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-text-secondary">{{ featureLabels[key as keyof typeof featureLabels] }}</span>
                  <span class="text-sm font-mono text-text-primary">{{ Number(value).toFixed(3) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 tech-card">
          <h4 class="text-text-primary font-medium mb-4">差异分析</h4>
          <div class="space-y-3">
            <div v-for="(value, key) in compareFeatureList" :key="key"
                 class="flex items-center gap-4">
              <span class="w-24 text-sm text-text-secondary">{{ value.label }}</span>
              <div class="flex-1 h-8 bg-tech-bg rounded flex items-center overflow-hidden">
                <div class="h-full flex items-center justify-end pr-2"
                     :style="{ 
                       width: `${Math.min(100, (value.valueA / 20) * 100)}%`,
                       background: 'rgba(100, 255, 218, 0.3)'
                     }">
                  <span class="text-xs font-mono text-tech-accent">
                    {{ value.valueA.toFixed(2) }}
                  </span>
                </div>
              </div>
              <div class="flex-1 h-8 bg-tech-bg rounded flex items-center overflow-hidden">
                <div class="h-full flex items-center pl-2"
                     :style="{ 
                       width: `${Math.min(100, (value.valueB / 20) * 100)}%`,
                       background: 'rgba(255, 145, 0, 0.3)'
                     }">
                  <span class="text-xs font-mono text-status-severe">
                    {{ value.valueB.toFixed(2) }}
                  </span>
                </div>
              </div>
              <span class="w-16 text-right text-sm font-mono"
                    :class="getDiffClass(value.valueA, value.valueB)">
                {{ getDiffText(value.valueA, value.valueB) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { useSignalStore } from '@/stores/signalStore'
import type { HealthSnapshot } from '@/types'
import { formatTimestamp, getHealthColor, getRiskColor, getRiskText } from '@/utils'
import { generateMockSnapshots } from '@/mock/dataGenerator'

const deviceStore = useDeviceStore()
const snapshotStore = useSnapshotStore()
const signalStore = useSignalStore()

const selectedDeviceId = ref('')
const selectedSnapshot = ref<HealthSnapshot | null>(null)
const compareMode = ref(false)
const selectedForCompare = ref<string[]>([])
const showCompareDialog = ref(false)
const dateRange = ref<Date[]>([])
const currentPage = ref(1)
const pageSize = ref(10)

const featureLabels = {
  rms: 'RMS 有效值',
  peak: '峰值',
  crestFactor: '波峰因子',
  kurtosis: '峭度',
  skewness: '偏度',
  peakFrequency: '峰值频率',
  harmonicRatio: '谐波比'
}

const compareSnapshots = computed(() => {
  return selectedForCompare.value
    .map(id => snapshotStore.snapshots.find(s => s.id === id))
    .filter(Boolean) as HealthSnapshot[]
})

const compareFeatureList = computed(() => {
  if (compareSnapshots.value.length < 2) return []
  const snapA = compareSnapshots.value[0]
  const snapB = compareSnapshots.value[1]
  const keys = Object.keys(featureLabels) as (keyof typeof featureLabels)[]
  
  return keys.map(key => ({
    key,
    label: featureLabels[key],
    valueA: Number(snapA.vibrationFeatures[key]) || 0,
    valueB: Number(snapB.vibrationFeatures[key]) || 0
  }))
})

function getHealthBg(score: number): string {
  if (score >= 80) return 'rgba(0, 200, 83, 0.15)'
  if (score >= 60) return 'rgba(255, 214, 0, 0.15)'
  if (score >= 40) return 'rgba(255, 145, 0, 0.15)'
  return 'rgba(255, 23, 68, 0.15)'
}

function onSnapshotClick(snapshot: HealthSnapshot) {
  if (compareMode.value) {
    const idx = selectedForCompare.value.indexOf(snapshot.id)
    if (idx !== -1) {
      selectedForCompare.value.splice(idx, 1)
    } else if (selectedForCompare.value.length < 2) {
      selectedForCompare.value.push(snapshot.id)
    }
  } else {
    selectedSnapshot.value = selectedSnapshot.value?.id === snapshot.id ? null : snapshot
  }
}

async function loadSnapshots() {
  if (!selectedDeviceId.value) return
  const offset = (currentPage.value - 1) * pageSize.value
  await snapshotStore.loadSnapshots(selectedDeviceId.value, pageSize.value, offset)
  selectedSnapshot.value = null
}

function onPageChange(page: number) {
  currentPage.value = page
  loadSnapshots()
}

async function createSnapshot() {
  if (!selectedDeviceId.value) return
  
  const rawData = signalStore.generateMockSignal(1024, 1, Math.random() > 0.7)
  const features = signalStore.extractFeatures(rawData, 1024)
  const risk = signalStore.evaluateCavitationRisk(rawData, 1024)
  
  const snapshot: HealthSnapshot = {
    id: `snap-${Date.now()}`,
    deviceId: selectedDeviceId.value,
    timestamp: Date.now(),
    healthScore: Math.max(0, Math.min(100, 100 - risk.probability * 0.8)),
    vibrationFeatures: features,
    cavitationRisk: risk,
    recommendations: risk.level === 'low' ? ['继续保持监测'] : ['建议检查设备状态']
  }

  await snapshotStore.saveSnapshot(snapshot)
  await loadSnapshots()
}

function getDiffClass(a: number, b: number): string {
  const diff = b - a
  if (Math.abs(diff) < 0.01) return 'text-text-secondary'
  return diff > 0 ? 'text-status-critical' : 'text-status-normal'
}

function getDiffText(a: number, b: number): string {
  const diff = b - a
  if (Math.abs(diff) < 0.01) return '—'
  return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`
}

onMounted(async () => {
  if (deviceStore.devices.length > 0) {
    selectedDeviceId.value = deviceStore.devices[0].id
    await loadSnapshots()
  }
})
</script>
