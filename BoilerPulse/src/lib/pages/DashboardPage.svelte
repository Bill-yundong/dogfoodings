<script lang="ts">
  import { boilerStore } from '$lib/stores/boiler';
  import { syncEngine } from '$lib/services/sync';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import FanControlPanel from '$lib/components/controls/FanControlPanel.svelte';
  import MPCPanel from '$lib/components/mpc/MPCPanel.svelte';
  import AnomalyList from '$lib/components/dashboard/AnomalyList.svelte';
  import type { FanControl, ControlMode } from '$lib/types';

  const handleModeChange = (mode: ControlMode) => {
    boilerStore.setControlMode(mode);
  };

  const handleControlChange = (control: Partial<FanControl>) => {
    if (control.oxygenSetpoint !== undefined) {
      boilerStore.setOxygenSetpoint(control.oxygenSetpoint);
    } else {
      boilerStore.setFanControl(control);
    }
  };

  const oxygenData = $derived($boilerStore.oxygenData);
  const efficiencyData = $derived($boilerStore.efficiencyData);
  const currentOxygen = $derived($boilerStore.currentOxygen);
  const currentEfficiency = $derived($boilerStore.currentEfficiency);
  const mpcPrediction = $derived($boilerStore.mpcPrediction);
  const anomalies = $derived($boilerStore.anomalies);
  const controlMode = $derived($boilerStore.controlMode);

  const oxygenValues = $derived(oxygenData.slice(-60).map((d) => d.value));
  const efficiencyValues = $derived(efficiencyData.slice(-60).map((d) => d.value));

  const timeLabels = $derived(
    oxygenData
      .slice(-60)
      .map((d) =>
        new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
  );

  const syncStatus = $derived(syncEngine.getAllSyncStatus());

  const efficiencyTrend = $derived(() => {
    if (efficiencyData.length < 2) return 0;
    const recent = efficiencyData.slice(-30);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    return ((last - first) / first) * 100;
  });
</script>

<div class="p-6 space-y-6 h-full overflow-y-auto">
  <div class="grid grid-cols-4 gap-4">
    <KpiCard
      title="烟气氧含量"
      value={currentOxygen?.value ?? 0}
      unit="%"
      status={
        currentOxygen?.value
          ? currentOxygen.value < 1.5 || currentOxygen.value > 7
            ? 'error'
            : currentOxygen.value < 2 || currentOxygen.value > 6
              ? 'warning'
              : 'normal'
          : 'normal'
      }
    />
    <KpiCard
      title="热效率"
      value={currentEfficiency?.value ?? 0}
      unit="%"
      trend={efficiencyTrend}
      status={currentEfficiency?.value && currentEfficiency.value < 85 ? 'error' : 'normal'}
    />
    <KpiCard
      title="煤耗"
      value={currentEfficiency?.coalConsumption ?? 0}
      unit="t/h"
    />
    <KpiCard
      title="蒸汽产量"
      value={currentEfficiency?.steamOutput ?? 0}
      unit="t/h"
    />
  </div>

  <div class="grid grid-cols-3 gap-6">
    <div class="col-span-2 space-y-6">
      <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-100">烟气氧含量趋势</h3>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>实时数据</span>
          </div>
        </div>
        <LineChart
          data={oxygenValues}
          labels={timeLabels}
          color="#3b82f6"
          height={180}
          yMin={0}
          yMax={10}
        />
      </div>

      <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-100">热效率趋势</h3>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>实时数据</span>
          </div>
        </div>
        <LineChart
          data={efficiencyValues}
          labels={timeLabels}
          color="#10b981"
          height={180}
          yMin={80}
          yMax={100}
        />
      </div>

      <AnomalyList anomalies={anomalies} />
    </div>

    <div class="space-y-6">
      <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
        <h3 class="text-lg font-semibold text-slate-100 mb-4">系统同步状态</h3>
        <div class="space-y-3">
          {#each syncStatus as status}
            <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <div class="text-sm font-medium text-slate-200">{status.source}</div>
                <div class="text-xs text-slate-500">延迟: {status.latency}ms</div>
              </div>
              <div class="text-right">
                <div class="text-xs font-mono text-slate-400">{status.dataPoints} 点</div>
                <div class={`text-xs ${
                  status.status === 'running' ? 'text-emerald-400' :
                  status.status === 'warning' ? 'text-amber-400' :
                  status.status === 'error' ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {status.status === 'running' ? '● 在线' :
                   status.status === 'offline' ? '○ 离线' :
                   status.status === 'warning' ? '⚠ 告警' : '✕ 故障'}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <FanControlPanel
        controlMode={controlMode}
        onModeChange={handleModeChange}
        onControlChange={handleControlChange}
      />

      <MPCPanel prediction={mpcPrediction} />
    </div>
  </div>
</div>
