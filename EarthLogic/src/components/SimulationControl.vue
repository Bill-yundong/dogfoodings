<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SimulationParams } from '../types'

const props = defineProps<{
  params: SimulationParams
  isRunning: boolean
  currentTime: number
  totalTime: number
}>()

const emit = defineEmits<{
  (e: 'update:params', params: SimulationParams): void
  (e: 'start'): void
  (e: 'stop'): void
  (e: 'reset'): void
  (e: 'timeChange', time: number): void
}>()

const localParams = ref({ ...props.params })

watch(() => props.params, (newParams) => {
  localParams.value = { ...newParams }
}, { deep: true })

const updateParam = (key: keyof SimulationParams, value: number) => {
  localParams.value[key] = value
  emit('update:params', { ...localParams.value })
}
</script>

<template>
  <div class="card">
    <h3 class="card-title">
      <span>⚙️</span>
      溶质运移模拟参数
    </h3>
    
    <div class="params-grid">
      <div class="form-group">
        <label class="form-label">扩散系数 (m²/s)</label>
        <input 
          type="number" 
          class="form-input"
          step="0.00001"
          :value="localParams.diffusionCoefficient"
          @input="(e) => updateParam('diffusionCoefficient', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">对流速度 (m/s)</label>
        <input 
          type="number" 
          class="form-input"
          step="0.00001"
          :value="localParams.advectionVelocity"
          @input="(e) => updateParam('advectionVelocity', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">阻滞因子</label>
        <input 
          type="number" 
          class="form-input"
          step="0.1"
          :value="localParams.retardationFactor"
          @input="(e) => updateParam('retardationFactor', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">衰减系数</label>
        <input 
          type="number" 
          class="form-input"
          step="0.00001"
          :value="localParams.decayCoefficient"
          @input="(e) => updateParam('decayCoefficient', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">源浓度 (mg/kg)</label>
        <input 
          type="number" 
          class="form-input"
          step="1"
          :value="localParams.sourceConcentration"
          @input="(e) => updateParam('sourceConcentration', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">源深度 (m)</label>
        <input 
          type="number" 
          class="form-input"
          step="0.1"
          :value="localParams.sourceDepth"
          @input="(e) => updateParam('sourceDepth', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <div class="time-control">
      <label class="form-label">
        模拟时间: {{ currentTime.toFixed(1) }} / {{ totalTime }} s
      </label>
      <input 
        type="range" 
        class="time-slider"
        :max="totalTime"
        :value="currentTime"
        @input="(e) => emit('timeChange', parseFloat((e.target as HTMLInputElement).value))"
      />
    </div>

    <div class="control-buttons">
      <button 
        class="btn btn-success" 
        @click="emit('start')"
        :disabled="isRunning"
      >
        {{ isRunning ? '模拟中...' : '开始模拟' }}
      </button>
      <button 
        class="btn" 
        style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;"
        @click="emit('stop')"
        :disabled="!isRunning"
      >
        停止
      </button>
      <button 
        class="btn" 
        style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white;"
        @click="emit('reset')"
      >
        重置
      </button>
    </div>
  </div>
</template>

<style scoped>
.params-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.time-control {
  margin: 20px 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.time-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: all 0.2s;
}

.time-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.control-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 768px) {
  .params-grid {
    grid-template-columns: 1fr;
  }
  
  .control-buttons {
    flex-direction: column;
  }
}
</style>
