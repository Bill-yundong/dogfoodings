<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useShoesStore } from '@/stores/shoes'
import { generateHistoricalData } from '@/utils/mockDataGenerator'
import * as echarts from 'echarts'

const router = useRouter()
const shoesStore = useShoesStore()

const statsCards = ref([
  { icon: 'Run', label: '本周里程', value: '42.5', unit: 'km', color: '#165DFF' },
  { icon: 'Timer', label: '运动时长', value: '6.8', unit: 'h', color: '#00B42A' },
  { icon: 'DataAnalysis', label: '平均风险', value: '18', unit: '%', color: '#FF7D00' },
  { icon: 'TrendCharts', label: '训练负荷', value: '正常', unit: '', color: '#722ED1' }
])

const recentActivities = ref([
  { date: '今天', distance: 8.2, duration: '45:32', risk: 'low', cadence: 178 },
  { date: '昨天', distance: 10.5, duration: '58:15', risk: 'moderate', cadence: 175 },
  { date: '前天', distance: 6.0, duration: '34:20', risk: 'low', cadence: 180 },
  { date: '3天前', distance: 12.1, duration: '68:45', risk: 'high', cadence: 172 }
])

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const historicalData = generateHistoricalData(7)

const totalDistance = computed(() => {
  return historicalData.reduce((sum, d) => sum + d.distance, 0).toFixed(1)
})

const avgRisk = computed(() => {
  return Math.round(historicalData.reduce((sum, d) => sum + d.avgRisk, 0) / historicalData.length)
})

function initChart() {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 27, 34, 0.95)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    legend: {
      data: ['距离 (km)', '风险评分'],
      textStyle: { color: 'var(--text-secondary)', fontSize: 11 },
      top: 0,
      right: 0
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: historicalData.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: 'km',
        nameTextStyle: { color: 'var(--text-tertiary)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
      },
      {
        type: 'value',
        name: '风险',
        nameTextStyle: { color: 'var(--text-tertiary)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
        splitLine: { show: false },
        max: 100
      }
    ],
    series: [
      {
        name: '距离 (km)',
        type: 'bar',
        data: historicalData.map(d => d.distance),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#165DFF' },
            { offset: 1, color: '#4080FF' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '风险评分',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#FF7D00' },
        itemStyle: { color: '#FF7D00' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 125, 0, 0.2)' },
            { offset: 1, color: 'rgba(255, 125, 0, 0)' }
          ])
        },
        data: historicalData.map(d => d.avgRisk)
      }
    ]
  }

  chartInstance.setOption(option)
}

function getRiskBadgeClass(risk: string) {
  const map: Record<string, string> = {
    low: 'risk-safe',
    moderate: 'risk-caution',
    high: 'risk-warning',
    critical: 'risk-danger'
  }
  return map[risk] || 'risk-safe'
}

function getRiskText(risk: string) {
  const map: Record<string, string> = {
    low: '低风险',
    moderate: '中风险',
    high: '高风险',
    critical: '危险'
  }
  return map[risk] || '未知'
}

onMounted(async () => {
  await shoesStore.loadShoes()
  initChart()
  window.addEventListener('resize', () => chartInstance?.resize())
})
</script>

<template>
  <div class="dashboard-page">
    <div class="welcome-section">
      <div class="welcome-text">
        <h1 class="font-display">早上好，跑者 👋</h1>
        <p>本周已完成 <span class="highlight">{{ totalDistance }}km</span>，平均风险指数 <span class="highlight" :class="avgRisk > 40 ? 'text-warning' : ''">{{ avgRisk }}%</span></p>
      </div>
      <el-button type="primary" size="large" @click="router.push('/monitor')">
        <el-icon><VideoPlay /></el-icon>
        开始训练
      </el-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="stat in statsCards" :key="stat.label" :style="{ '--card-color': stat.color }">
        <div class="stat-icon">
          <el-icon><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value font-display">{{ stat.value }}<small>{{ stat.unit }}</small></span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card chart-card">
        <div class="card-header">
          <h3><el-icon><TrendCharts /></el-icon> 本周运动趋势</h3>
        </div>
        <div ref="chartRef" class="chart-container"></div>
      </div>

      <div class="card activities-card">
        <div class="card-header">
          <h3><el-icon><List /></el-icon> 最近活动</h3>
          <el-button type="primary" link @click="router.push('/history')">查看全部</el-button>
        </div>
        <div class="activities-list">
          <div class="activity-item" v-for="activity in recentActivities" :key="activity.date">
            <div class="activity-date">{{ activity.date }}</div>
            <div class="activity-details">
              <span class="distance">{{ activity.distance }} km</span>
              <span class="duration">{{ activity.duration }}</span>
              <span class="cadence">{{ activity.cadence }} SPM</span>
            </div>
            <span class="risk-badge" :class="getRiskBadgeClass(activity.risk)">
              {{ getRiskText(activity.risk) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="shoes-section" v-if="shoesStore.shoesList.length > 0">
      <div class="section-header">
        <h3><el-icon><FootPrint /></el-icon> 我的跑鞋</h3>
        <el-button type="primary" link @click="router.push('/shoes')">管理跑鞋</el-button>
      </div>
      <div class="shoes-cards">
        <div 
          class="shoes-card card" 
          v-for="shoes in shoesStore.shoesList.slice(0, 3)" 
          :key="shoes.id"
        >
          <div class="shoes-icon">👟</div>
          <div class="shoes-info">
            <h4>{{ shoes.brand }} {{ shoes.model }}</h4>
            <p>{{ shoes.totalKilometers.toFixed(0) }} / {{ shoes.expectedLifespan }} km</p>
            <el-progress 
              :percentage="Math.round((shoes.totalKilometers / shoes.expectedLifespan) * 100)" 
              :stroke-width="6"
              :color="shoes.totalKilometers > shoes.expectedLifespan * 0.8 ? '#F53F3F' : '#165DFF'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  
  h1 {
    font-size: 28px;
    margin: 0 0 8px 0;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
  
  .highlight {
    color: var(--primary-color);
    font-weight: 600;
    
    &.text-warning {
      color: var(--warning-color);
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
    border-color: var(--card-color);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--card-color) 20%, transparent);
  color: var(--card-color);
  font-size: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  
  small {
    font-size: 14px;
    color: var(--text-tertiary);
    margin-left: 2px;
  }
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.chart-container {
  height: 300px;
  padding: 16px;
}

.activities-list {
  padding: 12px 20px;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  
  &:last-child {
    border-bottom: none;
  }
}

.activity-date {
  width: 60px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.activity-details {
  flex: 1;
  display: flex;
  gap: 16px;
  font-size: 13px;
  
  .distance {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .duration, .cadence {
    color: var(--text-secondary);
  }
}

.risk-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
}

.risk-safe {
  background: rgba(0, 180, 42, 0.1);
  color: var(--success-color);
  border-color: rgba(0, 180, 42, 0.3);
}

.risk-caution, .risk-warning {
  background: rgba(255, 125, 0, 0.1);
  color: var(--warning-color);
  border-color: rgba(255, 125, 0, 0.3);
}

.risk-danger {
  background: rgba(245, 63, 63, 0.1);
  color: var(--danger-color);
  border-color: rgba(245, 63, 63, 0.3);
}

.shoes-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.shoes-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.shoes-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.shoes-icon {
  font-size: 40px;
}

.shoes-info {
  flex: 1;
  
  h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  p {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>
