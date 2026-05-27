<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { PressureData } from '@/types'

const props = defineProps<{
  pressureData: PressureData | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const leftPressure = computed(() => {
  if (!props.pressureData?.leftFoot) return 0
  return props.pressureData.leftFoot.reduce((sum, p) => sum + p.pressure, 0).toFixed(1)
})

const rightPressure = computed(() => {
  if (!props.pressureData?.rightFoot) return 0
  return props.pressureData.rightFoot.reduce((sum, p) => sum + p.pressure, 0).toFixed(1)
})

function getPressureColor(pressure: number): string {
  const normalized = Math.min(1, Math.max(0, pressure))
  if (normalized < 0.2) return `rgba(0, 180, 42, ${0.3 + normalized * 0.5})`
  if (normalized < 0.5) return `rgba(22, 93, 255, ${0.4 + normalized * 0.4})`
  if (normalized < 0.8) return `rgba(255, 125, 0, ${0.5 + normalized * 0.3})`
  return `rgba(245, 63, 63, ${0.6 + normalized * 0.4})`
}

function drawHeatmap() {
  const canvas = canvasRef.value
  if (!canvas || !props.pressureData) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const cellWidth = width / 12
  const cellHeight = height / 10

  ctx.clearRect(0, 0, width, height)

  const allPoints = [...props.pressureData.leftFoot, ...props.pressureData.rightFoot]
  
  allPoints.forEach(point => {
    const x = point.x * cellWidth
    const y = point.y * cellHeight
    const color = getPressureColor(point.pressure)
    
    const gradient = ctx.createRadialGradient(
      x + cellWidth / 2, y + cellHeight / 2, 0,
      x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.8
    )
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'transparent')
    
    ctx.fillStyle = gradient
    ctx.fillRect(x - cellWidth * 0.3, y - cellHeight * 0.3, cellWidth * 1.6, cellHeight * 1.6)
  })

  ctx.font = '12px var(--font-body)'
  ctx.fillStyle = 'var(--text-tertiary)'
  ctx.textAlign = 'center'
  
  ctx.fillText('左足', width * 0.2, height - 10)
  ctx.fillText('右足', width * 0.75, height - 10)

  const legendY = 20
  const legendWidth = 120
  const legendHeight = 8
  const legendX = width - legendWidth - 20

  const legendGradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY)
  legendGradient.addColorStop(0, '#00B42A')
  legendGradient.addColorStop(0.33, '#165DFF')
  legendGradient.addColorStop(0.66, '#FF7D00')
  legendGradient.addColorStop(1, '#F53F3F')

  ctx.fillStyle = legendGradient
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight)

  ctx.font = '10px var(--font-body)'
  ctx.fillStyle = 'var(--text-tertiary)'
  ctx.textAlign = 'left'
  ctx.fillText('低', legendX, legendY + 20)
  ctx.textAlign = 'right'
  ctx.fillText('高', legendX + legendWidth, legendY + 20)
}

watch(() => props.pressureData, () => {
  drawHeatmap()
}, { deep: true })

onMounted(() => {
  drawHeatmap()
  window.addEventListener('resize', drawHeatmap)
})
</script>

<template>
  <div class="heatmap-container">
    <div class="heatmap-stats">
      <div class="stat">
        <span class="stat-label">左足压力</span>
        <span class="stat-value font-display">{{ leftPressure }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">右足压力</span>
        <span class="stat-value font-display">{{ rightPressure }}</span>
      </div>
    </div>
    <canvas ref="canvasRef" class="heatmap-canvas"></canvas>
  </div>
</template>

<style scoped lang="scss">
.heatmap-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.heatmap-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
}

.heatmap-canvas {
  flex: 1;
  width: 100%;
  min-height: 280px;
}
</style>
