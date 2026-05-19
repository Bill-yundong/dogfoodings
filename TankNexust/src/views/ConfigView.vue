<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useTankStore } from '@/stores/tankStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useIndexedDB } from '@/composables/useIndexedDB'
import type { Tank } from '@/types/tank'
import type { GaussianParams, AtmosphericStability } from '@/types/simulation'

const tankStore = useTankStore()
const simulationStore = useSimulationStore()
const { addTank, removeTank } = useIndexedDB()

const activeTab = ref<'tanks' | 'params' | 'database'>('params')

const newTank = reactive<Partial<Tank>>({
  name: '',
  chemical: '',
  capacity: 5000,
  currentVolume: 4000,
  position: { x: 0, y: 0 },
  diameter: 15,
  height: 30,
  pressure: 0.8,
  temperature: 25,
  toxicityLevel: 'medium',
  material: '碳钢',
  lastInspection: new Date().toISOString().split('T')[0],
  status: 'normal'
})

const params = reactive<GaussianParams>({ ...simulationStore.params })

const stabilityOptions: { value: AtmosphericStability; label: string; description: string }[] = [
  { value: 'A', label: 'A - 极不稳定', description: '强对流，晴朗白天' },
  { value: 'B', label: 'B - 不稳定', description: '中等对流，白天' },
  { value: 'C', label: 'C - 弱不稳定', description: '弱对流，多云白天' },
  { value: 'D', label: 'D - 中性', description: '阴天或夜间有云' },
  { value: 'E', label: 'E - 稳定', description: '弱逆温，夜间' },
  { value: 'F', label: 'F - 极稳定', description: '强逆温，晴朗夜间' }
]

function applyParams() {
  simulationStore.updateParams({ ...params })
}

function resetParams() {
  Object.assign(params, {
    sourceStrength: 50,
    releaseHeight: 15,
    windSpeed: 3.5,
    windDirection: 90,
    temperature: 25,
    humidity: 60,
    atmosphericStability: 'D',
    diffusionCoefficient: 0.1,
    decayRate: 0.01
  })
  applyParams()
}

async function addNewTank() {
  if (!newTank.name || !newTank.chemical) return

  const tankData: Tank = {
    id: `tank-${Date.now()}`,
    name: newTank.name,
    chemical: newTank.chemical,
    capacity: newTank.capacity || 5000,
    currentVolume: newTank.currentVolume || 4000,
    position: { x: newTank.position?.x || 0, y: newTank.position?.y || 0 },
    diameter: newTank.diameter || 15,
    height: newTank.height || 30,
    pressure: newTank.pressure || 0.8,
    temperature: newTank.temperature || 25,
    toxicityLevel: newTank.toxicityLevel || 'medium',
    material: newTank.material || '碳钢',
    lastInspection: newTank.lastInspection || new Date().toISOString().split('T')[0],
    status: newTank.status || 'normal'
  }

  tankStore.addTank(tankData)
  await addTank(tankData)

  newTank.name = ''
  newTank.chemical = ''
  newTank.position = { x: 0, y: 0 }
}

