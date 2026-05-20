<script lang="ts">
  import { page } from '$app/stores';

  const navItems = [
    { path: '/', label: '实时监控', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { path: '/simulation', label: '仿真中心', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/load-data', label: '负荷管理', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { path: '/dispatch', label: '调度协同', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { path: '/settings', label: '系统设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];
</script>

<aside class="fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-700/50 flex flex-col z-50">
  <div class="p-6 border-b border-dark-700/50">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-bold text-white">GridPulse</h1>
        <p class="text-xs text-dark-400">微电网频率分析平台</p>
      </div>
    </div>
  </div>

  <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
    {#each navItems as item}
      <a
        href={item.path}
        class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group {
          $page.url.pathname === item.path
            ? 'bg-accent-500/10 text-accent-400 border border-accent-500/30'
            : 'text-dark-400 hover:bg-dark-800 hover:text-white'
        }"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/>
        </svg>
        <span class="font-medium text-sm">{item.label}</span>
        {#if $page.url.pathname === item.path}
          <div class="ml-auto w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse"></div>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="p-4 border-t border-dark-700/50">
    <div class="glass-panel p-4">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
          调
        </div>
        <div>
          <p class="text-sm font-medium text-white">调度工程师</p>
          <p class="text-xs text-dark-400">admin@gridpulse.io</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="status-dot status-online"></span>
        <span class="text-xs text-dark-400">系统在线</span>
      </div>
    </div>
  </div>
</aside>
