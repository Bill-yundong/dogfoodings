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

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 p-5">
  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span class="text-cyan-400">🎛️</span>
    控制面板
  </h3>

  <div class="space-y-4">
    <div class="flex gap-2">
      {#if !$isSimulating}
        <button
          onclick={() => startSimulation()}
          class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          ▶ 开始模拟
        </button>
      {:else}
        <button
          onclick={() => stopSimulation()}
          class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
        >
          ⏹ 停止模拟
        </button>
      {/if}
    </div>

    <button
      onclick={() => generateRandomTasks(5)}
      class="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
    >
      ➕ 生成随机任务
    </button>

    <div>
      <label class="block text-sm text-slate-400 mb-2">
        模拟速度: {speed.toFixed(1)}x
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
      <div class="flex justify-between text-xs text-slate-500 mt-1">
        <span>0.1x</span>
        <span>5x</span>
      </div>
    </div>

    <div class="pt-4 border-t border-slate-700/50">
      <div class="text-xs text-slate-400 space-y-1">
        <p>OHT 总数: {$stats.totalOHTs}</p>
        <p>晶圆总数: {$wafers.size}</p>
        <p>路网节点: {$roadNetwork?.nodes.size || 0}</p>
        <p>路网路径: {$roadNetwork?.edges.size || 0}</p>
      </div>
    </div>
  </div>
</div>
