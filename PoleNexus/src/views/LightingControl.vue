<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import AppHeader from '@/components/AppHeader.vue'
import { usePoleStore } from '@/stores/poleStore'
import { useSyncService } from '@/services/syncService'
import { useEnergySavingService } from '@/services/energySavingService'
import { commandStore } from '@/services/indexedDB'
import type { DimmingCommand, EnergySavingRule } from '@/types'
import { formatPower } from '@/utils/helpers'

const poleStore = usePoleStore()
const syncService = useSyncService()
const energySavingService = useEnergySavingService()

const selectedPoles = ref<Set<string>>(new Set())
const groupBrightness = ref(70)
const commandReason = ref('')
const commands = ref<DimmingCommand[]>([])
const rules = ref<EnergySavingRule[]>([])
const isSending = ref(false)
const autoSavingEnabled = ref(false)

const onlinePoles = computed(() => poleStore.poles.filter(p => p.status === 'online'))

const totalSelectedPower = computed(() => {
  return selectedPoles.value.size > 0
    ? poleStore.poles
        .filter(p => selectedPoles.value.has(p.id))
        .reduce((sum, p) => sum + p.power, 0)
    : 0
})

function togglePoleSelection(poleId: string): void {
  if (selectedPoles.value.has(poleId)) {
    selectedPoles.value.delete(poleId)
  } else {
    selectedPoles.value.add(poleId)
  }
  selectedPoles.value = new Set(selectedPoles.value)
}

function selectAll(): void {
  if (selectedPoles.value.size === onlinePoles.value.length) {
    selectedPoles.value.clear()
  } else {
    selectedPoles.value = new Set(onlinePoles.value.map(p => p.id))
  }
}

function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    online: 'status-online',
    offline: 'status-offline',
    warning: 'status-warning',
  }
  return classMap[status] || ''
}

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    warning: '告警',
  }
  return textMap[status] || status
}

function getModeText(mode: string): string {
  const textMap: Record<string, string> = {
    manual: '手动',
    auto: '自动',
    schedule: '定时',
    energy_saving: '节能',
  }
  return textMap[mode] || mode
}

function getCommandStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    pending: 'status-warning',
    sent: 'status-online',
    executed: 'status-online',
    failed: 'status-offline',
  }
  return classMap[status] || ''
}

function getCommandStatusText(status: string): string {
  const textMap: Record<string, string> = {
    pending: '待发送',
    sent: '已发送',
    executed: '已执行',
    failed: '失败',
  }
  return textMap[status] || status
}

async function sendDimmingCommand(): Promise<void> {
  if (selectedPoles.value.size === 0) {
    alert('请先选择至少一个灯杆')
    return
  }

  isSending.value = true
  try {
    const command = await energySavingService.createDimmingCommand(
      Array.from(selectedPoles.value),
      groupBrightness.value,
      'manual',
      commandReason.value || undefined
    )
    
    await energySavingService.sendCommand(command)
    await loadCommands()
    
    selectedPoles.value.clear()
    commandReason.value = ''
  } finally {
    isSending.value = false
  }
}

async function applyEnergySaving(): Promise<void> {
  if (selectedPoles.value.size === 0) {
    alert('请先选择至少一个灯杆')
    return
  }

  const hour = new Date().getHours()
  const brightness = energySavingService.calculateBrightness({
    baseBrightness: 100,
    timeOfDay: hour,
  })

  isSending.value = true
  try {
    const command = await energySavingService.createDimmingCommand(
      Array.from(selectedPoles.value),
      brightness,
      'energy_saving',
      '应用节能规则'
    )
    
    await energySavingService.sendCommand(command)
    await loadCommands()
    
    selectedPoles.value.clear()
  } finally {
    isSending.value = false
  }
}

function toggleAutoSaving(): void {
  autoSavingEnabled.value = !autoSavingEnabled.value
  if (autoSavingEnabled.value) {
    energySavingService.startEnergySavingModel(30000)
  } else {
    energySavingService.stopEnergySavingModel()
  }
}

async function loadCommands(): Promise<void> {
  commands.value = await commandStore.getAll()
}

function loadRules(): void {
  rules.value = energySavingService.getRules()
}

function toggleRule(ruleId: string): void {
  const rule = rules.value.find(r => r.id === ruleId)
  if (rule) {
    energySavingService.updateRule(ruleId, { enabled: !rule.enabled })
    loadRules()
  }
}

let syncUnsubscribe: (() => void) | null = null

onMounted(async () => {
  await poleStore.loadPoles()
  await loadCommands()
  loadRules()
  
  syncUnsubscribe = syncService.on('command_sent', () => {
    loadCommands()
  })
})

onUnmounted(() => {
  if (autoSavingEnabled.value) {
    energySavingService.stopEnergySavingModel()
  }
  syncUnsubscribe?.()
})
</script>

