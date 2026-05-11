<template>
  <div class="data-status">
    <h3>💾 数据状态</h3>
    
    <div class="status-list">
      <div class="status-item">
        <span class="status-label">IndexedDB</span>
        <span class="status-value" :class="{ connected: dbInitialized }">
          {{ dbInitialized ? '已连接' : '未连接' }}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-label">监测数据</span>
        <span class="status-value">{{ stationCount }} 条</span>
      </div>
      
      <div class="status-item">
        <span class="status-label">气象数据</span>
        <span class="status-value">{{ weatherCount }} 条</span>
      </div>
    </div>
    
    <div class="action-buttons">
      <button @click="loadSampleData" class="btn-sample" :disabled="isLoading || isClearing">
        {{ isLoading ? '加载中...' : '加载示例数据' }}
      </button>
      <button @click="clearData" class="btn-clear" :disabled="isLoading || isClearing">
        {{ isClearing ? '清空中...' : '清空数据' }}
      </button>
    </div>
    
    <div v-if="message" class="message">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dbManager } from '../core/Database'
import type { MonitoringStation, WeatherData } from '../types'

const emit = defineEmits<{
  stationsLoaded: [stations: MonitoringStation[]]
  weatherLoaded: [weather: WeatherData[]]
}>()

const dbInitialized = ref(false)
const stationCount = ref(0)
const weatherCount = ref(0)
const isLoading = ref(false)
const isClearing = ref(false)
const message = ref('')

onMounted(async () => {
  try {
    await dbManager.init()
    dbInitialized.value = true
    
    const stations = await dbManager.getAllStations()
    const weather = await dbManager.getAllWeatherData()
    
    stationCount.value = stations.length
    weatherCount.value = weather.length
    
    if (stations.length > 0) {
      emit('stationsLoaded', stations)
    }
    if (weather.length > 0) {
      emit('weatherLoaded', weather)
    }
  } catch (e) {
    console.error('Failed to init database:', e)
    message.value = '❌ 数据库初始化失败，请刷新页面重试'
  }
})

async function loadSampleData() {
  if (!dbInitialized.value) {
    message.value = '⏳ 数据库正在初始化，请稍候...'
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  
  isLoading.value = true
  message.value = ''
  
  try {
    const sampleStations: MonitoringStation[] = [
      { id: '1', name: '北京奥体中心', lat: 39.9847, lng: 116.3958, pm25: 85, timestamp: Date.now() },
      { id: '2', name: '北京顺义', lat: 40.1275, lng: 116.6548, pm25: 72, timestamp: Date.now() },
      { id: '3', name: '北京昌平', lat: 40.2181, lng: 116.2357, pm25: 95, timestamp: Date.now() },
      { id: '4', name: '天津塘沽', lat: 39.0146, lng: 117.6627, pm25: 110, timestamp: Date.now() },
      { id: '5', name: '河北廊坊', lat: 39.5338, lng: 116.6983, pm25: 68, timestamp: Date.now() }
    ]
    
    const sampleWeather: WeatherData[] = [
      { id: 'w1', lat: 39.9042, lng: 116.4074, timestamp: Date.now(), windSpeed: 3.2, windDirection: 180, temperature: 20, humidity: 45, pressure: 1013 },
      { id: 'w2', lat: 39.0842, lng: 117.2010, timestamp: Date.now(), windSpeed: 2.8, windDirection: 200, temperature: 22, humidity: 40, pressure: 1015 }
    ]
    
    await dbManager.addStations(sampleStations)
    await dbManager.addWeatherDatas(sampleWeather)
    
    stationCount.value = sampleStations.length
    weatherCount.value = sampleWeather.length
    
    emit('stationsLoaded', sampleStations)
    emit('weatherLoaded', sampleWeather)
    
    message.value = '✅ 示例数据加载成功！'
    setTimeout(() => { message.value = '' }, 3000)
  } catch (error) {
    message.value = '❌ 数据加载失败，请重试'
    console.error('Load sample data error:', error)
    setTimeout(() => { message.value = '' }, 3000)
  } finally {
    isLoading.value = false
  }
}

async function clearData() {
  if (!dbInitialized.value) {
    message.value = '⏳ 数据库正在初始化，请稍候...'
    setTimeout(() => { message.value = '' }, 2000)
    return
  }
  
  isClearing.value = true
  message.value = ''
  
  try {
    await dbManager.clearOldData(Date.now() + 1000000)
    stationCount.value = 0
    weatherCount.value = 0
    
    message.value = '🗑️ 数据已清空'
    setTimeout(() => { message.value = '' }, 2000)
  } catch (error) {
    message.value = '❌ 清空失败，请重试'
    console.error('Clear data error:', error)
    setTimeout(() => { message.value = '' }, 3000)
  } finally {
    isClearing.value = false
  }
}
</script>

<style scoped>
.data-status {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 16px;
}

.data-status h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.status-label {
  font-size: 13px;
  color: #555;
}

.status-value {
  font-size: 13px;
  font-weight: 500;
  color: #999;
}

.status-value.connected {
  color: #52c41a;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-sample, .btn-clear {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sample {
  background: #e6f7ff;
  color: #1890ff;
}

.btn-sample:hover {
  background: #bae7ff;
}

.btn-clear {
  background: #fff1f0;
  color: #ff4d4f;
}

.btn-clear:hover {
  background: #ffccc7;
}

.btn-sample:disabled,
.btn-clear:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  font-size: 12px;
  color: #52c41a;
}
</style>
