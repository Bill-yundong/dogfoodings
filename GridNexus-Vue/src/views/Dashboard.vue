<template>
  <AppLayout>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">电网负荷流转中枢 - 概览</h2>
      </v-col>
    </v-row>

    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <StatCard
          title="总装机容量"
          :value="topologyStore.totalCapacity"
          unit="MW"
          icon="mdi-power-plug"
          color="surface"
          :trend="2.3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard
          title="当前总负荷"
          :value="topologyStore.totalLoad"
          unit="MW"
          icon="mdi-lightning-bolt"
          color="surface"
          :trend="5.8"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard
          title="系统负载率"
          :value="topologyStore.loadRatio"
          format="percentage"
          icon="mdi-gauge"
          :color="topologyStore.loadRatio > 85 ? 'error' : 'surface'"
          :trend="-1.2"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard
          title="过载节点数"
          :value="topologyStore.overloadedNodes.length"
          icon="mdi-alert"
          :color="topologyStore.overloadedNodes.length > 0 ? 'error' : 'surface'"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="8">
        <v-card class="elevation-2" height="100%">
          <v-card-title>
            电网拓扑概览
            <v-spacer />
            <v-btn @click="refreshData" icon>
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <TopologyGraph height="400px" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="elevation-2 mb-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-bell-ring</v-icon>
            告警信息
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="alert in alerts" :key="alert.id">
                <template v-slot:prepend>
                  <v-icon :color="alert.severity === 'critical' ? 'error' : 'warning'">
                    mdi-alert-circle
                  </v-icon>
                </template>
                <v-list-item-content>
                  <v-list-item-title>{{ alert.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ alert.message }}</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <span class="caption text-grey">{{ alert.time }}</span>
                </v-list-item-action>
              </v-list-item>
              <v-alert
                v-if="alerts.length === 0"
                type="success"
                density="compact"
                text
              >
                暂无告警信息，系统运行正常
              </v-alert>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-substation</v-icon>
            变电站状态
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>变电站</th>
                  <th>负载率</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ss in substations" :key="ss.id">
                  <td>{{ ss.name }}</td>
                  <td>
                    <v-progress-linear
                      :value="ss.loadRatio * 100"
                      :color="ss.loadRatio > 0.9 ? 'error' : ss.loadRatio > 0.7 ? 'warning' : 'success'"
                      height="20"
                    >
                      <template v-slot:default="{ value }">
                        <span>{{ value.toFixed(1) }}%</span>
                      </template>
                    </v-progress-linear>
                  </td>
                  <td>
                    <v-chip
                      size="small"
                      :color="ss.isOverloaded ? 'error' : 'success'"
                      variant="flat"
                    >
                      {{ ss.isOverloaded ? '过载' : '正常' }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" lg="6">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            24小时负荷趋势
          </v-card-title>
          <v-card-text>
            <LineChart :option="loadChartOption" height="300px" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-pie-chart</v-icon>
            负荷分布
          </v-card-title>
          <v-card-text>
            <LineChart :option="distributionChartOption" height="300px" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import StatCard from '@/components/StatCard.vue'
import TopologyGraph from '@/components/TopologyGraph.vue'
import LineChart from '@/components/LineChart.vue'
import { useTopologyStore } from '@/stores/topology'
import { useSnapshotStore } from '@/stores/snapshot'
import { generateLoadTimeSeries } from '@/utils/mockData'

const topologyStore = useTopologyStore()
const snapshotStore = useSnapshotStore()

const alerts = ref([
  {
    id: 1,
    severity: 'warning',
    title: '浦东变2号主变负载偏高',
    message: '负载率达到100%，建议关注',
    time: '10分钟前'
  },
  {
    id: 2,
    severity: 'warning',
    title: '浦西变2号主变负载偏高',
    message: '负载率达到107.5%，建议检查',
    time: '15分钟前'
  }
])

const substations = computed(() => {
  return topologyStore.nodes.filter(n => n.type === 'substation')
})

const loadChartOption = computed(() => {
  const data = generateLoadTimeSeries(24)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      textStyle: { color: '#fff' }
    },
    legend: {
      data: ['实际负荷', '预测负荷'],
      textStyle: { color: '#aaa' },
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(d => d.time),
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#aaa' }
    },
    yAxis: {
      type: 'value',
      name: 'MW',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#aaa' },
      splitLine: { lineStyle: { color: '#333' } }
    },
    series: [
      {
        name: '实际负荷',
        type: 'line',
        smooth: true,
        data: data.map(d => d.load),
        lineStyle: { color: '#1F6FEB', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(31, 111, 235, 0.4)' },
              { offset: 1, color: 'rgba(31, 111, 235, 0.05)' }
            ]
          }
        }
      },
      {
        name: '预测负荷',
        type: 'line',
        smooth: true,
        data: data.map(d => d.predicted),
        lineStyle: { color: '#8957E5', width: 2, type: 'dashed' }
      }
    ]
  }
})

const distributionChartOption = computed(() => {
  const ssData = substations.value.map(ss => ({
    name: ss.name,
    value: ss.currentLoad
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} MW ({d}%)',
      textStyle: { color: '#fff' }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#aaa' }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#161B22',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#fff'
          }
        },
        labelLine: {
          show: false
        },
        data: ssData
      }
    ],
    color: ['#1F6FEB', '#8957E5', '#3FB950', '#D29922', '#58A6FF']
  }
})

async function refreshData() {
  await topologyStore.simulateLoadChange()
}

onMounted(() => {
  if (!topologyStore.isInitialized) {
    topologyStore.init()
  }
})
</script>
