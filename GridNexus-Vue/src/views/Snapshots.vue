<template>
  <AppLayout>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">运行状态快照</h2>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="filterSubstation"
          label="选择变电站"
          :items="substationOptions"
          clearable
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-menu v-model="startMenu" :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-text-field
              v-bind="props"
              v-model="startDateText"
              label="开始日期"
              readonly
              prepend-icon="mdi-calendar"
            />
          </template>
          <v-date-picker v-model="startDate" color="primary" />
        </v-menu>
      </v-col>
      <v-col cols="12" md="3">
        <v-menu v-model="endMenu" :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-text-field
              v-bind="props"
              v-model="endDateText"
              label="结束日期"
              readonly
              prepend-icon="mdi-calendar"
            />
          </template>
          <v-date-picker v-model="endDate" color="primary" />
        </v-menu>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn @click="searchSnapshots" color="primary" class="mt-5">
          <v-icon class="mr-1">mdi-magnify</v-icon>
          查询
        </v-btn>
        <v-btn @click="createSnapshot" color="secondary" class="mt-5 ml-2">
          <v-icon class="mr-1">mdi-camera</v-icon>
          新建快照
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="8">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-history</v-icon>
            快照历史记录
            <v-spacer />
            <span class="text-caption text-grey">共 {{ snapshots.length }} 条记录</span>
          </v-card-title>
          <v-card-text>
            <v-progress-linear
              v-if="snapshotStore.isLoading"
              indeterminate
              color="primary"
            />
            
            <v-table v-else density="compact">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>变电站</th>
                  <th>负荷 (MW)</th>
                  <th>负载率</th>
                  <th>电压 (kV)</th>
                  <th>频率 (Hz)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="snapshot in snapshots"
                  :key="snapshot.id"
                  :active="selectedSnapshot?.id === snapshot.id"
                  @click="selectSnapshot(snapshot)"
                  class="cursor-pointer"
                >
                  <td>{{ formatDate(snapshot.timestamp) }}</td>
                  <td>{{ snapshot.substationId }}</td>
                  <td>{{ snapshot.data?.load || 0 }}</td>
                  <td>
                    <v-chip
                      size="small"
                      :color="(snapshot.data?.ratio || 0) > 0.9 ? 'error' : 'success'"
                    >
                      {{ (snapshot.data?.ratio * 100 || 0).toFixed(0) }}%
                    </v-chip>
                  </td>
                  <td>{{ snapshot.data?.voltage || '-' }}</td>
                  <td>{{ snapshot.data?.frequency || '-' }}</td>
                  <td>
                    <v-btn icon size="small" @click.stop="deleteSnapshot(snapshot.id)">
                      <v-icon size="small" color="error">mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert
              v-if="!snapshotStore.isLoading && snapshots.length === 0"
              type="info"
              density="compact"
              text
            >
              暂无快照记录
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="elevation-2 mb-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            快照详情
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="!selectedSnapshot"
              type="info"
              density="compact"
              text
            >
              点击列表中的快照查看详情
            </v-alert>
            
            <div v-else>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td><strong>快照ID</strong></td>
                    <td>{{ selectedSnapshot.id }}</td>
                  </tr>
                  <tr>
                    <td><strong>创建时间</strong></td>
                    <td>{{ formatDate(selectedSnapshot.timestamp) }}</td>
                  </tr>
                  <tr>
                    <td><strong>变电站</strong></td>
                    <td>{{ selectedSnapshot.substationId }}</td>
                  </tr>
                  <tr>
                    <td><strong>负荷</strong></td>
                    <td>{{ selectedSnapshot.data?.load }} MW</td>
                  </tr>
                  <tr>
                    <td><strong>容量</strong></td>
                    <td>{{ selectedSnapshot.data?.capacity }} MW</td>
                  </tr>
                  <tr>
                    <td><strong>负载率</strong></td>
                    <td>{{ (selectedSnapshot.data?.ratio * 100).toFixed(1) }}%</td>
                  </tr>
                  <tr>
                    <td><strong>母线电压</strong></td>
                    <td>{{ selectedSnapshot.data?.voltage }} kV</td>
                  </tr>
                  <tr>
                    <td><strong>系统频率</strong></td>
                    <td>{{ selectedSnapshot.data?.frequency }} Hz</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-database</v-icon>
            快照存储管理
          </v-card-title>
          <v-card-text>
            <v-row class="mb-3">
              <v-col cols="12">
                <v-text-field
                  v-model="retentionDays"
                  label="保留天数"
                  type="number"
                  min="7"
                  max="365"
                />
              </v-col>
            </v-row>
            <v-btn @click="clearOldSnapshots" color="error" variant="outlined">
              <v-icon class="mr-1">mdi-delete-sweep</v-icon>
              清理过期快照
            </v-btn>
            <div class="text-caption text-grey mt-2">
              将删除 {{ retentionDays }} 天前的所有快照
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-timeline-variant</v-icon>
            负荷趋势分析
            <v-spacer />
            <v-select
              v-model="trendSubstation"
              label="选择变电站"
              :items="substationOptions"
              density="compact"
              style="width: 200px;"
              @update:model-value="loadTrend"
            />
          </v-card-title>
          <v-card-text>
            <LineChart :option="trendChartOption" height="300px" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import LineChart from '@/components/LineChart.vue'
