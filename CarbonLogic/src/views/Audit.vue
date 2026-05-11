<script setup lang="ts">
import { ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const auditLogs = ref([
  { id: 1, timestamp: '2024-01-15 14:30:25', action: '排放数据录入', user: '张三', department: '生产部', status: 'approved', details: '生产线A 12月排放数据录入' },
  { id: 2, timestamp: '2024-01-15 11:20:10', action: 'LCA分析', user: '李四', department: '技术部', status: 'completed', details: '产品X生命周期评估完成' },
  { id: 3, timestamp: '2024-01-14 16:45:33', action: '供应链数据同步', user: '王五', department: '供应链部', status: 'synced', details: 'Tier 1供应商数据增量同步' },
  { id: 4, timestamp: '2024-01-14 09:15:00', action: '减排模拟方案', user: '赵六', department: '战略部', status: 'saved', details: '2024Q1减排方案 #3 已保存' },
  { id: 5, timestamp: '2024-01-13 15:30:00', action: '数据验证', user: '审核员A', department: '审计部', status: 'verified', details: 'Scope 2排放数据验证通过' },
  { id: 6, timestamp: '2024-01-12 10:00:00', action: '目标更新', user: '管理员', department: '管理层', status: 'updated', details: '2024年度减排目标更新' }
])

const dataQualityOption = ref({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '数据质量分布',
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: 65, name: '已验证', itemStyle: { color: '#67c23a' } },
        { value: 25, name: '待验证', itemStyle: { color: '#e6a23c' } },
        { value: 8, name: '有异议', itemStyle: { color: '#f56c6c' } },
        { value: 2, name: '已驳回', itemStyle: { color: '#909399' } }
      ],
      label: { formatter: '{b}: {d}%' }
    }
  ]
})

const auditStatistic = [
  { label: '总记录数', value: '12,456', color: '#409eff' },
  { label: '已验证', value: '8,096', color: '#67c23a' },
  { label: '待审核', value: '456', color: '#e6a23c' },
  { label: '数据完整率', value: '98.5%', color: '#909399' }
]

function getStatusTagType(status: string) {
  const map: Record<string, string> = {
    approved: 'success',
    completed: 'success',
    synced: 'success',
    saved: 'info',
    verified: 'success',
    updated: 'warning'
  }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    approved: '已批准',
    completed: '已完成',
    synced: '已同步',
    saved: '已保存',
    verified: '已验证',
    updated: '已更新'
  }
  return map[status] || status
}
</script>

<template>
  <div class="audit-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>跨部门审计透明度</span>
              <el-tag type="warning">IndexedDB 本地审计</el-tag>
            </div>
          </template>

          <el-alert
            title="审计追踪机制"
            type="success"
            description="所有排放数据、LCA分析、供应链同步操作都自动记录审计日志，存储于 IndexedDB 本地数据库，支持离线审计和后续数据溯源。"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-row :gutter="20">
            <el-col :span="6" v-for="stat in auditStatistic" :key="stat.label">
              <div class="stat-card">
                <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
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
            <span>数据质量分布</span>
          </template>
          <v-chart :option="dataQualityOption" :autoresize="true" style="height: 300px" />
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>审计日志</span>
              <el-button link type="primary">导出全部</el-button>
            </div>
          </template>

          <el-table :data="auditLogs" style="width: 100%">
            <el-table-column prop="timestamp" label="时间" width="160" />
            <el-table-column prop="action" label="操作" width="150" />
            <el-table-column prop="user" label="用户" width="100" />
            <el-table-column prop="department" label="部门" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="details" label="详情" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>跨部门数据对齐状态</span>
          </template>

          <el-table :data="[]" style="width: 100%">
            <el-table-column label="部门" width="150">
              <template #default>
                <el-tag type="info">生产部</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Scope 1 数据对齐" width="150" align="center">
              <el-tag type="success">已对齐</el-tag>
            </el-table-column>
            <el-table-column label="Scope 2 数据对齐" width="150" align="center">
              <el-tag type="success">已对齐</el-tag>
            </el-table-column>
            <el-table-column label="供应链数据对齐" width="150" align="center">
              <el-tag type="warning">部分对齐</el-tag>
            </el-table-column>
            <el-table-column label="最后同步时间">
              2024-01-15 08:00:00
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <el-tag type="success">正常</el-tag>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.audit-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .stat-card {
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
    border-radius: 8px;

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #606266;
    }
  }
}
</style>
