<template>
  <div class="analysis-view">
    <div class="view-header">
      <h2>📊 混合分析报告</h2>
      <p>基于历史数据的混合性能分析与优化建议</p>
    </div>

    <div class="analysis-summary">
      <div class="summary-card">
        <div class="summary-icon">📈</div>
        <div class="summary-content">
          <div class="summary-label">平均混合质量</div>
          <div class="summary-value">{{ avgQuality.toFixed(1) }}%</div>
          <div class="summary-trend" :class="qualityTrend.class">
            {{ qualityTrend.icon }} {{ qualityTrend.text }}
          </div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">⚠️</div>
        <div class="summary-content">
          <div class="summary-label">平均死区占比</div>
          <div class="summary-value">{{ (avgDeadZone * 100).toFixed(2) }}%</div>
          <div class="summary-trend" :class="deadZoneTrend.class">
            {{ deadZoneTrend.icon }} {{ deadZoneTrend.text }}
          </div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">⚡</div>
        <div class="summary-content">
          <div class="summary-label">总仿真次数</div>
          <div class="summary-value">{{ totalSimulations }}</div>
          <div class="summary-trend text-success">
            ✓ 数据完整
          </div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">⏱️</div>
        <div class="summary-content">
          <div class="summary-label">平均混合时间</div>
          <div class="summary-value">{{ avgMixingTime }} 步</div>
          <div class="summary-trend text-info">
            目标: 95% 均匀度
          </div>
        </div>
      </div>
    </div>

    <div class="analysis-layout">
      <div class="chart-section">
        <div class="card">
          <div class="section-header">
            <h3>📈 混合质量趋势</h3>
            <select class="form-input form-select form-input-sm" v-model="chartFluidFilter">
              <option :value="null">全部流体</option>
              <option v-for="fluid in fluids" :key="fluid.id" :value="fluid.id">
                {{ fluid.name }}
              </option>
            </select>
          </div>
          <div class="chart-container">
            <canvas ref="qualityChartRef" height="300"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h3>🔄 死区分布分析</h3>
          </div>
          <div class="chart-container">
            <canvas ref="deadZoneChartRef" height="300"></canvas>
          </div>
        </div>
      </div>

      <div class="insights-section">
        <div class="card">
          <h3>💡 智能洞察</h3>
          <div class="insights-list">
            <div 
              v-for="(insight, index) in insights" 
              :key="index" 
              class="insight-item"
              :class="insight.type"
            >
              <div class="insight-icon">{{ insight.icon }}</div>
              <div class="insight-content">
                <div class="insight-title">{{ insight.title }}</div>
                <div class="insight-description">{{ insight.description }}</div>
              </div>
            </div>
            <div v-if="insights.length === 0" class="empty-insights">
              <div class="empty-icon">🔍</div>
              <div>暂无分析数据</div>
              <div class="empty-hint">开始仿真并保存快照以生成分析报告</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>🎯 优化建议</h3>
          <div class="recommendations-list">
            <div 
              v-for="(rec, index) in recommendations" 
              :key="index" 
              class="recommendation-item"
            >
              <div class="rec-priority" :class="rec.priority">
                {{ rec.priority === 'high' ? '!' : '○' }}
              </div>
              <div class="rec-content">
                <div class="rec-title">{{ rec.title }}</div>
                <div class="rec-description">{{ rec.description }}</div>
                <div class="rec-benefit">预期收益: {{ rec.benefit }}</div>
              </div>
            </div>
            <div v-if="recommendations.length === 0" class="empty-insights">
              <div class="empty-icon">✨</div>
              <div>暂无优化建议</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>🧪 流体性能对比</h3>
          <div class="fluid-comparison">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>流体</th>
                  <th>平均混合度</th>
                  <th>死区占比</th>
                  <th>推荐转速</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fluid in fluidPerformance" :key="fluid.id">
                  <td>
                    <span class="fluid-badge">{{ fluid.name }}</span>
                  </td>
                  <td :class="fluid.avgQuality >= 0.8 ? 'text-success' : 'text-warning'">
                    {{ (fluid.avgQuality * 100).toFixed(1) }}%
                  </td>
                  <td :class="fluid.avgDeadZone < 0.1 ? 'text-success' : 'text-danger'">
                    {{ (fluid.avgDeadZone * 100).toFixed(2) }}%
                  </td>
                  <td class="monospace">{{ fluid.recommendedSpeed }} RPM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card export-section">
      <h3>📄 报告导出</h3>
      <p>生成完整的混合性能分析报告，包含详细数据和图表</p>
      <div class="export-buttons">
        <button class="btn btn-primary" @click="exportReport">
          📥 导出分析报告
        </button>
        <button class="btn btn-secondary" @click="generateSummary">
          📋 生成摘要
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { MixingAnalyzer } from '../utils/mixingAnalysis'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const store = useSimulationStore()

