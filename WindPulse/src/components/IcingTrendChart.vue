<template>
  <div class="chart-container">
    <h3>结冰趋势预测</h3>
    <div class="chart-wrapper">
      <v-chart :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import type { SensorData, IcingPrediction } from '../types'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const props = defineProps<{
  historyData: Array<{ sensor: SensorData; prediction: IcingPrediction }>
}>()

const chartOption = computed(() => {
  const times = props.historyData.map(d =>
    new Date(d.sensor.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  )

  const icingMasses = props.historyData.map(d => d.prediction.icingMass)
  const temperatures = props.historyData.map(d => d.sensor.temperature)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#fff'
      },
      formatter: function(params: any) {
        let result = params[0].axisValue + '<br/>'
        params.forEach((item: any) => {
          const unit = item.seriesName === '覆冰质量' ? ' kg/m²' : '°C'
          result += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${item.color};"></span>`
          result += `${item.seriesName}: <strong>${item.value.toFixed(2)}</strong>${unit}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['覆冰质量', '温度'],
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)'
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
      boundaryGap: false,
      data: times,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '覆冰质量 (kg/m²)',
        nameTextStyle: {
          color: '#8b5cf6'
        },
        axisLine: {
          lineStyle: {
            color: '#8b5cf6'
          }
        },
        axisLabel: {
          color: '#8b5cf6',
          formatter: '{value}'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        position: 'left'
      },
      {
        type: 'value',
        name: '温度 (°C)',
        nameTextStyle: {
          color: '#3b82f6'
        },
        axisLine: {
          lineStyle: {
            color: '#3b82f6'
          },
          show: true
        },
        axisLabel: {
          color: '#3b82f6',
          formatter: '{value}°C'
        },
        splitLine: {
          show: false
        },
        position: 'right'
      }
    ],
    series: [
      {
        name: '覆冰质量',
        type: 'line',
        smooth: true,
        data: icingMasses,
        lineStyle: {
          color: '#8b5cf6',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.05)' }
            ]
          }
        },
        itemStyle: {
          color: '#8b5cf6'
        }
      },
      {
        name: '温度',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: temperatures,
        lineStyle: {
          color: '#3b82f6',
          width: 2
        },
        itemStyle: {
          color: '#3b82f6'
        }
      }
    ]
  }
})
</script>

<style scoped>
.chart-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.chart-container h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.chart-wrapper {
  width: 100%;
  min-height: 350px;
}
</style>