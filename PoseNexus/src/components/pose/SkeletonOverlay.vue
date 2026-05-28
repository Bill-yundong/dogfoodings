<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { PoseData } from '@/types/pose'
import { SKELETON_CONNECTIONS } from '@/types/pose'

const props = defineProps<{
  pose: PoseData | null
  width: number
  height: number
  score: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const getColor = computed(() => {
  if (props.score >= 80) return '#00B42A'
  if (props.score >= 60) return '#FF7D00'
  return '#F53F3F'
})

function drawSkeleton() {
  if (!ctx.value || !props.pose) return

  const { keypoints } = props.pose

  ctx.value.clearRect(0, 0, props.width, props.height)
  ctx.value.lineWidth = 4
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'

  ctx.value.strokeStyle = getColor.value
  ctx.value.shadowColor = getColor.value
  ctx.value.shadowBlur = 10

  for (const [a, b] of SKELETON_CONNECTIONS) {
    const kp1 = keypoints[a]
    const kp2 = keypoints[b]

    if (kp1.visibility > 0.5 && kp2.visibility > 0.5) {
      ctx.value.beginPath()
      ctx.value.moveTo(kp1.x * props.width, kp1.y * props.height)
      ctx.value.lineTo(kp2.x * props.width, kp2.y * props.height)
      ctx.value.stroke()
    }
  }

  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i]
    if (kp.visibility > 0.5) {
      ctx.value.fillStyle = getColor.value
      ctx.value.beginPath()
      ctx.value.arc(kp.x * props.width, kp.y * props.height, 6, 0, Math.PI * 2)
      ctx.value.fill()
    }
  }
}

onMounted(() => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d')
  }
})

watch(() => props.pose, () => {
  drawSkeleton()
}, { deep: true })
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="width"
    :height="height"
    class="absolute inset-0 pointer-events-none"
  />
</template>
