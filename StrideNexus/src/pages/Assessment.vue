<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import { riskAssessor } from '@/ai/riskAssessor'

const radarChartRef = ref<HTMLDivElement | null>(null)
let radarChartInstance: echarts.ECharts | null = null

const riskScore = ref(35)
const riskLevel = computed(() => riskAssessor.getRiskLevel(riskScore.value))
const riskLevelText = computed(() => riskAssessor.getRiskLevelText(riskLevel.value))
const riskLevelColor = computed(() => riskAssessor.getRiskLevelColor(riskLevel.value))

const recoveryPlan = computed(() => riskAssessor.generateRecoveryPlan(riskLevel.value))

const riskFactors = ref([
  { name: '步频波动', value: 25, max: 100 },
  { name: '压力分布', value: 40, max: 100 },
  { name: '姿态稳定', value: 20, max: 100 },
  { name: '触地时间', value: 35, max: 100 },
  { name: '内旋异常', value: 15, max: 100 }
])

const recommendations = ref([
  { type: 'exercise', title: '加强核心训练', desc: '每周进行2-3次平板支撑和侧桥练习' },
  { type: 'stretch', title: '跑步后拉伸', desc: '重点拉伸腘绳肌和小腿肌肉群，每次30秒' },
  { type: 'rest', title: '适当休息', desc: '建议每周安排1-2个休息日或进行低强度活动' },
  { type: 'equipment', title: '检查跑鞋', desc: '确保跑鞋有足够的缓震和支撑性能' }
])

const injuryRisks = ref([
  { name: '膝盖损伤', risk: 'low', probability: 15 },
  { name: '跟腱炎', risk: 'moderate', probability: 35 },
  { name: '胫骨应力综合征', risk: 'low', probability: 20 },
  { name: '足底筋膜炎', risk: 'moderate', probability: 40 },
  { name: '髂胫束综合征', risk: 'low', probability: 18 }
])

function initRadarChart() {
  if (!radarChartRef.value) return
  
  radarChartInstance = echarts.init(radarChartRef.value)
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(22, 27, 34, 0.95)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    radar: {
      indicator: riskFactors.value.map(f => ({ name: f.name, max: f.max })),
      axisName: { color: 'var(--text-secondary)', fontSize: 11 },
      splitArea: {
        areaStyle: { color: ['rgba(22, 93, 255, 0.05)', 'rgba(22, 93, 255, 0.1)'] }
      },
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      splitLine: { lineStyle: { color: 'var(--border-color)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: riskFactors.value.map(f => f.value),
        name: '风险因素',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 93, 255, 0.5)' },
            { offset: 1, color: 'rgba(22, 93, 255, 0.1)' }
          ])
        },
        lineStyle: { color: '#165DFF', width: 2 },
        itemStyle: { color: '#165DFF' }
      }]
    }]
  }

  radarChartInstance.setOption(option)
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
    low: '低',
    moderate: '中',
    high: '高',
    critical: '严重'
  }
  return map[risk] || '未知'
}

onMounted(() => {
  initRadarChart()
  window.addEventListener('resize', () => radarChartInstance?.resize())
})
</script>

