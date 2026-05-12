<template>
  <div class="card">
    <h2>🔮 阻塞风险预测</h2>
    
    <div class="data-grid">
      <div class="data-item">
        <div class="data-label">水温</div>
        <div class="data-value">{{ ecologicalData.waterTemperature.toFixed(1) }}<span class="data-unit">°C</span></div>
      </div>
      <div class="data-item">
        <div class="data-label">盐度</div>
        <div class="data-value">{{ ecologicalData.salinity.toFixed(1) }}<span class="data-unit">‰</span></div>
      </div>
      <div class="data-item">
        <div class="data-label">浮游生物密度</div>
        <div class="data-value">{{ Math.round(ecologicalData.planktonDensity) }}<span class="data-unit">ind/m³</span></div>
      </div>
      <div class="data-item">
        <div class="data-label">海流速度</div>
        <div class="data-value">{{ ecologicalData.currentSpeed.toFixed(2) }}<span class="data-unit">m/s</span></div>
      </div>
      <div class="data-item">
        <div class="data-label">水母数量</div>
        <div class="data-value">{{ ecologicalData.jellyfishCount }}<span class="data-unit">只</span></div>
      </div>
      <div class="data-item">
        <div class="data-label">藻类浓度</div>
        <div class="data-value">{{ ecologicalData.algaeConcentration.toFixed(1) }}<span class="data-unit">μg/L</span></div>
      </div>
    </div>
    
    <div class="button-group">
      <button class="btn btn-primary" @click="$emit('predict')">
        运行预测 (72小时)
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ecologicalData: {
    type: Object,
    required: true
  },
  riskLevel: {
    type: String,
    default: 'normal'
  }
})

defineEmits(['predict'])
</script>