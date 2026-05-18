<template>
  <div class="prediction-view">
    <div class="flex items-center justify-between mb-6">
      <el-select v-model="selectedDeviceId" placeholder="选择设备" class="w-64" @change="loadDeviceData">
        <el-option v-for="d in deviceStore.devices" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <div class="flex items-center gap-2">
        <el-button type="primary" @click="runPrediction">运行预测</el-button>
        <el-button @click="exportReport">导出报告</el-button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="tech-card col-span-2">
        <h3 class="text-text-primary font-medium mb-6">气蚀风险评估</h3>
        <div class="grid grid-cols-2 gap-8">
          <RiskIndicator :value="currentRisk.probability" :level="currentRisk.level" />
          <div>
            <div class="mb-4">
              <p class="text-text-secondary text-sm mb-2">趋势分析</p>
              <div class="flex items-center gap-2">
                <el-tag :type="trendTagType" size="large" round>
                  <el-icon class="mr-1">
                    <component :is="currentRisk.trend === 'deteriorating' ? 'TrendCharts' : currentRisk.trend === 'improving' ? 'Top' : 'Minus'" />
                  </el-icon>
                  {{ trendText }}
                </el-tag>
              </div>
            </div>
            <div>
              <p class="text-text-secondary text-sm mb-2">预计剩余运行时间</p>
              <p class="text-2xl font-bold font-mono text-tech-accent">
                {{ estimatedRemainingTime }}
              </p>
              <p class="text-xs text-text-secondary">基于当前劣化速率估算</p>
            </div>
          </div>
        </div>
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">多维度风险雷达</h3>
        <ChartBase :option="radarOption" height="280px" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="tech-card col-span-2">
        <h3 class="text-text-primary font-medium mb-4">风险预测趋势</h3>
        <ChartBase :option="trendPredictionOption" height="300px" />
      </div>

      <div class="tech-card">
        <h3 class="text-text-primary font-medium mb-4">风险因子权重</h3>
        <div class="space-y-4">
          <div v-for="factor in currentRisk.factors" :key="factor.name">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-text-primary">{{ factor.name }}</span>
              <span class="text-sm font-mono" :style="{ color: factor.value > factor.threshold ? '#FF1744' : '#64FFDA' }">
                {{ factor.value.toFixed(2) }} / {{ factor.threshold }}
              </span>
            </div>
            <div class="h-2 bg-tech-bg rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500"
                   :style="{
                     width: `${Math.min(100, (factor.value / factor.threshold) * 100)}%`,
                     background: factor.value > factor.threshold 
                       ? 'linear-gradient(90deg, #FF9100, #FF1744)' 
                       : 'linear-gradient(90deg, #00C853, #64FFDA)'
                   }"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-text-secondary">
              <span>权重: {{ (factor.weight * 100).toFixed(0) }}%</span>
              <span>{{ factor.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tech-card">
      <h3 class="text-text-primary font-medium mb-4">智能建议</h3>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="(rec, idx) in recommendations" :key="idx"
             class="p-4 rounded-lg border border-tech-accent/20 bg-tech-bg/50 flex items-start gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
               :class="idx === 0 ? 'bg-status-critical/20 text-status-critical' : 'bg-tech-accent/20 text-tech-accent'">
            <el-icon>
              <component :is="idx === 0 ? 'Warning' : 'Lightning'" />
            </el-icon>
          </div>
          <div>
            <p class="text-text-primary">{{ rec }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { cavitationModel } from '@/algorithms/cavitation'
import RiskIndicator from '@/components/RiskIndicator.vue'
import ChartBase from '@/components/ChartBase.vue'
import { generateCavitationRisk } from '@/mock/dataGenerator'

const deviceStore = useDeviceStore()
const snapshotStore = useSnapshotStore()

const selectedDeviceId = ref('')
const currentRisk = ref(generateCavitationRisk(65))
const recommendations = ref<string[]>([])

const trendText = computed(() => {
  const map = { improving: '状态改善', stable: '状态稳定', deteriorating: '劣化趋势' }
  return map[currentRisk.value.trend]
})

const trendTagType = computed(() => {
  const map = { improving: 'success', stable: 'info', deteriorating: 'warning' }
  return map[currentRisk.value.trend] as 'success' | 'info' | 'warning'
})

const estimatedRemainingTime = computed(() => {
  if (currentRisk.value.level === 'low') return '> 180 天'
  if (currentRisk.value.level === 'medium') return '30-180 天'
  if (currentRisk.value.level === 'high') return '7-30 天'
  return '< 7 天'
})

const radarOption = computed(() => {
  const indicators = currentRisk.value.factors.map(f => ({
    name: f.name,
    max: f.threshold * 2
  }))
  const values = currentRisk.value.factors.map(f => f.value)

  return {
    tooltip: {
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#8892B0', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.1)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(100, 255, 218, 0.02)', 'rgba(100, 255, 218, 0.05)']
        }
      },
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.2)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '当前值',
        areaStyle: {
          color: 'rgba(100, 255, 218, 0.2)'
        },
        lineStyle: {
          color: '#64FFDA',
          width: 2
        },
        itemStyle: {
          color: '#64FFDA'
        }
      }, {
        value: indicators.map(i => i.max / 2),
        name: '阈值',
        areaStyle: {
          color: 'rgba(255, 23, 68, 0.1)'
        },
        lineStyle: {
          color: '#FF1744',
          type: 'dashed',
          width: 1
        },
        itemStyle: {
          color: '#FF1744'
        }
      }]
    }]
  }
})

