<script setup lang="ts">
import { useCarbonStore } from '@/stores/carbon'
import { onMounted } from 'vue'

const carbonStore = useCarbonStore()

onMounted(() => {
  carbonStore.loadAggregatedData()
})
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo">
          <el-icon :size="28" color="#409eff"><Wind /></el-icon>
          <span class="logo-text">CarbonLogic</span>
        </div>
        <div class="header-actions">
          <span class="subtitle">企业级碳中和足迹追踪引擎</span>
        </div>
      </div>
    </el-header>

    <el-container>
      <el-aside width="240px" class="app-aside">
        <el-menu
          :default-active="$route.path"
          router
          class="nav-menu"
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据概览</span>
          </el-menu-item>
          <el-menu-item index="/emissions">
            <el-icon><TrendCharts /></el-icon>
            <span>排放管理</span>
          </el-menu-item>
          <el-menu-item index="/supply-chain">
            <el-icon><Connection /></el-icon>
            <span>供应链追踪</span>
          </el-menu-item>
          <el-menu-item index="/lca">
            <el-icon><Cycle /></el-icon>
            <span>LCA 分析</span>
          </el-menu-item>
          <el-menu-item index="/simulation">
            <el-icon><MagicStick /></el-icon>
            <span>减排模拟</span>
          </el-menu-item>
          <el-menu-item index="/targets">
            <el-icon><Aim /></el-icon>
            <span>目标管理</span>
          </el-menu-item>
          <el-menu-item index="/audit">
            <el-icon><DocumentChecked /></el-icon>
            <span>审计透明</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss">
.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(90deg, #001529 0%, #002140 100%);
  color: white;
  padding: 0;

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo-text {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 1px;
    }
  }

  .subtitle {
    font-size: 14px;
    opacity: 0.8;
  }
}

.app-aside {
  background: #001529;
}

.nav-menu {
  border-right: none;
  height: 100%;

  .el-menu-item {
    height: 56px;
    line-height: 56px;
  }
}

.app-main {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}
</style>
