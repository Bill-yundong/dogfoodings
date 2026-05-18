<template>
  <div class="visualizer-container">
    <canvas 
      ref="canvasRef" 
      :width="canvasSize" 
      :height="canvasSize"
      class="tank-canvas"
    ></canvas>
    <div class="visualizer-overlay">
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: linear-gradient(to right, #0a0a1a, #00d4ff)"></div>
          <span>低浓度 → 高浓度</span>
        </div>
        <div class="legend-item" v-if="showDeadZones">
          <div class="legend-color" style="background: #ff4757"></div>
          <span>死区</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ffd93d"></div>
          <span>搅拌器</span>
        </div>
      </div>
      <div class="info-panel">
        <div class="info-item">
          <span class="info-label">网格分辨率</span>
          <span class="info-value">{{ gridSize.x }} × {{ gridSize.y }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">雷诺数</span>
          <span class="info-value">{{ reynoldsNumber.toExponential(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'

const props = defineProps({
  concentration: {
    type: Float32Array,
    default: null
  },
  velocityX: {
    type: Float32Array,
    default: null
  },
  velocityY: {
    type: Float32Array,
    default: null
  },
  deadZone: {
    type: Uint8Array,
    default: null
  },
  gridSize: {
    type: Object,
    default: () => ({ x: 64, y: 64 })
  },
  impellerSpeed: {
    type: Number,
    default: 120
  },
  reynoldsNumber: {
    type: Number,
    default: 10000
  },
  showDeadZones: {
    type: Boolean,
    default: true
  },
  showVelocityVectors: {
    type: Boolean,
    default: false
  }
})

const canvasRef = ref(null)
const canvasSize = ref(500)
let animationId = null
let rotationAngle = 0

function getColorForConcentration(conc, deadFlag = 0) {
  if (props.showDeadZones && deadFlag > 100) {
    const intensity = Math.min(1, deadFlag / 255)
    return `rgb(255, ${Math.floor(71 * (1 - intensity))}, ${Math.floor(87 * (1 - intensity))})`
  }
  
  const clampedConc = Math.max(0, Math.min(1, conc))
  const r = Math.floor(10 + clampedConc * 0)
  const g = Math.floor(10 + clampedConc * 100)
  const b = Math.floor(26 + clampedConc * 229)
  
  return `rgb(${r}, ${g}, ${b})`
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const { nx, ny } = props.gridSize
  const cellWidth = canvasSize.value / nx
  const cellHeight = canvasSize.value / ny
  
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, canvasSize.value, canvasSize.value)
  
  const centerX = canvasSize.value / 2
  const centerY = canvasSize.value / 2
  const tankRadius = (canvasSize.value / 2) * 0.95
  
  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, tankRadius, 0, Math.PI * 2)
  ctx.clip()
  
  if (props.concentration) {
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const idx = i * ny + j
        const conc = props.concentration[idx]
        const deadFlag = props.deadZone ? props.deadZone[idx] : 0
        
        const dx = (i - nx / 2) / nx
        const dy = (j - ny / 2) / ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist <= 0.48) {
          ctx.fillStyle = getColorForConcentration(conc, deadFlag)
          ctx.fillRect(
            i * cellWidth,
            j * cellHeight,
            cellWidth + 1,
            cellHeight + 1
          )
        }
      }
    }
  }
  
  if (props.showVelocityVectors && props.velocityX && props.velocityY) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    
    const step = 4
    for (let i = 0; i < nx; i += step) {
      for (let j = 0; j < ny; j += step) {
        const idx = i * ny + j
        const vx = props.velocityX[idx]
        const vy = props.velocityY[idx]
        
        const dx = (i - nx / 2) / nx
        const dy = (j - ny / 2) / ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist <= 0.48 && (vx !== 0 || vy !== 0)) {
          const scale = 20
          const x1 = i * cellWidth + cellWidth / 2
          const y1 = j * cellHeight + cellHeight / 2
          const x2 = x1 + vx * scale
          const y2 = y1 + vy * scale
          
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
    }
  }
  
  ctx.restore()
  
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, tankRadius, 0, Math.PI * 2)
  ctx.stroke()
  
  const impellerRadius = tankRadius * 0.6
  const impellerCenterX = centerX
  const impellerCenterY = centerY
  
  rotationAngle += (props.impellerSpeed * Math.PI / 180) / 10
  
  ctx.save()
  ctx.translate(impellerCenterX, impellerCenterY)
  ctx.rotate(rotationAngle)
  
  ctx.fillStyle = '#ffd93d'
  ctx.strokeStyle = '#ffcc00'
  ctx.lineWidth = 2
  
  const bladeCount = 4
  for (let b = 0; b < bladeCount; b++) {
    ctx.save()
    ctx.rotate((b * 2 * Math.PI) / bladeCount)
    
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(impellerRadius, -15)
    ctx.lineTo(impellerRadius, 15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.restore()
  }
  
  ctx.fillStyle = '#ffaa00'
  ctx.beginPath()
  ctx.arc(0, 0, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  
  ctx.restore()
  
  ctx.fillStyle = '#00d4ff'
  ctx.font = 'bold 14px Segoe UI'
  ctx.textAlign = 'left'
  ctx.fillText(`${props.impellerSpeed} RPM`, 20, 30)
  
  animationId = requestAnimationFrame(render)
}

function resizeCanvas() {
  const container = canvasRef.value?.parentElement
  if (container) {
    const size = Math.min(container.clientWidth, 500)
    canvasSize.value = size
  }
}

watch(() => [props.concentration, props.deadZone, props.velocityX, props.velocityY], () => {
}, { deep: true })

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  render()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

defineExpose({
  render
})
</script>

<style scoped>
.visualizer-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border);
}

.tank-canvas {
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.2);
}

.visualizer-overlay {
  position: absolute;
  bottom: 30px;
  left: 30px;
  right: 30px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-color {
  width: 40px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 11px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--primary);
  font-weight: 600;
  font-family: monospace;
}
</style>
