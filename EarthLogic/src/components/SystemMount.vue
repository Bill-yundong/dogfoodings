<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MountConfig, MountTarget } from '../types'
import { cache } from '../database'

const emit = defineEmits<{
  (e: 'mount', config: MountConfig): void
  (e: 'unmount', target: MountTarget): void
}>()

const agricultureConnected = ref(true)
const landRegulationConnected = ref(false)
const dbStats = ref({ totalPoints: 0, totalRecords: 0, yearRange: null as any })

const loadStats = async () => {
  const stats = await cache.getStatistics()
  dbStats.value = stats
}

const toggleAgriculture = () => {
  agricultureConnected.value = !agricultureConnected.value
  if (agricultureConnected.value) {
    emit('mount', {
      target: 'agriculture_bureau',
      permissions: ['read', 'write', 'simulate'],
      theme: 'dark'
    })
  } else {
    emit('unmount', 'agriculture_bureau')
  }
}

const toggleLandRegulation = () => {
  landRegulationConnected.value = !landRegulationConnected.value
  if (landRegulationConnected.value) {
    emit('mount', {
      target: 'land_regulation',
      permissions: ['read', 'export'],
      theme: 'dark'
    })
  } else {
    emit('unmount', 'land_regulation')
  }
}

const mountStatus = computed(() => {
  const targets = []
  if (agricultureConnected.value) targets.push('农业局系统')
  if (landRegulationConnected.value) targets.push('土地监管系统')
  return targets.length > 0 ? targets.join('、') : '未连接任何系统'
})

loadStats()
</script>

<template>
  <div class="card">
    <h3 class="card-title">
      <span>🔗</span>
      系统解耦挂载中心
    </h3>
    
    <div class="mount-info">
      <p class="mount-text">当前已挂载: <span class="mount-highlight">{{ mountStatus }}</span></p>
    </div>

    <div class="mount-status">
      <div 
        class="mount-item"
        :class="{ connected: agricultureConnected }"
        @click="toggleAgriculture"
        style="cursor: pointer;"
      >
        <span class="status-dot" :class="agricultureConnected ? 'green' : 'red'"></span>
        <span>农业局数据系统</span>
        <span class="mount-badge">{{ agricultureConnected ? '已连接' : '未连接' }}</span>
      </div>
      
      <div 
        class="mount-item"
        :class="{ connected: landRegulationConnected }"
        @click="toggleLandRegulation"
        style="cursor: pointer;"
      >
        <span class="status-dot" :class="landRegulationConnected ? 'green' : 'red'"></span>
        <span>土地监管系统</span>
        <span class="mount-badge">{{ landRegulationConnected ? '已连接' : '未连接' }}</span>
      </div>
    </div>

    <div class="db-info">
      <h4 style="margin-bottom: 12px; color: #86efac;">📊 IndexedDB 时空数据缓存</h4>
      <div class="grid grid-3">
        <div class="stat-card">
          <div class="stat-value">{{ dbStats.totalPoints }}</div>
          <div class="stat-label">采样点数量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dbStats.totalRecords }}</div>
          <div class="stat-label">历史数据记录</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dbStats.yearRange ? `${dbStats.yearRange.min}-${dbStats.yearRange.max}` : '-' }}</div>
          <div class="stat-label">数据年份范围</div>
        </div>
      </div>
    </div>

    <div class="decouple-info">
      <h4 style="margin-bottom: 12px; color: #fbbf24;">🛡️ 解耦架构特性</h4>
      <ul class="feature-list">
        <li>✅ 独立部署：土壤监测模块与业务系统分离</li>
        <li>✅ 异步通信：通过消息总线进行数据交互</li>
        <li>✅ 本地缓存：IndexedDB 存储历史采样数据</li>
        <li>✅ 权限隔离：不同系统挂载不同权限级别</li>
        <li>✅ 无状态模拟：客户端运算减轻服务端压力</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mount-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.mount-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.mount-highlight {
  color: #7dd3fc;
  font-weight: 600;
}

.mount-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin-left: auto;
}

.db-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #86efac;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.decouple-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 6px 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}
</style>
