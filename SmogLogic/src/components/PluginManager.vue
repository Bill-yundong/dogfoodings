<template>
  <div class="plugin-manager">
    <h3>🔌 计算插件管理</h3>
    <div class="plugin-list">
      <div v-for="plugin in plugins" :key="plugin.id" class="plugin-card">
        <div class="plugin-header">
          <span class="plugin-name">{{ plugin.name }}</span>
          <span class="plugin-version">v{{ plugin.version }}</span>
        </div>
        <p class="plugin-description">{{ plugin.description }}</p>
        <span class="plugin-type" :class="plugin.type">{{ getTypeLabel(plugin.type) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { pluginRegistry } from '../core/PluginRegistry'
import type { ComputationPlugin } from '../types'

const plugins = ref<ComputationPlugin[]>([])

onMounted(() => {
  plugins.value = pluginRegistry.list()
})

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    interpolation: '插值算法',
    simulation: '模拟引擎',
    analysis: '分析工具',
    preprocessing: '预处理'
  }
  return labels[type] || type
}
</script>

<style scoped>
.plugin-manager {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.plugin-manager h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plugin-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e9ecef;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plugin-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.plugin-version {
  font-size: 12px;
  color: #6c757d;
  background: #e9ecef;
  padding: 2px 8px;
  border-radius: 12px;
}

.plugin-description {
  font-size: 12px;
  color: #6c757d;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.plugin-type {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.plugin-type.interpolation {
  background: #e3f2fd;
  color: #1976d2;
}

.plugin-type.simulation {
  background: #e8f5e9;
  color: #388e3c;
}

.plugin-type.analysis {
  background: #fff3e0;
  color: #f57c00;
}
</style>
