<script setup lang="ts">
import { computed, toRefs } from 'vue'

const props = defineProps<{
  isRunning: boolean
  isPaused: boolean
  simulationSpeed: number
}>()

const { isRunning, isPaused, simulationSpeed } = toRefs(props)

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  stop: []
  speedChange: [speed: number]
}>()

const statusText = computed(() => {
  if (props.isPaused) return '已暂停'
  if (props.isRunning) return '运行中'
  return '已停止'
})

const statusColor = computed(() => {
  if (props.isPaused) return 'bg-amber-500'
  if (props.isRunning) return 'bg-emerald-500'
  return 'bg-slate-400'
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-slate-800 flex items-center">
        <span class="mr-2">🎛️</span>
        控制面板
      </h2>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full animate-pulse" :class="statusColor"></span>
        <span class="text-sm font-medium text-slate-600">{{ statusText }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <button
        v-if="!isRunning"
        @click="emit('start')"
        class="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <span class="text-lg">▶</span>
        开始仿真
      </button>
      
      <button
        v-if="isRunning && !isPaused"
        @click="emit('pause')"
        class="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <span class="text-lg">⏸</span>
        暂停
      </button>

      <button
        v-if="isPaused"
        @click="emit('resume')"
        class="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <span class="text-lg">▶</span>
        继续
      </button>

      <button
        v-if="isRunning || isPaused"
        @click="emit('stop')"
        class="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg shadow-red-200 hover:bg-red-600 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <span class="text-lg">⏹</span>
        停止
      </button>

      <div class="col-span-2 md:col-span-1"></div>
    </div>

    <div class="p-4 bg-slate-50 rounded-xl">
      <label class="block text-sm font-medium text-slate-700 mb-3">
        仿真速度: <span class="font-bold text-blue-600">{{ simulationSpeed.toFixed(1) }}x</span>
      </label>
      <input
        type="range"
        :value="simulationSpeed"
        @input="emit('speedChange', parseFloat(($event.target as HTMLInputElement).value))"
        min="0.1"
        max="5"
        step="0.1"
        class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div class="flex justify-between text-xs text-slate-500 mt-2">
        <span>0.1x</span>
        <span>1x</span>
        <span>2x</span>
        <span>5x</span>
      </div>
    </div>

    <div class="mt-6 pt-4 border-t border-slate-200">
      <h3 class="text-sm font-semibold text-slate-700 mb-3">快捷操作</h3>
      <div class="grid grid-cols-3 gap-3 text-xs">
        <div class="p-3 bg-slate-50 rounded-lg text-center">
          <div class="text-2xl mb-1">🔧</div>
          <p class="text-slate-600">点击工位卡片触发随机故障</p>
        </div>
        <div class="p-3 bg-slate-50 rounded-lg text-center">
          <div class="text-2xl mb-1">💾</div>
          <p class="text-slate-600">数据自动保存到 IndexedDB</p>
        </div>
        <div class="p-3 bg-slate-50 rounded-lg text-center">
          <div class="text-2xl mb-1">📈</div>
          <p class="text-slate-600">排队论算法实时识别瓶颈</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}
.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}
</style>
