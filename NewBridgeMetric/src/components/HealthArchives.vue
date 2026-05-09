<template>
  <div class="health-archives">
    <ul class="archives-list">
      <li 
        v-for="record in records" 
        :key="record.id"
        class="archive-item"
        @click="$emit('view-record', record)"
      >
        <div class="archive-info">
          <div class="archive-date">{{ formatDate(record.date) }}</div>
          <div class="archive-summary">{{ record.summary }}</div>
        </div>
        <div 
          class="archive-status"
          :class="record.status"
        >
          {{ record.status }}
        </div>
      </li>
      
      <li v-if="records.length === 0" class="archive-item">
        <div class="archive-info">
          <div class="archive-date">暂无数据</div>
          <div class="archive-summary">系统正在收集健康档案...</div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})

defineEmits(['view-record'])

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()
  
  if (isToday) {
    return '今天'
  } else if (isYesterday) {
    return '昨天'
  }
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style scoped>
.health-archives {
  max-height: 250px;
  overflow-y: auto;
}
</style>