const trendPredictionOption = computed(() => {
  const days = Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`)
  const history = days.slice(0, 7).map(() => 30 + Math.random() * 30)
  const prediction = days.slice(7).map(() => {
    const base = history[history.length - 1] || 50
    return Math.min(95, Math.max(5, base + (Math.random() - 0.3) * 20))
  })

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' }
    },
    legend: {
      data: ['历史数据', '预测值'],
      textStyle: { color: '#8892B0' },
      top: 0
    },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
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
      name: '风险概率 (%)',
      nameTextStyle: { color: '#8892B0' },
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0' },
      splitLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.1)' } }
    },
    series: [
      {
        type: 'line',
        name: '历史数据',
        data: [...history, ...prediction.slice(0, 1)],
        smooth: true,
        lineStyle: { color: '#64FFDA', width: 3 },
        itemStyle: { color: '#64FFDA' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 255, 218, 0.3)' },
              { offset: 1, color: 'rgba(100, 255, 218, 0)' }
            ]
          }
        }
      },
      {
        type: 'line',
        name: '预测值',
        data: [...Array(6).fill(null), history[history.length - 1], ...prediction],
        smooth: true,
        lineStyle: { color: '#FF9100', width: 3, type: 'dashed' },
        itemStyle: { color: '#FF9100' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 145, 0, 0.2)' },
              { offset: 1, color: 'rgba(255, 145, 0, 0)' }
            ]
          }
        }
      }
    ]
  }
})

async function loadDeviceData() {
  if (!selectedDeviceId.value) return
  await snapshotStore.loadSnapshots(selectedDeviceId.value, 10)
  const latest = snapshotStore.snapshots[0]
  if (latest) {
    currentRisk.value = latest.cavitationRisk
    recommendations.value = cavitationModel.generateRecommendations(latest.cavitationRisk)
  }
}

function runPrediction() {
  const healthScore = 40 + Math.random() * 50
  currentRisk.value = generateCavitationRisk(healthScore)
  recommendations.value = cavitationModel.generateRecommendations(currentRisk.value)
}

function exportReport() {
  alert('导出功能开发中...')
}

onMounted(() => {
  if (deviceStore.devices.length > 0) {
    selectedDeviceId.value = deviceStore.devices[0].id
    recommendations.value = cavitationModel.generateRecommendations(currentRisk.value)
  }
})
</script>
