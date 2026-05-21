<script setup lang="ts">
import { onMounted } from 'vue'
import Scene3D from './components/Scene3D.vue'
import ControlPanel from './components/ControlPanel.vue'
import { useDroneStore } from '@/stores/droneStore'
import { storeToRefs } from 'pinia'

const droneStore = useDroneStore()
const { activeDrones, droneList, missionList } = storeToRefs(droneStore)

onMounted(async () => {
  if (!droneStore.isInitialized) {
    await droneStore.init()
  }
})
</script>

<template>
  <div class="app-container">
    <div class="scene-wrapper">
      <Scene3D />
      <div class="hud-overlay">
        <div class="hud-title">
          <h1>DroneGrid</h1>
          <span>城市多旋翼无人机低空巡检路由矩阵</span>
        </div>
        <div class="hud-stats">
          <div class="stat">
            <span class="label">活跃无人机</span>
            <span class="value">{{ activeDrones.length }}</span>
          </div>
          <div class="stat">
            <span class="label">总无人机</span>
            <span class="value">{{ droneList.length }}</span>
          </div>
          <div class="stat">
            <span class="label">任务数</span>
            <span class="value">{{ missionList.length }}</span>
          </div>
        </div>
      </div>
    </div>
    <ControlPanel />
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  background: #0a0a1a;
}

.scene-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.hud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  pointer-events: none;
  z-index: 10;
}

.hud-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hud-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #00d4ff;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.hud-title span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.hud-stats {
  position: absolute;
  top: 20px;
  right: 420px;
  display: flex;
  gap: 20px;
  background: rgba(10, 10, 30, 0.8);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hud-stats .stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-stats .stat .label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hud-stats .stat .value {
  font-size: 20px;
  font-weight: 600;
  color: #00d4ff;
  font-family: 'Monaco', 'Consolas', monospace;
}
</style>
