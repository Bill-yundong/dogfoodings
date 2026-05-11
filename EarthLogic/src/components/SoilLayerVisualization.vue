<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { SoilLayer, SimulationResult, HeavyMetal } from '../types'

const props = defineProps<{
  layers: SoilLayer[]
  simulationResults: SimulationResult[]
  heavyMetals: HeavyMetal[]
  currentTimeIndex: number
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

const getInitialData = () => {
  const maxDepth = 3
  const numLayers = 50
  const depths = []
  const concentrations = []
  for (let i = 0; i < numLayers; i++) {
    depths.push((i / (numLayers - 1)) * maxDepth)
    concentrations.push(0)
  }
  return { depths, concentrations }
}

const updateChart = () => {
  if (!chart) return

  const currentResult = props.simulationResults[props.currentTimeIndex]
  const data = currentResult || getInitialData()

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        let result = ''
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value.toFixed(4)} mg/kg<br/>`
        })
        return result
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '浓度 (mg/kg)',
      nameTextStyle: {
        color: 'rgba(255,255,255,0.7)'
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.3)'
        }
      },
      axisLabel: {
        color: 'rgba(255,255,255,0.7)'
      },
      min: 0,
      max: Math.max(100, ...data.concentrations) * 1.1
    },
    yAxis: {
      type: 'value',
      name: '深度 (m)',
      inverse: true,
      nameTextStyle: {
        color: 'rgba(255,255,255,0.7)'
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.3)'
        }
      },
      axisLabel: {
        color: 'rgba(255,255,255,0.7)'
      }
    },
    series: [
      {
        name: '重金属浓度分布',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: data.concentrations.map((c, i) => [c, data.depths[i]]),
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#22c55e' },
            { offset: 0.5, color: '#eab308' },
            { offset: 1, color: '#ef4444' }
          ])
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'rgba(34, 197, 94, 0.3)' },
            { offset: 0.5, color: 'rgba(234, 179, 8, 0.2)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.1)' }
          ])
        },
        itemStyle: {
          color: '#3b82f6'
        }
      },
      ...props.layers.map((layer) => ({
        name: layer.name,
        type: 'line',
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: layer.depth,
              lineStyle: {
                color: layer.color,
                width: 2,
                type: 'dashed'
              },
              label: {
                formatter: layer.name,
                position: 'end',
                color: layer.color,
                fontSize: 12
              }
            }
          ]
        }
      }))
    ]
  }

  chart.setOption(option, true)
}

watch(() => props.currentTimeIndex, updateChart)
watch(() => props.simulationResults, updateChart, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chart?.resize())
})
</script>

<template>
  <div class="card">
    <h3 class="card-title">
      <span>🌱</span>
      土壤分层重金属运移可视化
    </h3>
    <div class="chart-container" ref="chartRef"></div>
    
    <div class="layer-info">
      <h4 style="margin-bottom: 12px; color: #86efac;">土壤层信息</h4>
      <div class="grid grid-3" style="gap: 12px;">
        <div 
          v-for="layer in layers" 
          :key="layer.id"
          class="layer-card"
          :style="{ borderLeftColor: layer.color }"
        >
          <div class="layer-name">{{ layer.name }}</div>
          <div class="layer-detail">深度: {{ layer.depth }}m</div>
          <div class="layer-detail">厚度: {{ layer.thickness }}m</div>
          <div class="layer-detail">孔隙度: {{ (layer.porosity * 100).toFixed(1) }}%</div>
          <div class="layer-detail">pH: {{ layer.ph.toFixed(1) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.layer-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid;
}

.layer-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #7dd3fc;
}

.layer-detail {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}
</style>
