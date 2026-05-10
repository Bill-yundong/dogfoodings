<script setup lang="ts">
import { onMounted } from 'vue'
import { useSyncService } from '@/services/syncService'

onMounted(() => {
  useSyncService().initialize()
})
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f0f2f5;
}
</style>