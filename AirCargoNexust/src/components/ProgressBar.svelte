<script lang="ts">
  let {
    value,
    max = 100,
    showLabel = true,
    status = 'normal' as 'normal' | 'warning' | 'danger'
  }: {
    value: number;
    max?: number;
    showLabel?: boolean;
    status?: 'normal' | 'warning' | 'danger';
  } = $props();

  let percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="w-full">
  {#if showLabel}
    <div class="flex justify-between text-xs mb-1">
      <span class="text-gray-400">进度</span>
      <span class="text-white font-mono">{value.toLocaleString()} / {max.toLocaleString()}</span>
    </div>
  {/if}
  <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
    <div 
      class="h-full rounded-full transition-all duration-300"
      class:bg-alert-green={status === 'normal'}
      class:bg-alert-orange={status === 'warning'}
      class:bg-alert-red={status === 'danger'}
      style="width: {percentage}%"
    ></div>
  </div>
</div>
