<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { PostureData, PosturePrediction } from '@/types'

const props = defineProps<{
  postureData: PostureData | null
  prediction: PosturePrediction | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const currentAngles = computed(() => {
  if (!props.postureData) return null
  return {
    ankle: props.postureData.ankleAngle.toFixed(1),
    knee: props.postureData.kneeAngle.toFixed(1),
    hip: props.postureData.hipAngle.toFixed(1),
    pronation: props.postureData.pronation.toFixed(1)
  }
})

const predictedAngles = computed(() => {
  if (!props.prediction) return null
  return {
    ankle: props.prediction.predictedAngles.ankle.toFixed(1),
    knee: props.prediction.predictedAngles.knee.toFixed(1),
    hip: props.prediction.predictedAngles.hip.toFixed(1),
    probability: (props.prediction.distortionProbability * 100).toFixed(0)
  }
})

function drawPosture() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const centerX = width / 2
  const centerY = height * 0.4

  ctx.clearRect(0, 0, width, height)

  const kneeAngle = props.postureData?.kneeAngle || 170
  const ankleAngle = props.postureData?.ankleAngle || 90

  const legLength = Math.min(width, height) * 0.25
  const thighLength = legLength * 0.55
  const calfLength = legLength * 0.45

  const hipX = centerX
  const hipY = centerY - 20

  const kneeBendAngle = (180 - kneeAngle) * Math.PI / 180
  const kneeX = hipX
  const kneeY = hipY + thighLength

  const ankleX = kneeX + Math.sin(kneeBendAngle - (ankleAngle - 90) * Math.PI / 180) * calfLength
  const ankleY = kneeY + Math.cos(kneeBendAngle - (ankleAngle - 90) * Math.PI / 180) * calfLength

  ctx.strokeStyle = '#165DFF'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(kneeX, kneeY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(kneeX, kneeY)
  ctx.lineTo(ankleX, ankleY)
  ctx.stroke()

  ctx.fillStyle = '#4080FF'
  ctx.beginPath()
  ctx.arc(hipX, hipY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(kneeX, kneeY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ankleX, ankleY, 8, 0, Math.PI * 2)
  ctx.fill()

  if (props.prediction) {
    const distortion = props.prediction.distortionProbability
    if (distortion > 0.3) {
      ctx.strokeStyle = distortion > 0.6 ? '#F53F3F' : '#FF7D00'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      
      const predKneeX = kneeX + (Math.random() - 0.5) * distortion * 30
      const predKneeY = kneeY + (Math.random() - 0.5) * distortion * 30
      
      ctx.beginPath()
      ctx.moveTo(hipX, hipY)
      ctx.lineTo(predKneeX, predKneeY)
      ctx.stroke()
      
      ctx.setLineDash([])
    }
  }

  ctx.font = '11px var(--font-body)'
  ctx.fillStyle = 'var(--text-tertiary)'
  
  ctx.fillText('髋', hipX + 12, hipY + 4)
  ctx.fillText('膝', kneeX + 12, kneeY + 4)
  ctx.fillText('踝', ankleX + 12, ankleY + 4)
}

watch(() => props.postureData, () => {
  drawPosture()
}, { deep: true })

watch(() => props.prediction, () => {
  drawPosture()
}, { deep: true })

onMounted(() => {
  drawPosture()
  window.addEventListener('resize', drawPosture)
})
</script>

<template>
  <div class="posture-viewer">
    <div class="posture-canvas-wrapper">
      <canvas ref="canvasRef" class="posture-canvas"></canvas>
    </div>
    
    <div class="posture-stats" v-if="currentAngles">
      <div class="angle-item">
        <span class="angle-label">髋角度</span>
        <span class="angle-value font-display">{{ currentAngles.hip }}°</span>
      </div>
      <div class="angle-item">
        <span class="angle-label">膝角度</span>
        <span class="angle-value font-display">{{ currentAngles.knee }}°</span>
      </div>
      <div class="angle-item">
        <span class="angle-label">踝角度</span>
        <span class="angle-value font-display">{{ currentAngles.ankle }}°</span>
      </div>
      <div class="angle-item">
        <span class="angle-label">内旋</span>
        <span class="angle-value font-display" :class="{ 
          'text-warning': Math.abs(parseFloat(currentAngles.pronation)) > 8,
          'text-danger': Math.abs(parseFloat(currentAngles.pronation)) > 12
        }">{{ currentAngles.pronation }}°</span>
      </div>
    </div>

    <div class="prediction-panel" v-if="predictedAngles">
      <div class="prediction-header">
        <el-icon><MagicStick /></el-icon>
        <span>AI姿态预测</span>
      </div>
      <div class="prediction-content">
        <div class="prediction-item">
          <span>畸变概率</span>
          <span class="prediction-value" :class="{ 
            'text-danger': parseInt(predictedAngles.probability) > 60,
            'text-warning': parseInt(predictedAngles.probability) > 30
          }">{{ predictedAngles.probability }}%</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill" :style="{ width: `${100 - parseInt(predictedAngles.probability)}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.posture-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
}

.posture-canvas-wrapper {
  flex: 1;
  min-height: 120px;
}

.posture-canvas {
  width: 100%;
  height: 100%;
}

.posture-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.angle-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.angle-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.angle-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.text-warning {
  color: var(--warning-color) !important;
}

.text-danger {
  color: var(--danger-color) !important;
}

.prediction-panel {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.prediction-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.prediction-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prediction-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.prediction-value {
  font-weight: 600;
  color: var(--text-primary);
}

.confidence-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--danger-color), var(--accent-color), var(--success-color));
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