async function deleteTank(id: string) {
  tankStore.removeTank(id)
  await removeTank(id)
}
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">参数配置</h2>
    </div>

    <div class="flex gap-2 mb-2">
      <button
        v-for="tab in [{ key: 'params', label: '扩散参数' }, { key: 'tanks', label: '储罐管理' }, { key: 'database', label: '数据管理' }]"
        :key="tab.key"
        @click="activeTab = tab.key as any"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.key ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div v-if="activeTab === 'params'" class="grid grid-cols-2 gap-4">
        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-4">源强参数</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                源强 (kg/s)
                <span class="float-right font-mono">{{ params.sourceStrength }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.sourceStrength"
                min="1"
                max="200"
                step="1"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                释放高度 (m)
                <span class="float-right font-mono">{{ params.releaseHeight }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.releaseHeight"
                min="1"
                max="50"
                step="0.5"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                扩散系数
                <span class="float-right font-mono">{{ params.diffusionCoefficient.toFixed(3) }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.diffusionCoefficient"
                min="0.01"
                max="0.5"
                step="0.01"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                衰减率
                <span class="float-right font-mono">{{ params.decayRate.toFixed(3) }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.decayRate"
                min="0.001"
                max="0.1"
                step="0.001"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-4">气象参数</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                风速 (m/s)
                <span class="float-right font-mono">{{ params.windSpeed }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.windSpeed"
                min="0"
                max="20"
                step="0.1"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                风向 (°)
                <span class="float-right font-mono">{{ params.windDirection }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.windDirection"
                min="0"
                max="360"
                step="5"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                温度 (°C)
                <span class="float-right font-mono">{{ params.temperature }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.temperature"
                min="-20"
                max="45"
                step="1"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">
                湿度 (%)
                <span class="float-right font-mono">{{ params.humidity }}</span>
              </label>
              <input
                type="range"
                v-model.number="params.humidity"
                min="0"
                max="100"
                step="1"
                class="w-full accent-accent-cyan"
                @input="applyParams"
              />
            </div>
          </div>
        </div>

        <div class="glass-panel p-4 col-span-2">
          <h3 class="text-sm font-medium text-text-secondary mb-4">大气稳定度</h3>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="opt in stabilityOptions"
              :key="opt.value"
              @click="params.atmosphericStability = opt.value; applyParams()"
              class="p-3 rounded-lg text-left transition-all"
              :class="params.atmosphericStability === opt.value ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary hover:bg-bg-tertiary/80'"
            >
              <div class="font-mono text-sm font-bold">{{ opt.label.split(' - ')[0] }}</div>
              <div class="text-xs opacity-80 mt-1">{{ opt.description }}</div>
            </button>
          </div>
        </div>

        <div class="col-span-2 flex gap-2">
          <button @click="resetParams" class="btn-secondary">重置默认值</button>
        </div>
      </div>

      <div v-if="activeTab === 'tanks'" class="space-y-4">
        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-4">添加储罐</h3>
          <div class="grid grid-cols-4 gap-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1">储罐名称</label>
              <input v-model="newTank.name" type="text" class="input-field text-sm" placeholder="如: T-105" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">危化品名称</label>
              <input v-model="newTank.chemical" type="text" class="input-field text-sm" placeholder="如: 氯气" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">容量 (m³)</label>
              <input v-model.number="newTank.capacity" type="number" class="input-field text-sm" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">当前存量 (m³)</label>
              <input v-model.number="newTank.currentVolume" type="number" class="input-field text-sm" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">X坐标</label>
              <input v-model.number="newTank.position!.x" type="number" class="input-field text-sm" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">Y坐标</label>
              <input v-model.number="newTank.position!.y" type="number" class="input-field text-sm" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1">毒性等级</label>
              <select v-model="newTank.toxicityLevel" class="input-field text-sm">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="extreme">极高</option>
              </select>
            </div>
            <div class="flex items-end">
              <button @click="addNewTank" class="btn-primary w-full text-sm">添加储罐</button>
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-4">储罐列表</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-text-secondary border-b border-white/10">
                  <th class="text-left py-2 px-3">名称</th>
                  <th class="text-left py-2 px-3">危化品</th>
                  <th class="text-right py-2 px-3">容量</th>
                  <th class="text-right py-2 px-3">存量</th>
                  <th class="text-center py-2 px-3">位置</th>
                  <th class="text-center py-2 px-3">毒性</th>
                  <th class="text-center py-2 px-3">状态</th>
                  <th class="text-center py-2 px-3">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tank in tankStore.tanks" :key="tank.id" class="border-b border-white/5 hover:bg-white/5">
                  <td class="py-3 px-3 font-mono">{{ tank.name }}</td>
                  <td class="py-3 px-3">{{ tank.chemical }}</td>
                  <td class="py-3 px-3 text-right font-mono">{{ tank.capacity }} m³</td>
                  <td class="py-3 px-3 text-right font-mono">{{ tank.currentVolume }} m³</td>
                  <td class="py-3 px-3 text-center font-mono">({{ tank.position.x }}, {{ tank.position.y }})</td>
                  <td class="py-3 px-3 text-center">
                    <span
                      class="px-2 py-0.5 rounded text-xs"
                      :class="{
                        'bg-risk-safe/20 text-risk-safe': tank.toxicityLevel === 'low',
                        'bg-risk-caution/20 text-risk-caution': tank.toxicityLevel === 'medium',
                        'bg-risk-warning/20 text-risk-warning': tank.toxicityLevel === 'high',
                        'bg-risk-danger/20 text-risk-danger': tank.toxicityLevel === 'extreme'
                      }"
                    >
                      {{ { low: '低', medium: '中', high: '高', extreme: '极高' }[tank.toxicityLevel] }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-center">
                    <span
                      class="px-2 py-0.5 rounded text-xs"
                      :class="{
                        'bg-risk-safe/20 text-risk-safe': tank.status === 'normal',
                        'bg-risk-caution/20 text-risk-caution': tank.status === 'warning',
                        'bg-risk-warning/20 text-risk-warning': tank.status === 'leaking',
                        'bg-risk-danger/20 text-risk-danger': tank.status === 'critical'
                      }"
                    >
                      {{ { normal: '正常', warning: '警告', leaking: '泄漏', critical: '危急' }[tank.status] }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-center">
                    <button
                      @click="deleteTank(tank.id)"
                      class="text-risk-danger hover:text-risk-danger/80 text-xs"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'database'" class="grid grid-cols-2 gap-4">
        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">危化品库</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            <div
              v-for="chem in tankStore.chemicals"
              :key="chem.id"
              class="bg-bg-tertiary/50 p-3 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">{{ chem.name }}</span>
                <span class="font-mono text-text-muted">{{ chem.formula }}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div>分子量: {{ chem.molecularWeight }}</div>
                <div>沸点: {{ chem.boilingPoint }}°C</div>
                <div>
                  毒性:
                  <span
                    :class="{
                      'text-risk-safe': chem.toxicity === 'low',
                      'text-risk-caution': chem.toxicity === 'medium',
                      'text-risk-warning': chem.toxicity === 'high',
                      'text-risk-danger': chem.toxicity === 'extreme'
                    }"
                  >
                    {{ { low: '低', medium: '中', high: '高', extreme: '极高' }[chem.toxicity] }}
                  </span>
                </div>
                <div>
                  燃爆:
                  <span
                    :class="{
                      'text-risk-safe': chem.flammability === 'non-flammable',
                      'text-risk-caution': chem.flammability === 'flammable',
                      'text-risk-danger': chem.flammability === 'highly-flammable'
                    }"
                  >
                    {{ { 'non-flammable': '不燃', flammable: '可燃', 'highly-flammable': '易燃' }[chem.flammability] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <h3 class="text-sm font-medium text-text-secondary mb-3">数据统计</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">储罐总数</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">{{ tankStore.tanks.length }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">危化品种类</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">{{ tankStore.chemicals.length }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">总容量</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">
                {{ tankStore.tanks.reduce((sum, t) => sum + t.capacity, 0).toLocaleString() }} m³
              </span>
            </div>
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">应急终端</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">5</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">避难所</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">3</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-bg-tertiary/50 rounded-lg">
              <span class="text-text-secondary">救援力量</span>
              <span class="text-2xl font-mono font-bold text-accent-cyan">5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
