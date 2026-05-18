<template>
  <div class="main-layout h-screen w-full flex">
    <aside class="sidebar h-full bg-tech-bg-light/90 backdrop-blur-sm border-r border-tech-accent/10 flex flex-col transition-all duration-300"
           :class="{ 'w-64': !collapsed, 'w-16': collapsed }">
      <div class="p-4 border-b border-tech-accent/10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-tech-accent to-tech-accent-dark flex items-center justify-center flex-shrink-0">
          <el-icon :size="24" color="#0A192F">
            <Cpu />
          </el-icon>
        </div>
        <transition name="fade">
          <div v-if="!collapsed" class="overflow-hidden">
            <h1 class="text-lg font-bold text-tech-accent">PumpLink</h1>
            <p class="text-xs text-text-secondary">智能预测性维护</p>
          </div>
        </transition>
      </div>

      <nav class="flex-1 py-4 overflow-y-auto">
        <div v-for="route in menuRoutes" :key="route.path" class="mb-1">
          <router-link :to="route.path" class="menu-item flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-tech-accent hover:bg-tech-accent/10 transition-all duration-200"
                       :class="{ 'active bg-tech-accent/10 text-tech-accent': isActive(route.path) }">
            <el-icon :size="20" class="flex-shrink-0">
              <component :is="route.meta.icon" />
            </el-icon>
            <transition name="fade">
              <span v-if="!collapsed" class="whitespace-nowrap">{{ route.meta.title }}</span>
            </transition>
          </router-link>
        </div>
      </nav>

      <div class="p-4 border-t border-tech-accent/10">
        <button @click="collapsed = !collapsed" class="w-full flex items-center justify-center py-2 text-text-secondary hover:text-tech-accent transition-colors">
          <el-icon :size="20">
            <component :is="collapsed ? 'Expand' : 'Fold'" />
          </el-icon>
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col overflow-hidden">
      <header class="h-14 bg-tech-bg-light/50 backdrop-blur-sm border-b border-tech-accent/10 flex items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-medium text-text-primary">{{ currentTitle }}</h2>
          <span class="px-2 py-1 bg-status-normal/20 text-status-normal text-xs rounded-full flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-status-normal animate-pulse"></span>
            实时连接
          </span>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative">
            <el-input v-model="searchQuery" placeholder="搜索设备..." class="w-64" :prefix-icon="Search" clearable />
          </div>

          <div class="relative">
            <button @click="showAlertPanel = !showAlertPanel" class="relative p-2 text-text-secondary hover:text-tech-accent transition-colors">
              <el-icon :size="20"><Bell /></el-icon>
              <span v-if="alertStore.unacknowledgedCount > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-status-critical text-white text-xs rounded-full flex items-center justify-center">
                {{ alertStore.unacknowledgedCount > 9 ? '9+' : alertStore.unacknowledgedCount }}
              </span>
            </button>

            <transition name="dropdown">
              <div v-if="showAlertPanel" class="absolute right-0 top-full mt-2 w-96 bg-tech-bg-light border border-tech-accent/20 rounded-lg shadow-xl z-50 overflow-hidden">
                <div class="p-4 border-b border-tech-accent/10 flex items-center justify-between">
                  <h4 class="text-text-primary font-medium">告警通知</h4>
                  <button v-if="alertStore.pendingAlerts.length > 0" 
                          @click="acknowledgeAll"
                          class="text-xs text-tech-accent hover:text-tech-accent-dark transition-colors">
                    全部已读
                  </button>
                </div>
                <div class="max-h-80 overflow-y-auto">
                  <div v-if="alertStore.pendingAlerts.length === 0" class="p-8 text-center text-text-secondary">
                    <el-icon :size="32" class="mb-2"><Check /></el-icon>
                    <p>暂无未读告警</p>
                  </div>
                  <div v-for="alert in alertStore.pendingAlerts.slice(0, 5)" :key="alert.id"
                       class="p-3 hover:bg-tech-accent/5 transition-colors cursor-pointer border-b border-tech-accent/5 last:border-0"
                       @click="handleAlertClick(alert)">
                    <div class="flex items-start gap-3">
                      <div class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                           :class="{
                             'bg-status-normal': alert.severity === 'info',
                             'bg-status-warning': alert.severity === 'warning',
                             'bg-status-severe': alert.severity === 'error',
                             'bg-status-critical animate-pulse': alert.severity === 'critical'
                           }"></div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-text-primary text-sm font-medium truncate">{{ alert.title }}</span>
                          <el-tag :type="getAlertTagType(alert.severity)" size="small" effect="dark">
                            {{ getSeverityText(alert.severity) }}
                          </el-tag>
                        </div>
                        <p class="text-text-secondary text-xs mt-1 truncate">{{ alert.deviceName }} · {{ alert.description }}</p>
                        <p class="text-text-muted text-xs mt-1 font-mono">{{ formatTimestamp(alert.timestamp) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-3 border-t border-tech-accent/10">
                  <button @click="$router.push('/alerts'); showAlertPanel = false" 
                          class="w-full text-center text-sm text-tech-accent hover:text-tech-accent-dark transition-colors">
                    查看全部告警 →
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <div class="flex items-center gap-3 pl-4 border-l border-tech-accent/10">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-tech-accent to-tech-accent-dark flex items-center justify-center">
              <span class="text-tech-bg text-sm font-medium">管</span>
            </div>
            <span class="text-text-primary text-sm">管理员</span>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-6 grid-bg">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cpu, Search, Bell, Fold, Expand, Odometer, TrendCharts, Warning, Connection, Camera, Setting, Check } from '@element-plus/icons-vue'
import { useAlertStore } from '@/stores/alertStore'
import { useDeviceStore } from '@/stores/deviceStore'
import type { Alert } from '@/types'
import { formatTimestamp, getSeverityText } from '@/utils'

const route = useRoute()
const router = useRouter()
const alertStore = useAlertStore()
const deviceStore = useDeviceStore()

const collapsed = ref(false)
const searchQuery = ref('')
const showAlertPanel = ref(false)

const menuRoutes = computed(() => {
  return router.getRoutes()
    .filter(r => r.meta && !r.meta.hidden && r.path !== '/')
    .map(r => ({
      path: r.path,
      meta: r.meta
    }))
})

const currentTitle = computed(() => {
  return route.meta.title || 'PumpLink'
})

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function closeAlertPanel(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    showAlertPanel.value = false
  }
}

function getAlertTagType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger'
  }
  return map[severity] || 'info'
}

async function handleAlertClick(alert: Alert) {
  await alertStore.acknowledgeAlert(alert.id, '管理员')
  showAlertPanel.value = false
  router.push('/alerts')
}

async function acknowledgeAll() {
  for (const alert of alertStore.pendingAlerts) {
    await alertStore.acknowledgeAlert(alert.id, '管理员')
  }
}

onMounted(async () => {
  await deviceStore.loadAllDevices()
  await alertStore.loadAlerts(20)
  document.addEventListener('click', closeAlertPanel)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAlertPanel)
})
</script>

<style scoped lang="scss">
.menu-item {
  position: relative;
  
  &.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: #64FFDA;
    border-radius: 0 2px 2px 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
