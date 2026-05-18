<template>
  <div class="spectrum-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-select v-model="selectedDeviceId" placeholder="选择设备" class="w-64" @change="onDeviceChange">
          <el-option v-for="d in deviceStore.devices" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-button type="primary" @click="analyzeSignal" :loading="signalStore.processing">
          {{ signalStore.processing ? '分析中...' : '开始分析' }}
        </el-button>
        <el-button @click="generateNewSignal">生成模拟信号</el-button>
      </div>
      <div class="flex items-center gap-2">
        <el-switch v-model="hasCavitation" active-text="含气蚀信号" inactive-text="正常信号" />
      </div>
    </div>

    <el-progress v-if="signalStore.processing" :percentage="signalStore.processingProgress" 
                 :stroke-width="4" class="mb-6" />

    <div class="grid grid-cols-2 gap-6 mb-6">
      <div class="tech-card">
        <WaveformCanvas 
          :data="currentWaveform" 
          :sampling-rate="samplingRate"
          title="时域波形图" />
      </div>

      <div class="tech-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-text-primary font-medium">频域分析 (FFT)</h3>
          <div class="flex items-center gap-2 text-xs text-text-secondary font-mono">
            <span class="px-2 py-1 bg-tech-accent/10 text-tech-accent rounded">主频: {{ dominantFreq.toFixed(1) }} Hz</span>
          </div>
        </div>
        <ChartBase :option="fftChartOption" height="150px" />
        <div class="flex items-center justify-between mt-2 text-xs text-text-secondary font-mono">
          <span>0 Hz</span>
          <span>{{ (samplingRate / 4).toFixed(0) }} Hz</span>
          <span>{{ (samplingRate / 2).toFixed(0) }} Hz</span>
        </div>
      </div>
    </div>

    <div class="tech-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-text-primary font-medium">小波时频分析</h3>
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-text-secondary">尺度:</span>
            <span class="text-tech-accent font-mono">1</span>
            <div class="w-24 h-2 bg-gradient-to-r from-tech-accent via-status-warning to-status-critical rounded"></div>
            <span class="text-tech-accent font-mono">{{ waveletScales }}</span>
          </div>
        </div>
      </div>
      <div ref="heatmapContainer" class="relative">
        <canvas ref="waveletCanvas" class="w-full" height="300"></canvas>
        <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-text-secondary font-mono py-2 pl-2">
          <span>高频</span>
          <span>中频</span>
          <span>低频</span>
        </div>
      </div>
      <div class="flex items-center justify-between mt-2 text-xs text-text-secondary font-mono px-8">
        <span>0s</span>
        <span>{{ (signalDuration / 2).toFixed(2) }}s</span>
        <span>{{ signalDuration.toFixed(2) }}s</span>
      </div>
    </div>

    <div class="tech-card">
      <h3 class="text-text-primary font-medium mb-4">特征参数</h3>
      <div class="grid grid-cols-6 gap-4">
        <div v-for="(value, key) in features" :key="key" 
             class="p-4 bg-tech-bg/50 rounded-lg border border-tech-accent/10">
          <p class="text-text-secondary text-xs mb-1">{{ featureLabels[key as keyof typeof featureLabels] }}</p>
          <p class="text-xl font-bold font-mono text-tech-accent">{{ value.toFixed(3) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useSignalStore } from '@/stores/signalStore'
import WaveformCanvas from '@/components/WaveformCanvas.vue'
import ChartBase from '@/components/ChartBase.vue'
import { generateWaveletData } from '@/mock/dataGenerator'

const deviceStore = useDeviceStore()
const signalStore = useSignalStore()

const selectedDeviceId = ref('')
const hasCavitation = ref(false)
const samplingRate = ref(2048)
const signalDuration = ref(2)
const currentWaveform = ref<Float32Array>(new Float32Array())
const waveletCanvas = ref<HTMLCanvasElement>()
const heatmapContainer = ref<HTMLDivElement>()
const waveletScales = ref(32)
const waveletData = ref<number[][]>([])

const featureLabels = {
  rms: 'RMS 有效值',
  peak: '峰值',
  crestFactor: '波峰因子',
  kurtosis: '峭度',
  skewness: '偏度',
  harmonicRatio: '谐波比'
}

const features = ref({
  rms: 0,
  peak: 0,
  crestFactor: 0,
  kurtosis: 0,
  skewness: 0,
  harmonicRatio: 0
})

const dominantFreq = computed(() => {
  if (!signalStore.currentSignal?.frequencyDomain.amplitudes) return 0
  const amps = signalStore.currentSignal.frequencyDomain.amplitudes
  let maxIdx = 0
  let maxVal = 0
  for (let i = 0; i < amps.length; i++) {
    if (amps[i] > maxVal) {
      maxVal = amps[i]
      maxIdx = i
    }
  }
  return (maxIdx * samplingRate.value) / 1024
})

const fftChartOption = computed(() => {
  const amps = signalStore.currentSignal?.frequencyDomain.amplitudes || []
  const freqs = signalStore.currentSignal?.frequencyDomain.frequencies || []
  const displayCount = Math.min(256, amps.length)
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 34, 64, 0.95)',
      borderColor: 'rgba(100, 255, 218, 0.3)',
      textStyle: { color: '#E6F1FF' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const freq = (idx * samplingRate.value) / 1024
        return `频率: ${freq.toFixed(1)} Hz<br/>幅值: ${amps[idx].toFixed(3)}`
      }
    },
    grid: { left: 40, right: 20, top: 10, bottom: 20 },
    xAxis: {
      type: 'category',
      data: freqs.slice(0, displayCount).map((_: number, i: number) => i),
      show: false
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.3)' } },
      axisLabel: { color: '#8892B0' },
      splitLine: { lineStyle: { color: 'rgba(100, 255, 218, 0.1)' } }
    },
    series: [{
      type: 'bar',
      data: amps.slice(0, displayCount),
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(100, 255, 218, 0.9)' },
            { offset: 1, color: 'rgba(100, 255, 218, 0.3)' }
          ]
        }
      },
      barWidth: 2
    }]
  }
})

