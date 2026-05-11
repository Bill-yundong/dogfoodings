<script setup lang="ts">
import { useCarbonStore } from '@/stores/carbon'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
])

const carbonStore = useCarbonStore()
const {
  totalEmissions,
  emissionsByScope,
  emissionsByType,
  emissionsByDepartment,
  emissionsTrend,
  forecast,
  scope1Percentage,
  scope2Percentage,
  scope3Percentage,
  isLoading
} = storeToRefs(carbonStore)

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['实际排放', '预测排放'], top: 0 },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [
      ...emissionsTrend.value.map(t => t.date),
      ...forecast.value.map(f => f.date)
    ]
  },
  yAxis: { type: 'value', name: 't CO₂e' },
  series: [
    {
      name: '实际排放',
      type: 'line',
      smooth: true,
      data: [...emissionsTrend.value.map(t => t.emissions), ...Array(forecast.value.length).fill(null)],
      areaStyle: { color: 'rgba(64, 158, 255, 0.3)' },
      lineStyle: { color: '#409eff' }
    },
    {
      name: '预测排放',
      type: 'line',
      smooth: true,
      data: [...Array(emissionsTrend.value.length).fill(null), ...forecast.value.map(f => f.projectedEmissions)],
      lineStyle: { color: '#67c23a', type: 'dashed' }
    }
  ]
}))

const scopeChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '排放分布',
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: emissionsByScope.value[1], name: 'Scope 1 直接排放', itemStyle: { color: '#409eff' } },
        { value: emissionsByScope.value[2], name: 'Scope 2 间接排放', itemStyle: { color: '#67c23a' } },
        { value: emissionsByScope.value[3], name: 'Scope 3 价值链排放', itemStyle: { color: '#e6a23c' } }
      ],
      label: { formatter: '{b}: {d}%' }
    }
  ]
}))

const departmentChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: Object.keys(emissionsByDepartment.value) },
  yAxis: { type: 'value', name: 't CO₂e' },
  series: [
    {
      type: 'bar',
      data: Object.values(emissionsByDepartment.value),
      itemStyle: {
        color: params => ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'][params.dataIndex % 5]
      }
    }
  ]
}))

const formattedTotal = computed(() =>
  totalEmissions.value > 1000
    ? `${(totalEmissions.value / 1000).toFixed(2)}K`
    : totalEmissions.value.toFixed(2)
)
</script>

<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card total-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#409eff"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formattedTotal }}</div>
              <div class="stat-label">总排放量 (t CO₂e)</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card scope1-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#409eff"><Factory /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ scope1Percentage.toFixed(1) }}%</div>
              <div class="stat-label">Scope 1 直接排放</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card scope2-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#67c23a"><Lightning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ scope2Percentage.toFixed(1) }}%</div>
              <div class="stat-label">Scope 2 间接排放</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card scope3-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#e6a23c"><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ scope3Percentage.toFixed(1) }}%</div>
              <div class="stat-label">Scope 3 价值链排放</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>排放趋势与预测</span>
              <el-tag type="info">趋势分析</el-tag>
            </div>
          </template>
          <v-chart :option="trendChartOption" :autoresize="true" style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>Scope 排放分布</span>
            </div>
          </template>
          <v-chart :option="scopeChartOption" :autoresize="true" style="height: 350px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="24">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>部门排放分布</span>
            </div>
          </template>
          <v-chart :option="departmentChartOption" :autoresize="true" style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  .stats-row {
    margin-bottom: 20px;
  }

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      padding: 12px;
      border-radius: 12px;
      background: rgba(64, 158, 255, 0.1);
    }

    .stat-info {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }

  .charts-row {
    margin-bottom: 20px;
  }

  .chart-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
  }
}
</style>
