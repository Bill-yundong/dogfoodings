<script setup lang="ts">
interface Props {
  status: 'normal' | 'warning' | 'danger' | 'critical' | 'offline'
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'md'
})

const statusConfig = {
  normal: { color: 'bg-risk-safe', label: '正常', pulse: false },
  warning: { color: 'bg-risk-caution', label: '警告', pulse: true },
  danger: { color: 'bg-risk-warning', label: '危险', pulse: true },
  critical: { color: 'bg-risk-danger', label: '危急', pulse: true },
  offline: { color: 'bg-text-muted', label: '离线', pulse: false }
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="rounded-full"
      :class="[
        sizeClasses[size],
        statusConfig[status].color,
        statusConfig[status].pulse ? 'animate-pulse' : ''
      ]"
    ></span>
    <span v-if="showLabel && label" class="text-sm">{{ label }}</span>
    <span v-if="showLabel && !label" class="text-sm">{{ statusConfig[status].label }}</span>
  </div>
</template>
