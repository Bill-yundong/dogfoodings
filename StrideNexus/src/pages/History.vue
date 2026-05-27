<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { generateHistoricalData } from '@/utils/mockDataGenerator'
import * as echarts from 'echarts'

const dateRange = ref('7')
const selectedSession = ref<any>(null)
const showDetail = ref(false)

const chartRef = ref<HTMLDivElement | null>(null)
const riskChartRef = ref<HTMLDivElement | null>(null)
const cadenceChartRef = ref<HTMLDivElement | null>(null)

let chartInstance: echarts.ECharts | null = null
let riskChartInstance: echarts.ECharts | null = null
let cadenceChartInstance: echarts.ECharts | null = null

const historicalData = ref(generateHistoricalData(30))

const sessions = computed(() => {
  const days = parseInt(dateRange.value)
  return historicalData.value.slice(0, days)
})

const stats = computed(() => {
  const data = sessions.value
  const totalDistance = data.reduce((sum, d) => sum + d.distance, 0)
  const avgDistance = totalDistance / data.length
  const totalDuration = data.reduce((sum, d) => sum + d.duration, 0)
  const avgRisk = data.reduce((sum, d) => sum + d.avgRisk, 0) / data.length
  
  return {
    totalDistance: totalDistance.toFixed(1),
    avgDistance: avgDistance.toFixed(1),
    totalDuration: Math.floor(totalDuration / 60),
    avgRisk: Math.round(avgRisk),
    sessionCount: data.length
  }
})

function initMainChart() {
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
      data: ['距离 (km)', '步频 (SPM)'],
      textStyle: { color: 'var(--text-secondary)', fontSize: 11 },
      top: 0
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sessions.value.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10, rotate: 45 },
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
        name: 'SPM',
        nameTextStyle: { color: 'var(--text-tertiary)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
        splitLine: { show: false },
        min: 150,
        max: 200
      }
    ],
    series: [
      {
        name: '距离 (km)',
        type: 'bar',
        data: sessions.value.map(d => d.distance),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#165DFF' },
            { offset: 1, color: '#4080FF' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '步频 (SPM)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#722ED1' },
        itemStyle: { color: '#722ED1' },
        data: sessions.value.map(d => d.avgCadence)
      }
    ]
  }

  chartInstance.setOption(option)
}

function initRiskChart() {
  if (!riskChartRef.value) return
  
  riskChartInstance = echarts.init(riskChartRef.value)
  
  const riskData = sessions.value.map(d => ({
    value: d.avgRisk,
    itemStyle: {
      color: d.avgRisk < 30 ? '#00B42A' : d.avgRisk < 50 ? '#FF7D00' : '#F53F3F'
    }
  }))
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 27, 34, 0.95)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' },
      formatter: (params: any) => {
        const data = params[0]
        const risk = data.value
        let level = '低风险'
        if (risk >= 50) level = '高风险'
        else if (risk >= 30) level = '中风险'
        return `${data.name}<br/>风险指数: ${risk}%<br/>风险等级: ${level}`
      }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sessions.value.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10, rotate: 45 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    series: [
      {
        type: 'bar',
        data: riskData,
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        },
        markLine: {
          silent: true,
          lineStyle: { color: '#FF7D00', type: 'dashed' },
          data: [{ yAxis: 30 }, { yAxis: 50 }],
          label: { show: false }
        }
      }
    ]
  }

  riskChartInstance.setOption(option)
}

function initCadenceChart() {
  if (!cadenceChartRef.value) return
  
  cadenceChartInstance = echarts.init(cadenceChartRef.value)
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 27, 34, 0.95)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sessions.value.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10, rotate: 45 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 150,
      max: 200,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    series: [
      {
        name: '平均步频',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#722ED1' },
        itemStyle: { color: '#722ED1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(114, 46, 209, 0.3)' },
            { offset: 1, color: 'rgba(114, 46, 209, 0)' }
          ])
        },
        data: sessions.value.map(d => d.avgCadence),
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(0, 180, 42, 0.1)' },
          data: [[{ yAxis: 170 }, { yAxis: 185 }]]
        }
      }
    ]
  }

  cadenceChartInstance.setOption(option)
}

function viewSessionDetail(session: any) {
  selectedSession.value = session
  showDetail.value = true
}

function getRiskBadgeClass(risk: number) {
  if (risk < 30) return 'risk-safe'
  if (risk < 50) return 'risk-caution'
  return 'risk-danger'
}

function getRiskText(risk: number) {
  if (risk < 30) return '低风险'
  if (risk < 50) return '中风险'
  return '高风险'
}

onMounted(() => {
  initMainChart()
  initRiskChart()
  initCadenceChart()
  
  window.addEventListener('resize', () => {
    chartInstance?.resize()
    riskChartInstance?.resize()
    cadenceChartInstance?.resize()
  })
})
</script>

