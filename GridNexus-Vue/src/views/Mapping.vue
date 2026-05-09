<template>
  <AppLayout>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">语义映射管理</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="6">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
            数据映射测试
          </v-card-title>
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="6">
                <v-select
                  v-model="mappingDirection"
                  label="映射方向"
                  :items="directionOptions"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="selectedSubstation"
                  label="目标变电站"
                  :items="substationOptions"
                />
              </v-col>
            </v-row>

            <v-row class="mb-4">
              <v-col cols="12">
                <v-btn @click="runMapping" color="primary" :disabled="mappingStore.isProcessing">
                  <v-icon class="mr-1" v-if="!mappingStore.isProcessing">mdi-play</v-icon>
                  <v-progress-circular
                    v-else
                    indeterminate
                    size="20"
                    width="2"
                    class="mr-2"
                  />
                  {{ mappingStore.isProcessing ? '处理中...' : '执行映射' }}
                </v-btn>
              </v-col>
            </v-row>

            <v-divider class="mb-4" />

            <v-row>
              <v-col cols="12" md="6">
                <h4 class="text-subtitle-2 mb-2">原始数据</h4>
                <v-card variant="outlined">
                  <v-card-text>
                    <pre class="text-xs">{{ sourceData }}</pre>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <h4 class="text-subtitle-2 mb-2">映射结果</h4>
                <v-card variant="outlined">
                  <v-card-text>
                    <pre v-if="mappingResult" class="text-xs">{{ mappingResult }}</pre>
                    <v-alert
                      v-else
                      type="info"
                      density="compact"
                      text
                    >
                      点击"执行映射"查看结果
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-alert
              v-if="mappingErrors.length > 0"
              type="warning"
              class="mt-4"
            >
              <div class="text-subtitle-2 mb-1">校验错误:</div>
              <ul>
                <li v-for="err in mappingErrors" :key="err.field">
                  {{ err.field }}: {{ err.message }}
                </li>
              </ul>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-file-document</v-icon>
            已注册映射规则
          </v-card-title>
          <v-card-text>
            <v-expansion-panels>
              <v-expansion-panel
                v-for="(mapping, index) in mappings"
                :key="index"
              >
                <v-expansion-panel-title>
                  <v-chip size="small" color="primary" class="mr-2">
                    {{ mapping.category }}
                  </v-chip>
                  {{ mapping.source }} → {{ mapping.target }}
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>源字段</th>
                        <th>目标字段</th>
                        <th>单位</th>
                        <th>校验规则</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(config, field) in mapping.fields" :key="field">
                        <td>{{ field }}</td>
                        <td>{{ config.targetField }}</td>
                        <td>{{ config.unit || '-' }}</td>
                        <td>{{ config.validation ? '已配置' : '无' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-history</v-icon>
            映射历史记录
            <v-spacer />
            <v-btn @click="clearHistory" variant="outlined" color="error">
              <v-icon class="mr-1">mdi-delete</v-icon>
              清空历史
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>方向</th>
                  <th>类别</th>
                  <th>映射字段数</th>
                  <th>错误数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in mappingHistory" :key="index">
                  <td>{{ formatDate(item.mappedAt) }}</td>
                  <td>{{ item.metadata.source }} → {{ item.metadata.target }}</td>
                  <td>
                    <v-chip size="small" color="secondary">
                      {{ item.metadata.category }}
                    </v-chip>
                  </td>
                  <td>{{ Object.keys(item.data).length }}</td>
                  <td>
                    <v-chip
                      size="small"
                      :color="item.errors.length > 0 ? 'error' : 'success'"
                    >
                      {{ item.errors.length }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert
              v-if="mappingHistory.length === 0"
              type="info"
              density="compact"
              text
            >
              暂无映射历史记录
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>
            <v-icon class="mr-2">mdi-information-variant</v-icon>
            语义映射说明
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">节点类型</h4>
                <v-chip
                  v-for="type in semanticTypes"
                  :key="type"
                  class="mr-1 mb-1"
                  size="small"
                  color="primary"
                  variant="outlined"
                >
                  {{ type }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">数据类别</h4>
                <v-chip
                  v-for="cat in dataCategories"
                  :key="cat"
                  class="mr-1 mb-1"
                  size="small"
                  color="secondary"
                  variant="outlined"
                >
                  {{ cat }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">映射特性</h4>
                <v-list dense>
                  <v-list-item>
                    <v-icon class="mr-2" color="success">mdi-check</v-icon>
                    <v-list-item-title>字段级别的数据转换</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <v-icon class="mr-2" color="success">mdi-check</v-icon>
                    <v-list-item-title>单位一致性检查</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <v-icon class="mr-2" color="success">mdi-check</v-icon>
                    <v-list-item-title>数据合法性校验</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <v-icon class="mr-2" color="success">mdi-check</v-icon>
                    <v-list-item-title>双向映射支持</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useMappingStore } from '@/stores/mapping'
import { useTopologyStore } from '@/stores/topology'

const mappingStore = useMappingStore()
const topologyStore = useTopologyStore()

const mappingDirection = ref('dispatch_to_substation')
const selectedSubstation = ref('SS-001')
const sourceData = ref('{}')
const mappingResult = ref(null)
const mappingErrors = ref([])

const directionOptions = [
  { title: '调度中心 → 变电站', value: 'dispatch_to_substation' },
  { title: '变电站 → 调度中心', value: 'substation_to_dispatch' }
]

const substationOptions = computed(() => {
  return topologyStore.nodes
    .filter(n => n.type === 'substation')
    .map(n => ({ title: n.name, value: n.id }))
})

const mappings = computed(() => mappingStore.mappings)
const mappingHistory = computed(() => mappingStore.mappingHistory)
const semanticTypes = computed(() => mappingStore.sourceTypes)
const dataCategories = computed(() => mappingStore.dataCategories)

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

async function runMapping() {
  let result
  
  if (mappingDirection.value === 'dispatch_to_substation') {
    result = await mappingStore.simulateDispatchToSubstation(selectedSubstation.value)
    sourceData.value = JSON.stringify({
      dispatchLoad: 3850,
      dispatchVoltage: 220,
      dispatchFrequency: 50.02
    }, null, 2)
  } else {
    result = await mappingStore.simulateSubstationToDispatch(selectedSubstation.value)
    const baseData = {
      actualLoad: 920,
      transformerStatus: 0,
      busVoltage: 221.5,
      frequency: 50.01
    }
    sourceData.value = JSON.stringify(baseData, null, 2)
  }

  mappingResult.value = JSON.stringify(result.data, null, 2)
  mappingErrors.value = result.errors || []
}

function clearHistory() {
  mappingStore.clearHistory()
}

onMounted(() => {
  mappingStore.loadMappings()
})
</script>
