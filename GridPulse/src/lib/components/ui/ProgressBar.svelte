<script lang="ts">
  export let value: number = 0;
  export let max: number = 100;
  export let label: string = '';
  export let showValue: boolean = true;
  export let color: 'accent' | 'green' | 'yellow' | 'red' = 'accent';

  $: percentage = Math.min(100, Math.max(0, (value / max) * 100));
  $: colorClass = color === 'accent' ? 'bg-accent-500' : 
                  color === 'green' ? 'bg-green-500' : 
                  color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
</script>

<div class="w-full">
  {#if label}
    <div class="flex justify-between items-center mb-1">
      <span class="text-sm text-dark-400">{label}</span>
      {#if showValue}
        <span class="text-sm font-mono text-white">{value.toFixed(1)}%</span>
      {/if}
    </div>
  {/if}
  <div class="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
    <div 
      class={`h-full ${colorClass} transition-all duration-300 ease-out rounded-full`}
      style={`width: ${percentage}%`}
    ></div>
  </div>
</div>