function generateNewSignal() {
  const n = samplingRate.value * signalDuration.value
  const data = new Float32Array(n)
  const dt = 1 / samplingRate.value

  const rotFreq = 25
  const vaneFreq = rotFreq * 6

  for (let i = 0; i < n; i++) {
    const t = i * dt
    let val = 0

    val += Math.sin(2 * Math.PI * rotFreq * t) * 2
    val += Math.sin(2 * Math.PI * vaneFreq * t) * 1.5
    val += Math.sin(2 * Math.PI * vaneFreq * 2 * t) * 0.8
    val += Math.sin(2 * Math.PI * vaneFreq * 3 * t) * 0.4

    if (hasCavitation.value) {
      val += (Math.random() - 0.5) * 3
      const cavitationFreq = 150 + Math.random() * 200
      val += Math.sin(2 * Math.PI * cavitationFreq * t) * Math.exp(-Math.pow(t - signalDuration.value/2, 2) * 4) * 2
    }

    val += (Math.random() - 0.5) * 0.5
    data[i] = val
  }

  currentWaveform.value = data
  waveletData.value = generateWaveletData(200, waveletScales.value, hasCavitation.value)
  drawWaveletHeatmap()
  extractFeaturesFromSignal(data)
}

function extractFeaturesFromSignal(data: Float32Array) {
  const n = data.length
  let sum = 0, sumSq = 0, peak = 0

  for (let i = 0; i < n; i++) {
    const val = data[i]
    sum += val
    sumSq += val * val
    if (Math.abs(val) > peak) peak = Math.abs(val)
  }

  const mean = sum / n
  const rms = Math.sqrt(sumSq / n)
  const crestFactor = rms > 0 ? peak / rms : 0

  let sum3 = 0, sum4 = 0
  for (let i = 0; i < n; i++) {
    const centered = data[i] - mean
    sum3 += Math.pow(centered, 3)
    sum4 += Math.pow(centered, 4)
  }

  const variance = sumSq / n - mean * mean
  const std = Math.sqrt(Math.max(0, variance))
  const skewness = std > 0.001 ? (sum3 / n) / Math.pow(std, 3) : 0
  const kurtosis = variance > 0.001 ? (sum4 / n) / Math.pow(variance, 2) : 0

  features.value = {
    rms,
    peak,
    crestFactor,
    kurtosis,
    skewness,
    harmonicRatio: 0.3 + Math.random() * 0.4
  }
}

function drawWaveletHeatmap() {
  const canvas = waveletCanvas.value
  const container = heatmapContainer.value
  if (!canvas || !container || waveletData.value.length === 0) return

  const rect = container.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = 300 * window.devicePixelRatio

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const width = rect.width
  const height = 300
  const data = waveletData.value
  const scales = data.length
  const timeSteps = data[0].length

  const cellWidth = width / timeSteps
  const cellHeight = height / scales

  for (let s = 0; s < scales; s++) {
    for (let t = 0; t < timeSteps; t++) {
      const val = data[s][t]
      ctx.fillStyle = getHeatmapColor(val)
      ctx.fillRect(t * cellWidth, s * cellHeight, cellWidth + 1, cellHeight + 1)
    }
  }
}

function getHeatmapColor(value: number): string {
  const v = Math.max(0, Math.min(1, value))
  if (v < 0.25) {
    const t = v / 0.25
    return `rgba(10, 25, 47, ${0.3 + t * 0.7})`
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25
    return `rgb(${Math.floor(100 * t)}, ${Math.floor(255 * (0.5 + t * 0.5))}, ${Math.floor(218 * (0.5 + t * 0.5))})`
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25
    return `rgb(${Math.floor(100 + 155 * t)}, ${Math.floor(255 - 25 * t)}, 0)`
  } else {
    const t = (v - 0.75) / 0.25
    return `rgb(255, ${Math.floor(214 - 214 * t)}, 0)`
  }
}

async function analyzeSignal() {
  if (!selectedDeviceId.value) return
  await signalStore.processSignal(selectedDeviceId.value, currentWaveform.value, samplingRate.value)
}

function onDeviceChange() {
  generateNewSignal()
}

onMounted(() => {
  if (deviceStore.devices.length > 0) {
    selectedDeviceId.value = deviceStore.devices[0].id
    generateNewSignal()
  }
})

watch(hasCavitation, () => {
  generateNewSignal()
})
</script>
