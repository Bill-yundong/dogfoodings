<template>
  <div class="simulation-controls">
    <h3>⚙️ 模拟控制</h3>
    
    <div class="control-group">
      <label>粒子数量</label>
      <input type="range" v-model.number="config.particleCount" min="100" max="5000" step="100">
      <span class="value">{{ config.particleCount }}</span>
    </div>

    <div class="control-group">
      <label>时间步长 (小时)</label>
      <input type="range" v-model.number="config.timeStep" min="0.1" max="6" step="0.1">
      <span class="value">{{ config.timeStep.toFixed(1) }}</span>
    </div>

    <div class="control-group">
      <label>扩散系数</label>
      <input type="range" v-model.number="config.diffusionCoefficient" min="0.01" max="1" step="0.01">
      <span class="value">{{ config.diffusionCoefficient.toFixed(2) }}</span>
    </div>

    <div class="control-group">
      <label>平流权重</label>
      <input type="range" v-model.number="config.advectionWeight" min="0" max="1" step="0.05">
      <span class="value">{{ config.advectionWeight.toFixed(2) }}</span>
    </div>

    <div class="control-group">
      <label>衰减速率</label>
      <input type="range" v-model.number="config.decayRate" min="0" max="0.1" step="0.005">
      <span class="value">{{ config.decayRate.toFixed(3) }}</span>
    </div>

    <div class="control-group">
      <label>模拟步数</label>
      <input type="number" v-model.number="steps" min="1" max="100">
    </div>

    <div class="button-group">
      <button @click="startSimulation" :disabled="isRunning" class="btn-primary">
        {{ isRunning ? '运行中...' : '🚀 开始模拟' }}
      </button>
      <button @click="reset" class="btn-secondary">🔄 重置</button>
    </div>

    <div v-if="progress > 0" class="progress-container">
      <div class="progress-bar" :style="{ width: (progress / steps * 100) + '%' }"></div>
      <span class="progress-text">{{ progress }} / {{ steps }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { SimulationConfig } from '../types'

const emit = defineEmits<{
  start: [config: SimulationConfig, steps: number]
  reset: []
}>()

const config = reactive<SimulationConfig>({
  timeStep: 1,
  particleCount: 1000,
  diffusionCoefficient: 0.2,
  advectionWeight: 0.8,
  decayRate: 0.01
})

const steps = ref(24)
const isRunning = ref(false)
const progress = ref(0)

function startSimulation() {
  isRunning.value = true
  progress.value = 0
  emit('start', { ...config }, steps.value)
}

function reset() {
  progress.value = 0
  isRunning.value = false
  emit('reset')
}

function updateProgress(current: number) {
  progress.value = current
  if (current >= steps.value) {
    isRunning.value = false
  }
}

defineExpose({ updateProgress })
</script>

<style scoped>
.simulation-controls {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 16px;
}

.simulation-controls h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.control-group label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.control-group input[type="range"] {
  flex: 1;
}

.control-group input[type="number"] {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.value {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-primary:hover:not(:disabled),
.btn-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.progress-container {
  margin-top: 12px;
  position: relative;
}

.progress-bar {
  height: 6px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666;
  text-align: center;
  display: block;
  margin-top: 4px;
}
</style>
