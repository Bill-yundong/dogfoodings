<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SupplyChainRepository } from '@/database/repository'
import type { SupplyChainNode } from '@/types/carbon'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart, SankeyChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, GraphChart, SankeyChart, TooltipComponent, LegendComponent])

const nodes = ref<SupplyChainNode[]>([])
const isLoading = ref(false)

const sankeyOption = ref({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      data: [
        { name: '原材料供应商A' },
        { name: '原材料供应商B' },
        { name: '零部件供应商C' },
        { name: '生产工厂' },
        { name: '分销商' },
        { name: '零售商' }
      ],
      links: [
        { source: '原材料供应商A', target: '生产工厂', value: 120 },
        { source: '原材料供应商B', target: '生产工厂', value: 80 },
        { source: '零部件供应商C', target: '生产工厂', value: 60 },
        { source: '生产工厂', target: '分销商', value: 260 },
        { source: '分销商', target: '零售商', value: 260 }
      ],
      lineStyle: { color: 'gradient', curveness: 0.5 }
    }
  ]
})

async function loadSupplyChainData() {
  isLoading.value = true
  try {
    nodes.value = await SupplyChainRepository.getAll()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadSupplyChainData()
})
</script>

<template>
  <div class="supply-chain-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>供应链碳足迹追踪</span>
              <el-tag type="success">增量同步中</el-tag>
            </div>
          </template>

          <el-alert
            title="IndexedDB 增量同步"
            type="info"
            description="供应链数据采用 IndexedDB 本地存储，支持离线操作和增量同步，确保跨部门审计的透明度。"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-steps :active="3" finish-status="success" align-center style="margin-bottom: 30px">
            <el-step title="Tier 1 供应商" description="直接供应商" />
            <el-step title="Tier 2 供应商" description="二级供应商" />
            <el-step title="Tier 3 供应商" description="三级供应商" />
            <el-step title="生产制造" description="自有工厂" />
          </el-steps>

          <el-row :gutter="20">
            <el-col :span="16">
              <div class="chart-container">
                <h4>供应链碳流图</h4>
                <v-chart :option="sankeyOption" :autoresize="true" style="height: 400px" />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stats-panel">
                <h4>供应链统计</h4>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="供应商总数">
                    <span class="stat-number">24</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="已同步节点">
                    <span class="stat-number stat-success">24</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="待同步节点">
                    <span class="stat-number stat-warning">0</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="平均排放强度">
                    <span class="stat-number">2.4 t CO₂e/unit</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="数据覆盖率">
                    <el-progress :percentage="95" :stroke-width="12" />
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>供应链节点列表</span>
          </template>

          <el-table :data="[]" style="width: 100%">
            <el-table-column prop="name" label="节点名称" />
            <el-table-column prop="type" label="类型">
              <template #default="{ row }">
                <el-tag :type="row.type === 'supplier' ? 'warning' : row.type === 'manufacturer' ? 'danger' : 'info'">
                  {{ row.type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="tier" label="层级" width="100">
              <template #default="{ row }">Tier {{ row.tier }}</template>
            </el-table-column>
            <el-table-column prop="location" label="位置" width="150" />
            <el-table-column prop="emissionIntensity" label="排放强度" width="180">
              <template #default="{ row }">
                {{ row.emissionIntensity }} t CO₂e/unit
              </template>
            </el-table-column>
            <el-table-column prop="syncStatus" label="同步状态" width="120">
              <template #default>
                <el-tag type="success">已同步</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <el-empty description="暂无供应链节点数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.supply-chain-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .chart-container {
    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }
  }

  .stats-panel {
    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }

    .stat-number {
      font-size: 20px;
      font-weight: 700;
      color: #303133;

      &.stat-success {
        color: #67c23a;
      }

      &.stat-warning {
        color: #e6a23c;
      }
    }
  }
}
</style>
