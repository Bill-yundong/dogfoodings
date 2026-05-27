<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isCollapse = ref(false)

const menuItems = [
  { path: '/', icon: 'Odometer', title: '仪表盘' },
  { path: '/monitor', icon: 'DataLine', title: '实时监测' },
  { path: '/assessment', icon: 'DataAnalysis', title: '损伤评估' },
  { path: '/shoes', icon: 'FootPrint', title: '跑鞋管理' },
  { path: '/history', icon: 'Histogram', title: '历史分析' },
  { path: '/settings', icon: 'Setting', title: '系统设置' }
]

const currentTitle = computed(() => {
  const item = menuItems.find(m => m.path === route.path)
  return item?.title || 'StrideNexus'
})
</script>

<template>
  <div class="app-container">
    <aside class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="logo">
        <span class="logo-icon">🏃</span>
        <span v-if="!isCollapse" class="logo-text font-display">StrideNexus</span>
      </div>
      
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :show-timeout="200"
        router
        class="sidebar-menu"
        background-color="transparent"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
      
      <button class="collapse-btn" @click="isCollapse = !isCollapse">
        <el-icon>
          <DArrowLeft v-if="!isCollapse" />
          <DArrowRight v-else />
        </el-icon>
      </button>
    </aside>
    
    <main class="main-content">
      <header class="header">
        <h1 class="page-title font-display">{{ currentTitle }}</h1>
        <div class="header-actions">
          <div class="status-indicator">
            <span class="status-dot online"></span>
            <span class="status-text">在线</span>
          </div>
          <el-avatar :size="36" style="background: linear-gradient(135deg, #165DFF, #4080FF);">
            U
          </el-avatar>
        </div>
      </header>
      
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(180deg, #0D1117 0%, #0D1117 50%, #0D1117 100%);
  position: relative;
  overflow: hidden;
}

.app-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(ellipse at 80% 20%, rgba(22, 93, 255, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, rgba(255, 125, 0, 0.08) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.sidebar {
  width: 240px;
  background: rgba(22, 27, 34, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  transition: width var(--transition-normal);
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  padding: 16px 8px;
  border: none;
}

:deep(.el-menu-item) {
  border-radius: var(--radius-md);
  margin-bottom: 4px;
  height: 48px;
  line-height: 48px;
}

.collapse-btn {
  padding: 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all var(--transition-fast);
  border-top: 1px solid var(--border-color);
}

.collapse-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(13, 17, 23, 0.8);
  backdrop-filter: blur(10px);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 180, 42, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(0, 180, 42, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  color: var(--success-color);
}

.content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}
</style>
