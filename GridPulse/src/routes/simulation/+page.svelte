<script lang="ts">
  import type { SolverConfig } from '$lib/types';
  import { simulationStore } from '$lib/stores/simulation';
  import FrequencyChart from '$lib/components/charts/FrequencyChart.svelte';
  import PhaseSpaceChart from '$lib/components/charts/PhaseSpaceChart.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

  const { 
    params, 
    config, 
    currentResult, 
    tasks, 
    runningTasks,
    updateParams, 
    updateConfig, 
    startSimulation 
  } = simulationStore;

  let isSimulating = false;

  async function handleStartSimulation() {
    isSimulating = true;
    try {
      await startSimulation();
    } finally {
      isSimulating = false;
    }
  }

  const integrationMethods = [
    { value: 'rk4', label: '四阶龙格-库塔 (RK4)' },
    { value: 'euler', label: '欧拉法' },
    { value: 'trapezoidal', label: '梯形法' }
  ];

  function formatTaskTime(date: Date) {
    return new Date(date).toLocaleString('zh-CN');
  }

  function getStatusColor(status: string) {
    return status === 'running' ? 'text-yellow-400' : 
           status === 'completed' ? 'text-green-400' : 
           status === 'failed' ? 'text-red-400' : 'text-dark-400';
  }

  $: chartData = $currentResult ? Array.from({ length: Math.min($currentResult.timeSeries.length, 2000) }, (_, i) => ({
    time: $currentResult.timeSeries[i],
    frequency: $currentResult.frequencySeries[i]
  })) : [];
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-1 space-y-6">
      <div class="card">
        <h3 class="text-lg font-bold text-white mb-4">仿真参数配置</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-dark-300 mb-2">惯性常数 M (s)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.1"
              value={$params.M}
              onchange={(e) => updateParams({ M: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">阻尼系数 D (pu)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.1"
              value={$params.D}
              onchange={(e) => updateParams({ D: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">机械功率 Pm (pu)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.01"
              value={$params.Pm}
              onchange={(e) => updateParams({ Pm: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">负荷功率 Pl (pu)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.01"
              value={$params.Pl}
              onchange={(e) => updateParams({ Pl: Number(e.target.value) })}
            />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-dark-300 mb-2">内电势 E (pu)</label>
              <input 
                type="number" 
                class="input-field w-full"
                step="0.01"
                value={$params.E}
                onchange={(e) => updateParams({ E: Number(e.target.value) })}
              />
            </div>
            <div>
              <label class="block text-sm text-dark-300 mb-2">母线电压 V (pu)</label>
              <input 
                type="number" 
                class="input-field w-full"
                step="0.01"
                value={$params.V}
                onchange={(e) => updateParams({ V: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">系统电抗 X (pu)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.01"
              value={$params.X}
              onchange={(e) => updateParams({ X: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-bold text-white mb-4">求解器配置</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-dark-300 mb-2">数值积分方法</label>
            <select 
              class="input-field w-full"
              value={$config.method}
              onchange={(e) => updateConfig({ method: e.target.value as SolverConfig['method'] })}
            >
              {#each integrationMethods as method}
                <option value={method.value}>{method.label}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">求解步长 dt (s)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="0.001"
              value={$config.dt}
              onchange={(e) => updateConfig({ dt: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label class="block text-sm text-dark-300 mb-2">仿真时长 (s)</label>
            <input 
              type="number" 
              class="input-field w-full"
              step="1"
              value={$config.tEnd}
              onchange={(e) => updateConfig({ tEnd: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <button 
        class="btn-primary w-full py-3 text-lg"
        onclick={handleStartSimulation}
        disabled={isSimulating || $runningTasks.length > 0}
      >
        {#if isSimulating || $runningTasks.length > 0}
          <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            仿真运行中...
          </span>
        {:else}
          开始仿真计算
        {/if}
      </button>
    </div>

    <div class="lg:col-span-2 space-y-6">
      {#if $currentResult}
        <div class="card">
          <h3 class="text-lg font-bold text-white mb-4">稳定性分析结果</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="text-center p-3 bg-dark-800/50 rounded-lg">
              <p class="text-xs text-dark-400">稳定裕度</p>
              <p class={`text-xl font-mono font-bold ${
                $currentResult.stabilityMargin.margin > 0.2 ? 'text-green-400' : 
                $currentResult.stabilityMargin.margin > 0.1 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {($currentResult.stabilityMargin.margin * 100).toFixed(1)}%
              </p>
            </div>
            <div class="text-center p-3 bg-dark-800/50 rounded-lg">
              <p class="text-xs text-dark-400">频率最低点</p>
              <p class="text-xl font-mono font-bold text-accent-400">
                {$currentResult.stabilityMargin.nadir.toFixed(3)} Hz
              </p>
            </div>
            <div class="text-center p-3 bg-dark-800/50 rounded-lg">
              <p class="text-xs text-dark-400">最大偏差</p>
              <p class="text-xl font-mono font-bold text-yellow-400">
                {$currentResult.stabilityMargin.maxDeviation.toFixed(3)} Hz
              </p>
            </div>
            <div class="text-center p-3 bg-dark-800/50 rounded-lg">
              <p class="text-xs text-dark-400">恢复时间</p>
              <p class="text-xl font-mono font-bold text-white">
                {$currentResult.stabilityMargin.recoveryTime.toFixed(2)} s
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-4 mb-4">
            <span class={`px-3 py-1 rounded-full text-sm font-medium ${
              $currentResult.stabilityMargin.isStable 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {$currentResult.stabilityMargin.isStable ? '✓ 系统稳定' : '✗ 系统失稳'}
            </span>
            <span class="text-sm text-dark-400">
              ROCOF: {$currentResult.stabilityMargin.rocof.toFixed(3)} Hz/s
            </span>
            <span class="text-sm text-dark-400">
              稳态频率: {$currentResult.stabilityMargin.settlingFrequency.toFixed(3)} Hz
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card">
            <h3 class="text-lg font-bold text-white mb-4">频率响应曲线</h3>
            <div class="overflow-x-auto">
              <FrequencyChart
                data={chartData}
                width={500}
                height={300}
                title=""
              />
            </div>
          </div>
          <div class="card">
            <h3 class="text-lg font-bold text-white mb-4">相空间轨迹</h3>
            <PhaseSpaceChart
              deltaData={$currentResult.deltaSeries}
              omegaData={$currentResult.omegaSeries}
              width={300}
              height={300}
            />
          </div>
        </div>
      {:else}
        <div class="card h-96 flex items-center justify-center">
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto text-dark-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-dark-400">配置参数后点击"开始仿真计算"查看结果</p>
          </div>
        </div>
      {/if}

      <div class="card">
        <h3 class="text-lg font-bold text-white mb-4">仿真任务历史</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-dark-400 text-sm border-b border-dark-700">
                <th class="pb-3">任务ID</th>
                <th class="pb-3">状态</th>
                <th class="pb-3">进度</th>
                <th class="pb-3">创建时间</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              {#each $tasks.slice(0, 10) as task}
                <tr class="border-b border-dark-800 hover:bg-dark-800/30">
                  <td class="py-3 font-mono text-xs text-accent-400">{task.id}</td>
                  <td class="py-3">
                    <span class={getStatusColor(task.status)}>
                      {task.status === 'pending' ? '等待中' : 
                       task.status === 'running' ? '运行中' : 
                       task.status === 'completed' ? '已完成' : '失败'}
                    </span>
                  </td>
                  <td class="py-3 w-40">
                    <ProgressBar value={task.progress} showValue={false} />
                  </td>
                  <td class="py-3 text-dark-400">{formatTaskTime(task.createdAt)}</td>
                </tr>
              {/each}
              {#if $tasks.length === 0}
                <tr>
                  <td colspan="4" class="py-8 text-center text-dark-500">暂无仿真任务</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
