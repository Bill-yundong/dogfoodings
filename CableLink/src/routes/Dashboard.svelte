<script lang="ts">
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

  $effect(() => {
    const interval = setInterval(() => {
      const maxTemp = realtimeStore.getMaxTemperature();
      const avgCurrent = realtimeStore.getTotalCurrent();
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      tempHistory = [...tempHistory.slice(-59), maxTemp];
      currentHistory = [...currentHistory.slice(-59), avgCurrent];
      timeLabels = [...timeLabels.slice(-59), timeStr];
    }, 1000);

    return () => clearInterval(interval);
  });
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
      value={realtimeStore.getMaxTemperature()}
      unit="°C"
      color={getTemperatureColor(realtimeStore.getMaxTemperature(), realtimeStore.cableParams.maxTemperature)}
      icon="🌡️"
    />
    <StatCard
      label="平均温度"
      value={realtimeStore.getAvgTemperature()}
      unit="°C"
      color="#3E92CC"
      icon="📊"
    />
    <StatCard
      label="平均载流量"
      value={realtimeStore.getTotalCurrent()}
      unit="A"
      color="#2EC4B6"
      icon="⚡"
    />
    <StatCard
      label="传输功率"
      value={(realtimeStore.getTotalCurrent() * 220 / 1000).toFixed(1)}
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
            最高温度: <span class="text-danger-red font-mono">{formatTemperature(realtimeStore.getMaxTemperature())}</span>
          </span>
          {#if realtimeStore.getHotspotLocation()}
            <span class="text-gray-400">
              热点位置: <span class="text-warning-orange font-mono">
                {formatDistance(realtimeStore.getHotspotLocation()!.distance)}
              </span>
            </span>
          {/if}
        </div>
      </div>
      <div class="h-[350px]">
        <ThermalHeatmap
          data={realtimeStore.sensorData}
          maxTemp={realtimeStore.cableParams.maxTemperature}
          minTemp={realtimeStore.cableParams.ambientTemperature}
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
              <span class="text-white font-mono">{formatTemperature(realtimeStore.getMaxTemperature())}</span>
            </div>
            <div class="h-2 bg-space-light rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                style="width: {Math.min(100, (realtimeStore.getMaxTemperature() / realtimeStore.cableParams.maxTemperature) * 100)}%; background: linear-gradient(90deg, #2EC4B6, #FF9F1C, #E63946);"
              ></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-500">
              <span>{realtimeStore.cableParams.ambientTemperature}°C</span>
              <span>{realtimeStore.cableParams.maxTemperature}°C (阈值)</span>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-400">当前载流</span>
              <span class="text-white font-mono">{formatCurrent(realtimeStore.getTotalCurrent())}</span>
            </div>
            <div class="h-2 bg-space-light rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-tech-cyan to-safe-green rounded-full transition-all duration-500"
                style="width: {Math.min(100, (realtimeStore.getTotalCurrent() / realtimeStore.cableParams.maxCurrent) * 100)}%;"
              ></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-500">
              <span>0A</span>
              <span>{realtimeStore.cableParams.maxCurrent}A (额定)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-glow p-5">
        <h3 class="text-sm font-semibold text-white mb-3">海缆信息</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">海缆长度</span>
            <span class="text-white font-mono">{formatDistance(realtimeStore.cableParams.length)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">传感器数量</span>
            <span class="text-white font-mono">{realtimeStore.sensorData.length}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">环境温度</span>
            <span class="text-white font-mono">{formatTemperature(realtimeStore.cableParams.ambientTemperature)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">热阻系数</span>
            <span class="text-white font-mono">{realtimeStore.cableParams.thermalResistance} K·m/W</span>
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
      <span class="text-sm text-gray-400">共 {alertStore.alerts.length} 条记录</span>
    </div>
    <div class="space-y-3 max-h-[300px] overflow-y-auto">
      {#if alertStore.alerts.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">✅</div>
          <p>暂无告警记录</p>
        </div>
      {:else}
        {#each alertStore.alerts.slice(0, 5) as alert (alert.id)}
          <AlertItem {alert} />
        {/each}
      {/if}
    </div>
  </div>
</div>
