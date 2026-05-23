<template>
  <div class="h-screen w-screen bg-cyber-bg text-cyber-text overflow-hidden flex flex-col">
    <div class="flex-1 flex overflow-hidden">
      <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
      
      <div class="flex-1 flex flex-col overflow-hidden">
        <Header v-if="!isNotFoundPage" />
        
        <main class="flex-1 overflow-hidden">
          <router-view v-slot="{ Component, route: routeInfo }">
            <component :is="Component" :key="routeInfo.fullPath" />
          </router-view>
        </main>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="uiStore.loading"
        class="fixed inset-0 bg-cyber-bg/80 backdrop-blur-sm flex items-center justify-center z-50"
      >
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-cyber-text font-medium">{{ uiStore.loadingText }}</p>
          <p v-if="uiStore.loadingProgress > 0" class="text-xs text-cyber-text-secondary mt-2 font-mono">
            {{ uiStore.loadingProgress }}%
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import { useUiStore, usePointCloudStore, useTaskStore, useSyncStore, useSnapshotStore } from '@/stores'

const route = useRoute()
const uiStore = useUiStore()
const pointCloudStore = usePointCloudStore()
const taskStore = useTaskStore()
const syncStore = useSyncStore()
const snapshotStore = useSnapshotStore()

const sidebarCollapsed = ref(false)

const isNotFoundPage = computed(() => route.name === 'NotFound')

const cachedViews = computed(() => ['Dashboard', 'Processing', 'Visualizer', 'Sync', 'Snapshots', 'Settings'])

onMounted(async () => {
  uiStore.hideLoading()
  
  pointCloudStore.loadPointClouds().catch(e => console.error('loadPointClouds error:', e))
  taskStore.loadTasks().catch(e => console.error('loadTasks error:', e))
  syncStore.loadSyncTasks().catch(e => console.error('loadSyncTasks error:', e))
  snapshotStore.loadSnapshots().catch(e => console.error('loadSnapshots error:', e))

  await nextTick()
  preloadRoutes()
  
  setTimeout(() => {
    uiStore.addNotification({
      type: 'success',
      title: '系统初始化完成',
      message: '电力巡检点云降维中枢已就绪'
    })
  }, 500)
})

function preloadRoutes() {
  const routes = [
    () => import('@/views/ProcessingCenter.vue'),
    () => import('@/views/Visualizer.vue'),
    () => import('@/views/SyncManager.vue'),
    () => import('@/views/SnapshotManager.vue'),
    () => import('@/views/Settings.vue')
  ]
  
  setTimeout(() => {
    routes.forEach(load => {
      try { load() } catch (e) {}
    })
  }, 1000)
}
</script>

<style>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.12s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
