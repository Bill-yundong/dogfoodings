<script lang="ts">
  let {
    label,
    value,
    unit = '',
    trend,
    status = 'normal' as 'normal' | 'warning' | 'danger'
  }: {
    label: string;
    value: string | number;
    unit?: string;
    trend?: number;
    status?: 'normal' | 'warning' | 'danger';
  } = $props();
</script>

<div class="glass-panel p-4">
  <div class="hud-text mb-1">{label}</div>
  <div class="flex items-baseline gap-1">
    <span 
      class="font-display text-2xl font-bold"
      class:text-alert-green={status === 'normal'}
      class:text-alert-orange={status === 'warning'}
      class:text-alert-red={status === 'danger'}
    >
      {value}
    </span>
    {#if unit}
      <span class="text-sm text-gray-400">{unit}</span>
    {/if}
  </div>
  {#if trend !== undefined}
    <div class="mt-2 text-xs">
      <span 
        class={trend >= 0 ? 'text-alert-green' : 'text-alert-red'}
      >
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
      </span>
      <span class="text-gray-500 ml-1">vs 基准</span>
    </div>
  {/if}
</div>
