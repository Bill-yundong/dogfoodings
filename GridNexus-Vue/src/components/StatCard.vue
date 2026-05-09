<template>
  <v-card class="elevation-2" :color="color">
    <v-card-title class="pb-0">
      <v-icon size="36" class="mr-3">{{ icon }}</v-icon>
      <div class="text-overline opacity-80">{{ title }}</div>
    </v-card-title>
    <v-card-text class="pt-2">
      <div class="text-h4 font-weight-bold">
        {{ formattedValue }}
        <span v-if="unit" class="text-body-1">{{ unit }}</span>
      </div>
      <div v-if="trend !== undefined" class="d-flex align-center mt-2">
        <v-icon :color="trend >= 0 ? 'success' : 'error'" size="small">
          {{ trend >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
        </v-icon>
        <span class="ml-1 text-body-2">
          {{ Math.abs(trend).toFixed(1) }}% 较昨日
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    default: 0
  },
  unit: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'mdi-information'
  },
  color: {
    type: String,
    default: 'surface'
  },
  trend: {
    type: Number,
    default: undefined
  },
  format: {
    type: String,
    default: 'number'
  }
})

const formattedValue = computed(() => {
  if (props.format === 'percentage') {
    return `${Number(props.value).toFixed(1)}%`
  }
  if (props.format === 'decimal') {
    return Number(props.value).toFixed(2)
  }
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})
</script>
