<template>
  <div class="waveform-container tech-card" ref="containerRef">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-text-primary font-medium">{{ title }}</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-text-secondary font-mono">采样率: {{ samplingRate }} Hz</span>
        <span class="text-xs text-text-secondary font-mono">时长: {{ duration.toFixed(2) }}s</span>
      </div>
    </div>
    <canvas ref="canvasRef" class="w-full" :height="height"></canvas>
    <div class="flex items-center justify-between mt-2 text-xs text-text-secondary font-mono">
      <span>0s</span>
      <span>{{ (duration / 2).toFixed(2) }}s</span>
      <span>{{ duration.toFixed(2) }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  data: Float32Array | number[]
  samplingRate: number
  title?: string
  height?: number
  color?: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()
const height = ref(props.height || 150)
let animationId: number | null = null

function drawWaveform() {
  const canvas = canvasRef.value
  if (!canvas || !props.data || props.data.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = height.value * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const width = rect.width
  const h = height.value
  const data = props.data
  const step = Math.ceil(data.length / width)

  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, width, h)

  ctx.strokeStyle = 'rgba(100, 255, 218, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    const y = (h / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(100, 255, 218, 0.05)'
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, h)
  ctx.stroke()

  const centerY = h / 2
  const scale = (h / 2 - 10) / 8

  ctx.beginPath()
  ctx.strokeStyle = props.color || '#64FFDA'
  ctx.lineWidth = 1.5

  for (let x = 0; x < width; x++) {
    const startIdx = x * step
    const endIdx = Math.min(startIdx + step, data.length)
    
    let min = Infinity
    let max = -Infinity
    
    for (let i = startIdx; i < endIdx; i++) {
      const val = data[i]
      if (val < min) min = val
      if (val > max) max = val
    }

    const y1 = centerY - Math.max(-1, Math.min(1, max / 8)) * (h / 2 - 10)
    const y2 = centerY - Math.max(-1, Math.min(1, min / 8)) * (h / 2 - 10)

    if (x === 0) {
      ctx.moveTo(x, y1)
    } else {
      ctx.lineTo(x, y1)
    }
    ctx.lineTo(x, y2)
  }

  ctx.stroke()

  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, 'rgba(100, 255, 218, 0.3)')
  gradient.addColorStop(0.5, 'rgba(100, 255, 218, 0.1)')
  gradient.addColorStop(1, 'rgba(100, 255, 218, 0.3)')
  
  ctx.lineTo(width, centerY)
  ctx.lineTo(0, centerY)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()
}

const duration = computed(() => props.data.length / props.samplingRate)

watch(() => props.data, () => {
  drawWaveform()
}, { deep: true })

onMounted(() => {
  drawWaveform()
  window.addEventListener('resize', drawWaveform)
})

onUnmounted(() => {
  window.removeEventListener('resize', drawWaveform)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>
