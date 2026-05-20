<script lang="ts">
  import { $state, $derived } from 'svelte';
  import { gridStore } from '$lib/stores/grid';
  import MetricCard from '$lib/components/ui/MetricCard.svelte';
  import FrequencyChart from '$lib/components/charts/FrequencyChart.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

  const { systemStatus, totalInertia, onlineGeneration, gridSystem } = gridStore;

  let historyData = $state<{ time: number; frequency: number }[]>([]);
  const maxHistoryPoints = 500;
  let startTime = Date.now();

  $effect(() => {
    const now = (Date.now() - startTime) / 1000;
    historyData.push({ time: now, frequency: systemStatus.currentFrequency });
    
    if (historyData.length > maxHistoryPoints) {
      historyData.shift();
    }
  });

  const stabilityStatus = $derived(
    systemStatus.stabilityMargin > 0.3 ? 'normal' : 
    systemStatus.stabilityMargin > 0.15 ? 'warning' : 'danger'
  );

  const freqStatus = $derived(
    Math.abs(systemStatus.frequencyDeviation) < 0.1 ? 'normal' : 
    Math.abs(systemStatus.frequencyDeviation) < 0.2 ? 'warning' : 'danger'
  );

  const reserveStatus = $derived(
    systemStatus.spinningReserve > 15 ? 'normal' : 
    systemStatus.spinningReserve > 8 ? 'warning' : 'danger'
  );

  function getGeneratorStatusColor(status: string) {
    return status === 'online' ? 'bg-green-500' : 
           status === 'derated' ? 'bg-yellow-500' : 'bg-red-500';
  }

  function getGeneratorTypeLabel(type: string) {
    const labels: Record<string, string> = {
      'synchronous': '同步发电机',
      'inverter-based': '逆变器接口',
      'wind': '风力发电',
      'solar': '光伏发电'
    };
    return labels[type] || type;
  }
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      label="系统频率"
      value={systemStatus.currentFrequency.toFixed(3)}
      unit="Hz"
      status={freqStatus}
      trend={systemStatus.frequencyDeviation >= 0 ? 'up' : 'down'}
      trendValue={`${Math.abs(systemStatus.frequencyDeviation).toFixed(3)} Hz`}
      icon="M13 10V3L4 14h7v7l9-11h-7z"
    />
    <MetricCard
      label="有功功率"
      value={systemStatus.totalGeneration.toFixed(1)}
      unit="MW"
      status="normal"
      icon="M13 10V3L4 14h7v7l9-11h-7z"
    />
    <MetricCard
      label="总负荷"
      value={systemStatus.totalLoad.toFixed(1)}
      unit="MW"
      status="normal"
      icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
    />
    <MetricCard
      label="稳定裕度"
      value={(systemStatus.stabilityMargin * 100).toFixed(1)}
      unit="%"
      status={stabilityStatus}
      icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">频率实时监控</h3>
          <div class="flex items-center gap-2 text-sm text-dark-400">
            <span class="status-dot status-online"></span>
            <span>实时更新中</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <FrequencyChart
            data={historyData}
            width={800}
            height={350}
            title=""
          />
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div class="card">
        <h3 class="text-lg font-bold text-white mb-4">系统运行指标</h3>
        <div class="space-y-4">
          <div>
            <ProgressBar
              label="旋转备用"
              value={(systemStatus.spinningReserve / 20) * 100}
              color={systemStatus.spinningReserve > 15 ? 'green' : systemStatus.spinningReserve > 8 ? 'yellow' : 'red'}
            />
            <p class="text-xs text-dark-400 mt-1">当前: {systemStatus.spinningReserve.toFixed(1)} MW / 20 MW</p>
          </div>
          <div>
            <ProgressBar
              label="系统惯量"
              value={(totalInertia / 4) * 100}
              color={totalInertia > 3 ? 'green' : totalInertia > 2 ? 'yellow' : 'red'}
            />
            <p class="text-xs text-dark-400 mt-1">当前: {totalInertia.toFixed(2)} s (标幺值)</p>
          </div>
          <div>
            <ProgressBar
              label="在线容量"
              value={(onlineGeneration / gridSystem.totalCapacity) * 100}
              color="accent"
            />
            <p class="text-xs text-dark-400 mt-1">当前: {onlineGeneration} MW / {gridSystem.totalCapacity} MW</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-bold text-white mb-4">发电机状态</h3>
        <div class="space-y-3">
          {#each gridSystem.generators as gen}
            <div class="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
              <div class="flex items-center gap-3">
                <span class={`w-2 h-2 rounded-full ${getGeneratorStatusColor(gen.status)}`}></span>
                <div>
                  <p class="text-sm font-medium text-white">{gen.id.toUpperCase()}</p>
                  <p class="text-xs text-dark-400">{getGeneratorTypeLabel(gen.type)}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-mono text-accent-400">{gen.ratedPower} MW</p>
                <p class="text-xs text-dark-400">H={gen.inertia}s</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">功率平衡分析</h3>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-2xl font-mono text-green-400">{systemStatus.totalGeneration.toFixed(1)}</p>
          <p class="text-xs text-dark-400 mt-1">发电 (MW)</p>
        </div>
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-2xl font-mono text-yellow-400">{systemStatus.totalLoad.toFixed(1)}</p>
          <p class="text-xs text-dark-400 mt-1">负荷 (MW)</p>
        </div>
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-2xl font-mono text-accent-400">
            {(systemStatus.totalGeneration - systemStatus.totalLoad).toFixed(1)}
          </p>
          <p class="text-xs text-dark-400 mt-1">差值 (MW)</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">快速操作</h3>
      <div class="grid grid-cols-2 gap-3">
        <a href="/simulation" class="btn-primary text-center">
          运行仿真
        </a>
        <a href="/load-data" class="btn-secondary text-center">
          查看负荷数据
        </a>
        <a href="/dispatch" class="btn-accent text-center">
          调度协同
        </a>
        <a href="/settings" class="btn-secondary text-center">
          系统设置
        </a>
      </div>
    </div>
  </div>
</div>
