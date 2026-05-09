<template>
  <div class="app-container">
    <header class="app-header">
      <h1>特大桥梁健康状态监控系统</h1>
      <div class="header-info">
        <span class="status-indicator" :class="systemStatus"></span>
        <span>系统状态: {{ systemStatusText }}</span>
        <span class="current-time">{{ currentTime }}</span>
      </div>
    </header>
    
    <main class="main-content">
      <aside class="sidebar">
        <div class="sidebar-section">
          <h2>运维中枢</h2>
          <StrainGaugeList 
            :strainGauges="strainGauges" 
            :selectedGauge="selectedGauge"
            @select-gauge="handleSelectGauge"
          />
        </div>
        
        <div class="sidebar-section">
          <h2>结构健康档案</h2>
          <HealthArchives 
            :records="healthRecords"
            @view-record="handleViewRecord"
          />
        </div>
      </aside>
      
      <section class="main-view">
        <div class="bridge-visualization">
          <h2>桥体位姿实时渲染</h2>
          <BridgeVisualization 
            ref="bridgeVisualization"
            :bridgeData="bridgeData"
            :strainGauges="strainGauges"
            :selectedGauge="selectedGauge"
          />
        </div>
        
        <div class="data-panel">
          <div class="panel-section">
            <h2>应变片实时数据</h2>
            <RealTimeDataDisplay 
              :strainData="strainData"
              :selectedGauge="selectedGauge"
            />
          </div>
          
          <div class="panel-section">
            <h2>应急指挥系统</h2>
            <EmergencyCommandPanel 
              :alerts="alerts"
              :bridgeHealth="bridgeHealth"
              @alert="handleAlert"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import StrainGaugeList from './components/StrainGaugeList.vue'
import HealthArchives from './components/HealthArchives.vue'
import BridgeVisualization from './components/BridgeVisualization.vue'
import RealTimeDataDisplay from './components/RealTimeDataDisplay.vue'
import EmergencyCommandPanel from './components/EmergencyCommandPanel.vue'
import { initDatabase, saveStrainData, getHealthRecords } from './utils/database.js'
import { alignData, generateAlert } from './utils/semanticAlignment.js'

const currentTime = ref('')
const systemStatus = ref('normal')
const strainGauges = ref([])
const strainData = ref({})
const selectedGauge = ref(null)
const bridgeData = ref({
  spanLength: 1000,
  totalSpans: 5,
  width: 30,
  height: 20,
  deflection: new Array(5).fill(0),
  rotation: new Array(5).fill(0)
})
const healthRecords = ref([])
const alerts = ref([])
const bridgeHealth = ref('良好')

const systemStatusText = computed(() => {
  const statusMap = {
    normal: '正常运行',
    warning: '警告',
    critical: '危急'
  }
  return statusMap[systemStatus.value] || '未知'
})

let dataInterval = null
let timeInterval = null

const initStrainGauges = () => {
  const gauges = []
  const positions = [
    { span: 1, position: 0.1, type: 'bending' },
    { span: 1, position: 0.5, type: 'bending' },
    { span: 1, position: 0.9, type: 'bending' },
    { span: 2, position: 0.25, type: 'shear' },
    { span: 2, position: 0.75, type: 'shear' },
    { span: 3, position: 0.3, type: 'axial' },
    { span: 3, position: 0.6, type: 'axial' },
    { span: 4, position: 0.2, type: 'bending' },
    { span: 4, position: 0.8, type: 'bending' },
    { span: 5, position: 0.15, type: 'shear' },
    { span: 5, position: 0.85, type: 'shear' }
  ]
  
  positions.forEach((pos, index) => {
    gauges.push({
      id: `SG-${String(index + 1).padStart(3, '0')}`,
      name: `应变片 ${index + 1}`,
      ...pos,
      threshold: pos.type === 'bending' ? 100 : pos.type === 'shear' ? 80 : 50,
      status: 'normal'
    })
  })
  
  strainGauges.value = gauges
}

const generateSimulatedData = () => {
  const newData = {}
  const time = new Date()
  
  strainGauges.value.forEach(gauge => {
    const baseValue = Math.sin(time.getSeconds() * 0.1 + gauge.span * 0.5 + gauge.position * 10) * 30
    const noise = (Math.random() - 0.5) * 10
    const value = Math.round((baseValue + noise) * 100) / 100
    
    newData[gauge.id] = {
      value,
      timestamp: time.toISOString(),
      unit: 'με'
    }
    
    if (Math.abs(value) > gauge.threshold) {
      const alert = generateAlert(gauge, value)
      if (alert) {
        alerts.value.unshift(alert)
        if (alerts.value.length > 10) {
          alerts.value.pop()
        }
        systemStatus.value = alert.level === 'critical' ? 'critical' : 'warning'
        setTimeout(() => {
          systemStatus.value = 'normal'
        }, 10000)
      }
    }
  })
  
  strainData.value = newData
  window.__strainData = newData
  
  bridgeData.value.deflection = bridgeData.value.deflection.map((_, i) => {
    return Math.sin(time.getSeconds() * 0.05 + i * 0.3) * 0.02
  })
  
  bridgeData.value.rotation = bridgeData.value.rotation.map((_, i) => {
    return Math.sin(time.getSeconds() * 0.03 + i * 0.2) * 0.01
  })
  
  const alignedData = alignData(newData, strainGauges.value)
  saveStrainData(alignedData)
  
  updateBridgeHealth()
}

const updateBridgeHealth = () => {
  let maxStrain = 0
  Object.values(strainData.value).forEach(data => {
    if (Math.abs(data.value) > maxStrain) {
      maxStrain = Math.abs(data.value)
    }
  })
  
  if (maxStrain > 100) {
    bridgeHealth.value = '危急'
  } else if (maxStrain > 70) {
    bridgeHealth.value = '警告'
  } else if (maxStrain > 40) {
    bridgeHealth.value = '关注'
  } else {
    bridgeHealth.value = '良好'
  }
}

const loadHealthRecords = async () => {
  try {
    const records = await getHealthRecords(10)
    healthRecords.value = records
  } catch (error) {
    console.error('加载健康档案失败:', error)
  }
}

const handleSelectGauge = (gauge) => {
  selectedGauge.value = gauge.id
}

const handleViewRecord = (record) => {
  console.log('查看档案:', record)
}

const handleAlert = (alert) => {
  alerts.value.unshift(alert)
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(async () => {
  try {
    await initDatabase()
    initStrainGauges()
    await loadHealthRecords()
    
    updateTime()
    timeInterval = setInterval(updateTime, 1000)
    
    generateSimulatedData()
    dataInterval = setInterval(generateSimulatedData, 2000)
    
  } catch (error) {
    console.error('系统初始化失败:', error)
    systemStatus.value = 'critical'
  }
})

onUnmounted(() => {
  if (dataInterval) {
    clearInterval(dataInterval)
  }
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>
