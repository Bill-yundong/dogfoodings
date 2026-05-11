<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCarbonStore } from '@/stores/carbon'
import { storeToRefs } from 'pinia'
import type { CarbonRecord } from '@/types/carbon'

const carbonStore = useCarbonStore()
const { records } = storeToRefs(carbonStore)

const formVisible = ref(false)
const formData = ref({
  sourceId: '',
  sourceName: '',
  type: 'energy' as CarbonRecord['type'],
  quantity: 0,
  unit: 'kWh',
  department: '',
  scope: 2 as 1 | 2 | 3,
  factor: undefined as number | undefined
})

onMounted(() => {
  carbonStore.loadAggregatedData()
})

const emissionTypes = [
  { value: 'production', label: '生产排放' },
  { value: 'supply', label: '供应排放' },
  { value: 'transport', label: '运输排放' },
  { value: 'energy', label: '能源排放' }
]

const departments = [
  '生产部',
  '供应链部',
  '物流部',
  '研发部',
  '行政部',
  '销售部'
]

async function submitForm() {
  try {
    await carbonStore.addEmissionRecord(formData.value)
    formVisible.value = false
    resetForm()
  } catch (err) {
    console.error('Failed to add record:', err)
  }
}

function resetForm() {
  formData.value = {
    sourceId: '',
    sourceName: '',
    type: 'energy',
    quantity: 0,
    unit: 'kWh',
    department: '',
    scope: 2,
    factor: undefined
  }
}
</script>

<template>
  <div class="emissions-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>排放数据管理</span>
          <el-button type="primary" @click="formVisible = true">
            <el-icon><Plus /></el-icon>
            添加排放记录
          </el-button>
        </div>
      </template>

      <el-table :data="records" style="width: 100%">
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="sourceName" label="来源" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }">
            <el-tag>{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="emissions" label="排放量 (t CO₂e)" width="150">
          <template #default="{ row }">
            <span class="emission-value">{{ row.emissions?.toFixed(4) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="Scope" width="100">
          <template #default="{ row }">
            <el-tag :type="row.scope === 1 ? 'danger' : row.scope === 2 ? 'warning' : 'info'">
              {{ row.scope }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'verified' ? 'success' : 'info'">
              {{ row.status === 'verified' ? '已验证' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="records.length === 0" description="暂无排放数据，请添加新记录" />
    </el-card>

    <el-dialog v-model="formVisible" title="添加排放记录" width="600px">
      <el-form :model="formData" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="来源ID">
              <el-input v-model="formData.sourceId" placeholder="例如: LINE-001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源名称">
              <el-input v-model="formData.sourceName" placeholder="例如: 1号生产线" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排放类型">
              <el-select v-model="formData.type" style="width: 100%">
                <el-option
                  v-for="type in emissionTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Scope">
              <el-select v-model="formData.scope" style="width: 100%">
                <el-option :label="1" :value="1" />
                <el-option :label="2" :value="2" />
                <el-option :label="3" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数量">
              <el-input-number v-model="formData.quantity" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位">
              <el-input v-model="formData.unit" placeholder="例如: kWh, L, ton" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-select v-model="formData.department" style="width: 100%">
                <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排放因子 (可选)">
              <el-input-number v-model="formData.factor" :min="0" style="width: 100%" placeholder="留空使用默认值" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.emissions-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .emission-value {
    font-weight: 600;
    color: #409eff;
  }
}
</style>
