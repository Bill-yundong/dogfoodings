<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { realtimeStore } from '@/stores/realtime';
  import { alertStore } from '@/stores/alerts';
  import { formatTime, formatDateTime } from '@/utils/format';
  import type { AlertRecord } from '@/types';

  let currentTime = $state(new Date());
  let showAlertDropdown = $state(false);
  let intervalId: number | null = null;

  const { cableParams } = realtimeStore;
  const { unreadCount, alerts, updateAlertStatus } = alertStore;

  onMount(() => {
    intervalId = window.setInterval(() => {
      currentTime = new Date();
    }, 1000);

    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener('click', handleClickOutside);
  });

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.alert-dropdown-container')) {
      showAlertDropdown = false;
    }
  }

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    showAlertDropdown = !showAlertDropdown;
  }

  function getUnreadAlerts(): AlertRecord[] {
    let value: AlertRecord[] = [];
    alerts.subscribe(v => value = v)();
    return value.filter(a => a.status === 'active').slice(0, 5);
  }

  async function handleAcknowledge(alertId: string, e: MouseEvent) {
    e.stopPropagation();
    await updateAlertStatus(alertId, 'acknowledged', '运维工程师');
  }

  function formatAlertTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return formatDateTime(timestamp);
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'danger': return 'text-danger-red bg-danger-red/10';
      case 'warning': return 'text-warning-orange bg-warning-orange/10';
      default: return 'text-tech-cyan bg-tech-cyan/10';
    }
  }
</script>

<header class="h-14 bg-space-gray/80 backdrop-blur-xl border-b border-tech-cyan/10 flex items-center justify-between px-6">
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-safe-green animate-pulse"></div>
      <span class="text-sm text-gray-400">系统运行中</span>
    </div>
    <div class="h-4 w-px bg-gray-700"></div>
    <div class="text-sm text-gray-300 font-mono">
      {formatTime(currentTime.getTime())}
    </div>
  </div>

  <div class="flex items-center gap-4">
    <div class="text-right">
      <p class="text-xs text-gray-400">{$cableParams.name}</p>
      <p class="text-sm text-white font-medium">{$cableParams.length.toFixed(0)}m 海缆</p>
    </div>

    <div class="relative alert-dropdown-container">
      <button
        onclick={toggleDropdown}
        class="relative p-2 rounded-lg hover:bg-space-light transition-colors"
        aria-label="告警通知"
        aria-expanded={showAlertDropdown}
      >
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {#if $unreadCount > 0}
          <span class="absolute -top-1 -right-1 w-5 h-5 bg-danger-red text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {$unreadCount > 99 ? '99+' : $unreadCount}
          </span>
        {/if}
      </button>

      {#if showAlertDropdown}
        <div class="absolute right-0 top-full mt-2 w-80 bg-space-gray border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 class="font-semibold text-white">告警通知</h3>
            {#if $unreadCount > 0}
              <span class="text-xs text-danger-red">{$unreadCount} 条未读</span>
            {/if}
          </div>
          <div class="max-h-80 overflow-y-auto">
            {#if getUnreadAlerts().length === 0}
              <div class="px-4 py-8 text-center text-gray-500">
                <div class="text-2xl mb-2">✅</div>
                <p class="text-sm">暂无未读告警</p>
              </div>
            {:else}
              {#each getUnreadAlerts() as alert (alert.id)}
                <div class="px-4 py-3 border-b border-gray-800 hover:bg-space-light/50 transition-colors">
                  <div class="flex items-start gap-3">
                    <span class={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity === 'danger' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                    </span>
                    <span class="text-xs text-gray-500">{formatAlertTime(alert.timestamp)}</span>
                  </div>
                  <p class="mt-1 text-sm text-gray-300">{alert.message}</p>
                  <div class="mt-2 flex items-center justify-between">
                    <span class="text-xs text-gray-500 font-mono">{alert.sensorId}</span>
                    <button
                      onclick={(e) => handleAcknowledge(alert.id, e)}
                      class="text-xs text-tech-cyan hover:text-tech-cyan/80 transition-colors"
                    >
                      确认
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
          <div class="px-4 py-2 border-t border-gray-700">
            <button
              onclick={() => { showAlertDropdown = false; window.location.href = '/alerts'; }}
              class="w-full text-center text-sm text-tech-cyan hover:text-tech-cyan/80 transition-colors py-1"
            >
              查看全部告警 →
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-3 pl-4 border-l border-gray-700">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-tech-cyan to-deep-sea flex items-center justify-center text-white text-sm font-bold">
        运
      </div>
      <div class="hidden sm:block">
        <p class="text-sm font-medium text-white">运维工程师</p>
        <p class="text-xs text-gray-400">在线</p>
      </div>
    </div>
  </div>
</header>
