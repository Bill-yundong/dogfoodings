<template>
  <div class="data-display">
    <div 
      v-for="(data, gaugeId) in strainData" 
      :key="gaugeId"
      class="data-card"
      :class="[
        getStatusClass(data.value),
        { selected: selectedGauge === gaugeId }
      ]"
    >
      <h3>{{ gaugeId }}</h3>
      <div class="data-value">{{ formatValue(data.value) }}</div>
      <div class="data-unit">{{ data.unit }}</div>
    </div>
    
    <div v-if="Object.keys(strainData).length === 0" class="data-card">
      <h3>等待数据</h3>
      <div class="data-value">--</div>
      <div class="data-unit">με</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  strainData: {
    type: Object,
    default: () => ({})
  },
  selectedGauge: {
    type: String,
    default: null
  }
})

const formatValue = (value) => {
  if (value === undefined || value === null) return '--'
  return value.toFixed(2)
}

const getStatusClass = (value) => {
  if (value === undefined || value === null) return ''
  
  const absValue = Math.abs(value)
  
  if (absValue > 100) {
    return 'critical'
  } else if (absValue > 70) {
    return 'warning'
  }
  return ''
}
</script>

<style scoped>
.data-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 180px;
  overflow-y: auto;
}
</style>
