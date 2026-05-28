<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  size?: number
  thickness?: number
}>()

const size = computed(() => props.size || 120)
const thickness = computed(() => props.thickness || 8)
const radius = computed(() => (size.value - thickness.value) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeDashoffset = computed(() => {
  const progress = Math.min(100, Math.max(0, props.score)) / 100
  return circumference.value * (1 - progress)
})

const getColor = computed(() => {
  if (props.score >= 90) return '#FBBF24'
  if (props.score >= 80) return '#00B42A'
  if (props.score >= 70) return '#165DFF'
  if (props.score >= 60) return '#FF7D00'
  return '#F53F3F'
})

const getGrade = computed(() => {
  if (props.score >= 90) return 'S'
  if (props.score >= 80) return 'A'
  if (props.score >= 70) return 'B'
  if (props.score >= 60) return 'C'
  return 'D'
})
</script>

<template>
  <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" class="transform -rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="getColor"
        stroke-opacity="0.2"
        :stroke-width="thickness"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="getColor"
        :stroke-width="thickness"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        class="transition-all duration-300 ease-out"
        :style="{ filter: `drop-shadow(0 0 8px ${getColor})` }"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span
        class="text-3xl font-bold"
        :style="{ color: getColor }"
      >
        {{ Math.round(score) }}
      </span>
      <span
        class="text-xs font-medium"
        :style="{ color: getColor }"
      >
        {{ getGrade }}
      </span>
    </div>
  </div>
</template>