const qualityChartRef = ref(null)
const deadZoneChartRef = ref(null)
const chartFluidFilter = ref(null)

let qualityChart = null
let deadZoneChart = null

const snapshots = computed(() => store.snapshots)
const fluids = computed(() => store.fluids)

const filteredSnapshots = computed(() => {
  if (!chartFluidFilter.value) return snapshots.value
  return snapshots.value.filter(s => s.fluidId === chartFluidFilter.value)
})

const avgQuality = computed(() => {
  if (snapshots.value.length === 0) return 0
  const sum = snapshots.value.reduce((acc, s) => acc + (s.mixingQuality || 0), 0)
  return (sum / snapshots.value.length) * 100
})

const avgDeadZone = computed(() => {
  if (snapshots.value.length === 0) return 0
  const sum = snapshots.value.reduce((acc, s) => acc + (s.deadZoneRatio || 0), 0)
  return sum / snapshots.value.length
})

const totalSimulations = computed(() => store.simulations.length)

const avgMixingTime = computed(() => {
  const completedSims = store.simulations.filter(s => s.status === 'stopped')
  if (completedSims.length === 0) return 0
  const sum = completedSims.reduce((acc, s) => acc + (s.finalMixingQuality >= 0.95 ? s.params?.totalSteps : 0), 0)
  const count = completedSims.filter(s => s.finalMixingQuality >= 0.95).length
  return count > 0 ? Math.round(sum / count) : 'N/A'
})

const qualityTrend = computed(() => {
  const recent = filteredSnapshots.value.slice(0, 10)
  if (recent.length < 2) return { icon: '—', text: '稳定', class: 'text-secondary' }
  
  const first = recent[recent.length - 1]?.mixingQuality || 0
  const last = recent[0]?.mixingQuality || 0
  const diff = last - first
  
  if (diff > 0.05) return { icon: '↑', text: '提升中', class: 'text-success' }
  if (diff < -0.05) return { icon: '↓', text: '下降', class: 'text-danger' }
  return { icon: '—', text: '稳定', class: 'text-secondary' }
})

const deadZoneTrend = computed(() => {
  const recent = filteredSnapshots.value.slice(0, 10)
  if (recent.length < 2) return { icon: '—', text: '正常', class: 'text-secondary' }
  
  const first = recent[recent.length - 1]?.deadZoneRatio || 0
  const last = recent[0]?.deadZoneRatio || 0
  const diff = last - first
  
  if (diff < -0.02) return { icon: '↓', text: '改善', class: 'text-success' }
  if (diff > 0.02) return { icon: '↑', text: '恶化', class: 'text-danger' }
  return { icon: '—', text: '正常', class: 'text-secondary' }
})

