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

<div class="max-h-80 overflow-y-auto">
  {#if $alerts.length === 0}
    <div class="p-10 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center text-3xl opacity-50">
        🔔
      </div>
      <p class="text-slate-500">暂无告警</p>
      <p class="text-xs text-slate-600 mt-1">系统运行正常</p>
    </div>
  {:else}
    <div class="px-4 py-3 border-b border-slate-700/30 flex justify-end">
      <button
        onclick={() => clearAlerts()}
        class="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-slate-700/50"
      >
        清空全部
      </button>
    </div>
    {#each $alerts as alert (alert.id)}
      <div class="px-6 py-4 border-b border-slate-700/30 border-l-4 {typeClasses[alert.type]} hover:bg-slate-800/20 transition-colors">
        <div class="flex items-start gap-3">
          <span class="text-xl">{typeIcons[alert.type]}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-slate-200 leading-relaxed">{alert.message}</p>
            <p class="text-xs text-slate-500 mt-1.5">{formatTime(alert.timestamp)}</p>
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>