<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="font-display">历史数据分析</h1>
      <el-radio-group v-model="dateRange" size="default">
        <el-radio-button value="7">近7天</el-radio-button>
        <el-radio-button value="14">近14天</el-radio-button>
        <el-radio-button value="30">近30天</el-radio-button>
      </el-radio-group>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(22, 93, 255, 0.15); color: #165DFF;">
          <el-icon><Route /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value font-display">{{ stats.totalDistance }}<small>km</small></span>
          <span class="stat-label">总里程</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(0, 180, 42, 0.15); color: #00B42A;">
          <el-icon><Timer /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value font-display">{{ stats.totalDuration }}<small>min</small></span>
          <span class="stat-label">总时长</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(255, 125, 0, 0.15); color: #FF7D00;">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value font-display">{{ stats.avgRisk }}<small>%</small></span>
          <span class="stat-label">平均风险</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(114, 46, 209, 0.15); color: #722ED1;">
          <el-icon><DataLine /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value font-display">{{ stats.sessionCount }}<small>次</small></span>
          <span class="stat-label">训练次数</span>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card chart-card">
        <div class="card-header">
          <h3><el-icon><TrendCharts /></el-icon> 距离与步频趋势</h3>
        </div>
        <div ref="chartRef" class="chart-container"></div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3><el-icon><Warning /></el-icon> 风险指数变化</h3>
        </div>
        <div ref="riskChartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="card chart-card">
      <div class="card-header">
        <h3><el-icon><DataLine /></el-icon> 步频稳定性分析</h3>
        <span class="tip">绿色区域为最佳步频范围 170-185 SPM</span>
      </div>
      <div ref="cadenceChartRef" class="chart-container"></div>
    </div>

    <div class="card sessions-card">
      <div class="card-header">
        <h3><el-icon><List /></el-icon> 训练记录详情</h3>
      </div>
      <div class="sessions-table">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>距离</th>
              <th>时长</th>
              <th>平均步频</th>
              <th>平均配速</th>
              <th>风险指数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.date">
              <td class="date">{{ session.date }}</td>
              <td class="distance">{{ session.distance }} km</td>
              <td>{{ Math.floor(session.duration / 60) }}:{{ String(session.duration % 60).padStart(2, '0') }}</td>
              <td>{{ session.avgCadence }} SPM</td>
              <td>{{ session.avgPace }}</td>
              <td>
                <span class="risk-badge" :class="getRiskBadgeClass(session.avgRisk)">
                  {{ session.avgRisk }}% · {{ getRiskText(session.avgRisk) }}
                </span>
              </td>
              <td>
                <el-button type="primary" link size="small" @click="viewSessionDetail(session)">
                  查看详情
                </el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <el-drawer
      v-model="showDetail"
      title="训练详情"
      direction="rtl"
      size="50%"
    >
      <div v-if="selectedSession" class="session-detail">
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">日期</span>
              <span class="value">{{ selectedSession.date }}</span>
            </div>
            <div class="detail-item">
              <span class="label">距离</span>
              <span class="value">{{ selectedSession.distance }} km</span>
            </div>
            <div class="detail-item">
              <span class="label">时长</span>
              <span class="value">{{ Math.floor(selectedSession.duration / 60) }}分{{ selectedSession.duration % 60 }}秒</span>
            </div>
            <div class="detail-item">
              <span class="label">平均配速</span>
              <span class="value">{{ selectedSession.avgPace }}</span>
            </div>
            <div class="detail-item">
              <span class="label">平均步频</span>
              <span class="value">{{ selectedSession.avgCadence }} SPM</span>
            </div>
            <div class="detail-item">
              <span class="label">平均心率</span>
              <span class="value">{{ selectedSession.avgHeartRate }} BPM</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>风险评估</h4>
          <div class="risk-overview">
            <el-progress
              type="dashboard"
              :percentage="selectedSession.avgRisk"
              :color="selectedSession.avgRisk < 30 ? '#00B42A' : selectedSession.avgRisk < 50 ? '#FF7D00' : '#F53F3F'"
              :width="120"
            />
            <div class="risk-info">
              <div class="risk-level">{{ getRiskText(selectedSession.avgRisk) }}</div>
              <p>本次训练风险指数处于{{ selectedSession.avgRisk < 30 ? '安全' : selectedSession.avgRisk < 50 ? '警戒' : '危险' }}范围</p>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>数据要点</h4>
          <ul class="key-points">
            <li v-for="(point, index) in selectedSession.keyPoints" :key="index">
              <el-icon><Check /></el-icon> {{ point }}
            </li>
          </ul>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.history-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h1 {
    margin: 0;
    font-size: 24px;
    color: var(--text-primary);
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
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
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

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
    color: var(--text-primary);
  }
  
  .tip {
    font-size: 12px;
    color: var(--text-tertiary);
  }
}

.chart-container {
  height: 300px;
  padding: 16px;
}

.sessions-table {
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: 14px 20px;
      text-align: left;
      border-bottom: 1px solid var(--border-light);
    }
    
    th {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }
    
    td {
      font-size: 13px;
      color: var(--text-primary);
    }
    
    .date {
      color: var(--text-secondary);
    }
    
    .distance {
      font-weight: 600;
      color: var(--primary-color);
    }
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

.risk-caution {
  background: rgba(255, 125, 0, 0.1);
  color: var(--warning-color);
  border-color: rgba(255, 125, 0, 0.3);
}

.risk-danger {
  background: rgba(245, 63, 63, 0.1);
  color: var(--danger-color);
  border-color: rgba(245, 63, 63, 0.3);
}

.session-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .label {
    font-size: 12px;
    color: var(--text-tertiary);
  }
  
  .value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.risk-overview {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.risk-info {
  flex: 1;
  
  .risk-level {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.key-points {
  margin: 0;
  padding: 0;
  list-style: none;
  
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    font-size: 13px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-light);
    
    &:last-child {
      border-bottom: none;
    }
    
    .el-icon {
      color: var(--success-color);
    }
  }
}
</style>
