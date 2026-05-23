<template>
  <div class="h-screen w-screen bg-cyber-bg text-cyber-text overflow-hidden flex flex-col">
    <div class="flex-1 flex overflow-hidden">
      <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
      
      <div class="flex-1 flex flex-col overflow-hidden">
        <Header v-if="!isNotFoundPage" />
        
        <main class="flex-1 overflow-hidden">
          <router-view v-slot="{ Component, route: routeInfo }">
            <Suspense>
              <template #default>
                <transition name="fade-fast" mode="in-out">
                  <keep-alive :include="cachedViews" :max="6">
                    <component :is="Component" :key="routeInfo.fullPath" />
                  </keep-alive>
                </transition>
              </template>
              <template #fallback>
                <div class="h-full w-full flex items-center justify-center bg-cyber-bg">
                  <div class="text-center">
                    <div class="w-10 h-10 border-3 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin mx-auto mb-3"></div>
                    <p class="text-sm text-cyber-text-secondary">正在加载页面...</p>
                  </div>
                </div>
              </template>
            </Suspense>
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
  uiStore.showLoading('正在初始化系统...')
  
  let timeoutId: number | null = null
  
  const initTimeout = new Promise<void>((resolve) => {
    timeoutId = window.setTimeout(() => {
      console.warn('Initialization timeout, forcing hide loading')
      resolve()
    }, 3000)
  })
  
  try {
    const initPromise = Promise.all([
      pointCloudStore.loadPointClouds().catch(e => { console.error('loadPointClouds error:', e); return null }),
      taskStore.loadTasks().catch(e => { console.error('loadTasks error:', e); return null }),
      syncStore.loadSyncTasks().catch(e => { console.error('loadSyncTasks error:', e); return null }),
      snapshotStore.loadSnapshots().catch(e => { console.error('loadSnapshots error:', e); return null })
    ])
    
    await Promise.race([initPromise, initTimeout])
    
    uiStore.hideLoading()
    
    uiStore.addNotification({
      type: 'success',
      title: '系统初始化完成',
      message: '电力巡检点云降维中枢已就绪'
    })

    await nextTick()
    preloadRoutes()
  } catch (error) {
    console.error('Initialization error:', error)
    uiStore.hideLoading()
    
    uiStore.addNotification({
      type: 'warning',
      title: '初始化提示',
      message: '部分数据加载失败，系统以离线模式运行'
    })
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    uiStore.hideLoading()
  }
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
