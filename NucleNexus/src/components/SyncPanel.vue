<template>
  <div class="card">
    <h2>🔄 语义同步</h2>
    
    <div class="system-status">
      <div class="system-item">
        <div class="system-icon production">🏭</div>
        <div class="system-info">
          <div class="system-name">生产部门系统</div>
          <div class="system-status-text">在线</div>
        </div>
        <div class="system-indicator online"></div>
      </div>
      
      <div class="system-item">
        <div class="system-icon safety">🛡️</div>
        <div class="system-info">
          <div class="system-name">安监指挥系统</div>
          <div class="system-status-text">在线</div>
        </div>
        <div class="system-indicator online"></div>
      </div>
    </div>
    
    <div class="sync-info">
      <div class="sync-detail">
        <span class="sync-label">上次同步</span>
        <span class="sync-value">{{ lastSyncTime }}</span>
      </div>
      <div class="sync-detail">
        <span class="sync-label">同步次数</span>
        <span class="sync-value">{{ syncCount }}</span>
      </div>
    </div>
    
    <div class="button-group">
      <button class="btn btn-primary" @click="$emit('sync')">
        立即同步
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineEmits(['sync'])

const lastSyncTime = ref('从未同步')
const syncCount = ref(0)

onMounted(() => {
  const stored = localStorage.getItem('lastSyncTime')
  if (stored) {
    lastSyncTime.value = new Date(stored).toLocaleString('zh-CN')
  }
  syncCount.value = parseInt(localStorage.getItem('syncCount') || '0')
})
</script>

<style scoped>
.system-status {
  margin-bottom: 20px;
}

.system-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 10px;
}

.system-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.system-icon.production {
  background: rgba(0, 217, 255, 0.2);
}

.system-icon.safety {
  background: rgba(0, 255, 136, 0.2);
}

.system-info {
  flex: 1;
}

.system-name {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
}

.system-status-text {
  color: #8892b0;
  font-size: 0.85rem;
}

.system-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.system-indicator.online {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
}

.sync-info {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.sync-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(0, 217, 255, 0.1);
  border-radius: 8px;
  border-left: 3px solid #00d9ff;
}

.sync-label {
  color: #8892b0;
  font-size: 0.9rem;
}

.sync-value {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>