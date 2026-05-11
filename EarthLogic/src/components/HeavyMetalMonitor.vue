<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { HeavyMetal, SimulationResult } from '../types'

const props = defineProps<{
  heavyMetals: HeavyMetal[]
  simulationResults: SimulationResult[]
  currentTimeIndex: number
}>()

const radarChartRef = ref<HTMLDivElement | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null

const initRadarChart = () => {
  if (!radarChartRef.value) return
  
  radarChart = echarts.init(radarChartRef.value)
  updateRadarChart()
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const updateRadarChart = () => {
  if (!radarChart) return

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: props.heavyMetals.map(metal => ({
        name: metal.name,
        max: metal.threshold * 2
      })),
      axisName: {
        color: 'rgba(255,255,255,0.7)'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.1)'
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.2)'
        }
      }
    },
    series: [
      {
        name: '当前浓度',
        type: 'radar',
        data: [
          {
            value: props.heavyMetals.map(m => m.concentration),
            name: '当前浓度',
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
              ])
            },
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            itemStyle: {
              color: '#3b82f6'
            }
          },
          {
            value: props.heavyMetals.map(m => m.threshold),
            name: '安全阈值',
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(34, 197, 94, 0.3)' },
                { offset: 1, color: 'rgba(34, 197, 94, 0.05)' }
              ])
            },
            lineStyle: {
              color: '#22c55e',
              width: 2,
              type: 'dashed'
            },
            itemStyle: {
              color: '#22c55e'
            }
          }
        ]
      }
    ]
  }

  radarChart.setOption(option, true)
}

const updateTrendChart = () => {
  if (!trendChart) return

  const times = props.simulationResults.map(r => r.time)
  const maxConcentrations = props.simulationResults.map(r => r.maxConcentration)
  const plumeFronts = props.simulationResults.map(r => r.plumeFront)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['最大浓度', '污染前锋'],
      textStyle: {
        color: 'rgba(255,255,255,0.7)'
      },
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      name: '时间',
      data: times,
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
    yAxis: [
      {
        type: 'value',
        name: '最大浓度 (mg/kg)',
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
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.1)'
          }
        }
      },
      {
        type: 'value',
        name: '污染前锋 (m)',
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
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '最大浓度',
        type: 'line',
        smooth: true,
        data: maxConcentrations,
        lineStyle: {
          width: 3,
          color: '#ef4444'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
          ])
        },
        itemStyle: {
          color: '#ef4444'
        }
      },
      {
        name: '污染前锋',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: plumeFronts,
        lineStyle: {
          width: 3,
          color: '#f59e0b'
        },
        itemStyle: {
          color: '#f59e0b'
        }
      }
    ]
  }

  trendChart.setOption(option, true)
}

watch(
  () => props.currentTimeIndex,
  () => {
    updateRadarChart()
    updateTrendChart()
  }
)

watch(
  () => props.simulationResults,
  () => {
    updateRadarChart()
    updateTrendChart()
  },
  { deep: true }
)

onMounted(() => {
  initRadarChart()
  initTrendChart()
  window.addEventListener('resize', () => {
    radarChart?.resize()
    trendChart?.resize()
  })
})
</script>

<template>
  <div>
    <div class="card">
      <h3 class="card-title">
        <span>⚗️</span>
        重金属浓度监测
      </h3>
      <div class="chart-container" ref="radarChartRef"></div>
    </div>

    <div class="card" style="margin-top: 20px;">
      <h3 class="card-title">
        <span>📈</span>
        污染运移趋势
      </h3>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>
  </div>
</template>