import { useSnapshotStore } from '@/stores/snapshot'
import { useTopologyStore } from '@/stores/topology'

const snapshotStore = useSnapshotStore()
const topologyStore = useTopologyStore()

const filterSubstation = ref(null)
const startDate = ref(null)
const endDate = ref(null)
const startMenu = ref(false)
const endMenu = ref(false)
const selectedSnapshot = ref(null)
const retentionDays = ref(90)
const trendSubstation = ref('SS-001')
const trendData = ref([])

const snapshots = computed(() => snapshotStore.snapshots)

const substationOptions = computed(() => {
  return topologyStore.nodes
    .filter(n => n.type === 'substation')
    .map(n => ({ title: n.name, value: n.id }))
})

const startDateText = computed(() => {
  return startDate.value ? new Date(startDate.value).toLocaleDateString('zh-CN') : ''
})

const endDateText = computed(() => {
  return endDate.value ? new Date(endDate.value).toLocaleDateString('zh-CN') : ''
})

const trendChartOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.map(d => d.time),
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#aaa' }
    },
    yAxis: [
      {
        type: 'value',
        name: 'MW',
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#aaa' },
        splitLine: { lineStyle: { color: '#333' } }
      },
      {
        type: 'value',
        name: '%',
        max: 100,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#aaa' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '负荷',
        type: 'line',
        smooth: true,
        data: trendData.value.map(d => d.load),
        lineStyle: { color: '#1F6FEB', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(31, 111, 235, 0.3)' },
              { offset: 1, color: 'rgba(31, 111, 235, 0.02)' }
            ]
          }
        }
      },
      {
        name: '负载率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: trendData.value.map(d => d.ratio * 100),
        lineStyle: { color: '#8957E5', width: 2 }
      }
    ]
  }
})

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

async function searchSnapshots() {
  const params = {
    substationId: filterSubstation.value || undefined,
    startTime: startDate.value ? new Date(startDate.value).getTime() : undefined,
    endTime: endDate.value ? new Date(endDate.value).getTime() + 86400000 : undefined,
    limit: 100
  }
  await snapshotStore.loadSnapshots(params)
}

function selectSnapshot(snapshot) {
  selectedSnapshot.value = snapshot
}

async function createSnapshot() {
  const substations = topologyStore.nodes.filter(n => n.type === 'substation')
  for (const ss of substations) {
    await snapshotStore.saveSnapshot({
      substationId: ss.id,
      type: 'load_snapshot',
      data: {
        load: ss.currentLoad,
        capacity: ss.capacity,
        ratio: ss.loadRatio,
        voltage: 220 + (Math.random() - 0.5) * 2,
        frequency: 50 + (Math.random() - 0.5) * 0.1
      }
    })
  }
  await searchSnapshots()
}

async function deleteSnapshot(id) {
  await snapshotStore.deleteSnapshot(id)
  if (selectedSnapshot.value?.id === id) {
    selectedSnapshot.value = null
  }
}

async function clearOldSnapshots() {
  await snapshotStore.clearOldSnapshots(retentionDays.value)
}

async function loadTrend() {
  trendData.value = await snapshotStore.getLoadTrend(trendSubstation.value, 24)
}

watch(trendSubstation, () => {
  loadTrend()
})

onMounted(async () => {
  await snapshotStore.init()
  await loadTrend()
})
</script>
