<script lang="ts">
  import type { AnomalyEvent } from '$lib/services/detector';

  let { anomalies } = $props<{ anomalies: AnomalyEvent[] }>();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const severityConfig = {
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400'
    }
  };
</script>

<div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-slate-100">异常事件</h3>
    <span class="text-xs text-slate-500">最近 {anomalies.length} 条</span>
  </div>

  <div class="space-y-2 max-h-80 overflow-y-auto pr-2">
    {#if anomalies.length === 0}
      <div class="flex items-center justify-center py-8 text-slate-500">
        <div class="text-center">
          <div class="text-3xl mb-2">✅</div>
          <div>暂无异常事件</div>
        </div>
      </div>
    {:else}
      {#each [...anomalies].reverse() as anomaly (anomaly.id)}
        <div class={`p-3 rounded-lg border ${severityConfig[anomaly.severity].bg} ${severityConfig[anomaly.severity].border}`}>
          <div class="flex items-start gap-3">
            <span class={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityConfig[anomaly.severity].dot} ${anomaly.severity === 'error' ? 'animate-pulse' : ''}`}></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class={`text-sm font-medium ${severityConfig[anomaly.severity].text} truncate`}>
                  {anomaly.description}
                </span>
                <span class="text-xs text-slate-500 font-mono flex-shrink-0">
                  {formatTime(anomaly.timestamp)}
                </span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span>类型: {anomaly.type}</span>
                <span>值: {anomaly.value.toFixed(3)}</span>
                <span>阈值: {anomaly.threshold}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
