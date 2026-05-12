<template>
  <div class="log-container">
    <div v-if="logs.length === 0" class="empty-log">
      暂无日志记录
    </div>
    <div v-else>
      <div v-for="(log, index) in logs" :key="index" :class="['log-entry', `log-${log.type || 'info'}`]">
        <span class="log-time">{{ log.time }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.log-container {
  max-height: 300px;
  overflow-y: auto;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #00d9ff;
  border-radius: 3px;
}

.empty-log {
  text-align: center;
  color: #8892b0;
  padding: 40px;
  font-size: 0.95rem;
}

.log-entry {
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  border-left: 3px solid #00d9ff;
  transition: all 0.3s ease;
}

.log-entry.log-warning {
  border-left-color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
}

.log-entry.log-danger {
  border-left-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.log-entry:hover {
  transform: translateX(5px);
}

.log-time {
  color: #8892b0;
  margin-right: 12px;
  font-family: monospace;
}

.log-message {
  color: #ffffff;
}
</style>