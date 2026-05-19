<script lang="ts">
  let {
    title,
    value,
    unit,
    trend,
    status = 'normal'
  }: {
    title: string;
    value: number;
    unit?: string;
    trend?: number;
    status?: 'normal' | 'warning' | 'error';
  } = $props();

  const displayValue = $derived(value.toFixed(2));

  const statusColors = {
    normal: 'text-slate-100',
    warning: 'text-amber-400',
    error: 'text-red-400'
  };
</script>

<div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all duration-300">
  <div class="flex items-start justify-between mb-3">
    <span class="text-slate-400 text-sm font-medium">{title}</span>
    {#if trend !== undefined}
      <span class={`text-xs font-medium px-2 py-0.5 rounded ${trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
      </span>
    {/if}
  </div>
  <div class="flex items-baseline gap-2">
    <span class="text-3xl font-bold font-mono {statusColors[status]}">{displayValue}</span>
    {#if unit}
      <span class="text-slate-500 text-sm">{unit}</span>
    {/if}
  </div>
</div>
