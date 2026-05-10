<script lang="ts">
  import { alerts, unacknowledgedAlerts } from '../lib/stores';
  import type { Alert } from '../types';

  let allAlerts = $state<Alert[]>([]);
  let unacknowledged = $state<Alert[]>([]);

  $effect(() => {
    const unsub1 = alerts.subscribe((a) => {
      allAlerts = a;
    });
    const unsub2 = unacknowledgedAlerts.subscribe((a) => {
      unacknowledged = a;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }

  function getLevelColor(level: Alert['level']): string {
    switch (level) {
      case 'emergency': return 'bg-red-600';
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  }

  function getLevelText(level: Alert['level']): string {
    switch (level) {
      case 'emergency': return '紧急';
      case 'critical': return '严重';
      case 'warning': return '警告';
      default: return '信息';
    }
  }

  function getSourceText(source: Alert['source']): string {
    switch (source) {
      case 'pantograph': return '受电弓';
      case 'track': return '轨道';
      case 'trajectory': return '轨迹';
      default: return '系统';
    }
  }

  function acknowledgeAlert(id: string): void {
    alerts.acknowledge(id);
  }
</script>

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">⚠️</span>
    告警中心
    {#if unacknowledged.length > 0}
      <span class="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full animate-pulse">
        {unacknowledged.length}
      </span>
    {/if}
  </h3>

  {#if allAlerts.length === 0}
    <div class="text-gray-400 text-center py-8">
      暂无告警
    </div>
  {:else}
    <div class="space-y-2 max-h-80 overflow-y-auto">
      {#each allAlerts.slice(0, 20) as alert (alert.id)}
        <div
          class="p-3 rounded-lg border-l-4 {alert.acknowledged ? 'bg-gray-800 opacity-60' : 'bg-gray-800'}"
          class:border-red-500={alert.level === 'critical' || alert.level === 'emergency'}
          class:border-yellow-500={alert.level === 'warning'}
          class:border-blue-500={alert.level === 'info'}
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs px-2 py-0.5 rounded text-white {getLevelColor(alert.level)}">
                  {getLevelText(alert.level)}
                </span>
                <span class="text-xs text-gray-400">{getSourceText(alert.source)}</span>
                <span class="text-xs text-gray-500">{formatTime(alert.timestamp)}</span>
              </div>
              <p class="text-white text-sm">{alert.message}</p>
              {#if alert.trainId || alert.mileage}
                <div class="text-xs text-gray-400 mt-1">
                  {#if alert.trainId}列车: {alert.trainId}{/if}
                  {#if alert.trainId && alert.mileage} | {/if}
                  {#if alert.mileage}里程: K{(alert.mileage / 1000).toFixed(3)}{/if}
                </div>
              {/if}
            </div>
            {#if !alert.acknowledged}
              <button
                class="ml-2 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
                onclick={() => acknowledgeAlert(alert.id)}
              >
                确认
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
