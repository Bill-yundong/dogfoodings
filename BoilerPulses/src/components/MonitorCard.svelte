<script>
  import { boilerState } from '../lib/stores/boilerStore.js';

  export let param;
  export let value;

  $: isOptimal = value >= param.optimal.min && value <= param.optimal.max;
  $: statusColor = isOptimal ? 'text-green-400' : value < param.optimal.min ? 'text-blue-400' : 'text-red-400';
  $: bgColor = isOptimal ? 'bg-green-500/10' : value < param.optimal.min ? 'bg-blue-500/10' : 'bg-red-500/10';
  $: borderColor = isOptimal ? 'border-green-500/30' : value < param.optimal.min ? 'border-blue-500/30' : 'border-red-500/30';
  $: progressPercent = Math.min(100, Math.max(0, ((value - param.optimal.min) / (param.optimal.max - param.optimal.min)) * 100);
</script>

<div class="monitor-card {bgColor} border {borderColor} rounded-xl p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full animate-pulse" style="background: {param.color}"></div>
      <span class="text-sm text-gray-400">{param.label}</span>
    </div>
    <span class="text-xs text-gray-500">{param.unit}</span>
  </div>
  <div class="text-3xl font-bold mb-3 {statusColor}" style="font-variant-numeric: tabular-nums">
    {value.toFixed(2)}
  </div>
  <div class="space-y-2">
    <div class="flex justify-between text-xs text-gray-500">
      <span>{param.optimal.min}</span>
      <span class="text-gray-400">最优范围</span>
      <span>{param.optimal.max}</span>
    </div>
    <div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
      <div 
        class="h-full rounded-full transition-all duration-500"
        style="width: {progressPercent}%; background: {param.color}"
      ></div>
    </div>
    <div class="text-xs {statusColor} text-center">
      {#if isOptimal}
        ✓ 运行正常
      {:else if value < param.optimal.min}
        ⚠ 低于最优值
      {:else}
        ⚠ 高于最优值
      {/if}
    </div>
  </div>
</div>

<style>
  .monitor-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  }
</style>
