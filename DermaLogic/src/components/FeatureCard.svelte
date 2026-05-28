<script lang="ts">
  export let label: string
  export let value: number
  export let icon: unknown
  export const max = 100

  $: percentage = Math.min(100, Math.max(0, value))
  $: color = value >= 70 ? 'from-green-400 to-green-500' : value >= 40 ? 'from-yellow-400 to-yellow-500' : 'from-red-400 to-red-500'
</script>

<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
  <div class="flex items-start justify-between mb-3">
    <div class="p-2.5 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100">
      <svelte:component this={icon} class="w-5 h-5 text-primary-600"></svelte:component>
    </div>
    <span class="text-2xl font-bold text-gray-800">{Math.round(value)}%</span>
  </div>
  
  <p class="text-sm text-gray-600 mb-3">{label}</p>
  
  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
    <div 
      class="h-full bg-gradient-to-r {color} rounded-full transition-all duration-700 ease-out"
      style="width: {percentage}%"
    ></div>
  </div>
</div>
