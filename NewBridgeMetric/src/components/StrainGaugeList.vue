<template>
  <div class="strain-gauge-list">
    <ul class="gauge-list">
      <li 
        v-for="gauge in strainGauges" 
        :key="gauge.id"
        class="gauge-item"
        :class="{ selected: selectedGauge === gauge.id }"
        @click="$emit('select-gauge', gauge)"
      >
        <div class="gauge-info">
          <div class="gauge-id">{{ gauge.id }}</div>
          <div class="gauge-location">
            第{{ gauge.span }}跨 · {{ (gauge.position * 100).toFixed(0) }}% · {{ getTypeLabel(gauge.type) }}
          </div>
        </div>
        <div 
          class="gauge-value"
          :class="getValueStatusClass(gauge)"
        >
          {{ getGaugeValue(gauge.id) }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  strainGauges: {
    type: Array,
    default: () => []
  },
  selectedGauge: {
    type: String,
    default: null
  }
})

defineEmits(['select-gauge'])

const getTypeLabel = (type) => {
  const typeMap = {
    bending: '弯曲',
    shear: '剪切',
    axial: '轴向'
  }
  return typeMap[type] || type
}

const getGaugeValue = (gaugeId) => {
  const data = window.__strainData?.[gaugeId]
  if (data) {
    return `${data.value.toFixed(1)} ${data.unit}`
  }
  return '--'
}

const getValueStatusClass = (gauge) => {
  const data = window.__strainData?.[gauge.id]
  if (!data) return ''
  
  const absValue = Math.abs(data.value)
  
  if (absValue > 100) {
    return 'critical'
  } else if (absValue > 70) {
    return 'warning'
  }
  return ''
}
</script>

<style scoped>
.strain-gauge-list {
  max-height: 300px;
  overflow-y: auto;
}
</style>
