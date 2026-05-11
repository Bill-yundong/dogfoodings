<script setup lang="ts">
import { ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, GaugeChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, GaugeChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const currentYear = ref(2024)
const baseYear = 2020
const baseEmissions = 12500

const targetProgress = ref(68)
const targetReduction = ref(42)

const emissionTrendOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { data: ['实际排放', '目标路径'], top: 0 },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'] },
  yAxis: { type: 'value', name: 't CO₂e' },
  series: [
    {
      name: '实际排放',
      type: 'line',
      smooth: true,
      data: [12500, 12100, 11600, 10800, 9800, null, null, null, null, null, null],
      lineStyle: { color: '#409eff', width: 3 },
      itemStyle: { color: '#409eff' }
    },
    {
      name: '目标路径',
      type: 'line',
      smooth: true,
      lineStyle: { color: '#67c23a', type: 'dashed', width: 2 },
      data: [12500, 12000, 11500, 11000, 10500, 10000, 9500, 8900, 8300, 7700, 7250]
    }
  ]
})

const scopeBreakdown = [
  { name: 'Scope 1', reduction: 35, target: 40, current: 2400, baseline: 3700 },
  { name: 'Scope 2', reduction: 52, target: 55, current: 1800, baseline: 3750 },
  { name: 'Scope 3', reduction: 28, target: 35, current: 3600, baseline: 5000 }
]

const initiatives = [
  { name: '太阳能光伏安装', scope: 2, expectedReduction: 15, status: 'in-progress', investment: 500000 },
  { name: '生产设备能效升级', scope: 1, expectedReduction: 20, status: 'completed', investment: 800000 },
  { name: '供应商碳减排项目', scope: 3, expectedReduction: 12, status: 'planned', investment: 300000 },
  { name: '物流电动化转型', scope: 3, expectedReduction: 18, status: 'in-progress', investment: 1200000 }
]
</script>

<template>
  <div class="targets-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>碳中和目标管理</span>
              <el-tag type="success">科学碳目标 (SBTi)</el-tag>
            </div>
          </template>

          <el-alert
            title="目标对齐逻辑"
            type="info"
            description="基于生产、供应链、减排目标三者的全链路逻辑对齐，确保每个环节的贡献都能准确反映到整体目标进度。"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-row :gutter="20">
            <el-col :span="6">
              <div class="target-overview">
                <h4>总体目标</h4>
                <div class="big-number">
                  -{{ targetReduction }}%
                  <div class="subtitle">2030年减排目标</div>
                </div>
                <div class="baseline-info">
                  基准年: {{ baseYear }} | 基准排放: {{ baseEmissions.toLocaleString() }} t CO₂e
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="progress-card">
                <h4>目标进度</h4>
                <el-progress
                  type="circle"
                  :percentage="targetProgress"
                  :width="120"
                  color="#67c23a"
                />
                <div class="progress-info">
                  当前排放: 7,800 t CO₂e
                  <br />
                  目标排放: 7,250 t CO₂e
                </div>
              </div>
            </el-col>

            <el-col :span="12">
              <div class="chart-container">
                <h4>减排趋势与目标路径</h4>
                <v-chart :option="emissionTrendOption" :autoresize="true" style="height: 280px" />
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>各Scope减排进度</span>
          </template>

          <div v-for="scope in scopeBreakdown" :key="scope.name" class="scope-item">
            <div class="scope-header">
              <span class="scope-name">{{ scope.name }}</span>
              <el-tag type="success">-{{ scope.reduction }}%</el-tag>
            </div>
            <el-progress
              :percentage="(scope.reduction / scope.target) * 100"
              :stroke-width="10"
              style="margin: 8px 0"
            />
            <div class="scope-details">
              目标: -{{ scope.target }}% | 当前: {{ scope.current.toLocaleString() }} t | 基准: {{ scope.baseline.toLocaleString() }} t
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <span>减排举措追踪</span>
          </template>

          <el-table :data="initiatives" style="width: 100%">
            <el-table-column prop="name" label="举措名称" />
            <el-table-column prop="scope" label="Scope" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ row.scope }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="expectedReduction" label="预期减排" width="120" align="center">
              <template #default="{ row }">-{{ row.expectedReduction }}%</template>
            </el-table-column>
            <el-table-column prop="investment" label="投资额" width="120" align="center">
              <template #default="{ row }">¥{{ (row.investment / 10000).toFixed(0) }}万</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'completed' ? 'success' : row.status === 'in-progress' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ row.status === 'completed' ? '已完成' : row.status === 'in-progress' ? '进行中' : '计划中' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.targets-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .target-overview {
    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }

    .big-number {
      font-size: 48px;
      font-weight: 700;
      color: #67c23a;
      line-height: 1.2;
      margin-bottom: 8px;

      .subtitle {
        font-size: 14px;
        font-weight: 400;
        color: #909399;
      }
    }

    .baseline-info {
      color: #606266;
      font-size: 13px;
      background: #f5f7fa;
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
    }
  }

  .progress-card {
    text-align: center;

    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }

    .progress-info {
      margin-top: 12px;
      font-size: 13px;
      color: #606266;
      line-height: 1.6;
    }
  }

  .chart-container {
    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }
  }

  .scope-item {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .scope-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .scope-name {
        font-weight: 600;
        font-size: 15px;
      }
    }

    .scope-details {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}
</style>
