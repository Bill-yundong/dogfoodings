<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Tank } from '@/types/tank'
import type { DiffusionResult } from '@/types/simulation'
import type { EmergencyTerminal, Shelter, ResourceUnit } from '@/types/terminal'
import { useMapRenderer } from '@/composables/useMapRenderer'

interface Props {
  tanks: Tank[]
  diffusionResult: DiffusionResult | null
  terminals: EmergencyTerminal[]
  shelters: Shelter[]
  resources: ResourceUnit[]
  windDirection: number
}

const props = defineProps<Props>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const {
  viewState,
  canvasSize,
  gridVisible,
  labelsVisible,
  clear,
  drawGrid,
  drawTanks,
  drawDiffusion,
  drawTerminals,
  drawShelters,
  drawResources,
  drawCompass,
  drawScale,
  zoomIn,
  zoomOut,
  pan,
  resetView
} = useMapRenderer(null)

let animationId: number | null = null
let isDragging = false
let lastMousePos = { x: 0, y: 0 }

function resizeCanvas() {
  if (!canvasRef.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
  canvasSize.width = rect.width
  canvasSize.height = rect.height
}

function render() {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  clear(ctx)
  drawGrid(ctx)
  drawDiffusion(ctx, props.diffusionResult)
  drawShelters(ctx, props.shelters)
  drawTerminals(ctx, props.terminals)
  drawTanks(ctx, props.tanks)
  drawResources(ctx, props.resources)
  drawCompass(ctx, props.windDirection)
  drawScale(ctx)

  animationId = requestAnimationFrame(render)
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging = true
  lastMousePos = { x: e.clientX, y: e.clientY }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return

  const dx = e.clientX - lastMousePos.x
  const dy = e.clientY - lastMousePos.y
  pan(dx, dy)
  lastMousePos = { x: e.clientX, y: e.clientY }
}

function handleMouseUp() {
  isDragging = false
}

function handleMouseLeave() {
  isDragging = false
}

onMounted(() => {
  resizeCanvas()
  render()

  window.addEventListener('resize', resizeCanvas)

  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', handleWheel, { passive: false })
    canvasRef.value.addEventListener('mousedown', handleMouseDown)
    canvasRef.value.addEventListener('mousemove', handleMouseMove)
    canvasRef.value.addEventListener('mouseup', handleMouseUp)
    canvasRef.value.addEventListener('mouseleave', handleMouseLeave)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full overflow-hidden">
    <canvas
      ref="canvasRef"
      class="block cursor-grab active:cursor-grabbing"
    ></canvas>

    <div class="absolute top-4 right-4 flex flex-col gap-2">
      <button
        @click="zoomIn"
        class="w-10 h-10 glass-panel flex items-center justify-center text-white hover:bg-accent-cyan/20 transition-colors"
      >
        +
      </button>
      <button
        @click="zoomOut"
        class="w-10 h-10 glass-panel flex items-center justify-center text-white hover:bg-accent-cyan/20 transition-colors"
      >
        -
      </button>
      <button
        @click="resetView"
        class="w-10 h-10 glass-panel flex items-center justify-center text-white hover:bg-accent-cyan/20 transition-colors text-xs"
      >
        ⟳
      </button>
    </div>

    <div class="absolute bottom-4 left-4 glass-panel p-3 flex gap-4 text-xs">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="gridVisible" class="accent-accent-cyan" />
        <span>网格</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="labelsVisible" class="accent-accent-cyan" />
        <span>标签</span>
      </label>
    </div>

    <div class="absolute bottom-4 right-4 glass-panel p-3">
      <div class="text-xs text-text-secondary mb-2">风险等级</div>
      <div class="flex flex-col gap-1 text-xs">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded" style="background: rgba(139, 0, 0, 0.85)"></span>
          <span>极高风险</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded" style="background: rgba(255, 71, 87, 0.75)"></span>
          <span>高风险</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded" style="background: rgba(255, 127, 80, 0.65)"></span>
          <span>中风险</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded" style="background: rgba(255, 215, 0, 0.55)"></span>
          <span>低风险</span>
        </div>
      </div>
    </div>
  </div>
</template>
