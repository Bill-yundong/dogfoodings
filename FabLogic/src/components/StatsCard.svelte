<script>
  let { title, value, icon = '', trend = null, color = 'primary' } = $props()

  const colorClasses = {
    primary: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    success: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    warning: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    danger: 'from-red-500/20 to-red-500/5 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30'
  }

  const textColors = {
    primary: 'text-cyan-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    purple: 'text-purple-400'
  }
</script>

<div class="stats-card bg-gradient-to-br {colorClasses[color]} border rounded-xl p-5 backdrop-blur-sm">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-sm text-slate-400 mb-1">{title}</p>
      <p class="text-3xl font-bold text-white">{value}</p>
      {#if trend !== null}
        <p class="text-xs mt-1 {trend >= 0 ? 'text-emerald-400' : 'text-red-400'}">
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </p>
      {/if}
    </div>
    {#if icon}
      <div class="text-3xl {textColors[color]}">{icon}</div>
    {/if}
  </div>
</div>
