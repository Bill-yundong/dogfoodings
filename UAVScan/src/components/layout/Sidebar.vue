<template>
  <aside
    class="h-full bg-cyber-bg-light border-r border-cyber-border flex flex-col transition-all duration-300"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <div class="p-4 border-b border-cyber-border flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue to-electric-blue-dark flex items-center justify-center flex-shrink-0">
        <component :is="icons.ScanLine" class="w-6 h-6 text-cyber-bg" />
      </div>
      <transition name="fade">
        <div v-if="!collapsed" class="flex flex-col">
          <span class="font-bold text-lg text-cyber-text tracking-wide">UAVScan</span>
          <span class="text-xs text-cyber-text-secondary">点云降维中枢</span>
        </div>
      </transition>
    </div>

    <nav class="flex-1 p-2 overflow-y-auto">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <router-link
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
            :class="{
              'bg-electric-blue/10 text-electric-blue border border-electric-blue/30': isActive(item.path),
              'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter': !isActive(item.path)
            }"
          >
            <component
              :is="icons[item.icon]"
              class="w-5 h-5 flex-shrink-0 transition-transform duration-200"
              :class="{ 'group-hover:scale-110': !isActive(item.path) }"
            />
            <transition name="fade">
              <span v-if="!collapsed" class="text-sm font-medium truncate">{{ item.label }}</span>
            </transition>
            <transition name="fade">
              <span
                v-if="!collapsed && item.badge"
                class="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-electric-blue/20 text-electric-blue"
              >
                {{ item.badge }}
              </span>
            </transition>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="p-2 border-t border-cyber-border">
      <button
        @click="$emit('toggle')"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-bg-lighter transition-all duration-200"
      >
        <component
          :is="collapsed ? icons.ChevronRight : icons.ChevronLeft"
          class="w-5 h-5"
        />
        <transition name="fade">
          <span v-if="!collapsed" class="text-sm">收起菜单</span>
        </transition>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import type { Component } from 'vue'
import {
  LayoutDashboard,
  Cpu,
  Box,
  RefreshCw,
  Camera,
  Settings,
  ScanLine,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import { useTaskStore, useSyncStore } from '@/stores'

const props = defineProps<{
  collapsed: boolean
}>()

defineEmits<{
  toggle: []
}>()

const route = useRoute()
const taskStore = useTaskStore()
const syncStore = useSyncStore()

type IconName = 'LayoutDashboard' | 'Cpu' | 'Box' | 'RefreshCw' | 'Camera' | 'Settings' | 'ScanLine' | 'ChevronLeft' | 'ChevronRight'

interface MenuItem {
  path: string
  label: string
  icon: IconName
  badge?: number
}

const icons: Record<IconName, Component> = {
  LayoutDashboard: markRaw(LayoutDashboard),
  Cpu: markRaw(Cpu),
  Box: markRaw(Box),
  RefreshCw: markRaw(RefreshCw),
  Camera: markRaw(Camera),
  Settings: markRaw(Settings),
  ScanLine: markRaw(ScanLine),
  ChevronLeft: markRaw(ChevronLeft),
  ChevronRight: markRaw(ChevronRight)
}

const baseMenuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: '数据仪表盘',
    icon: 'LayoutDashboard'
  },
  {
    path: '/processing',
    label: '处理中心',
    icon: 'Cpu'
  },
  {
    path: '/visualizer',
    label: '点云可视化',
    icon: 'Box'
  },
  {
    path: '/sync',
    label: '数据同步',
    icon: 'RefreshCw'
  },
  {
    path: '/snapshots',
    label: '快照管理',
    icon: 'Camera'
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: 'Settings'
  }
]

const runningTaskCount = computed(() => taskStore.runningTasks.length)
const syncingTaskCount = computed(() => syncStore.syncingTasks.length)

const menuItems = computed<MenuItem[]>(() => {
  return baseMenuItems.map(item => {
    if (item.path === '/processing' && runningTaskCount.value > 0) {
      return { ...item, badge: runningTaskCount.value }
    }
    if (item.path === '/sync' && syncingTaskCount.value > 0) {
      return { ...item, badge: syncingTaskCount.value }
    }
    return item
  })
})

const activePath = computed(() => route.path)

function isActive(path: string): boolean {
  const currentPath = activePath.value
  return currentPath === path || currentPath.startsWith(path + '/')
}
</script>
