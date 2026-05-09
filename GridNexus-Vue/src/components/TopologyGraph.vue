<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { useTopologyStore } from '@/stores/topology'

const props = defineProps({
  height: {
    type: String,
    default: '500px'
  }
})

const topologyStore = useTopologyStore()
const chartRef = ref(null)
let chartInstance = null

const nodeIconMap = {
  dispatch_center: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.94 9 12 14.82 4.06 9 12 4.18z',
  substation: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  transformer: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  bus: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  feeder: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
  load: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
  generator: 'M13 3H8v18h5v-3h2c2.76 0 5-2.24 5-5v-5c0-2.76-2.24-5-5-5h-2V3zm2 5v2h2c1.1 0 2 .9 2 2s-.9 2-2 2h-2v2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4h-2z'
}

const nodeColorMap = {
  dispatch_center: '#1F6FEB',
  substation: '#8957E5',
  transformer: '#3FB950',
  bus: '#D29922',
  feeder: '#58A6FF',
  load: '#F85149',
  generator: '#0891B2'
}

const chartOption = computed(() => {
  const nodes = topologyStore.nodes.map(node => ({
    id: node.id,
    name: node.name,
    symbolSize: Math.max(30, Math.min(80, node.loadRatio * 50 + 30)),
    itemStyle: {
      color: node.isOverloaded ? '#F85149' : nodeColorMap[node.type] || '#666'
    },
    label: {
      show: true,
      fontSize: 10,
      color: '#fff',
      formatter: params => {
        return `${params.data.name.split('变')[0] || params.data.name.slice(-4)}\n${Math.round(node.loadRatio * 100)}%`
      }
    },
    category: node.type
  }))

  const edges = topologyStore.connections.map(conn => ({
    source: conn.from,
    target: conn.to,
    lineStyle: {
      width: Math.max(1, conn.flowRatio * 5),
      color: conn.flowRatio > 0.9 ? '#F85149' : conn.flowRatio > 0.7 ? '#D29922' : '#444',
      curveness: 0.1
    },
    label: {
      show: conn.flowRatio > 0.5,
      formatter: `${Math.round(conn.currentFlow)}MW`,
      fontSize: 9,
      color: '#aaa'
    }
  }))

  const categories = Object.values(nodeColorMap).map((color, i) => ({
    name: Object.keys(nodeColorMap)[i],
    itemStyle: { color }
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: params => {
        if (params.dataType === 'node') {
          const node = topologyStore.getNodeById(params.data.id)
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${node.name}</div>
              <div>类型: ${node.type}</div>
              <div>容量: ${node.capacity} MW</div>
              <div>负荷: ${node.currentLoad} MW</div>
              <div>负载率: ${(node.loadRatio * 100).toFixed(1)}%</div>
              <div>可用容量: ${node.availableCapacity} MW</div>
              <div style="color: ${node.isOverloaded ? '#F85149' : '#3FB950'}; margin-top: 4px;">
                状态: ${node.isOverloaded ? '过载' : '正常'}
              </div>
            </div>
          `
        }
        return ''
      }
    },
    legend: {
      data: Object.keys(nodeColorMap),
      textStyle: { color: '#aaa' },
      bottom: 10
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: edges,
        categories,
        roam: true,
        draggable: true,
        force: {
          repulsion: 300,
          edgeLength: [80, 200],
          gravity: 0.1
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 10
          }
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8
      }
    ]
  }
})

function initChart() {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
  
  chartInstance.on('click', (params) => {
    if (params.dataType === 'node') {
      topologyStore.selectNode(params.data.id)
    }
  })
  
  window.addEventListener('resize', handleResize)
}

function updateChart() {
  if (chartInstance && chartOption.value) {
    chartInstance.setOption(chartOption.value, true)
  }
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(() => [topologyStore.nodes, topologyStore.connections], () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>
