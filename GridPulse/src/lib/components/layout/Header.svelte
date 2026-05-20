<script lang="ts">
  import { page } from '$app/stores';
  import { gridStore } from '$lib/stores/grid';

  const { systemStatus, unacknowledgedCount, acknowledgeAlert, alerts } = gridStore;

  let showAlerts = false;

  const pageTitles: Record<string, string> = {
    '/': '实时监控面板',
    '/simulation': '稳定性仿真中心',
    '/load-data': '负荷数据管理',
    '/dispatch': '调度协同模块',
    '/settings': '系统设置'
  };

  $: currentTitle = pageTitles[$page.url.pathname] || 'GridPulse';

  $: statusColor = systemStatus.systemState === 'normal' 
    ? 'text-green-400' 
    : systemStatus.systemState === 'alert' 
      ? 'text-yellow-400' 
      : 'text-red-400';

  $: statusBg = systemStatus.systemState === 'normal' 
    ? 'bg-green-500/10 border-green-500/30' 
    : systemStatus.systemState === 'alert' 
      ? 'bg-yellow-500/10 border-yellow-500/30' 
      : 'bg-red-500/10 border-red-500/30';

  $: statusText = systemStatus.systemState === 'normal' 
    ? '正常运行' 
    : systemStatus.systemState === 'alert' 
      ? '预警状态' 
      : '紧急状态';
</script>

<header class="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50">
  <div class="flex items-center justify-between px-6 py-4">
    <div>
      <h2 class="text-xl font-bold text-white">{currentTitle}</h2>
      <p class="text-sm text-dark-400">
        最后更新: {systemStatus.lastUpdate.toLocaleTimeString('zh-CN')}
      </p>
    </div>

    <div class="flex items-center gap-4">
      <div class={`px-4 py-2 rounded-lg border ${statusBg}`}>
        <div class="flex items-center gap-2">
          <span class={`status-dot ${systemStatus.systemState === 'normal' ? 'status-online' : systemStatus.systemState === 'alert' ? 'status-warning' : 'status-danger'}`}></span>
          <span class={`text-sm font-medium ${statusColor}`}>{statusText}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 font-mono text-sm">
        <span class="text-dark-400">频率:</span>
        <span class={`font-bold text-lg ${
          Math.abs(systemStatus.frequencyDeviation) > 0.2 
            ? 'text-red-400' 
            : Math.abs(systemStatus.frequencyDeviation) > 0.1 
              ? 'text-yellow-400' 
              : 'text-green-400'
        }`}>
          {systemStatus.currentFrequency.toFixed(3)} Hz
        </span>
      </div>

      <button 
        class="relative p-2 rounded-lg hover:bg-dark-800 transition-colors"
        onclick={() => showAlerts = !showAlerts}
      >
        <svg class="w-6 h-6 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {#if unacknowledgedCount > 0}
          <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
          </span>
        {/if}
      </button>

      {#if showAlerts}
        <div class="absolute right-6 top-16 w-96 glass-panel shadow-xl z-50">
          <div class="p-4 border-b border-dark-700/50">
            <h3 class="font-bold text-white">告警通知</h3>
          </div>
          <div class="max-h-96 overflow-y-auto">
            {#each alerts.slice(0, 10) as alert}
              <div 
                class="p-4 border-b border-dark-700/30 hover:bg-dark-800/50 transition-colors cursor-pointer"
                onclick={() => acknowledgeAlert(alert.id)}
              >
                <div class="flex items-start gap-3">
                  <div class={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    alert.severity === 'danger' ? 'bg-red-500' : 
                    alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white">{alert.message}</p>
                    <p class="text-xs text-dark-500 mt-1">
                      {alert.timestamp.toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {#if !alert.acknowledged}
                    <span class="w-2 h-2 rounded-full bg-accent-400 flex-shrink-0"></span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</header>