const insights = computed(() => {
  const result = []
  
  if (avgQuality.value >= 80) {
    result.push({
      type: 'success',
      icon: '✅',
      title: '混合效果良好',
      description: `平均混合质量达到 ${avgQuality.value.toFixed(1)}%，工艺参数设置合理。`
    })
  } else if (avgQuality.value >= 60) {
    result.push({
      type: 'warning',
      icon: '⚠️',
      title: '混合效果中等',
      description: '建议检查搅拌转速和叶轮设计，考虑优化操作参数。'
    })
  } else {
    result.push({
      type: 'danger',
      icon: '❌',
      title: '混合效果不佳',
      description: '混合质量低于预期，需要全面评估搅拌系统设计。'
    })
  }
  
  if (avgDeadZone.value > 0.1) {
    result.push({
      type: 'danger',
      icon: '🔴',
      title: '死区问题严重',
      description: `平均死区占比 ${(avgDeadZone.value * 100).toFixed(1)}%，建议优化内部构件布局。`
    })
  } else if (avgDeadZone.value > 0.05) {
    result.push({
      type: 'warning',
      icon: '🟡',
      title: '存在少量死区',
      description: '死区在可接受范围内，但仍有优化空间。'
    })
  }
  
  if (snapshots.value.length > 20) {
    result.push({
      type: 'info',
      icon: '📊',
      title: '数据样本充足',
      description: `已积累 ${snapshots.value.length} 条快照数据，分析结果可靠。`
    })
  }
  
  return result
})

const recommendations = computed(() => {
  const recs = []
  
  if (avgDeadZone.value > 0.08) {
    recs.push({
      priority: 'high',
      title: '优化搅拌器安装位置',
      description: '当前死区占比较高，建议调整搅拌器偏心距或增加挡板数量。',
      benefit: '死区减少 30-50%'
    })
  }
  
  if (avgQuality.value < 75) {
    recs.push({
      priority: 'high',
      title: '提高搅拌转速',
      description: '当前混合质量偏低，建议将转速提高 15-25% 以增强湍流强度。',
      benefit: '混合均匀度提升 15-25%'
    })
  }
  
  recs.push({
    priority: 'normal',
    title: '优化进料位置',
    description: '考虑采用多点进料方式，缩短初始混合时间。',
    benefit: '混合时间缩短 20-30%'
  })
  
  recs.push({
    priority: 'normal',
    title: '建立过程参数监控',
    description: '建议在关键位置安装浓度传感器，实现实时混合质量监测。',
    benefit: '产品一致性提升 40%'
  })
  
  return recs
})

const fluidPerformance = computed(() => {
  const performance = []
  
  for (const fluid of fluids.value) {
    const fluidSnaps = snapshots.value.filter(s => s.fluidId === fluid.id)
    if (fluidSnaps.length === 0) continue
    
    const avgQuality = fluidSnaps.reduce((acc, s) => acc + (s.mixingQuality || 0), 0) / fluidSnaps.length
    const avgDeadZone = fluidSnaps.reduce((acc, s) => acc + (s.deadZoneRatio || 0), 0) / fluidSnaps.length
    
    let recommendedSpeed = 120
    if (fluid.viscosity > 0.01) recommendedSpeed = 180
    else if (fluid.viscosity > 0.001) recommendedSpeed = 150
    else recommendedSpeed = 120
    
    performance.push({
      id: fluid.id,
      name: fluid.name,
      avgQuality,
      avgDeadZone,
      recommendedSpeed
    })
  }
  
  return performance.sort((a, b) => b.avgQuality - a.avgQuality)
})

function initCharts() {
  if (qualityChartRef.value) {
    const ctx = qualityChartRef.value.getContext('2d')
    
    if (qualityChart) {
      qualityChart.destroy()
    }
    
    const labels = filteredSnapshots.value.slice(0, 20).reverse().map((s, i) => `#${i + 1}`)
    const qualityData = filteredSnapshots.value.slice(0, 20).reverse().map(s => (s.mixingQuality || 0) * 100)
    
    qualityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '混合质量 (%)',
          data: qualityData,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          }
        }
      }
    })
  }
  
  if (deadZoneChartRef.value) {
    const ctx = deadZoneChartRef.value.getContext('2d')
    
    if (deadZoneChart) {
      deadZoneChart.destroy()
    }
    
    const labels = filteredSnapshots.value.slice(0, 20).reverse().map((s, i) => `#${i + 1}`)
    const deadZoneData = filteredSnapshots.value.slice(0, 20).reverse().map(s => (s.deadZoneRatio || 0) * 100)
    
    deadZoneChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '死区占比 (%)',
          data: deadZoneData,
          backgroundColor: deadZoneData.map(v => v > 10 ? 'rgba(255, 71, 87, 0.6)' : 'rgba(0, 255, 136, 0.6)'),
          borderColor: deadZoneData.map(v => v > 10 ? '#ff4757' : '#00ff88'),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          }
        }
      }
    })
  }
}

function exportReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      avgQuality: avgQuality.value,
      avgDeadZone: avgDeadZone.value,
      totalSimulations: totalSimulations.value,
      totalSnapshots: snapshots.value.length
    },
    fluidPerformance: fluidPerformance.value,
    insights: insights.value,
    recommendations: recommendations.value,
    snapshots: snapshots.value.map(s => ({
      id: s.id,
      fluidName: s.fluidName,
      mixingQuality: s.mixingQuality,
      deadZoneRatio: s.deadZoneRatio,
      timestamp: s.timestamp,
      parameters: s.parameters
    }))
  }
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mixing-analysis-report-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function generateSummary() {
  const summary = `
混合性能分析报告
================

生成时间: ${new Date().toLocaleString('zh-CN')}

📊 概览
------
• 平均混合质量: ${avgQuality.value.toFixed(1)}%
• 平均死区占比: ${(avgDeadZone.value * 100).toFixed(2)}%
• 总仿真次数: ${totalSimulations.value}
• 快照数据量: ${snapshots.value.length}

💡 关键洞察
${insights.value.map(i => `• [${i.type.toUpperCase()}] ${i.title}: ${i.description}`).join('\n')}

🎯 优化建议
${recommendations.value.map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.title}
   ${r.description}
   预期收益: ${r.benefit}`).join('\n\n')}
  `.trim()
  
  const blob = new Blob([summary], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mixing-summary-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

watch(chartFluidFilter, () => {
  nextTick(() => initCharts())
})

watch(() => store.snapshots.length, () => {
  nextTick(() => initCharts())
})

onMounted(async () => {
  await store.loadFluids()
  await store.loadSnapshots()
  await store.loadSimulations()
  nextTick(() => initCharts())
})
</script>

<style scoped>
.analysis-view {
  width: 100%;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: var(--text-primary);
}

.view-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.analysis-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.summary-icon {
  font-size: 36px;
}

.summary-content {
  flex: 1;
}

.summary-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
  margin-bottom: 4px;
}

.summary-trend {
  font-size: 12px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  align-items: start;
  margin-bottom: 24px;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.chart-container {
  width: 100%;
  min-height: 300px;
}

.form-input-sm {
  padding: 6px 10px;
  font-size: 12px;
  width: 150px;
}

.insights-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.insights-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.insights-list, .recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  border-left: 3px solid;
}

.insight-item.success {
  background: rgba(0, 255, 136, 0.05);
  border-color: var(--success);
}

.insight-item.warning {
  background: rgba(255, 217, 61, 0.05);
  border-color: var(--warning);
}

.insight-item.danger {
  background: rgba(255, 71, 87, 0.05);
  border-color: var(--danger);
}

.insight-item.info {
  background: rgba(0, 212, 255, 0.05);
  border-color: var(--primary);
}

.insight-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.insight-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.insight-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.recommendation-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--bg-glass);
  border-radius: 8px;
}

.rec-priority {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.rec-priority.high {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.rec-priority.normal {
  background: rgba(0, 212, 255, 0.2);
  color: var(--primary);
}

.rec-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.rec-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 6px;
}

.rec-benefit {
  font-size: 11px;
  color: var(--success);
  font-weight: 500;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
}

.comparison-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  background: rgba(0, 212, 255, 0.05);
}

.comparison-table td {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.fluid-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0, 212, 255, 0.15);
  color: var(--primary);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.monospace {
  font-family: 'Courier New', monospace;
}

.empty-insights {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.export-section p {
  margin: 8px 0 16px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.export-buttons {
  display: flex;
  gap: 12px;
}

@media (max-width: 1200px) {
  .analysis-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .analysis-layout {
    grid-template-columns: 1fr;
  }
}
</style>
