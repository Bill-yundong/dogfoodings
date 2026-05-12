<template>
  <div class="event-list">
    <div class="list-header">
      <h3>历史覆冰事件档案</h3>
      <div class="stats">
        <span>总计: {{ totalEvents }} 次事件</span>
        <span>成本节省: ¥{{ costSavings.toLocaleString() }}</span>
      </div>
    </div>

    <div class="severity-filter">
      <button
        v-for="severity in severities"
        :key="severity.value"
        @click="filterBySeverity(severity.value)"
        :class="{ active: currentFilter === severity.value }"
      >
        {{ severity.label }}
      </button>
    </div>

    <div class="event-items" v-if="filteredEvents.length > 0">
      <div v-for="event in filteredEvents" :key="event.id" class="event-card" :class="event.severity">
        <div class="event-header">
          <span class="turbine-id">{{ event.turbineId }}</span>
          <span class="severity-badge">{{ getSeverityLabel(event.severity) }}</span>
        </div>
        <div class="event-details">
          <div class="detail-item">
            <span class="label">最大覆冰</span>
            <span class="value">{{ event.maxIcingMass.toFixed(2) }} kg/m²</span>
          </div>
          <div class="detail-item">
            <span class="label">平均温度</span>
            <span class="value">{{ event.averageTemperature.toFixed(1) }}°C</span>
          </div>
          <div class="detail-item">
            <span class="label">维护成本</span>
            <span class="value">¥{{ event.maintenanceCost.toLocaleString() }}</span>
          </div>
        </div>
        <div class="event-time">
          {{ formatTime(event.startTime) }} - {{ formatTime(event.endTime) }}
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      暂无历史事件数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { IcingEvent } from '../types'
import { icingEventDB } from '../services/IcingEventDB'

const events = ref<IcingEvent[]>([])
const currentFilter = ref<string>('all')
const costSavings = ref(0)

const severities = [
  { value: 'all', label: '全部' },
  { value: 'minor', label: '轻微' },
  { value: 'moderate', label: '中等' },
  { value: 'severe', label: '严重' },
  { value: 'extreme', label: '极端' }
]

const totalEvents = computed(() => events.value.length)

const filteredEvents = computed(() => {
  if (currentFilter.value === 'all') {
    return events.value
  }
  return events.value.filter(e => e.severity === currentFilter.value)
})

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    minor: '轻微',
    moderate: '中等',
    severe: '严重',
    extreme: '极端'
  }
  return labels[severity] || severity
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function filterBySeverity(severity: string) {
  currentFilter.value = severity
}

async function loadEvents() {
  try {
    await icingEventDB.init()
    events.value = await icingEventDB.getAllEvents()
    costSavings.value = await icingEventDB.calculateCostSavings()
  } catch (error) {
    console.error('Failed to load events:', error)
  }
}

onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.event-list {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
  max-height: 500px;
  overflow-y: auto;
}

.list-header {
  margin-bottom: 16px;
}

.list-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.stats {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.severity-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.severity-filter button {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.severity-filter button:hover,
.severity-filter button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.event-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid #6b7280;
}

.event-card.minor {
  border-left-color: #10b981;
}

.event-card.moderate {
  border-left-color: #f59e0b;
}

.event-card.severe {
  border-left-color: #ef4444;
}

.event-card.extreme {
  border-left-color: #7c3aed;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.turbine-id {
  font-weight: 600;
  font-size: 1rem;
}

.severity-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
}

.event-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 10px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.detail-item .value {
  font-size: 0.95rem;
  font-weight: 500;
}

.event-time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
}
</style>