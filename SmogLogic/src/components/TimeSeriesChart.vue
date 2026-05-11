<template>
  <div class="time-series-chart">
    <h3>📈 时间序列分析</h3>
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import type { Particle } from '../types'

const props = defineProps<{
  particlesHistory?: Particle[][]
}>()

const chartContainer = ref<HTMLElement>()
let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null

onMounted(() => {
  initChart()
})

function initChart() {
  if (!chartContainer.value) return
  
  const width = chartContainer.value.clientWidth
  const height = 200
  const margin = { top: 20, right: 20, bottom: 30, left: 50 }
  
  svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
}

watch(() => props.particlesHistory, (history) => {
  if (!history || history.length === 0 || !svg) return
  
  const width = chartContainer.value?.clientWidth || 600
  const height = 200
  const margin = { top: 20, right: 20, bottom: 30, left: 50 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  
  svg.selectAll('*').remove()
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  const data = history.map((particles, i) => ({
    time: i,
    pm25: particles.reduce((sum, p) => sum + p.pm25, 0),
    count: particles.length
  }))
  
  const xScale = d3.scaleLinear()
    .domain([0, data.length - 1])
    .range([0, innerWidth])
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.pm25) || 100])
    .range([innerHeight, 0])
  
  const xAxis = d3.axisBottom(xScale)
    .ticks(Math.min(data.length, 10))
    .tickFormat(i => `T${i}`)
  
  const yAxis = d3.axisLeft(yScale)
    .ticks(5)
  
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '10px')
  
  g.append('g')
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '10px')
  
  const line = d3.line<typeof data[0]>()
    .x(d => xScale(d.time))
    .y(d => yScale(d.pm25))
    .curve(d3.curveMonotoneX)
  
  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'url(#gradient)')
    .attr('stroke-width', 2.5)
    .attr('d', line)
  
  const gradient = g.append('defs')
    .append('linearGradient')
    .attr('id', 'gradient')
    .attr('x1', '0%')
    .attr('x2', '100%')
  
  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#667eea')
  
  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#764ba2')
  
  const area = d3.area<typeof data[0]>()
    .x(d => xScale(d.time))
    .y0(innerHeight)
    .y1(d => yScale(d.pm25))
    .curve(d3.curveMonotoneX)
  
  g.append('path')
    .datum(data)
    .attr('fill', 'url(#areaGradient)')
    .attr('opacity', 0.1)
    .attr('d', area)
  
  const areaGradient = g.append('defs')
    .append('linearGradient')
    .attr('id', 'areaGradient')
    .attr('x1', '0%')
    .attr('x2', '0%')
    .attr('y1', '0%')
    .attr('y2', '100%')
  
  areaGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#667eea')
  
  areaGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#667eea')
    .attr('stop-opacity', 0)
  
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.time))
    .attr('cy', d => yScale(d.pm25))
    .attr('r', 4)
    .attr('fill', '#667eea')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
}, { deep: true })
</script>

<style scoped>
.time-series-chart {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 16px;
}

.time-series-chart h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.chart-container {
  width: 100%;
  height: 200px;
}
</style>
