<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBatteryStore } from '@/stores/battery'
import { Plus, Trash2, Save, Play, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import { BMS_TAGS, FIRE_TAGS, getBmsTagLabel, getFireTagLabel } from '@/utils/semantic'
import type { MappingRule } from '@/types'

const batteryStore = useBatteryStore()

const selectedRule = ref<MappingRule | null>(null)
const showRuleEditor = ref(false)
const isEditing = ref(false)

const transformTypes = [
  { value: 'direct', label: '直接映射' },
  { value: 'linear', label: '线性转换' },
  { value: 'threshold', label: '阈值触发' },
  { value: 'custom', label: '自定义表达式' }
]

function addRule() {
  selectedRule.value = {
    id: `rule_${Date.now()}`,
    source: BMS_TAGS[0].id,
    target: FIRE_TAGS[0].id,
    transformType: 'direct',
    enabled: true,
    description: ''
  }
  isEditing.value = true
  showRuleEditor.value = true
}

function editRule(rule: MappingRule) {
  selectedRule.value = { ...rule }
  isEditing.value = true
  showRuleEditor.value = true
}

function deleteRule(ruleId: string) {
  const rules = batteryStore.mappingRules.filter(r => r.id !== ruleId)
  batteryStore.updateMappingRules(rules)
}

function saveRule() {
  if (!selectedRule.value) return
  
  const rules = [...batteryStore.mappingRules]
  const existingIndex = rules.findIndex(r => r.id === selectedRule.value!.id)
  
  if (existingIndex > -1) {
    rules[existingIndex] = selectedRule.value
  } else {
    rules.push(selectedRule.value)
  }
  
  batteryStore.updateMappingRules(rules)
  showRuleEditor.value = false
  isEditing.value = false
  selectedRule.value = null
}

function toggleRule(rule: MappingRule) {
  const rules = batteryStore.mappingRules.map(r => 
    r.id === rule.id ? { ...r, enabled: !r.enabled } : r
  )
  batteryStore.updateMappingRules(rules)
}

function testRules() {
  const testSignals = batteryStore.mappingRules
    .filter(r => r.enabled)
    .map((rule, index) => ({
      id: `test_${Date.now()}_${index}`,
      target: rule.target,
      action: 'TEST_TRIGGER',
      value: Math.random() > 0.5 ? 1 : 0,
      level: ['info', 'warning', 'critical'][index % 3] as 'info' | 'warning' | 'critical',
      timestamp: Date.now(),
      sourceCellId: 'test'
    }))
  
  batteryStore.fireSignals = [...testSignals, ...batteryStore.fireSignals].slice(0, 50)
}

const activeRulesCount = computed(() => 
  batteryStore.mappingRules.filter(r => r.enabled).length
)
</script>

<template>
  <div class="h-full flex flex-col gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="addRule"
          class="btn-primary flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          添加映射规则
        </button>
        <button
          @click="testRules"
          class="btn-ghost flex items-center gap-2"
        >
          <Play class="w-4 h-4" />
          测试联动
        </button>
      </div>
      <div class="text-sm text-dark-300">
        已启用规则: <span class="text-primary font-medium">{{ activeRulesCount }}</span> / {{ batteryStore.mappingRules.length }}
      </div>
    </div>

    <div class="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
      <div class="glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">BMS 数据点</h3>
        <div class="space-y-2 flex-1 overflow-y-auto">
          <div
            v-for="tag in BMS_TAGS"
            :key="tag.id"
            class="p-3 rounded-lg bg-dark-600/50 border border-primary/30"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-primary">{{ tag.label }}</span>
              <span class="text-xs text-dark-400">{{ tag.dataType }}</span>
            </div>
            <div class="text-xs text-dark-400 mt-1">
              {{ tag.unit ? `单位: ${tag.unit}` : '' }}
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="threshold in tag.thresholds"
                :key="threshold.level"
                class="text-xs px-1.5 py-0.5 rounded"
                :class="{
                  'bg-success/20 text-success': threshold.level === 'normal',
                  'bg-warning/20 text-warning': threshold.level === 'warning',
                  'bg-danger/20 text-danger': threshold.level === 'critical'
                }"
              >
                {{ threshold.level }}
                <span v-if="threshold.min !== undefined">≥{{ threshold.min }}</span>
                <span v-if="threshold.max !== undefined"><{{ threshold.max }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">映射规则</h3>
        <div class="space-y-2 flex-1 overflow-y-auto">
          <div
            v-for="rule in batteryStore.mappingRules"
            :key="rule.id"
            class="p-3 rounded-lg bg-dark-600/50 border border-dark-400/30 hover:border-primary/50 transition-colors"
            :class="{ 'opacity-50': !rule.enabled }"
          >
            <div class="flex items-center gap-2 mb-2">
              <button
                @click="toggleRule(rule)"
                class="text-dark-300 hover:text-white transition-colors"
              >
                <component :is="rule.enabled ? ToggleRight : ToggleLeft" class="w-5 h-5" :class="rule.enabled ? 'text-success' : ''" />
              </button>
              <span class="text-sm text-dark-100 flex-1 truncate">{{ rule.description || rule.id }}</span>
              <button
                @click="editRule(rule)"
                class="text-xs text-primary hover:underline"
              >
                编辑
              </button>
              <button
                @click="deleteRule(rule.id)"
                class="text-dark-400 hover:text-danger transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded bg-primary/20 text-primary">
                {{ getBmsTagLabel(rule.source) }}
              </span>
              <ArrowRight class="w-3 h-3 text-dark-400" />
              <span class="px-2 py-0.5 rounded bg-danger/20 text-danger">
                {{ getFireTagLabel(rule.target) }}
              </span>
              <span class="text-dark-400 ml-auto">{{ rule.transformType }}</span>
            </div>
          </div>
          <div v-if="batteryStore.mappingRules.length === 0" class="text-center py-8 text-dark-400">
            <p class="text-sm">暂无映射规则</p>
            <p class="text-xs mt-1">点击上方按钮添加规则</p>
          </div>
        </div>
      </div>

      <div class="glass-card p-4 flex flex-col">
        <h3 class="text-white font-semibold mb-3">消防设备标签</h3>
        <div class="space-y-2 flex-1 overflow-y-auto">
          <div
            v-for="tag in FIRE_TAGS"
            :key="tag.id"
            class="p-3 rounded-lg bg-dark-600/50 border border-danger/30"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-danger">{{ tag.label }}</span>
              <span class="text-xs text-dark-400">{{ tag.dataType }}</span>
            </div>
            <div class="text-xs text-dark-400 mt-1">
              {{ tag.unit ? `单位: ${tag.unit}` : '' }}
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="threshold in tag.thresholds"
                :key="threshold.level"
                class="text-xs px-1.5 py-0.5 rounded"
                :class="{
                  'bg-success/20 text-success': threshold.level === 'normal',
                  'bg-warning/20 text-warning': threshold.level === 'warning',
                  'bg-danger/20 text-danger': threshold.level === 'critical'
                }"
              >
                {{ threshold.level }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-4 flex-shrink-0">
      <h3 class="text-white font-semibold mb-3">联动信号日志</h3>
      <div class="h-48 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="text-dark-400 text-xs uppercase">
            <tr>
              <th class="text-left py-2 px-3">时间</th>
              <th class="text-left py-2 px-3">目标设备</th>
              <th class="text-left py-2 px-3">动作</th>
              <th class="text-left py-2 px-3">值</th>
              <th class="text-left py-2 px-3">级别</th>
            </tr>
          </thead>
          <tbody class="text-dark-200">
            <tr
              v-for="signal in batteryStore.fireSignals.slice(0, 20)"
              :key="signal.id"
              class="border-t border-dark-500/30"
            >
              <td class="py-2 px-3 font-mono text-xs">
                {{ new Date(signal.timestamp).toLocaleTimeString() }}
              </td>
              <td class="py-2 px-3">{{ getFireTagLabel(signal.target) }}</td>
              <td class="py-2 px-3">{{ signal.action }}</td>
              <td class="py-2 px-3 font-mono">{{ signal.value ?? '-' }}</td>
              <td class="py-2 px-3">
                <span
                  class="px-2 py-0.5 rounded text-xs"
                  :class="{
                    'bg-primary/20 text-primary': signal.level === 'info',
                    'bg-warning/20 text-warning': signal.level === 'warning',
                    'bg-danger/20 text-danger': signal.level === 'critical'
                  }"
                >
                  {{ signal.level }}
                </span>
              </td>
            </tr>
            <tr v-if="batteryStore.fireSignals.length === 0">
              <td colspan="5" class="text-center py-8 text-dark-400">
                暂无联动信号
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showRuleEditor && selectedRule"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showRuleEditor = false"
      >
        <div class="glass-card w-[500px] p-6">
          <h3 class="text-lg font-semibold text-white mb-4">
            {{ isEditing ? '编辑映射规则' : '添加映射规则' }}
          </h3>
          <div class="space-y-4">
            <div>
              <label class="text-sm text-dark-300 block mb-1">BMS 数据源</label>
              <select
                v-model="selectedRule.source"
                class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100"
              >
                <option v-for="tag in BMS_TAGS" :key="tag.id" :value="tag.id">
                  {{ tag.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-sm text-dark-300 block mb-1">转换类型</label>
              <select
                v-model="selectedRule.transformType"
                class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100"
              >
                <option v-for="t in transformTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-sm text-dark-300 block mb-1">消防目标</label>
              <select
                v-model="selectedRule.target"
                class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100"
              >
                <option v-for="tag in FIRE_TAGS" :key="tag.id" :value="tag.id">
                  {{ tag.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-sm text-dark-300 block mb-1">规则描述</label>
              <input
                v-model="selectedRule.description"
                type="text"
                placeholder="输入规则描述..."
                class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100"
              />
            </div>
            <div v-if="selectedRule.transformType === 'threshold'" class="p-3 bg-dark-600/50 rounded">
              <p class="text-xs text-dark-400 mb-2">阈值配置 (可选)</p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-dark-400 block mb-1">阈值</label>
                  <input
                    v-model.number="(selectedRule.transformConfig ??= {}).threshold"
                    type="number"
                    class="w-full bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100"
                  />
                </div>
                <div>
                  <label class="text-xs text-dark-400 block mb-1">触发条件</label>
                  <select
                    v-model="(selectedRule.transformConfig ??= {}).condition"
                    class="w-full bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100"
                  >
                    <option value="gt">大于阈值</option>
                    <option value="lt">小于阈值</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showRuleEditor = false"
              class="btn-ghost"
            >
              取消
            </button>
            <button
              @click="saveRule"
              class="btn-primary flex items-center gap-2"
            >
              <Save class="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
