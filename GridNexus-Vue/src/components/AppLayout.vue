<template>
  <v-app id="grid-nexus-app">
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>
        <v-icon class="mr-2">mdi-power-plug-outline</v-icon>
        GridNexus - 电网负荷流转中枢
      </v-toolbar-title>
      <v-spacer />
      <v-toolbar-items>
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon>
              <v-badge color="error" :content="notificationCount">
                <v-icon>mdi-bell</v-icon>
              </v-badge>
            </v-btn>
          </template>
          <v-card max-width="320">
            <v-card-title class="pb-2">
              <v-icon class="mr-2">mdi-bell</v-icon>
              通知中心
              <v-spacer />
              <v-btn icon variant="text" size="small" @click="notificationCount = 0">
                <v-icon size="small">mdi-bell-off</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider />
            <v-list>
              <v-list-item v-for="alert in alerts" :key="alert.id">
                <template v-slot:prepend>
                  <v-icon
                    :color="alert.severity === 'critical' ? 'error' : 'warning'"
                  >
                    mdi-alert-circle
                  </v-icon>
                </template>
                <v-list-item-content>
                  <v-list-item-title>{{ alert.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ alert.message }}</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <span class="caption text-grey">{{ alert.time }}</span>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            <v-divider v-if="alerts.length > 0" />
            <v-card-actions>
              <v-btn variant="text" block>
                查看全部通知
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon>
              <v-icon>mdi-account</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item>
              <v-list-item-title>管理员</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <v-list-item-title>设置</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>退出</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-toolbar-items>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      app
      color="surface"
      width="260"
    >
      <v-list>
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :to="item.to"
          router
          active-class="primary--text"
        >
          <template v-slot:prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>

    <v-footer app color="surface">
      <v-col class="text-center">
        <span>GridNexus v1.0.0 - 电网负荷流转中枢管理系统</span>
      </v-col>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTopologyStore } from '@/stores/topology'
import { useSnapshotStore } from '@/stores/snapshot'
import { useMappingStore } from '@/stores/mapping'

const drawer = ref(true)
const notificationCount = ref(3)
const alerts = ref([
  {
    id: 1,
    severity: 'warning',
    title: '浦东变2号主变负载偏高',
    message: '负载率达到100%，建议关注',
    time: '10分钟前'
  },
  {
    id: 2,
    severity: 'warning',
    title: '浦西变2号主变负载偏高',
    message: '负载率达到107.5%，建议检查',
    time: '15分钟前'
  },
  {
    id: 3,
    severity: 'info',
    title: '系统每日巡检完成',
    message: '所有关键指标正常',
    time: '1小时前'
  }
])

const navItems = [
  { title: '概览', icon: 'mdi-view-dashboard', to: '/' },
  { title: '拓扑分析', icon: 'mdi-graph', to: '/topology' },
  { title: '状态快照', icon: 'mdi-camera-timer', to: '/snapshots' },
  { title: '语义映射', icon: 'mdi-swap-horizontal', to: '/mapping' }
]

const topologyStore = useTopologyStore()
const snapshotStore = useSnapshotStore()
const mappingStore = useMappingStore()

onMounted(async () => {
  await topologyStore.init()
  await snapshotStore.init()
  mappingStore.loadMappings()
})
</script>
