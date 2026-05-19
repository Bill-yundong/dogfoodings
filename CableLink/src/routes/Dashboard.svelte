<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { realtimeStore } from '@/stores/realtime';
  import { alertStore } from '@/stores/alerts';
  import { formatTemperature, formatCurrent, formatDistance, getTemperatureColor } from '@/utils/format';
  import StatCard from '@/components/common/StatCard.svelte';
  import ThermalHeatmap from '@/components/charts/ThermalHeatmap.svelte';
  import LineChart from '@/components/charts/LineChart.svelte';
  import AlertItem from '@/components/alerts/AlertItem.svelte';

  let tempHistory = $state<number[]>([]);
  let currentHistory = $state<number[]>([]);
  let timeLabels = $state<string[]>([]);
  let intervalId: number | null = null;

  const {
    sensorData,
    maxTemperature,
    avgTemperature,
    avgCurrent,
    hotspotLocation,
    cableParams
  } = realtimeStore;

  const { alerts } = alertStore;

  onMount(() => {
    intervalId = window.setInterval(() => {
      const maxTemp = get(maxTemperature);
      const avgCurrentVal = get(avgCurrent);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      tempHistory = [...tempHistory.slice(-59), maxTemp];
      currentHistory = [...currentHistory.slice(-59), avgCurrentVal];
      timeLabels = [...timeLabels.slice(-59), timeStr];
    }, 1000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  function get<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
    let value: T = undefined as T;
    store.subscribe(v => value = v)();
    return value;
  }
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">实时监控总览</h1>
      <p class="text-gray-400 mt-1">海底电缆温度与载流量实时监测系统</p>
    </div>
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-2 px-3 py-1.5 bg-safe-green/10 text-safe-green rounded-full text-sm">
        <span class="w-2 h-2 rounded-full bg-safe-green animate-pulse"></span>
        数据采集中
      </span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      label="最高温度"
      value={$maxTemperature}
      unit="°C"
      color={getTemperatureColor($maxTemperature, $cableParams.maxTemperature)}
      icon="🌡️"
    />
    <StatCard
      label="平均温度"
      value={$avgTemperature}
      unit="°C"
      color="#3E92CC"
      icon="📊"
    />
    <StatCard
      label="平均载流量"
      value={$avgCurrent}
      unit="A"
      color="#2EC4B6"
      icon="⚡"
    />
    <StatCard
      label="传输功率"
      value={($avgCurrent * 220 / 1000).toFixed(1)}
      unit="MW"
      color="#FF9F1C"
      icon="🔌"
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 panel-glow p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">温度热力分布</h2>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-gray-400">
            最高温度: <span class="text-danger-red font-mono">{formatTemperature($maxTemperature)}</span>
          </span>
          {#if $hotspotLocation}
            <span class="text-gray-400">
              热点位置: <span class="text-warning-orange font-mono">
                {formatDistance($hotspotLocation.distance)}
              </span>
            </span>
          {/if}
        </div>
      </div>
      <div class="h-[350px]">
        <ThermalHeatmap
          data={$sensorData}
          maxTemp={$cableParams.maxTemperature}
          minTemp={$cableParams.ambientTemperature}
        />
      </div>
    </div>

    <div class="space-y-6">
      <div class="panel-glow p-5">
        <h3 class="text-sm font-semibold text-white mb-2">温度阈值</h3>
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-400">当前最高</span>
              <span class="text-white font-mono">{formatTemperature($maxTemperature)}</span>
            </div>
            <div class="h-2 bg-space-light rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                style="width: {Math.min(100, ($maxTemperature / $cableParams.maxTemperature) * 100)}%; background: linear-gradient(90deg, #2EC4B6, #FF9F1C, #E63946);"
              ></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-500">
              <span>{$cableParams.ambientTemperature}°C</span>
              <span>{$cableParams.maxTemperature}°C (阈值)</span>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-400">当前载流</span>
              <span class="text-white font-mono">{formatCurrent($avgCurrent)}</span>
            </div>
            <div class="h-2 bg-space-light rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-tech-cyan to-safe-green rounded-full transition-all duration-500"
                style="width: {Math.min(100, ($avgCurrent / $cableParams.maxCurrent) * 100)}%;"
              ></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-500">
              <span>0A</span>
              <span>{$cableParams.maxCurrent}A (额定)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-glow p-5">
        <h3 class="text-sm font-semibold text-white mb-3">海缆信息</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">海缆长度</span>
            <span class="text-white font-mono">{formatDistance($cableParams.length)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">传感器数量</span>
            <span class="text-white font-mono">{$sensorData.length}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">环境温度</span>
            <span class="text-white font-mono">{formatTemperature($cableParams.ambientTemperature)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">热阻系数</span>
            <span class="text-white font-mono">{$cableParams.thermalResistance} K·m/W</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="panel-glow p-5">
      <h3 class="text-sm font-semibold text-white mb-3">温度趋势 (最近60秒)</h3>
      <div class="h-[200px]">
        <LineChart
          data={tempHistory}
          labels={timeLabels}
          color="#E63946"
          yLabel="温度 (°C)"
        />
      </div>
    </div>

    <div class="panel-glow p-5">
      <h3 class="text-sm font-semibold text-white mb-3">载流量趋势 (最近60秒)</h3>
      <div class="h-[200px]">
        <LineChart
          data={currentHistory}
          labels={timeLabels}
          color="#3E92CC"
          yLabel="电流 (A)"
        />
      </div>
    </div>
  </div>

  <div class="panel-glow p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">最近告警</h3>
      <span class="text-sm text-gray-400">共 {$alerts.length} 条记录</span>
    </div>
    <div class="space-y-3 max-h-[300px] overflow-y-auto">
      {#if $alerts.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">✅</div>
          <p>暂无告警记录</p>
        </div>
      {:else}
        {#each $alerts.slice(0, 5) as alert (alert.id)}
          <AlertItem {alert} />
        {/each}
      {/if}
    </div>
  </div>
</div>
