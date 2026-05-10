<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/road-management', label: '路政管理' },
  { path: '/lighting-control', label: '照明控制' },
  { path: '/logs', label: '工况日志' },
]

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(path: string): void {
  router.push(path)
}
</script>

<template>
  <header class="header">
    <div class="logo">💡 PoleNexus</div>
    <nav class="nav">
      <a
        v-for="item in navItems"
        :key="item.path"
        :class="{ active: isActive(item.path) }"
        @click.prevent="navigate(item.path)"
        href="#"
      >
        {{ item.label }}
      </a>
    </nav>
  </header>
</template>