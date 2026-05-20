<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let unit: string = '';
  export let trend: 'up' | 'down' | 'stable' = 'stable';
  export let trendValue: string = '';
  export let status: 'normal' | 'warning' | 'danger' = 'normal';
  export let icon: string = '';

  $: statusColor = status === 'normal' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400';
  $: statusBg = status === 'normal' ? 'from-green-500/5 to-transparent' : status === 'warning' ? 'from-yellow-500/5 to-transparent' : 'from-red-500/5 to-transparent';
  $: statusBorder = status === 'normal' ? 'border-green-500/20' : status === 'warning' ? 'border-yellow-500/20' : 'border-red-500/20';
</script>

<div class="card bg-gradient-to-b {statusBg} border {statusBorder}">
  <div class="flex items-start justify-between">
    <div>
      <p class="metric-label">{label}</p>
      <div class="flex items-baseline gap-1 mt-1">
        <span class="metric-value {statusColor}">{value}</span>
        {#if unit}
          <span class="text-dark-400 text-sm">{unit}</span>
        {/if}
      </div>
      {#if trendValue}
        <div class="flex items-center gap-1 mt-2">
          {#if trend === 'up'}
            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
          {:else if trend === 'down'}
            <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          {:else}
            <svg class="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>
            </svg>
          {/if}
          <span class="text-xs text-dark-400">{trendValue}</span>
        </div>
      {/if}
    </div>
    {#if icon}
      <div class="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center">
        <svg class="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon}/>
        </svg>
      </div>
    {/if}
  </div>
</div>
