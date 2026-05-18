<script>
  import {
    isSimulating,
    isInitialized,
    stats,
    wafers,
    roadNetwork,
    startSimulation,
    stopSimulation,
    setSimulationSpeed,
    generateRandomTasks
  } from '../store/AMHSStore.js'

  let speed = $state(1)

  const handleSpeedChange = (e) => {
    speed = parseFloat(e.target.value)
    setSimulationSpeed(speed)
  }
</script>

<div class="space-y-5">
  <div class="flex gap-3">
    {#if !$isSimulating}
      <button
        onclick={() => startSimulation()}
        class="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
      >
        <span class="mr-1.5">▶</span>开始模拟
      </button>
    {:else}
      <button
        onclick={() => stopSimulation()}
        class="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
      >
        <span class="mr-1.5">⏹</span>停止模拟
      </button>
    {/if}
  </div>

  <button
    onclick={() => generateRandomTasks(5)}
    class="w-full px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
  >
    <span class="mr-1.5">➕</span>生成随机任务
  </button>

  <div class="bg-slate-800/50 rounded-xl p-4">
    <label class="block text-sm text-slate-300 mb-3 font-medium">
      模拟速度: <span class="text-cyan-400">{speed.toFixed(1)}x</span>
    </label>
    <input
      type="range"
      min="0.1"
      max="5"
      step="0.1"
      value={speed}
      oninput={handleSpeedChange}
      class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
    />
    <div class="flex justify-between text-xs text-slate-500 mt-2">
      <span>0.1x</span>
      <span>2.5x</span>
      <span>5x</span>
    </div>
  </div>

  <div class="pt-4 border-t border-slate-700/50">
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-slate-800/30 rounded-lg p-3">
        <p class="text-xs text-slate-500 mb-1">OHT 总数</p>
        <p class="text-lg font-semibold text-white">{$stats.totalOHTs}</p>
      </div>
      <div class="bg-slate-800/30 rounded-lg p-3">
        <p class="text-xs text-slate-500 mb-1">晶圆总数</p>
        <p class="text-lg font-semibold text-white">{$wafers.size}</p>
      </div>
      <div class="bg-slate-800/30 rounded-lg p-3">
        <p class="text-xs text-slate-500 mb-1">路网节点</p>
        <p class="text-lg font-semibold text-white">{$roadNetwork?.nodes.size || 0}</p>
      </div>
      <div class="bg-slate-800/30 rounded-lg p-3">
        <p class="text-xs text-slate-500 mb-1">路网路径</p>
        <p class="text-lg font-semibold text-white">{$roadNetwork?.edges.size || 0}</p>
      </div>
    </div>
  </div>
</div>
