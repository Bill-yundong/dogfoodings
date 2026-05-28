<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as d3 from 'd3'
import type { MaillardSimulationResult } from '@/types'

interface Props {
  data: MaillardSimulationResult
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 600,
  height: 300
})

const chartRef = ref<SVGSVGElement | null>(null)

const drawChart = () => {
  if (!chartRef.value) return

  const svg = d3.select(chartRef.value)
  svg.selectAll('*').remove()

  const margin = { top: 20, right: 30, bottom: 40, left: 50 }
  const width = props.width - margin.left - margin.right
  const height = props.height - margin.top - margin.bottom

  const g = svg
    .attr('width', props.width)
    .attr('height', props.height)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(props.data.time) || 30])
    .range([0, width])

  const yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([height, 0])

  const defs = svg.append('defs')
  
  const browningGradient = defs.append('linearGradient')
    .attr('id', 'browningGradient')
    .attr('x1', '0').attr('y1', '0')
    .attr('x2', '0').attr('y2', '1')
  browningGradient.append('stop').attr('offset', '0%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.8)
  browningGradient.append('stop').attr('offset', '100%').attr('stop-color', '#92400E').attr('stop-opacity', 0.1)

  const aromaGradient = defs.append('linearGradient')
    .attr('id', 'aromaGradient')
    .attr('x1', '0').attr('y1', '0')
    .attr('x2', '0').attr('y2', '1')
  aromaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#8B5CF6').attr('stop-opacity', 0.8)
  aromaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#5B21B6').attr('stop-opacity', 0.1)

  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat(() => '')
    )
    .selectAll('.tick line')
    .attr('stroke', 'rgba(156, 163, 175, 0.1)')

  g.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
    )
    .selectAll('.tick line')
    .attr('stroke', 'rgba(156, 163, 175, 0.1)')

  const xAxis = g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(5))
  xAxis.selectAll('text').attr('fill', '#9CA3AF').attr('font-size', '11px')
  xAxis.selectAll('path, line').attr('stroke', 'rgba(156, 163, 175, 0.3)')

  const yAxis = g.append('g')
    .call(d3.axisLeft(yScale).ticks(5))
  yAxis.selectAll('text').attr('fill', '#9CA3AF').attr('font-size', '11px')
  yAxis.selectAll('path, line').attr('stroke', 'rgba(156, 163, 175, 0.3)')

  const browningArea = d3.area()
    .x((_, i) => xScale(props.data.time[i]))
    .y0(height)
    .y1(d => yScale(d))
    .curve(d3.curveMonotoneX)

  const aromaArea = d3.area()
    .x((_, i) => xScale(props.data.time[i]))
    .y0(height)
    .y1(d => yScale(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(props.data.aromaIntensity)
    .attr('d', aromaArea as any)
    .attr('fill', 'url(#aromaGradient)')

  g.append('path')
    .datum(props.data.browningLevel)
    .attr('d', browningArea as any)
    .attr('fill', 'url(#browningGradient)')

  const browningLine = d3.line()
    .x((_, i) => xScale(props.data.time[i]))
    .y(d => yScale(d))
    .curve(d3.curveMonotoneX)

  const aromaLine = d3.line()
    .x((_, i) => xScale(props.data.time[i]))
    .y(d => yScale(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(props.data.aromaIntensity)
    .attr('d', aromaLine as any)
    .attr('fill', 'none')
    .attr('stroke', '#8B5CF6')
    .attr('stroke-width', 2.5)

  g.append('path')
    .datum(props.data.browningLevel)
    .attr('d', browningLine as any)
    .attr('fill', 'none')
    .attr('stroke', '#F59E0B')
    .attr('stroke-width', 2.5)

  g.append('text')
    .attr('x', width / 2)
    .attr('y', height + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', '#9CA3AF')
    .attr('font-size', '12px')
    .text('时间 (分钟)')

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#9CA3AF')
    .attr('font-size', '12px')
    .text('强度 (%)')

  const legend = g.append('g').attr('transform', `translate(${width - 150}, 10)`)
  
  legend.append('rect').attr('width', 12).attr('height', 3).attr('y', 4).attr('fill', '#F59E0B')
  legend.append('text').attr('x', 18).attr('y', 8).attr('fill', '#9CA3AF').attr('font-size', '11px').text('褐变程度')
  
  legend.append('rect').attr('width', 12).attr('height', 3).attr('y', 20).attr('fill', '#8B5CF6')
  legend.append('text').attr('x', 18).attr('y', 24).attr('fill', '#9CA3AF').attr('font-size', '11px').text('香气强度')
}

onMounted(() => {
  drawChart()
})

watch(() => props.data, () => {
  drawChart()
}, { deep: true })
</script>

<template>
  <div class="chart-container">
    <svg ref="chartRef" class="w-full h-full"></svg>
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
}
</style>
