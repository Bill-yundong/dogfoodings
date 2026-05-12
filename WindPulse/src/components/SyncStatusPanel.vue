<template>
  <div class="sync-panel">
    <h3>系统同步状态</h3>
    <div class="sync-items">
      <div class="sync-item">
        <div class="connection-status" :class="{ connected: syncStatus.platformConnected }">
          <div class="dot"></div>
          <span>运维平台</span>
        </div>
        <button @click="connectPlatform" :disabled="syncStatus.platformConnected">
          {{ syncStatus.platformConnected ? '已连接' : '连接' }}
        </button>
      </div>

      <div class="sync-item">
        <div class="connection-status" :class="{ connected: syncStatus.deicingSystemConnected }">
          <div class="dot"></div>
          <span>除冰系统</span>
        </div>
        <button @click="connectDeicingSystem" :disabled="syncStatus.deicingSystemConnected">
          {{ syncStatus.deicingSystemConnected ? '已连接' : '连接' }}
        </button>
      </div>
    </div>

    <div class="last-sync" v-if="syncStatus.lastSync > 0">
      上次同步: {{ formatTime(syncStatus.lastSync) }}
    </div>

    <button
      class="sync-button"
      @click="toggleSync"
      :disabled="!syncStatus.platformConnected || !syncStatus.deicingSystemConnected"
    >
      {{ isSyncing ? '停止同步' : '开始同步' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SyncStatus } from '../types'
import { semanticSyncService } from '../services/SemanticSyncService'

const emit = defineEmits<{
  (e: 'sync-started'): void
  (e: 'sync-stopped'): void
}>()

const isSyncing = ref(false)
const syncStatus = ref<SyncStatus>(semanticSyncService.syncStatus)

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

async function connectPlatform() {
  await semanticSyncService.connectPlatform()
  syncStatus.value = { ...semanticSyncService.syncStatus }
}

async function connectDeicingSystem() {
  await semanticSyncService.connectDeicingSystem()
  syncStatus.value = { ...semanticSyncService.syncStatus }
}

function toggleSync() {
  if (isSyncing.value) {
    semanticSyncService.stopSync()
    isSyncing.value = false
    emit('sync-stopped')
  } else {
    semanticSyncService.startSync()
    isSyncing.value = true
    emit('sync-started')
  }
}
</script>

<style scoped>
.sync-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.sync-panel h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
}

.sync-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.sync-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-status .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6b7280;
}

.connection-status.connected .dot {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}

.connection-status span {
  font-size: 0.95rem;
}

.sync-item button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.sync-item button:disabled {
  background: #10b981;
  cursor: not-allowed;
}

.last-sync {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 16px;
}

.sync-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.sync-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
}

.sync-button:disabled {
  background: #4b5563;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>