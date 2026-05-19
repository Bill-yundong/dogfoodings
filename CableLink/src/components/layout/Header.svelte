<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { realtimeStore } from '@/stores/realtime';
  import { alertStore } from '@/stores/alerts';
  import { formatTime } from '@/utils/format';

  let currentTime = $state(new Date());
  let intervalId: number | null = null;

  const { cableParams } = realtimeStore;
  const { unreadCount } = alertStore;

  onMount(() => {
    intervalId = window.setInterval(() => {
      currentTime = new Date();
    }, 1000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
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

    <div class="relative">
      <button class="relative p-2 rounded-lg hover:bg-space-light transition-colors" aria-label="告警通知">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {#if $unreadCount > 0}
          <span class="absolute -top-1 -right-1 w-5 h-5 bg-danger-red text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {$unreadCount > 99 ? '99+' : $unreadCount}
          </span>
        {/if}
      </button>
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
