<template>
  <div ref="containerRef" class="bridge-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { BridgeRenderer } from '../services/bridgeRenderer'
import type { BridgePose, NormalizedData } from '../types'

const props = defineProps<{
  pose: BridgePose | null
  sensorData: NormalizedData[]
  selectedSensorId?: string
}>()

const containerRef = ref<HTMLElement | null>(null)
let renderer: BridgeRenderer | null = null

const handleResize = () => {
  if (renderer && containerRef.value) {
    renderer.resize(
      containerRef.value.clientWidth,
      containerRef.value.clientHeight
    )
  }
}

onMounted(() => {
  if (containerRef.value) {
    renderer = new BridgeRenderer({
      container: containerRef.value,
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    })

    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
})

watch(
  () => props.pose,
  (newPose) => {
    if (renderer && newPose) {
      renderer.updatePose(newPose)
    }
  }
)

watch(
  () => props.sensorData,
  (newData) => {
    if (renderer && newData) {
      renderer.updateSensorData(newData)
    }
  },
  { deep: true }
)

watch(
  () => props.selectedSensorId,
  (sensorId) => {
    if (renderer && sensorId) {
      renderer.highlightSensor(sensorId)
    }
  }
)

defineExpose({
  resetView: () => {
    if (renderer) {
      renderer.resetView()
    }
  }
})
</script>

<style scoped>
.bridge-viewer {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
