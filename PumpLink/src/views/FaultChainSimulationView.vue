<template>
  <div class="fault-simulation-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <el-select v-model="selectedDeviceId" placeholder="选择设备" class="w-64" @change="resetSimulation">
          <el-option v-for="d in deviceStore.devices" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-select v-model="selectedCause" placeholder="选择故障诱因" class="w-48">
          <el-option v-for="cause in availableCauses" :key="cause" :label="cause" :value="cause" />
        </el-select>
        <el-button type="primary" @click="runSimulation" :disabled="isSimulating">
          <el-icon class="mr-1"><VideoPlay /></el-icon>
          {{ isSimulating ? '模拟中...' : '开始模拟' }}
        </el-button>
        <el-button @click="resetSimulation">重置</el-button>
      </div>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-text-secondary">置信度:</span>
        <span class="text-tech-accent font-mono font-bold">{{ (currentChain.confidence * 100).toFixed(0) }}%</span>
        <span class="text-text-secondary">预计故障时间:</span>
        <span class="text-status-warning font-mono font-bold">{{ currentChain.estimatedTimeToFailure }} 小时</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="tech-card col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-text-primary font-medium">故障传播路径</h3>
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-full bg-tech-accent"></span>
              <span class="text-text-secondary">根因</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-full bg-status-warning"></span>
              <span class="text-text-secondary">中间效应</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-full bg-status-critical"></span>
              <span class="text-text-secondary">最终症状</span>
            </div>
          </div>
        </div>
        <svg ref="graphSvg" class="w-full" height="400" viewBox="0 0 800 400">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(100, 255, 218, 0.5)" />
            </marker>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g v-for="edge in currentChain.propagationPath" :key="`${edge.from}-${edge.to}`">
            <line :x1="getNodeById(edge.from)?.x || 0" 
                  :y1="getNodeById(edge.from)?.y || 0"
                  :x2="getNodeById(edge.to)?.x || 0"
                  :y2="getNodeById(edge.to)?.y || 0"
                  stroke="rgba(100, 255, 218, 0.3)"
                  stroke-width="2"
                  marker-end="url(#arrowhead)"
                  :class="{ 'animate-pulse': isEdgeActive(edge) }" />
          </g>

          <g v-for="node in currentChain.nodes" :key="node.id"
             @click="selectNode(node)"
             class="cursor-pointer">
            <circle :cx="node.x" :cy="node.y" r="40"
                    :fill="getNodeFill(node)"
                    :stroke="getNodeStroke(node)"
                    stroke-width="2"
                    :filter="activeNodeId === node.id ? 'url(#nodeGlow)' : ''"
                    class="transition-all duration-300"
                    :class="{ 'animate-pulse': activeNodeId === node.id }" />
            <text :x="node.x" :y="node.y" 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  class="text-xs font-medium fill-white pointer-events-none">
              {{ node.component }}
            </text>
            <text :x="node.x" :y="(node.y || 0) + 55" 
                  text-anchor="middle" 
                  class="text-xs fill-text-secondary pointer-events-none">
              {{ (node.probability * 100).toFixed(0) }}%
            </text>
          </g>
        </svg>

        <div class="mt-4">
          <label class="text-text-secondary text-sm mb-2 block">演化时间轴</label>
          <el-slider v-model="timeSlider" :min="0" :max="maxTime" :step="1"
                     @input="onTimeChange"
                     :marks="timeMarks" />
        </div>
      </div>

      <div class="space-y-6">
        <div class="tech-card">
          <h3 class="text-text-primary font-medium mb-4">节点详情</h3>
          <div v-if="selectedNode" class="space-y-4">
            <div>
              <p class="text-text-secondary text-xs mb-1">部件</p>
              <p class="text-text-primary font-medium">{{ selectedNode.component }}</p>
            </div>
            <div>
              <p class="text-text-secondary text-xs mb-1">描述</p>
              <p class="text-text-primary">{{ selectedNode.description }}</p>
            </div>
            <div>
              <p class="text-text-secondary text-xs mb-1">类型</p>
              <el-tag :type="getNodeTagType(selectedNode.type)" size="small">
                {{ getNodeTypeText(selectedNode.type) }}
              </el-tag>
            </div>
            <div>
              <p class="text-text-secondary text-xs mb-1">发生概率</p>
              <div class="h-2 bg-tech-bg rounded-full">
                <div class="h-full rounded-full bg-tech-accent" 
                     :style="{ width: `${selectedNode.probability * 100}%` }"></div>
              </div>
              <p class="text-right text-xs text-tech-accent font-mono mt-1">
                {{ (selectedNode.probability * 100).toFixed(1) }}%
              </p>
            </div>
            <div>
              <p class="text-text-secondary text-xs mb-1">发生时间</p>
              <p class="text-text-primary font-mono">{{ selectedNode.timePoint }} 小时后</p>
            </div>
          </div>
          <div v-else class="text-center py-8 text-text-secondary">
            点击节点查看详情
          </div>
        </div>

        <div class="tech-card">
          <h3 class="text-text-primary font-medium mb-4">因果关系矩阵</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr>
                  <th class="p-2 text-text-secondary font-normal"></th>
                  <th v-for="node in currentChain.nodes" :key="node.id" 
                      class="p-2 text-text-secondary font-normal text-center">
                    {{ node.component.substring(0, 2) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in causalityMatrix" :key="i">
                  <td class="p-2 text-text-secondary">{{ currentChain.nodes[i]?.component.substring(0, 2) }}</td>
                  <td v-for="(cell, j) in row" :key="j" 
                      class="p-2 text-center"
                      :style="{ background: getMatrixCellColor(cell) }">
                    <span :class="cell > 0.5 ? 'text-white' : 'text-text-secondary'">
                      {{ cell > 0 ? (cell * 100).toFixed(0) : '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="tech-card">
          <h3 class="text-text-primary font-medium mb-4">受影响部件</h3>
          <div class="flex flex-wrap gap-2">
            <el-tag v-for="comp in currentChain.affectedComponents" :key="comp"
                    type="danger" size="small" effect="dark">
              {{ comp }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { faultSimulator } from '@/algorithms/faultChain'
import type { FaultChain, FaultNode } from '@/types'

const deviceStore = useDeviceStore()

const selectedDeviceId = ref('')
const selectedCause = ref('入口压力不足')
const currentChain = ref<FaultChain>(faultSimulator.simulate('入口压力不足', ''))
const isSimulating = ref(false)
const activeNodeId = ref('')
const selectedNode = ref<FaultNode | null>(null)
const timeSlider = ref(0)

const availableCauses = faultSimulator.getAvailableCauses()

const maxTime = computed(() => {
  return Math.max(...currentChain.value.nodes.map(n => n.timePoint), 1)
})

const timeMarks = computed(() => {
  const marks: Record<number, string> = {}
  const step = Math.ceil(maxTime.value / 4)
  for (let i = 0; i <= maxTime.value; i += step) {
    marks[i] = `${i}h`
  }
  return marks
})

const causalityMatrix = computed(() => {
  return faultSimulator.calculateCausalityMatrix(currentChain.value)
})

function getNodeById(id: string): FaultNode | undefined {
  return currentChain.value.nodes.find(n => n.id === id)
}

function getNodeFill(node: FaultNode): string {
  if (activeNodeId.value === node.id) return '#64FFDA'
  if (node.timePoint > timeSlider.value) return 'rgba(100, 255, 218, 0.1)'
  if (node.type === 'cause') return 'rgba(100, 255, 218, 0.3)'
  if (node.type === 'symptom') return 'rgba(255, 23, 68, 0.3)'
  return 'rgba(255, 214, 0, 0.3)'
}

function getNodeStroke(node: FaultNode): string {
  if (node.timePoint > timeSlider.value) return 'rgba(100, 255, 218, 0.2)'
  if (node.type === 'cause') return '#64FFDA'
  if (node.type === 'symptom') return '#FF1744'
  return '#FFD600'
}

function getNodeTagType(type: string): 'success' | 'warning' | 'danger' | 'info' {
  if (type === 'cause') return 'success'
  if (type === 'symptom') return 'danger'
  return 'warning'
}

function getNodeTypeText(type: string): string {
  const map = { cause: '根因', effect: '中间效应', symptom: '症状' }
  return map[type as keyof typeof map] || type
}

function isEdgeActive(edge: { from: string; to: string }): boolean {
  const fromNode = getNodeById(edge.from)
  const toNode = getNodeById(edge.to)
  return fromNode?.timePoint! <= timeSlider.value && toNode?.timePoint! <= timeSlider.value
}

function selectNode(node: FaultNode) {
  selectedNode.value = node
  activeNodeId.value = node.id
}

function onTimeChange(val: number) {
  timeSlider.value = val
  const activeNode = currentChain.value.nodes.find(n => n.timePoint <= val && n.timePoint > val - 1)
  if (activeNode) {
    activeNodeId.value = activeNode.id
    selectedNode.value = activeNode
  }
}

async function runSimulation() {
  isSimulating.value = true
  activeNodeId.value = ''
  selectedNode.value = null
  timeSlider.value = 0

  currentChain.value = faultSimulator.simulate(selectedCause.value, selectedDeviceId.value)

  for await (const node of faultSimulator.animatePropagation(currentChain.value, 2)) {
    activeNodeId.value = node.id
    selectedNode.value = node
    timeSlider.value = node.timePoint
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  isSimulating.value = false
}

function resetSimulation() {
  currentChain.value = faultSimulator.simulate(selectedCause.value, selectedDeviceId.value)
  activeNodeId.value = ''
  selectedNode.value = null
  timeSlider.value = 0
}

function getMatrixCellColor(value: number): string {
  if (value === 0) return 'transparent'
  if (value > 0.7) return 'rgba(255, 23, 68, 0.6)'
  if (value > 0.4) return 'rgba(255, 214, 0, 0.4)'
  return 'rgba(100, 255, 218, 0.2)'
}

onMounted(() => {
  if (deviceStore.devices.length > 0) {
    selectedDeviceId.value = deviceStore.devices[0].id
    resetSimulation()
  }
})
</script>
