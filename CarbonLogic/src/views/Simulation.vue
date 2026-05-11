<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCarbonStore } from '@/stores/carbon'
import { storeToRefs } from 'pinia'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const carbonStore = useCarbonStore()
const { simulationResults } = storeToRefs(carbonStore)

const baseEmissions = ref(1000)
const energyEfficiency = ref(15)
const renewableRatio = ref(30)
const supplyChainOptimization = ref(10)
const productionOptimization = ref(20)

const simulatedResult = computed(() => {
  let simulated = baseEmissions.value

  if (energyEfficiency.value) {
    simulated *= (1 - energyEfficiency.value / 100)
  }
  if (renewableRatio.value) {
    simulated *= (1 - renewableRatio.value / 200)
  }
  if (supplyChainOptimization.value) {
    simulated *= (1 - supplyChainOptimization.value / 150)
  }
  if (productionOptimization.value) {
    simulated *= (1 - productionOptimization.value / 120)
  }

  return {
    base: baseEmissions.value,
    simulated,
    reduction: ((baseEmissions.value - simulated) / baseEmissions.value) * 100
  }
})

const comparisonChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['基准排放', '模拟排放'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['排放对比'] },
  yAxis: { type: 'value', name: 't CO₂e' },
  series: [
    {
      name: '基准排放',
      type: 'bar',
      data: [simulatedResult.value.base],
      itemStyle: { color: '#909399' },
      barWidth: 80
    },
    {
      name: '模拟排放',
      type: 'bar',
      data: [simulatedResult.value.simulated],
      itemStyle: { color: '#67c23a' },
      barWidth: 80
    }
  ]
}))

async function saveSimulation() {
  await carbonStore.runSimulation(
    baseEmissions.value,
    {
      energyEfficiency: energyEfficiency.value,
      renewableRatio: renewableRatio.value,
      supplyChainOptimization: supplyChainOptimization.value,
      productionOptimization: productionOptimization.value
    },
    `模拟方案 ${simulationResults.value.length + 1}`
  )
}
</script>

<template>
  <div class="simulation-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>减排方案动态模拟</span>
              <el-button type="success" @click="saveSimulation">
                <el-icon><DocumentChecked /></el-icon>
                保存方案
              </el-button>
            </div>
          </template>

          <el-alert
            title="差分模拟引擎"
            type="info"
            description="通过调整关键参数，实时计算减排效果，帮助制定最优减排策略。所有模拟方案自动保存到 IndexedDB。"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-row :gutter="20">
            <el-col :span="8">
              <div class="params-panel">
                <h4>参数调整</h4>

                <div class="param-item">
                  <div class="param-header">
                    <span class="param-label">基准排放量 (t CO₂e)</span>
                    <span class="param-value">{{ baseEmissions }}</span>
                  </div>
                  <el-slider v-model="baseEmissions" :min="100" :max="5000" :step="50" />
                </div>

                <div class="param-item">
                  <div class="param-header">
                    <span class="param-label">能效提升</span>
                    <span class="param-value">{{ energyEfficiency }}%</span>
                  </div>
                  <el-slider v-model="energyEfficiency" :min="0" :max="50" />
                </div>

                <div class="param-item">
                  <div class="param-header">
                    <span class="param-label">可再生能源比例</span>
                    <span class="param-value">{{ renewableRatio }}%</span>
                  </div>
                  <el-slider v-model="renewableRatio" :min="0" :max="100" />
                </div>

                <div class="param-item">
                  <div class="param-header">
                    <span class="param-label">供应链优化</span>
                    <span class="param-value">{{ supplyChainOptimization }}%</span>
                  </div>
                  <el-slider v-model="supplyChainOptimization" :min="0" :max="50" />
                </div>

                <div class="param-item">
                  <div class="param-header">
                    <span class="param-label">生产工艺优化</span>
                    <span class="param-value">{{ productionOptimization }}%</span>
                  </div>
                  <el-slider v-model="productionOptimization" :min="0" :max="50" />
                </div>
              </div>
            </el-col>

            <el-col :span="8">
              <div class="chart-container">
                <h4>排放对比</h4>
                <v-chart :option="comparisonChartOption" :autoresize="true" style="height: 320px" />
              </div>
            </el-col>

            <el-col :span="8">
              <div class="results-panel">
                <h4>模拟结果</h4>

                <div class="result-card">
                  <div class="result-label">基准排放</div>
                  <div class="result-value">{{ simulatedResult.base.toFixed(0) }} t CO₂e</div>
                </div>

                <div class="result-card result-success">
                  <div class="result-label">模拟排放</div>
                  <div class="result-value">{{ simulatedResult.simulated.toFixed(0) }} t CO₂e</div>
                </div>

                <div class="result-card result-highlight">
                  <div class="result-label">减排量</div>
                  <div class="result-value">
                    {{ (simulatedResult.base - simulatedResult.simulated).toFixed(0) }} t CO₂e
                    <el-tag type="success" size="large" style="margin-left: 8px">
                      -{{ simulatedResult.reduction.toFixed(1) }}%
                    </el-tag>
                  </div>
                </div>
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
            <div class="card-header">
              <span>已保存的模拟方案</span>
              <el-button link type="danger" @click="carbonStore.clearSimulationResults()">清空</el-button>
            </div>
          </template>

          <el-table :data="simulationResults" style="width: 100%">
            <el-table-column prop="name" label="方案名称" />
            <el-table-column prop="baseEmissions" label="基准排放" width="150">
              <template #default="{ row }">{{ row.baseEmissions.toFixed(0) }} t</template>
            </el-table-column>
            <el-table-column prop="simulatedEmissions" label="模拟排放" width="150">
              <template #default="{ row }">{{ row.simulatedEmissions.toFixed(0) }} t</template>
            </el-table-column>
            <el-table-column prop="reductionPercentage" label="减排率" width="120">
              <template #default="{ row }">
                <el-tag type="success">-{{ row.reductionPercentage.toFixed(1) }}%</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="参数详情">
              <template #default="{ row }">
                <el-tag size="small" style="margin-right: 4px">能效: {{ row.params.energyEfficiency || 0 }}%</el-tag>
                <el-tag size="small" style="margin-right: 4px">可再生: {{ row.params.renewableRatio || 0 }}%</el-tag>
                <el-tag size="small" style="margin-right: 4px">供应链: {{ row.params.supplyChainOptimization || 0 }}%</el-tag>
                <el-tag size="small">生产: {{ row.params.productionOptimization || 0 }}%</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="simulationResults.length === 0" description="暂无保存的模拟方案" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.simulation-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .params-panel {
    h4 {
      margin-bottom: 20px;
      font-weight: 600;
    }

    .param-item {
      margin-bottom: 24px;

      .param-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;

        .param-label {
          font-weight: 500;
        }

        .param-value {
          color: #409eff;
          font-weight: 600;
        }
      }
    }
  }

  .chart-container {
    h4 {
      margin-bottom: 16px;
      font-weight: 600;
    }
  }

  .results-panel {
    h4 {
      margin-bottom: 20px;
      font-weight: 600;
    }

    .result-card {
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
      margin-bottom: 12px;

      &.result-success {
        background: #f0f9eb;
      }

      &.result-highlight {
        background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
        color: white;
      }

      .result-label {
        font-size: 13px;
        margin-bottom: 4px;
        opacity: 0.8;
      }

      .result-value {
        font-size: 22px;
        font-weight: 700;
      }
    }
  }
}
</style>
