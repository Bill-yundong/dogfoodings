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
        <v-btn icon>
          <v-badge color="error" :content="notificationCount">
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>
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
