<template>
  <AppLayout>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">电网拓扑分析</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-graph</v-icon>
            拓扑结构图
            <v-spacer />
            <v-btn @click="refreshTopology" icon class="mr-2">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-btn @click="simulateLoad" color="primary">
              <v-icon class="mr-1">mdi-play</v-icon>
              模拟负荷波动
            </v-btn>
          </v-card-title>
          <v-card-text>
            <TopologyGraph height="500px" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" lg="6">
        <v-card class="elevation-2" height="100%">
          <v-card-title>
            <v-icon class="mr-2">mdi-file-chart</v-icon>
            节点详情
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="!selectedNode"
              type="info"
              density="compact"
              text
            >
              点击拓扑图中的节点查看详情
            </v-alert>
            
            <v-skeleton-loader v-if="topologyStore.isCalculating" type="table" />
            
            <div v-else-if="selectedNode">
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td><strong>节点名称</strong></td>
                    <td>{{ selectedNode.name }}</td>
                  </tr>
                  <tr>
                    <td><strong>节点ID</strong></td>
                    <td>{{ selectedNode.id }}</td>
                  </tr>
                  <tr>
                    <td><strong>节点类型</strong></td>
                    <td>{{ selectedNode.type }}</td>
                  </tr>
                  <tr>
                    <td><strong>额定容量</strong></td>
                    <td>{{ selectedNode.capacity }} MW</td>
                  </tr>
                  <tr>
                    <td><strong>当前负荷</strong></td>
                    <td>{{ selectedNode.currentLoad.toFixed(2) }} MW</td>
                  </tr>
                  <tr>
                    <td><strong>负载率</strong></td>
                    <td>
                      <v-chip
                        size="small"
                        :color="selectedNode.loadRatio > 0.9 ? 'error' : selectedNode.loadRatio > 0.7 ? 'warning' : 'success'"
                      >
                        {{ (selectedNode.loadRatio * 100).toFixed(2) }}%
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>可用容量</strong></td>
                    <td>{{ selectedNode.availableCapacity.toFixed(2) }} MW</td>
                  </tr>
                  <tr>
                    <td><strong>运行状态</strong></td>
                    <td>
                      <v-chip
                        size="small"
                        :color="selectedNode.isOverloaded ? 'error' : 'success'"
                        variant="flat"
                      >
                        {{ selectedNode.isOverloaded ? '过载' : '正常' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card class="elevation-2 mb-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-expand-all</v-icon>
            扩容决策分析
          </v-card-title>
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="6">
                <v-text-field
                  v-model="targetRatio"
                  label="目标负载率 (%)"
                  type="number"
                  min="50"
                  max="95"
                />
              </v-col>
              <v-col cols="6">
                <v-btn @click="runExpansionAnalysis" color="secondary" class="mt-5">
                  <v-icon class="mr-1">mdi-calculator</v-icon>
                  生成扩容计划
                </v-btn>
              </v-col>
            </v-row>

            <v-progress-linear
              v-if="topologyStore.isCalculating"
              indeterminate
              color="primary"
            />

            <div v-else-if="expansionPlan">
              <v-alert
                v-if="expansionPlan.overloadedNodes.length === 0"
                type="success"
                density="compact"
                class="mb-3"
              >
                所有节点运行在安全负载率范围内
              </v-alert>

              <v-alert
                v-else
                type="warning"
                density="compact"
                class="mb-3"
              >
                发现 {{ expansionPlan.overloadedNodes.length }} 个过载节点，
                {{ expansionPlan.bottleneckCount }} 条瓶颈线路
              </v-alert>

              <h4 class="text-h6 mt-4 mb-2">扩容建议</h4>
              <v-card
                v-for="rec in expansionPlan.recommendations"
                :key="rec.nodeId"
                class="mb-2"
                variant="outlined"
              >
                <v-card-text>
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <strong>{{ rec.name }}</strong>
                      <div class="text-caption text-grey">
                        当前: {{ rec.currentCapacity }} MW → 建议: {{ rec.recommendedCapacity }} MW
                      </div>
                    </div>
                    <div class="text-right">
                      <v-chip
                        size="small"
                        :color="rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'"
                      >
                        {{ rec.priority === 'critical' ? '紧急' : rec.priority === 'high' ? '高' : '中' }}
                      </v-chip>
                      <div class="text-caption text-grey mt-1">
                        预计成本: ¥{{ rec.estimatedCost.toLocaleString() }}
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <v-alert
                v-if="expansionPlan.recommendations.length === 0"
                type="info"
                density="compact"
              >
                暂无扩容建议
              </v-alert>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-swap-horizontal-variant</v-icon>
            功率流计算
          </v-card-title>
          <v-card-text>
            <v-btn @click="calculatePowerFlow" color="info" class="mb-3">
              <v-icon class="mr-1">mdi-sync</v-icon>
              计算功率流
            </v-btn>

            <v-progress-linear
              v-if="topologyStore.isCalculating"
              indeterminate
              color="primary"
            />

            <v-table v-else-if="powerFlows.length > 0" density="compact">
              <thead>
                <tr>
                  <th>连接</th>
                  <th>功率流</th>
                  <th>容量</th>
                  <th>负载率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flow in powerFlows" :key="flow.connectionId">
                  <td>{{ flow.from }} → {{ flow.to }}</td>
                  <td>{{ flow.flow.toFixed(1) }} MW</td>
                  <td>{{ flow.capacity.toFixed(1) }} MW</td>
                  <td>
                    <v-chip
                      size="small"
                      :color="flow.ratio > 0.9 ? 'error' : flow.ratio > 0.7 ? 'warning' : 'success'"
                    >
                      {{ (flow.ratio * 100).toFixed(1) }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert
              v-else
              type="info"
              density="compact"
              text
            >
              点击"计算功率流"查看详细信息
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import TopologyGraph from '@/components/TopologyGraph.vue'
import { useTopologyStore } from '@/stores/topology'

const topologyStore = useTopologyStore()

const targetRatio = ref(80)
const expansionPlan = ref(null)
const powerFlows = ref([])

const selectedNode = computed(() => topologyStore.selectedNode)

async function refreshTopology() {
  await topologyStore.simulateLoadChange()
}

async function simulateLoad() {
  await topologyStore.simulateLoadChange()
}

async function runExpansionAnalysis() {
  expansionPlan.value = await topologyStore.generateExpansionPlan({
    targetRatio: targetRatio.value / 100
  })
}

async function calculatePowerFlow() {
  await topologyStore.calculatePowerFlow()
  powerFlows.value = topologyStore.powerFlows
}
</script>
