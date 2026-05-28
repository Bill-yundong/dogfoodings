<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as d3 from 'd3'
import type { TasteCoordinate } from '@/types'
import { TASTE_DIMENSIONS } from '@/types'

interface Props {
  data: TasteCoordinate
  width?: number
  height?: number
  showLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 400,
  height: 400,
  showLabels: true
})

const chartRef = ref<SVGSVGElement | null>(null)

const tasteLabels: Record<string, string> = {
  sweet: '甜',
  sour: '酸',
  bitter: '苦',
  salty: '咸',
  umami: '鲜'
}

const tasteColors: Record<string, string> = {
  sweet: '#FBBF24',
  sour: '#EF4444',
  bitter: '#6B7280',
  salty: '#3B82F6',
  umami: '#8B5CF6'
}

const radarData = computed(() => {
  return TASTE_DIMENSIONS.map(dim => ({
    axis: dim,
    value: props.data[dim],
    label: tasteLabels[dim],
    color: tasteColors[dim]
  }))
})

const drawChart = () => {
  if (!chartRef.value) return

  const svg = d3.select(chartRef.value)
  svg.selectAll('*').remove()

  const margin = { top: 40, right: 40, bottom: 40, left: 40 }
  const width = props.width - margin.left - margin.right
  const height = props.height - margin.top - margin.bottom
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2 - 20

  const g = svg
    .attr('width', props.width)
    .attr('height', props.height)
    .append('g')
    .attr('transform', `translate(${margin.left + centerX}, ${margin.top + centerY})`)

  const levels = 5
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius / levels) * i
    g.append('circle')
      .attr('r', levelRadius)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(156, 163, 175, 0.2)')
      .attr('stroke-dasharray', '2,2')
  }

  const angleSlice = (Math.PI * 2) / TASTE_DIMENSIONS.length
  TASTE_DIMENSIONS.forEach((_, i) => {
    const angle = angleSlice * i - Math.PI / 2
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', Math.cos(angle) * radius)
      .attr('y2', Math.sin(angle) * radius)
      .attr('stroke', 'rgba(156, 163, 175, 0.3)')
  })

  const line = d3.lineRadial()
    .radius((d: any) => (d.value / 100) * radius)
    .angle((_, i) => angleSlice * i)
    .curve(d3.curveLinearClosed)

  const area = d3.areaRadial()
    .innerRadius(0)
    .outerRadius((d: any) => (d.value / 100) * radius)
    .angle((_, i) => angleSlice * i)
    .curve(d3.curveLinearClosed)

  const areaGradient = g.append('defs')
    .append('linearGradient')
    .attr('id', 'areaGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%')
  areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.6)
  areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#92400E').attr('stop-opacity', 0.3)

  g.append('path')
    .datum(radarData.value)
    .attr('d', area as any)
    .attr('fill', 'url(#areaGradient)')
    .attr('opacity', 0.8)

  g.append('path')
    .datum(radarData.value)
    .attr('d', line as any)
    .attr('fill', 'none')
    .attr('stroke', '#F59E0B')
    .attr('stroke-width', 2.5)

  radarData.value.forEach((d, i) => {
    const angle = angleSlice * i - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    const pointX = Math.cos(angle) * (d.value / 100) * radius
    const pointY = Math.sin(angle) * (d.value / 100) * radius

    g.append('circle')
      .attr('cx', pointX)
      .attr('cy', pointY)
      .attr('r', 6)
      .attr('fill', d.color)
      .attr('stroke', '#1A1A1A')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))')

    if (props.showLabels) {
      const labelRadius = radius + 25
      const labelX = Math.cos(angle) * labelRadius
      const labelY = Math.sin(angle) * labelRadius
      
      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#9CA3AF')
        .attr('font-size', '12px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(d.label)

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY + 16)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d.color)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(d.value)
    }
  })
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
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
