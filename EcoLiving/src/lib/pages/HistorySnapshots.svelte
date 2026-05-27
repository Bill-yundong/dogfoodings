<script lang="ts">
  import { Download, TrendingDown, Zap, Clock, Database, ChevronDown, ChevronUp, BarChart3, RefreshCw } from '@lucide/svelte';
  import AreaChart from '@/lib/components/charts/AreaChart.svelte';
  import DonutChart from '@/lib/components/charts/DonutChart.svelte';
  import StatCard from '@/lib/components/cards/StatCard.svelte';
  import { useEnergyStore } from '@/lib/stores/energyStore.svelte.ts';
  import { formatEnergy, formatCost, formatDate } from '@/lib/utils/formatters';
  import type { EnergySnapshot, DeviceSnapshot } from '@/lib/types/energy';

  const store = useEnergyStore();

  let expandedSnapshotId = $state<string | null>(null);
  let isLoadingMore = $state(false);
  let selectedTimeRange = $state<'24h' | '7d' | '30d'>('24h');

  const timeRanges: { value: '24h' | '7d' | '30d'; label: string }[] = [
    { value: '24h', label: '最近24小时' },
    { value: '7d', label: '最近7天' },
    { value: '30d', label: '最近30天' },
  ];

  const consumptionChartData = $derived(() => 
    store.snapshots.map((s: EnergySnapshot) => ({
      timestamp: s.timestamp,
      value: s.totalConsumption,
      value2: s.standbyConsumption,
    })).reverse()
  );

  const efficiencyChartData = $derived(() =>
    store.snapshots.map((s: EnergySnapshot) => ({
      timestamp: s.timestamp,
      value: s.efficiencyScore,
    })).reverse()
  );

  const categoryBreakdown = $derived(() => {
    if (store.snapshots.length === 0) return [];
    
    const latest = store.snapshots[0];
    const breakdown: Record<string, number> = {};
    
    latest.deviceBreakdown.forEach((d: DeviceSnapshot) => {
      breakdown[d.category] = (breakdown[d.category] || 0) + d.consumption;
    });

    const colors: Record<string, string> = {
      climate: '#3B82F6',
      kitchen: '#F59E0B',
      entertainment: '#8B5CF6',
      lighting: '#00D4AA',
      other: '#64748B',
    };

    const labels: Record<string, string> = {
      climate: '空调暖通',
      kitchen: '厨房电器',
      entertainment: '娱乐设备',
      lighting: '照明系统',
      other: '其他设备',
    };

    return Object.entries(breakdown).map(([category, value]: [string, number]) => ({
      label: labels[category] || category,
      value,
      color: colors[category] || '#64748B',
    }));
  });

  const stats = $derived(() => {
    if (store.snapshots.length === 0) {
      return {
        totalConsumption: 0,
        avgEfficiency: 0,
        totalCost: 0,
        standbyRatio: 0,
      };
    }

    const totalConsumption = store.snapshots.reduce((sum: number, s: EnergySnapshot) => sum + s.totalConsumption, 0);
    const totalStandby = store.snapshots.reduce((sum: number, s: EnergySnapshot) => sum + s.standbyConsumption, 0);
    const avgEfficiency = store.snapshots.reduce((sum: number, s: EnergySnapshot) => sum + s.efficiencyScore, 0) / store.snapshots.length;
    const totalCost = store.snapshots.reduce((sum: number, s: EnergySnapshot) => sum + s.cost, 0);

    return {
      totalConsumption,
      avgEfficiency,
      totalCost,
      standbyRatio: totalStandby / Math.max(totalConsumption, 1),
    };
  });

  const topDevices = $derived(() => {
    if (store.snapshots.length === 0) return [];
    const latest = store.snapshots[0];
    return [...latest.deviceBreakdown]
      .sort((a: DeviceSnapshot, b: DeviceSnapshot) => b.consumption - a.consumption)
      .slice(0, 5);
  });

  function toggleSnapshot(id: string) {
    expandedSnapshotId = expandedSnapshotId === id ? null : id;
  }

  async function loadMore() {
    isLoadingMore = true;
    await store.loadMoreSnapshots(24);
    isLoadingMore = false;
  }

  async function exportData() {
    const data = await store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-snapshots-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getEfficiencyColor(score: number): string {
    if (score >= 90) return '#10B981';
    if (score >= 75) return '#00D4AA';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  }

  function getEfficiencyLabel(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '一般';
    return '较差';
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-100 mb-1">历史快照管理</h1>
      <p class="text-slate-400 text-sm">查看用能历史数据，分析能耗趋势</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
        {#each timeRanges as range}
          <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors"
            class:bg-primary-500={selectedTimeRange === range.value}
            class:text-white={selectedTimeRange === range.value}
            class:text-slate-400={selectedTimeRange !== range.value}
            on:click={() => selectedTimeRange = range.value}
          >
            {range.label}
          </button>
        {/each}
      </div>
      <button 
        class="btn-secondary text-sm flex items-center gap-2"
        on:click={exportData}
      >
        <Download size={16} />
        导出数据
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      title="累计能耗"
      value={stats().totalConsumption}
      unit="kWh"
      icon={Zap}
      color="#00D4AA"
      delay={0}
    />
    <StatCard
      title="平均能效"
      value={stats().avgEfficiency}
      unit="分"
      icon={BarChart3}
      color="#8B5CF6"
      delay={50}
    />
    <StatCard
      title="累计费用"
      value={stats().totalCost}
      unit="元"
      icon={TrendingDown}
      color="#3B82F6"
      delay={100}
    />
    <StatCard
      title="待机占比"
      value={stats().standbyRatio * 100}
      unit="%"
      icon={Clock}
      color="#F59E0B"
      delay={150}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-100 flex items-center gap-2">
          <BarChart3 size={18} class="text-primary-400" />
          能耗趋势分析
        </h3>
        <div class="flex items-center gap-4 text-xs">
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-primary-500" />
            总能耗
          </span>
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-amber-500" />
            待机能耗
          </span>
        </div>
      </div>
      <AreaChart
        data={consumptionChartData()}
        height={250}
        color="#00D4AA"
        color2="#F59E0B"
        showGradient={true}
        showArea={true}
        showLine={true}
      />
    </div>

    <div class="glass-card p-5">
      <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Zap size={18} class="text-primary-400" />
        分类能耗占比
      </h3>
      <DonutChart
        segments={categoryBreakdown()}
        size={180}
        thickness={20}
        showLabels={true}
      />
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 glass-card p-5">
      <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <BarChart3 size={18} class="text-primary-400" />
        能效评分趋势
      </h3>
      <AreaChart
        data={efficiencyChartData()}
        height={200}
        color="#8B5CF6"
        showGradient={true}
        showArea={true}
        showLine={true}
      />
    </div>

    <div class="glass-card p-5">
      <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Zap size={18} class="text-primary-400" />
        高能耗设备
      </h3>
      <div class="space-y-3">
        {#each topDevices() as device}
          <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div>
              <span class="text-sm text-slate-300">{device.name}</span>
              <p class="text-xs text-slate-500">运行 {device.runHours.toFixed(1)} 小时</p>
            </div>
            <span class="text-sm font-mono text-primary-400">
              {formatEnergy(device.consumption)}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-100 flex items-center gap-2">
        <Database size={18} class="text-primary-400" />
        历史快照记录
        <span class="ml-2 px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
          共 {store.snapshots.length} 条
        </span>
      </h3>
      <button 
        class="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
        on:click={() => store.resetAllData()}
      >
        <RefreshCw size={14} />
        重置数据
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-700/50">
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">时间</th>
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">总能耗</th>
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">待机能耗</th>
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">费用</th>
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">能效评分</th>
            <th class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each store.snapshots as snapshot}
            <tr 
              class="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors cursor-pointer"
              on:click={() => toggleSnapshot(snapshot.id)}
            >
              <td class="py-3 px-4">
                <span class="text-sm text-slate-300">{formatDate(snapshot.timestamp)}</span>
                <span class="text-xs text-slate-500 ml-2">{snapshot.hour}:00</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm font-mono text-slate-200">{formatEnergy(snapshot.totalConsumption)}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm font-mono text-amber-400">{formatEnergy(snapshot.standbyConsumption)}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm font-mono text-slate-200">{formatCost(snapshot.cost)}</span>
              </td>
              <td class="py-3 px-4">
                <span 
                  class="text-sm font-mono"
                  style="color: {getEfficiencyColor(snapshot.efficiencyScore)};"
                >
                  {snapshot.efficiencyScore.toFixed(0)} 分
                </span>
                <span 
                  class="ml-2 text-xs px-2 py-0.5 rounded-full"
                  style="background: {getEfficiencyColor(snapshot.efficiencyScore)}20; color: {getEfficiencyColor(snapshot.efficiencyScore)};"
                >
                  {getEfficiencyLabel(snapshot.efficiencyScore)}
                </span>
              </td>
              <td class="py-3 px-4">
                <button class="text-slate-500 hover:text-primary-400 transition-colors">
                  {#if expandedSnapshotId === snapshot.id}
                    <ChevronUp size={18} />
                  {:else}
                    <ChevronDown size={18} />
                  {/if}
                </button>
              </td>
            </tr>
            {#if expandedSnapshotId === snapshot.id}
              <tr class="bg-slate-800/30">
                <td colspan="6" class="py-4 px-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each snapshot.deviceBreakdown as device}
                      <div class="p-3 bg-slate-800/50 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm text-slate-300">{device.name}</span>
                          <span class="text-xs text-slate-500">{device.category}</span>
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-mono text-primary-400">
                            {formatEnergy(device.consumption)}
                          </span>
                          <span class="text-xs text-slate-500">
                            运行 {device.runHours.toFixed(1)}h
                          </span>
                        </div>
                        <div class="mt-2 progress-bar">
                          <div 
                            class="progress-bar-fill"
                            style="width: {Math.min(100, (device.consumption / snapshot.totalConsumption) * 100)}%;"
                          />
                        </div>
                      </div>
                    {/each}
                  </div>
                  {#if snapshot.weather}
                    <div class="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <span class="text-sm text-blue-400">
                        天气：温度 {snapshot.weather.temperature}°C，湿度 {snapshot.weather.humidity}%
                      </span>
                    </div>
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    {#if store.snapshots.length > 0}
      <div class="mt-4 text-center">
        <button 
          class="btn-secondary text-sm px-6 py-2 flex items-center gap-2 mx-auto"
          on:click={loadMore}
          disabled={isLoadingMore}
        >
          {#if isLoadingMore}
            <RefreshCw size={16} class="animate-spin" />
            加载中...
          {:else}
            加载更多
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <div class="glass-card p-5">
    <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
      <Database size={18} class="text-primary-400" />
      IndexedDB 存储状态
    </h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <span class="text-xs text-slate-500">设备数</span>
        <p class="text-xl font-bold text-slate-200 font-mono mt-1">{store.devices.length}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <span class="text-xs text-slate-500">快照数</span>
        <p class="text-xl font-bold text-slate-200 font-mono mt-1">{store.snapshots.length}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <span class="text-xs text-slate-500">浪费点记录</span>
        <p class="text-xl font-bold text-slate-200 font-mono mt-1">{store.wastePoints.length}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <span class="text-xs text-slate-500">建议记录</span>
        <p class="text-xl font-bold text-slate-200 font-mono mt-1">{store.suggestions.length}</p>
      </div>
    </div>
  </div>
</div>
