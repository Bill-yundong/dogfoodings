<script setup lang="ts">
import { ref } from 'vue'
import { useCarbonStore } from '@/stores/carbon'
import { storeToRefs } from 'pinia'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const carbonStore = useCarbonStore()
const { lcaCalculations, currentLcaJob, lcaProgress, lcaCurrentStage } = storeToRefs(carbonStore)

const formVisible = ref(false)
const formData = ref({
  productId: '',
  productName: '',
  productionVolume: 1000,
  materialWeight: 50,
  transportDistance: 500,
  lifespan: 10,
  recyclability: 0.3
})

const breakdownChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { data: ['原材料', '生产制造', '运输配送', '使用阶段', '生命周期末期'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['原材料', '生产制造', '运输配送', '使用阶段', '生命周期末期'] },
  yAxis: { type: 'value', name: 't CO₂e' },
  series: [
    {
      type: 'bar',
      data: [120, 200, 150, 80, 40],
      itemStyle: {
        color: params => ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'][params.dataIndex]
      }
    }
  ]
})

async function submitLCA() {
  try {
    await carbonStore.startLCACalculation(
      formData.value.productId,
      formData.value.productName,
      {
        productionVolume: formData.value.productionVolume,
        materialWeight: formData.value.materialWeight,
        transportDistance: formData.value.transportDistance,
        lifespan: formData.value.lifespan,
        recyclability: formData.value.recyclability
      }
    )
    formVisible.value = false
    formData.value = {
      productId: '',
      productName: '',
      productionVolume: 1000,
      materialWeight: 50,
      transportDistance: 500,
      lifespan: 10,
      recyclability: 0.3
    }
  } catch (err) {
    console.error('LCA calculation failed:', err)
  }
}
</script>

<template>
  <div class="lca-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>全生命周期分析 (LCA)</span>
              <el-button type="primary" @click="formVisible = true">
                <el-icon><Cycle /></el-icon>
                新建LCA分析
              </el-button>
            </div>
          </template>

          <el-alert
            title="异步计算引擎"
            type="success"
            description="LCA分析采用异步计算引擎，支持多任务并行处理，自动保存计算进度和结果到 IndexedDB。"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <div v-if="currentLcaJob" class="calculation-progress">
            <h4>正在计算中...</h4>
            <el-progress :percentage="lcaProgress" :status="lcaProgress === 100 ? 'success' : undefined" />
            <div class="current-stage">
              <el-icon><Loading /></el-icon>
              <span>{{ lcaCurrentStage }}</span>
            </div>
          </div>

          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="16">
              <div class="chart-container">
                <h4>生命周期排放分布</h4>
                <v-chart :option="breakdownChartOption" :autoresize="true" style="height: 350px" />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stats-panel">
                <h4>分析统计</h4>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="已完成分析">
                    <span class="stat-number">{{ lcaCalculations.length }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="平均计算时间">
                    <span class="stat-number">2.4s</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="平均总排放">
                    <span class="stat-number">590 t CO₂e</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="数据完整性">
                    <el-progress :percentage="88" :stroke-width="12" />
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
            <span>LCA分析历史</span>
          </template>

          <el-table :data="lcaCalculations" style="width: 100%">
            <el-table-column prop="timestamp" label="时间" width="180" />
            <el-table-column prop="productName" label="产品名称" />
            <el-table-column prop="totalEmissions" label="总排放量 (t CO₂e)" width="180">
              <template #default="{ row }">
                <span class="emission-value">{{ row.totalEmissions?.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'calculating' ? 'warning' : 'danger'">
                  {{ row.status === 'completed' ? '已完成' : row.status === 'calculating' ? '计算中' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <el-button link type="primary">查看详情</el-button>
            </el-table-column>
          </el-table>

          <el-empty v-if="lcaCalculations.length === 0" description="暂无LCA分析记录，请创建新的分析" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="formVisible" title="新建LCA分析" width="700px">
      <el-form :model="formData" label-width="140px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品ID">
              <el-input v-model="formData.productId" placeholder="例如: PROD-001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称">
              <el-input v-model="formData.productName" placeholder="例如: 电动汽车电池" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生产数量">
              <el-input-number v-model="formData.productionVolume" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料重量 (kg)">
              <el-input-number v-model="formData.materialWeight" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="运输距离 (km)">
              <el-input-number v-model="formData.transportDistance" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用年限 (年)">
              <el-input-number v-model="formData.lifespan" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="可回收比例">
          <el-slider v-model="formData.recyclability" :min="0" :max="1" :step="0.01" />
          <div style="text-align: right; color: #909399">{{ (formData.recyclability * 100).toFixed(0) }}%</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitLCA">开始计算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.lca-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .calculation-progress {
    background: linear-gradient(135deg, #ecf5ff 0%, #e6f7ff 100%);
    padding: 24px;
    border-radius: 8px;
    border: 1px solid #b3d8ff;

    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }

    .current-stage {
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #409eff;
    }
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
    }
  }

  .emission-value {
    font-weight: 600;
    color: #409eff;
  }
}
</style>
