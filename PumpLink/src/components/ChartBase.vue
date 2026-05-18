<template>
  <div ref="chartRef" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  option: Record<string, any>
  width?: string
  height?: string
  theme?: 'dark' | 'light'
}>()

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value, props.theme || 'dark')
  chartInstance.setOption(props.option)
}

function resize() {
  chartInstance?.resize()
}

watch(() => props.option, (newOption) => {
  chartInstance?.setOption(newOption)
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chartInstance?.dispose()
})

defineExpose({
  resize,
  getInstance: () => chartInstance
})
</script>
