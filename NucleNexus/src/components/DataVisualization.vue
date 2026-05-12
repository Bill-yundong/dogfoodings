<template>
  <div class="card">
    <h2>📊 生态数据趋势</h2>
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  ecologicalData: {
    type: Object,
    required: true
  }
})

const chartContainer = ref(null)
let chart = null
const dataHistory = ref([])

const initChart = () => {
  chart = echarts.init(chartContainer.value)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 52, 96, 0.9)',
      borderColor: '#00d9ff',
      textStyle: {
        color: '#ffffff'
      }
    },
    legend: {
      data: ['浮游生物密度', '水母数量', '藻类浓度'],
      textStyle: {
        color: '#8892b0'
      },
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '60px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      axisLine: {
        lineStyle: {
          color: '#8892b0'
        }
      },
      axisLabel: {
        color: '#8892b0'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#8892b0'
        }
      },
      axisLabel: {
        color: '#8892b0'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(136, 146, 176, 0.2)'
        }
      }
    },
    series: [
      {
        name: '浮游生物密度',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: {
          color: '#00d9ff',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 217, 255, 0.3)' },
            { offset: 1, color: 'rgba(0, 217, 255, 0)' }
          ])
        }
      },
      {
        name: '水母数量',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: {
          color: '#ff6b6b',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0)' }
          ])
        }
      },
      {
        name: '藻类浓度',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: {
          color: '#4ecdc4',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
            { offset: 1, color: 'rgba(78, 205, 196, 0)' }
          ])
        }
      }
    ]
  }
  
  chart.setOption(option)
}

const updateChart = () => {
  if (!chart) return
  
  const now = new Date()
  const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  dataHistory.value.push({
    time: timeLabel,
    plankton: Number(props.ecologicalData.planktonDensity.toFixed(2)),
    jellyfish: props.ecologicalData.jellyfishCount,
    algae: Number(props.ecologicalData.algaeConcentration.toFixed(2))
  })
  
  if (dataHistory.value.length > 20) {
    dataHistory.value.shift()
  }
  
  chart.setOption({
    xAxis: {
      data: dataHistory.value.map(d => d.time)
    },
    series: [
      { data: dataHistory.value.map(d => d.plankton) },
      { data: dataHistory.value.map(d => d.jellyfish) },
      { data: dataHistory.value.map(d => d.algae) }
    ]
  })
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chart?.resize())
})

watch(() => props.ecologicalData, () => {
  updateChart()
}, { deep: true })

onUnmounted(() => {
  chart?.dispose()
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 300px;
}
</style>