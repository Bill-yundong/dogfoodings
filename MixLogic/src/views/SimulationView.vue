<template>
  <div class="simulation-view">
    <div class="view-header">
      <h2>🔬 搅拌釜混合演化仿真</h2>
      <p>基于异步滑移网格的流体混合数值模拟平台</p>
    </div>

    <div class="simulation-layout">
      <div class="visualization-section">
        <StirredTankVisualizer
          :concentration="concentrationField"
          :velocityX="velocityX"
          :velocityY="velocityY"
          :deadZone="deadZoneField"
          :gridSize="gridSize"
          :impellerSpeed="impellerSpeed"
          :reynoldsNumber="reynoldsNumber"
          :showDeadZones="showDeadZones"
          :showVelocityVectors="showVelocityVectors"
        />
        
        <div class="visualization-controls">
          <label class="control-checkbox">
            <input type="checkbox" v-model="showDeadZones" />
            <span>显示死区</span>
          </label>
          <label class="control-checkbox">
            <input type="checkbox" v-model="showVelocityVectors" />
            <span>速度矢量</span>
          </label>
          <button class="btn btn-secondary" @click="captureSnapshot" :disabled="!concentrationField">
            📸 保存快照
          </button>
        </div>
      </div>

      <div class="control-section">
        <MetricsPanel
          :mixingQuality="mixingQuality"
          :deadZoneRatio="deadZoneRatio"
          :reynoldsNumber="reynoldsNumber"
          :impellerSpeed="impellerSpeed"
          :currentStep="currentStep"
          :totalSteps="totalSteps"
          :startTime="simulationStartTime"
        />

        <div class="control-panel card">
          <h3>⚙️ 仿真控制</h3>
          
          <div class="form-group">
            <label class="form-label">流体类型</label>
            <select class="form-input form-select" v-model="selectedFluidId" :disabled="isRunning">
              <option v-for="fluid in fluids" :key="fluid.id" :value="fluid.id">
                {{ fluid.name }} (μ={{ fluid.viscosity }} Pa·s)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">搅拌转速: {{ impellerSpeed }} RPM</label>
            <input 
              type="range" 
              class="form-input" 
              v-model.number="impellerSpeed" 
              min="30" 
              max="300" 
              step="10"
              :disabled="isRunning"
            />
          </div>

          <div class="form-group">
            <label class="form-label">网格分辨率</label>
            <select class="form-input form-select" v-model="gridResolution" :disabled="isRunning">
              <option :value="32">32 × 32 (快速)</option>
              <option :value="64">64 × 64 (平衡)</option>
              <option :value="128">128 × 128 (精确)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">总步数: {{ totalSteps }}</label>
            <input 
              type="range" 
              class="form-input" 
              v-model.number="totalSteps" 
              min="500" 
              max="5000" 
              step="100"
              :disabled="isRunning"
            />
          </div>

          <div class="form-group">
            <label class="form-label">自动快照间隔</label>
            <select class="form-input form-select" v-model.number="snapshotInterval" :disabled="isRunning">
              <option :value="0">禁用</option>
              <option :value="50">每 50 步</option>
              <option :value="100">每 100 步</option>
              <option :value="200">每 200 步</option>
            </select>
          </div>

          <div class="control-buttons">
            <button 
              v-if="!isRunning" 
              class="btn btn-primary" 
              @click="startSimulation"
              :disabled="!selectedFluidId"
            >
              ▶️ 开始仿真
            </button>
            <button 
              v-else 
              class="btn btn-secondary" 
              @click="stopSimulation"
            >
              ⏹️ 停止仿真
            </button>
            <button 
              class="btn btn-secondary" 
              @click="resetSimulation"
              :disabled="isRunning"
            >
              🔄 重置
            </button>
          </div>
        </div>

        <div class="recommendations card" v-if="recommendations.length > 0">
          <h3>💡 优化建议</h3>
          <div 
            v-for="(rec, index) in recommendations" 
            :key="index" 
            class="recommendation-item"
            :class="rec.type"
          >
            <span class="rec-icon">{{ rec.type === 'danger' ? '⚠️' : '💡' }}</span>
            <span class="rec-text">{{ rec.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { SlipGridSolver, AsyncSimulationRunner } from '../utils/simulationEngine'
import { MixingAnalyzer } from '../utils/mixingAnalysis'
import { syncManager } from '../utils/dataSync'
import StirredTankVisualizer from '../components/StirredTankVisualizer.vue'
import MetricsPanel from '../components/MetricsPanel.vue'

const store = useSimulationStore()

const fluids = computed(() => store.fluids)
const isRunning = computed(() => store.isRunning)
const mixingQuality = computed(() => store.mixingQuality)
const deadZoneRatio = computed(() => store.deadZoneRatio)
const currentStep = computed(() => store.currentStep)

const selectedFluidId = ref(null)
const impellerSpeed = ref(120)
const gridResolution = ref(64)
const totalSteps = ref(1000)
const snapshotInterval = ref(100)
const showDeadZones = ref(true)
const showVelocityVectors = ref(false)

const gridSize = computed(() => ({ x: gridResolution.value, y: gridResolution.value }))

const concentrationField = ref(null)
const velocityX = ref(null)
const velocityY = ref(null)
const deadZoneField = ref(null)
const reynoldsNumber = ref(0)
const recommendations = ref([])
const simulationStartTime = ref(null)

let solver = null
let runner = null
let analyzer = null

async function startSimulation() {
  if (!selectedFluidId.value) return
  
  const fluid = store.fluids.find(f => f.id === selectedFluidId.value)
  if (!fluid) return
  
  store.reset()
  
  solver = new SlipGridSolver(gridSize.value, {
    impellerSpeed: impellerSpeed.value,
    viscosity: fluid.viscosity,
    density: fluid.density
  })
  
  analyzer = new MixingAnalyzer(gridSize.value)
  runner = new AsyncSimulationRunner(solver)
  
  reynoldsNumber.value = solver.reynoldsNumber
  
  simulationStartTime.value = Date.now()
  await store.startSimulation(selectedFluidId.value, {
    gridSize: gridSize.value,
    impellerSpeed: impellerSpeed.value,
    totalSteps: totalSteps.value
  })
  
  runner.onStep(async ({ step, data, metrics }) => {
    concentrationField.value = data.concentration
    velocityX.value = data.velocityX
    velocityY.value = data.velocityY
    deadZoneField.value = data.deadZone
    
    store.updateMixingMetrics(metrics.mixingQuality, metrics.deadZoneRatio)
    store.incrementStep()
    
    if (snapshotInterval.value > 0 && step % snapshotInterval.value === 0) {
      await saveCurrentSnapshot()
    }
    
    updateRecommendations(metrics)
  })
  
  runner.run(totalSteps.value)
}

async function stopSimulation() {
  if (runner) {
    runner.stop()
  }
  await store.stopSimulation()
  simulationStartTime.value = null
}

function resetSimulation() {
  store.reset()
  concentrationField.value = null
  velocityX.value = null
  velocityY.value = null
  deadZoneField.value = null
  reynoldsNumber.value = 0
  recommendations.value = []
  simulationStartTime.value = null
  solver = null
  runner = null
  analyzer = null
}

async function saveCurrentSnapshot() {
  const fluid = store.fluids.find(f => f.id === selectedFluidId.value)
  
  const snapshot = {
    fluidId: selectedFluidId.value,
    fluidName: fluid?.name || 'Unknown',
    concentration: Array.from(concentrationField.value),
    velocityX: Array.from(velocityX.value),
    velocityY: Array.from(velocityY.value),
    deadZone: Array.from(deadZoneField.value),
    mixingQuality: mixingQuality.value,
    deadZoneRatio: deadZoneRatio.value,
    reynoldsNumber: reynoldsNumber.value,
    step: currentStep.value,
    parameters: {
      impellerSpeed: impellerSpeed.value,
      gridSize: gridSize.value,
      viscosity: fluid?.viscosity,
      density: fluid?.density
    }
  }
  
  const snapshotId = await store.saveSnapshot(snapshot)
  
  if (snapshotId) {
    snapshot.id = snapshotId
    syncManager.broadcastSnapshot(snapshot)
  }
}

async function captureSnapshot() {
  if (!concentrationField.value) {
    alert('暂无仿真数据，请先开始仿真')
    return
  }
  try {
    await saveCurrentSnapshot()
    alert('快照保存成功！')
  } catch (e) {
    console.error('Failed to save snapshot:', e)
    alert('快照保存失败，请重试')
  }
}

function updateRecommendations(metrics) {
  const recs = []
  
  if (metrics.mixingQuality < 0.7 && currentStep.value > 200) {
    recs.push({
      type: 'warning',
      message: '混合均匀度提升缓慢，考虑提高搅拌转速或延长搅拌时间'
    })
  }
  
  if (metrics.deadZoneRatio > 0.15) {
    recs.push({
      type: 'danger',
      message: `死区占比达到 ${(metrics.deadZoneRatio * 100).toFixed(1)}%，建议优化搅拌器安装位置`
    })
  }
  
  if (reynoldsNumber.value < 1000) {
    recs.push({
      type: 'warning',
      message: '当前处于层流状态，建议提高转速以增强混合效果'
    })
  }
  
  recommendations.value = recs
}

watch(impellerSpeed, (newSpeed) => {
  if (solver) {
    solver.setImpellerSpeed(newSpeed)
    reynoldsNumber.value = solver.reynoldsNumber
  }
})

onMounted(() => {
  store.loadFluids()
})

onUnmounted(() => {
  if (runner) {
    runner.stop()
  }
})
</script>

<style scoped>
.simulation-view {
  width: 100%;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: var(--text-primary);
}

.view-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.simulation-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  align-items: start;
}

.visualization-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.visualization-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.control-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.control-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-panel h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.control-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.control-buttons .btn {
  flex: 1;
}

.recommendations h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.recommendation-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.recommendation-item.warning {
  background: rgba(255, 217, 61, 0.1);
  border-left: 3px solid var(--warning);
}

.recommendation-item.danger {
  background: rgba(255, 71, 87, 0.1);
  border-left: 3px solid var(--danger);
}

.rec-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.rec-text {
  flex: 1;
  color: var(--text-primary);
}

@media (max-width: 1200px) {
  .simulation-layout {
    grid-template-columns: 1fr;
  }
}
</style>
