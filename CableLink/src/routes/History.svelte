<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getSensorDataAggregates, getDistinctSensorIds } from '@/db/sensor';
  import { getStorageStats } from '@/db';
  import { formatTemperature, formatDateTime, formatBytes } from '@/utils/format';
  import LineChart from '@/components/charts/LineChart.svelte';

  let selectedSensor = $state('all');
  let timeRange = $state('24h');
  let isLoading = $state(false);
  let sensorIds = $state<string[]>([]);
  let aggregates = $state<Array<{
    timestamp: number;
    avgTemp: number;
    maxTemp: number;
    minTemp: number;
    avgCurrent: number;
    count: number;
  }>>([]);
  let storageStats = $state<{
    sensorRecords: number;
    alertRecords: number;
    predictionRecords: number;
    estimatedSizeMB: number;
  } | null>(null);

  const timeRangeOptions = [
    { value: '1h', label: '最近1小时', ms: 3600000 },
    { value: '6h', label: '最近6小时', ms: 21600000 },
    { value: '24h', label: '最近24小时', ms: 86400000 },
    { value: '7d', label: '最近7天', ms: 604800000 },
    { value: '30d', label: '最近30天', ms: 2592000000 }
  ];

  const loadData = async () => {
    isLoading = true;
    try {
      const range = timeRangeOptions.find(r => r.value === timeRange);
      const endTime = Date.now();
      const startTime = endTime - (range?.ms || 86400000);

      const intervalMs = (range?.ms || 86400000) > 86400000 ? 3600000 : 300000;

      aggregates = await getSensorDataAggregates(
        startTime,
        endTime,
        selectedSensor === 'all' ? undefined : selectedSensor,
        intervalMs
      );

      sensorIds = await getDistinctSensorIds();
      storageStats = await getStorageStats();
    } finally {
      isLoading = false;
    }
  };

  let intervalId: number | null = null;

  onMount(() => {
    loadData();
    intervalId = window.setInterval(() => {
      loadData();
    }, 60000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  const exportData = () => {
    const csvContent = [
      ['时间', '平均温度(°C)', '最高温度(°C)', '最低温度(°C)', '平均电流(A)', '数据点数'].join(','),
      ...aggregates.map((a: { timestamp: number; avgTemp: number; maxTemp: number; minTemp: number; avgCurrent: number; count: number }) => [
        formatDateTime(a.timestamp),
        a.avgTemp.toFixed(2),
        a.maxTemp.toFixed(2),
        a.minTemp.toFixed(2),
        a.avgCurrent.toFixed(2),
        a.count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cablelink-data-${timeRange}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">历史数据</h1>
      <p class="text-gray-400 mt-1">长周期历史数据查询与分析</p>
    </div>
    <div class="flex items-center gap-3">
      <button onclick={exportData} disabled={aggregates.length === 0} class="btn-secondary">
        导出 CSV
      </button>
      <button onclick={loadData} disabled={isLoading} class="btn-primary">
        {isLoading ? '加载中...' : '刷新数据'}
      </button>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-4">
    <div class="flex items-center gap-2">
      <label class="text-sm text-gray-400" for="sensor-select">传感器:</label>
      <select
        id="sensor-select"
        bind:value={selectedSensor}
        onchange={loadData}
        class="px-3 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan"
      >
        <option value="all">全部传感器</option>
        {#each sensorIds as id}
          <option value={id}>{id}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-400">时间范围:</span>
      <div class="flex bg-space-light rounded-lg p-1" role="group">
        {#each timeRangeOptions as opt}
          <button
            onclick={() => { timeRange = opt.value; loadData(); }}
            class={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === opt.value
                ? 'bg-tech-cyan text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-pressed={timeRange === opt.value}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if storageStats}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="panel p-4">
        <p class="text-xs text-gray-400 mb-1">传感器数据记录</p>
        <p class="text-2xl font-bold text-tech-cyan font-mono">{storageStats.sensorRecords.toLocaleString()}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-gray-400 mb-1">告警记录</p>
        <p class="text-2xl font-bold text-warning-orange font-mono">{storageStats.alertRecords.toLocaleString()}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-gray-400 mb-1">预测记录</p>
        <p class="text-2xl font-bold text-safe-green font-mono">{storageStats.predictionRecords.toLocaleString()}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-gray-400 mb-1">估计存储大小</p>
        <p class="text-2xl font-bold text-white font-mono">{formatBytes(storageStats.estimatedSizeMB * 1024 * 1024)}</p>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="panel-glow p-12 text-center">
      <div class="animate-spin w-8 h-8 border-2 border-tech-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-400">正在加载历史数据...</p>
    </div>
  {:else if aggregates.length > 0}
    <div class="panel-glow p-5">
      <h3 class="text-lg font-semibold text-white mb-4">温度趋势</h3>
      <div class="h-[300px]">
        <LineChart
          data={aggregates.map((a: { avgTemp: number }) => a.avgTemp)}
          labels={aggregates.map((a: { timestamp: number }) => formatDateTime(a.timestamp))}
          color="#3E92CC"
          yLabel="温度 (°C)"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="panel-glow p-5">
        <h3 class="text-lg font-semibold text-white mb-4">最高/最低温度</h3>
        <div class="h-[250px]">
          <LineChart
            data={aggregates.map((a: { maxTemp: number }) => a.maxTemp)}
            labels={aggregates.map((a: { timestamp: number }) => formatDateTime(a.timestamp))}
            color="#E63946"
            yLabel="最高温度 (°C)"
          />
        </div>
      </div>
      <div class="panel-glow p-5">
        <h3 class="text-lg font-semibold text-white mb-4">平均载流量</h3>
        <div class="h-[250px]">
          <LineChart
            data={aggregates.map((a: { avgCurrent: number }) => a.avgCurrent)}
            labels={aggregates.map((a: { timestamp: number }) => formatDateTime(a.timestamp))}
            color="#2EC4B6"
            yLabel="电流 (A)"
          />
        </div>
      </div>
    </div>

    <div class="panel-glow p-5">
      <h3 class="text-lg font-semibold text-white mb-4">数据明细</h3>
      <div class="overflow-x-auto max-h-[400px]">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-space-gray z-10">
            <tr class="text-left text-gray-400 border-b border-gray-700">
              <th class="py-3 px-4 font-medium">时间</th>
              <th class="py-3 px-4 font-medium">平均温度</th>
              <th class="py-3 px-4 font-medium">最高温度</th>
              <th class="py-3 px-4 font-medium">最低温度</th>
              <th class="py-3 px-4 font-medium">平均电流</th>
              <th class="py-3 px-4 font-medium">数据点</th>
            </tr>
          </thead>
          <tbody>
            {#each [...aggregates].reverse().slice(0, 50) as agg}
              <tr class="border-b border-gray-800 hover:bg-space-light/50 transition-colors">
                <td class="py-3 px-4 font-mono text-gray-300">{formatDateTime(agg.timestamp)}</td>
                <td class="py-3 px-4 font-mono text-tech-cyan">{formatTemperature(agg.avgTemp)}</td>
                <td class="py-3 px-4 font-mono text-danger-red">{formatTemperature(agg.maxTemp)}</td>
                <td class="py-3 px-4 font-mono text-safe-green">{formatTemperature(agg.minTemp)}</td>
                <td class="py-3 px-4 font-mono text-warning-orange">{agg.avgCurrent.toFixed(0)}A</td>
                <td class="py-3 px-4 font-mono text-gray-400">{agg.count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if aggregates.length > 50}
        <p class="text-center text-sm text-gray-500 mt-4">仅显示最近 50 条记录，共 {aggregates.length} 条</p>
      {/if}
    </div>
  {:else}
    <div class="panel-glow p-12 text-center">
      <div class="text-5xl mb-4">📊</div>
      <p class="text-gray-400">暂无历史数据</p>
      <p class="text-sm text-gray-500 mt-2">系统正在收集中，请稍后查看</p>
    </div>
  {/if}
</div>