<template>
  <div class="assessment-page">
    <div class="assessment-header">
      <div class="risk-overview card">
        <div class="risk-score-display">
          <div class="score-circle" :style="{ '--risk-color': riskLevelColor }">
            <svg viewBox="0 0 120 120">
              <circle class="score-bg" cx="60" cy="60" r="50" />
              <circle 
                class="score-progress" 
                cx="60" 
                cy="60" 
                r="50"
                :stroke="riskLevelColor"
                :stroke-dasharray="`${riskScore * 3.14} 314`"
              />
            </svg>
            <div class="score-content">
              <span class="score-value font-display">{{ riskScore }}</span>
              <span class="score-label">风险指数</span>
            </div>
          </div>
          <div class="risk-info">
            <div class="risk-level-badge" :style="{ backgroundColor: riskLevelColor + '20', color: riskLevelColor }">
              {{ riskLevelText }}
            </div>
            <p class="risk-desc">
              您当前的运动损伤风险处于{{ riskLevelText }}水平，建议{{ riskLevel === 'safe' ? '继续保持' : '注意调整训练方案' }}。
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="assessment-grid">
      <div class="card radar-card">
        <div class="card-header">
          <h3><el-icon><DataAnalysis /></el-icon> 风险因素分析</h3>
        </div>
        <div ref="radarChartRef" class="radar-chart"></div>
      </div>

      <div class="card injuries-card">
        <div class="card-header">
          <h3><el-icon><Warning /></el-icon> 损伤风险预测</h3>
        </div>
        <div class="injuries-list">
          <div class="injury-item" v-for="injury in injuryRisks" :key="injury.name">
            <div class="injury-name">{{ injury.name }}</div>
            <div class="injury-bar">
              <div 
                class="injury-fill" 
                :style="{ 
                  width: `${injury.probability}%`,
                  backgroundColor: injury.risk === 'low' ? '#00B42A' : '#FF7D00'
                }"
              ></div>
            </div>
            <span class="risk-badge" :class="getRiskBadgeClass(injury.risk)">
              {{ getRiskText(injury.risk) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="card recovery-card">
      <div class="card-header">
        <h3><el-icon><FirstAidKit /></el-icon> 康复建议方案</h3>
      </div>
      <div class="recovery-content">
        <div class="recovery-summary">
          <div class="recovery-item">
            <span class="recovery-icon">😴</span>
            <div>
              <span class="recovery-value font-display">{{ recoveryPlan.restDays }}</span>
              <span class="recovery-label">建议休息日</span>
            </div>
          </div>
        </div>
        <div class="recovery-details">
          <div class="recovery-section">
            <h4>推荐活动</h4>
            <div class="tag-list">
              <el-tag v-for="activity in recoveryPlan.recommendedActivities" :key="activity" type="success">
                {{ activity }}
              </el-tag>
            </div>
          </div>
          <div class="recovery-section">
            <h4>注意事项</h4>
            <ul class="precautions-list">
              <li v-for="(item, index) in recoveryPlan.precautions" :key="index">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="card recommendations-card">
      <div class="card-header">
        <h3><el-icon><Tips /></el-icon> 个性化建议</h3>
      </div>
      <div class="recommendations-grid">
        <div class="recommendation-item" v-for="rec in recommendations" :key="rec.title">
          <div class="rec-icon" :class="rec.type">
            <el-icon v-if="rec.type === 'exercise'"><Dumbbell /></el-icon>
            <el-icon v-else-if="rec.type === 'stretch'"><Aim /></el-icon>
            <el-icon v-else-if="rec.type === 'rest'"><Moon /></el-icon>
            <el-icon v-else><Shoes /></el-icon>
          </div>
          <div class="rec-content">
            <h4>{{ rec.title }}</h4>
            <p>{{ rec.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.assessment-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assessment-header {
  .risk-overview {
    padding: 24px;
  }
}

.risk-score-display {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.score-circle {
  position: relative;
  width: 160px;
  height: 160px;
  
  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  
  .score-bg {
    fill: none;
    stroke: var(--bg-tertiary);
    stroke-width: 10;
  }
  
  .score-progress {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
    transition: stroke-dasharray 0.5s ease;
  }
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  display: block;
  font-size: 42px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.score-label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.risk-info {
  flex: 1;
  min-width: 250px;
}

.risk-level-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.risk-desc {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.assessment-grid {
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
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.radar-chart {
  height: 320px;
}

.injuries-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.injury-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.injury-name {
  width: 100px;
  font-size: 13px;
  color: var(--text-secondary);
}

.injury-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.injury-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.risk-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
  min-width: 32px;
  text-align: center;
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

.recovery-card, .recommendations-card {
  padding: 0 0 20px 0;
}

.recovery-content {
  padding: 20px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
}

.recovery-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
}

.recovery-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.recovery-icon {
  font-size: 48px;
}

.recovery-value {
  display: block;
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
}

.recovery-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.recovery-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recovery-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.precautions-list {
  margin: 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 13px;
  
  li {
    margin-bottom: 6px;
  }
}

.recommendations-grid {
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.recommendation-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
  }
}

.rec-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 18px;
  flex-shrink: 0;
  
  &.exercise { background: rgba(22, 93, 255, 0.15); color: #165DFF; }
  &.stretch { background: rgba(114, 46, 209, 0.15); color: #722ED1; }
  &.rest { background: rgba(0, 180, 42, 0.15); color: #00B42A; }
  &.equipment { background: rgba(255, 125, 0, 0.15); color: #FF7D00; }
}

.rec-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.rec-content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
