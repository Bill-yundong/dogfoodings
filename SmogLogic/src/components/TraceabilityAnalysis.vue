<template>
  <div class="traceability-analysis">
    <h3>🔍 污染源溯源</h3>
    
    <div class="input-group">
      <label>目标位置</label>
      <div class="coords-input">
        <input type="number" v-model.number="targetLat" placeholder="纬度" step="0.0001">
        <input type="number" v-model.number="targetLng" placeholder="经度" step="0.0001">
      </div>
    </div>
    
    <div class="input-group">
      <label>搜索半径 (km)</label>
      <input type="range" v-model.number="radius" min="0.1" max="5" step="0.1">
      <span class="value">{{ radius.toFixed(1) }} km</span>
    </div>
    
    <button @click="runTrace" class="btn-analyze">
      开始溯源分析
    </button>
    
    <div v-if="traceResults.length > 0" class="results">
      <h4>潜在污染源贡献</h4>
      <div class="result-list">
        <div v-for="(result, index) in traceResults" :key="index" class="result-item">
          <div class="result-header">
            <span class="source-id">源 {{ result.sourceId }}</span>
            <span class="contribution">{{ (result.contribution * 100).toFixed(1) }}%</span>
          </div>
          <div class="contribution-bar">
            <div class="bar-fill" :style="{ width: (result.contribution * 100) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Particle, TraceResult } from '../types'

const props = defineProps<{
  particles?: Particle[]
}>()

const emit = defineEmits<{
  trace: [lat: number, lng: number, radius: number]
}>()

const targetLat = ref(39.9042)
const targetLng = ref(116.4074)
const radius = ref(1)
const traceResults = ref<TraceResult[]>([])

function runTrace() {
  if (!props.particles) return
  
  const nearbyParticles = props.particles.filter(p => {
    const dx = (p.lng - targetLng.value) * 111 * Math.cos((p.lat * Math.PI) / 180)
    const dy = (p.lat - targetLat.value) * 111
    return Math.sqrt(dx * dx + dy * dy) < radius.value
  })
  
  const sourceContributions: Map<string, number> = new Map()
  let totalPM25 = 0
  
  for (const particle of nearbyParticles) {
    const current = sourceContributions.get(particle.sourceId) || 0
    sourceContributions.set(particle.sourceId, current + particle.pm25)
    totalPM25 += particle.pm25
  }
  
  traceResults.value = Array.from(sourceContributions.entries())
    .map(([sourceId, pm25]) => ({
      sourceId,
      contribution: totalPM25 > 0 ? pm25 / totalPM25 : 0,
      path: [],
      startTime: Date.now() - 86400000,
      endTime: Date.now()
    }))
    .sort((a, b) => b.contribution - a.contribution)
  
  emit('trace', targetLat.value, targetLng.value, radius.value)
}

defineExpose({ setResults: (results: TraceResult[]) => {
  traceResults.value = results
}})
</script>

<style scoped>
.traceability-analysis {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.traceability-analysis h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.input-group label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.coords-input {
  display: flex;
  gap: 8px;
}

.coords-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.value {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.btn-analyze {
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-analyze:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.results {
  margin-top: 20px;
}

.results h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.source-id {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.contribution {
  font-size: 13px;
  font-weight: 600;
  color: #f5576c;
}

.contribution-bar {
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f093fb, #f5576c);
  border-radius: 3px;
  transition: width 0.3s;
}
</style>
