<template>
  <div class="app-container">
    <header class="header">
      <div class="logo">
        <div class="logo-icon">⚗️</div>
        <div class="logo-text">
          <h1>MixLogic</h1>
          <p>化工搅拌釜混合演化仿真系统</p>
        </div>
      </div>
      <nav class="nav">
        <router-link 
          v-for="route in navRoutes" 
          :key="route.path"
          :to="route.path" 
          class="nav-link"
          active-class="active"
        >
          <span class="nav-icon">{{ route.icon }}</span>
          <span class="nav-label">{{ route.label }}</span>
        </router-link>
      </nav>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-icon">💾</span>
          <div class="stat-info">
            <span class="stat-value">{{ cacheCount }}</span>
            <span class="stat-label">缓存快照</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🔄</span>
          <div class="stat-info">
            <span class="stat-value">{{ syncStatus }}</span>
            <span class="stat-label">协同状态</span>
          </div>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
    <footer class="footer">
      <p>MixLogic v1.0.0 | 异步滑移网格数值模拟 | IndexedDB 流体特征缓存</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulationStore } from './stores/simulation'

const store = useSimulationStore()

const navRoutes = [
  { path: '/simulation', label: '仿真模拟', icon: '🔬' },
  { path: '/database', label: '数据库', icon: '🗄️' },
  { path: '/collaboration', label: '数据协同', icon: '🔗' },
  { path: '/analysis', label: '分析报告', icon: '📊' }
]

const cacheCount = computed(() => store.snapshotCount)
const syncStatus = computed(() => store.syncStatus ? '已同步' : '待同步')
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(10, 10, 26, 0.9);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 36px;
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-text h1 {
  font-size: 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.logo-text p {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: 1px;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.nav-link:hover {
  background: rgba(0, 212, 255, 0.1);
  color: var(--text-primary);
}

.nav-link.active {
  background: rgba(0, 212, 255, 0.15);
  border-color: var(--border);
  color: var(--primary);
}

.nav-icon {
  font-size: 16px;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-glass);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.stat-icon {
  font-size: 18px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.main-content {
  flex: 1;
  padding: 24px 32px;
}

.footer {
  padding: 16px 32px;
  text-align: center;
  border-top: 1px solid var(--border);
  background: rgba(10, 10, 26, 0.8);
}

.footer p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
