<script>
  import { boilerState, oxygenHistory, efficiencyTrend, systemStatus, combustionQuality } from '../lib/stores/boilerStore.js';
  import { MONITOR_PARAMS } from '../lib/constants/boilerConstants.js';
  import MonitorCard from './MonitorCard.svelte';
  import RealtimeChart from './RealtimeChart.svelte';
</script>

<div class="monitor-panel">
  <div class="panel-header">
    <h2 class="text-xl font-bold text-white">实时监控面板</h2>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 text-sm">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span class="text-gray-400">数据采集中</span>
      </div>
      <div class="text-sm text-gray-400">
        数据点: {$systemStatus.dataPoints.toLocaleString()}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
    {#each MONITOR_PARAMS as param}
      <MonitorCard param={param} value={$boilerState[param.id]} />
    {/each}
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="text-lg font-semibold text-white">烟气氧含量趋势</h3>
        <span class="text-sm text-gray-400">最优范围: 3.5% - 5.0%</span>
      </div>
      <RealtimeChart
        data={$oxygenHistory}
        color="#3b82f6"
        yLabel="氧含量 (%)"
        yMin={2}
        yMax={8}
        height={220}
      />
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h3 class="text-lg font-semibold text-white">热效率趋势</h3>
        <span class="text-sm text-gray-400">当前: {$boilerState.efficiency.toFixed(2)}%</span>
      </div>
      <RealtimeChart
        data={$efficiencyTrend}
        color="#06b6d4"
        yLabel="热效率 (%)"
        yMin={75}
        yMax={98}
        height={220}
      />
    </div>
  </div>

  <div class="mt-6 quality-card">
    <div class="quality-header">
      <h3 class="text-lg font-semibold text-white">燃烧质量综合评估</h3>
      <div class="quality-score {$combustionQuality.overall >= 80 ? 'text-green-400' : $combustionQuality.overall >= 60 ? 'text-yellow-400' : 'text-red-400'}">
        {$combustionQuality.overall} 分
      </div>
    </div>
    <div class="quality-grid">
      <div class="quality-item">
        <div class="flex justify-between mb-1">
          <span class="text-sm text-gray-400">配风合理性</span>
          <span class="text-sm text-blue-400">{$combustionQuality.oxygen}%</span>
        </div>
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full transition-all duration-500" style="width: {$combustionQuality.oxygen}%"></div>
        </div>
      </div>
      <div class="quality-item">
        <div class="flex justify-between mb-1">
          <span class="text-sm text-gray-400">温度稳定性</span>
          <span class="text-sm text-red-400">{$combustionQuality.temperature}%</span>
        </div>
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-red-500 rounded-full transition-all duration-500" style="width: {$combustionQuality.temperature}%"></div>
        </div>
      </div>
      <div class="quality-item">
        <div class="flex justify-between mb-1">
          <span class="text-sm text-gray-400">热效率</span>
          <span class="text-sm text-cyan-400">{$combustionQuality.efficiency}%</span>
        </div>
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-cyan-500 rounded-full transition-all duration-500" style="width: {$combustionQuality.efficiency}%"></div>
        </div>
      </div>
      <div class="quality-item">
        <div class="flex justify-between mb-1">
          <span class="text-sm text-gray-400">排放控制</span>
          <span class="text-sm text-purple-400">{$combustionQuality.emissions}%</span>
        </div>
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-purple-500 rounded-full transition-all duration-500" style="width: {$combustionQuality.emissions}%"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .monitor-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 23, 0.98) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(59, 130, 246, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .chart-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .quality-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .quality-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .quality-score {
    font-size: 2rem;
    font-weight: bold;
  }

  .quality-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }
</style>
