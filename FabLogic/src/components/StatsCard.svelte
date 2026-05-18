<script>
  let { title, value, icon = '', trend = null, color = 'primary' } = $props()

  const colorClasses = {
    primary: 'from-cyan-500/15 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40',
    success: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
    warning: 'from-amber-500/15 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
    danger: 'from-red-500/15 to-red-500/5 border-red-500/20 hover:border-red-500/40',
    purple: 'from-purple-500/15 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40'
  }

  const textColors = {
    primary: 'text-cyan-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    purple: 'text-purple-400'
  }

  const iconBgColors = {
    primary: 'bg-cyan-500/10',
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    danger: 'bg-red-500/10',
    purple: 'bg-purple-500/10'
  }
</script>

<div class="bg-gradient-to-br {colorClasses[color]} border rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <p class="text-sm text-slate-400 mb-1.5 font-medium">{title}</p>
      <p class="text-3xl font-bold text-white tracking-tight">{value}</p>
      {#if trend !== null}
        <p class="text-xs mt-2 font-medium {trend >= 0 ? 'text-emerald-400' : 'text-red-400'}">
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% 较昨日
        </p>
      {/if}
    </div>
    {#if icon}
      <div class="w-12 h-12 rounded-xl {iconBgColors[color]} flex items-center justify-center text-2xl">
        {icon}
      </div>
    {/if}
  </div>
</div>
