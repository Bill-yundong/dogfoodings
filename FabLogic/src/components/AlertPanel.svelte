<script>
  import { alerts, clearAlerts } from '../store/AMHSStore.js'

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }

  const typeClasses = {
    info: 'border-l-cyan-500 bg-cyan-500/5',
    success: 'border-l-emerald-500 bg-emerald-500/5',
    warning: 'border-l-amber-500 bg-amber-500/5',
    error: 'border-l-red-500 bg-red-500/5'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
</script>

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
  <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
      <span class="text-cyan-400">🔔</span>
      系统告警
    </h3>
    <button
      onclick={() => clearAlerts()}
      class="text-xs text-slate-400 hover:text-white transition-colors"
    >
      清空
    </button>
  </div>
  <div class="max-h-64 overflow-y-auto">
    {#if $alerts.length === 0}
      <div class="p-8 text-center text-slate-500">
        <p>暂无告警</p>
      </div>
    {:else}
      {#each $alerts as alert (alert.id)}
        <div class="p-3 border-b border-slate-700/30 border-l-4 {typeClasses[alert.type]}">
          <div class="flex items-start gap-2">
            <span class="text-lg">{typeIcons[alert.type]}</span>
            <div class="flex-1">
              <p class="text-sm text-slate-300">{alert.message}</p>
              <p class="text-xs text-slate-500 mt-1">{formatTime(alert.timestamp)}</p>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
