<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { CadenceData } from '@/types'

const props = defineProps<{
  cadenceHistory: CadenceData[]
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance || props.cadenceHistory.length === 0) return

  const recentData = props.cadenceHistory.slice(-60)
  
  const times = recentData.map((_, i) => i)
  const cadenceValues = recentData.map(d => d.stepsPerMinute)
  const contactTimes = recentData.map(d => d.groundContactTime * 0.5)
  const verticalOsc = recentData.map(d => d.verticalOscillation * 5)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 27, 34, 0.95)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    legend: {
      data: ['步频 (SPM)', '触地时间(×0.5ms)', '垂直振幅(×5cm)'],
      textStyle: { color: 'var(--text-secondary)', fontSize: 11 },
      top: 0,
      right: 0
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 100,
      max: 220,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    series: [
      {
        name: '步频 (SPM)',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#165DFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 93, 255, 0.3)' },
            { offset: 1, color: 'rgba(22, 93, 255, 0)' }
          ])
        },
        data: cadenceValues
      },
      {
        name: '触地时间(×0.5ms)',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#FF7D00', type: 'dashed' },
        data: contactTimes
      },
      {
        name: '垂直振幅(×5cm)',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#00B42A', type: 'dotted' },
        data: verticalOsc
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(() => props.cadenceHistory, () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chartInstance?.resize())
})

onUnmounted(() => {
  chartInstance?.dispose()
})
</script>

<template>
  <div ref="chartRef" class="cadence-chart"></div>
</template>

<style scoped lang="scss">
.cadence-chart {
  width: 100%;
  height: 100%;
  min-height: 220px;
}
</style>