<template>
  <div class="layout">
    <AppHeader />
    
    <main class="content">
      <div class="grid grid-4">
        <div class="stat-card">
          <div class="value">{{ onlinePoles.length }}</div>
          <div class="label">可控制设备</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #1890ff">{{ selectedPoles.size }}</div>
          <div class="label">已选择</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #faad14">{{ formatPower(totalSelectedPower) }}</div>
          <div class="label">选中功率</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ commands.filter(c => c.status === 'pending').length }}</div>
          <div class="label">待执行指令</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top: 24px">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">批量控制</h3>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 20px">
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500">
                目标亮度: {{ groupBrightness }}%
              </label>
              <input
                v-model.number="groupBrightness"
                type="range"
                min="0"
                max="100"
                class="slider"
              />
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #999; margin-top: 4px">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500">
                操作说明 (可选)
              </label>
              <textarea
                v-model="commandReason"
                placeholder="请输入操作原因..."
                style="width: 100%; padding: 12px; border: 1px solid #d9d9d9; border-radius: 4px; resize: vertical; min-height: 80px"
              ></textarea>
            </div>
            
            <div style="display: flex; gap: 12px">
              <button
                class="btn btn-primary"
                :disabled="selectedPoles.size === 0 || isSending"
                @click="sendDimmingCommand"
              >
                {{ isSending ? '发送中...' : '发送调光指令' }}
              </button>
              <button
                class="btn btn-success"
                :disabled="selectedPoles.size === 0"
                @click="applyEnergySaving"
              >
                应用节能模式
              </button>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">自动节能</h3>
            <label class="switch">
              <input type="checkbox" v-model="autoSavingEnabled" @change="toggleAutoSaving" />
              <span class="switch-slider"></span>
            </label>
          </div>
          
          <div style="max-height: 200px; overflow-y: auto">
            <div v-for="rule in rules" :key="rule.id" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0">
              <div>
                <div style="font-weight: 500">{{ rule.name }}</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px">
                  {{ rule.startHour }}:00 - {{ rule.endHour }}:00 | 亮度: {{ rule.brightness }}% | 优先级: {{ rule.priority }}
                </div>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="rule.enabled"
                  @change="toggleRule(rule.id)"
                />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <div class="card-header">
          <h3 class="card-title">设备列表</h3>
          <button
            class="btn btn-sm btn-primary"
            @click="selectAll"
          >
            {{ selectedPoles.size === onlinePoles.length ? '取消全选' : '全选在线' }}
          </button>
        </div>
        
        <div style="overflow-x: auto">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 50px">选择</th>
                <th>灯杆编号</th>
                <th>位置</th>
                <th>状态</th>
                <th>当前亮度</th>
                <th>功率</th>
                <th>调光模式</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pole in poleStore.poles" :key="pole.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedPoles.has(pole.id)"
                    :disabled="pole.status === 'offline'"
                    @change="togglePoleSelection(pole.id)"
                  />
                </td>
                <td>{{ pole.name }}</td>
                <td>{{ pole.location }}</td>
                <td>
                  <span :class="['status-badge', getStatusClass(pole.status)]">
                    {{ getStatusText(pole.status) }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <div class="progress-bar" style="width: 60px">
                      <div class="progress-bar-fill" :style="{ width: `${pole.brightness}%` }"></div>
                    </div>
                    {{ pole.brightness }}%
                  </div>
                </td>
                <td>{{ formatPower(pole.power) }}</td>
                <td>{{ getModeText(pole.dimmingMode) }}</td>
                <td>
                  <button
                    class="btn btn-sm"
                    :class="pole.isOn ? 'btn-warning' : 'btn-success'"
                    :disabled="pole.status === 'offline'"
                    @click="poleStore.togglePole(pole.id)"
                  >
                    {{ pole.isOn ? '关闭' : '开启' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <div class="card-header">
          <h3 class="card-title">指令历史</h3>
        </div>
        
        <div style="overflow-x: auto">
          <table class="table">
            <thead>
              <tr>
                <th>指令ID</th>
                <th>目标灯杆数</th>
                <th>目标亮度</th>
                <th>模式</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cmd in commands.slice(0, 10)" :key="cmd.id">
                <td style="font-family: monospace; font-size: 12px">{{ cmd.id.slice(0, 12) }}...</td>
                <td>{{ cmd.poleIds.length }}</td>
                <td>{{ cmd.brightness }}%</td>
                <td>{{ getModeText(cmd.mode) }}</td>
                <td>
                  <span :class="['status-badge', getCommandStatusClass(cmd.status)]">
                    {{ getCommandStatusText(cmd.status) }}
                  </span>
                </td>
                <td>{{ dayjs(cmd.createdAt).format('HH:mm:ss') }}</td>
                <td>{{ cmd.reason || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="commands.length === 0" style="text-align: center; padding: 40px; color: #999">
          暂无指令记录
        </div>
      </div>
    </main>
  </div>
</template>