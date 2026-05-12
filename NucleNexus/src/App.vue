<script setup>
import { ref, onMounted, computed } from 'vue'
import IndexedDB from './utils/indexedDB.js'
import AdvectionDiffusionSolver from './utils/advectionDiffusionSolver.js'
import SemanticSync from './utils/semanticSync.js'
import StatusCard from './components/StatusCard.vue'
import DataVisualization from './components/DataVisualization.vue'
import SyncPanel from './components/SyncPanel.vue'
import PredictionPanel from './components/PredictionPanel.vue'
import LogPanel from './components/LogPanel.vue'

const currentStatus = ref('normal')
const statusMessage = ref('系统运行正常')
const lastUpdate = ref(new Date().toLocaleString('zh-CN'))
const logs = ref([])

const db = ref(null)
const solver = ref(null)
const semanticSync = ref(null)

const ecologicalData = ref({
  waterTemperature: 18.5,
  salinity: 32.1,
  planktonDensity: 1250,
  currentSpeed: 0.8,
  jellyfishCount: 12,
  algaeConcentration: 45
})

const riskLevel = computed(() => {
  const score = solver.value?.calculateRiskScore(ecologicalData.value) || 0
  if (score < 30) return 'normal'
  if (score < 70) return 'warning'
  return 'danger'
})

const riskScore = computed(() => {
  return solver.value?.calculateRiskScore(ecologicalData.value) || 0
})

const addLog = (message, type = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString('zh-CN'),
    message,
    type
  })
  if (logs.value.length > 50) logs.value.pop()
}

const initSystem = async () => {
  addLog('正在初始化系统...')
  
  db.value = new IndexedDB()
  await db.value.init()
  addLog('IndexedDB 数据库初始化完成')
  
  solver.value = new AdvectionDiffusionSolver()
  addLog('平流扩散求解器加载完成')
  
  semanticSync.value = new SemanticSync(db.value)
  addLog('语义同步模块初始化完成')
  
  await loadInitialData()
  addLog('系统初始化成功！')
  
  startDataSimulation()
}

const loadInitialData = async () => {
  const savedData = await db.value.getLatestEcologicalData()
  if (savedData) {
    ecologicalData.value = { ...ecologicalData.value, ...savedData }
    addLog('已加载历史生态数据')
  }
}

const startDataSimulation = () => {
  setInterval(async () => {
    updateEcologicalData()
    await db.value.saveEcologicalData(ecologicalData.value)
    lastUpdate.value = new Date().toLocaleString('zh-CN')
    
    const prediction = solver.value.predict(ecologicalData.value, 24)
    if (prediction.riskLevel === 'danger') {
      currentStatus.value = 'danger'
      statusMessage.value = `高风险预警：预计 ${prediction.hoursToBlockage} 小时后可能发生阻塞`
      addLog(`【预警】高阻塞风险，预计 ${prediction.hoursToBlockage} 小时后发生`, 'warning')
    } else if (prediction.riskLevel === 'warning') {
      currentStatus.value = 'warning'
      statusMessage.value = `注意：监测到海生物密度上升趋势`
    } else {
      currentStatus.value = 'normal'
      statusMessage.value = '系统运行正常'
    }
  }, 5000)
}

const updateEcologicalData = () => {
  ecologicalData.value.waterTemperature += (Math.random() - 0.5) * 0.5
  ecologicalData.value.salinity += (Math.random() - 0.5) * 0.3
  ecologicalData.value.planktonDensity += (Math.random() - 0.3) * 100
  ecologicalData.value.currentSpeed += (Math.random() - 0.5) * 0.1
  ecologicalData.value.jellyfishCount += Math.floor((Math.random() - 0.4) * 5)
  ecologicalData.value.algaeConcentration += (Math.random() - 0.4) * 10
  
  ecologicalData.value.planktonDensity = Math.max(500, Math.min(5000, ecologicalData.value.planktonDensity))
  ecologicalData.value.jellyfishCount = Math.max(0, Math.min(200, ecologicalData.value.jellyfishCount))
}

const handleSync = async () => {
  addLog('正在执行数据同步...')
  const result = await semanticSync.value.sync()
  addLog(`同步完成：${result.productionSynced} 条生产数据, ${result.safetySynced} 条安监数据`)
}

const handlePrediction = () => {
  addLog('正在运行阻塞风险预测...')
  const prediction = solver.value.predict(ecologicalData.value, 72)
  addLog(`预测结果：未来72小时阻塞风险 ${prediction.riskLevel.toUpperCase()}`)
  if (prediction.hoursToBlockage < 72) {
    addLog(`预计阻塞时间：${prediction.hoursToBlockage.toFixed(1)} 小时后`, 'warning')
  }
}

onMounted(() => {
  initSystem()
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>🏭 NucleNexus - 核电站取水口海生物阻塞预警系统</h1>
      <p>基于异步平流扩散求解器的智能预测与语义同步系统</p>
    </header>

    <div class="grid">
      <StatusCard 
        :status="currentStatus" 
        :message="statusMessage"
        :last-update="lastUpdate"
        :risk-score="riskScore"
      />
      <PredictionPanel 
        :ecological-data="ecologicalData"
        :risk-level="riskLevel"
        @predict="handlePrediction"
      />
    </div>

    <div class="grid">
      <DataVisualization :ecological-data="ecologicalData" />
      <SyncPanel @sync="handleSync" />
    </div>

    <div class="card">
      <h2>📋 系统日志</h2>
      <LogPanel :logs="logs" />
    </div>
  </div>
</template>