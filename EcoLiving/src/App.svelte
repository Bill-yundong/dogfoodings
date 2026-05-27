<script lang="ts">
  import { onMount } from 'svelte';
  import { LayoutDashboard, Zap, AlertTriangle, Database, Menu, X, Activity, RefreshCw } from '@lucide/svelte';
  import Dashboard from '@/lib/pages/Dashboard.svelte';
  import DeviceControl from '@/lib/pages/DeviceControl.svelte';
  import WasteDetection from '@/lib/pages/WasteDetection.svelte';
  import HistorySnapshots from '@/lib/pages/HistorySnapshots.svelte';
  import { useEnergyStore } from '@/lib/stores/energyStore.svelte.ts';
  import { formatPower } from '@/lib/utils/formatters';

  const store = useEnergyStore();

  let sidebarOpen = $state(false);

  const navItems = [
    { path: '/', label: '节能中枢', icon: LayoutDashboard },
    { path: '/control', label: '用电控制', icon: Zap },
    { path: '/detection', label: '浪费检测', icon: AlertTriangle },
    { path: '/history', label: '历史快照', icon: Database },
  ];

  const currentPage = $derived(() => {
    switch (store.currentRoute) {
      case '/': return Dashboard;
      case '/control': return DeviceControl;
      case '/detection': return WasteDetection;
      case '/history': return HistorySnapshots;
      default: return Dashboard;
    }
  });

  function navigate(path: string) {
    store.navigate(path);
    sidebarOpen = false;
  }

  onMount(async () => {
    await store.init();
  });

  $effect(() => {
    const handlePopState = () => {
      const path = window.location.hash.slice(1) || '/';
      if (path !== store.currentRoute) {
        store.currentRoute = path;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

  $effect(() => {
    const hash = '#' + store.currentRoute;
    if (window.location.hash !== hash) {
      window.history.pushState({}, '', hash);
    }
  });
</script>

{#if store.isLoading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="w-16 h-16 mx-auto mb-6 relative">
        <div class="absolute inset-0 border-4 border-primary-500/30 rounded-full" />
        <div class="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
        <Activity size={28} class="absolute inset-0 m-auto text-primary-400" />
      </div>
      <h2 class="text-xl font-bold text-slate-200 mb-2">EcoLiving 节能中枢</h2>
      <p class="text-slate-400">系统初始化中...</p>
    </div>
  </div>
{:else if store.error}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md glass-card p-8">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
        <AlertTriangle size={32} class="text-red-500" />
      </div>
      <h2 class="text-xl font-bold text-slate-200 mb-2">初始化失败</h2>
      <p class="text-slate-400 mb-4">{store.error}</p>
      <button 
        class="btn-primary flex items-center gap-2 mx-auto"
        on:click={() => store.init()}
      >
        <RefreshCw size={16} />
        重试
      </button>
    </div>
  </div>
{:else}
  <div class="min-h-screen flex">
    <aside 
      class="fixed lg:static inset-y-0 left-0 z-50 w-64 glass-card rounded-none border-0 border-r border-slate-700/50 transform transition-transform duration-300 lg:transform-none"
      class:-translate-x-full={!sidebarOpen}
      class:translate-x-0={sidebarOpen}
    >
      <div class="h-full flex flex-col">
        <div class="p-6 border-b border-slate-700/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Zap size={24} class="text-white" />
            </div>
            <div>
              <h1 class="text-lg font-bold text-slate-100">EcoLiving</h1>
              <p class="text-xs text-slate-500">智能能效管理系统</p>
            </div>
          </div>
        </div>

        <div class="p-4 border-b border-slate-700/50">
          <div class="p-3 bg-primary-500/10 rounded-xl border border-primary-500/30">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-400">实时功率</span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span class="text-xs text-green-400">实时</span>
              </span>
            </div>
            <p class="text-2xl font-bold text-primary-400 font-mono">
              {formatPower(store.totalPower())}
            </p>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">节能评分</span>
              <span class="text-slate-300 font-mono">{store.efficiencyScore().toFixed(0)} 分</span>
            </div>
            <div class="mt-2 progress-bar">
              <div 
                class="progress-bar-fill"
                style="width: {store.efficiencyScore()}%;"
              />
            </div>
          </div>
        </div>

        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
          {#each navItems as item}
            <button
              class="nav-link w-full flex items-center gap-3 text-left"
              class:active={store.currentRoute === item.path}
              on:click={() => navigate(item.path)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {#if item.path === '/detection' && store.activeWasteCount() > 0}
                <span class="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  {store.activeWasteCount()}
                </span>
              {/if}
            </button>
          {/each}
        </nav>

        <div class="p-4 border-t border-slate-700/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              U
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-200 truncate">用户</p>
              <p class="text-xs text-slate-500">智能节能模式</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    {#if sidebarOpen}
      <div 
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        on:click={() => sidebarOpen = false}
      />
    {/if}

    <div class="flex-1 flex flex-col min-h-screen">
      <header class="sticky top-0 z-30 glass-card rounded-none border-0 border-b border-slate-700/50">
        <div class="flex items-center justify-between px-4 lg:px-6 py-4">
          <div class="flex items-center gap-4">
            <button 
              class="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              on:click={() => sidebarOpen = !sidebarOpen}
            >
              {#if sidebarOpen}
                <X size={20} class="text-slate-300" />
              {:else}
                <Menu size={20} class="text-slate-300" />
              {/if}
            </button>
            <div>
              <h2 class="text-lg font-semibold text-slate-100">
                {navItems.find(n => n.path === store.currentRoute)?.label || '节能中枢'}
              </h2>
              <p class="text-xs text-slate-500">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
              <Activity size={14} class="text-green-400 animate-pulse" />
              <span class="text-xs text-slate-400">
                {store.activeDevicesCount()} 台设备运行中
              </span>
            </div>
            {#if store.standbyDevicesCount() > 0}
              <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <AlertTriangle size={14} class="text-amber-400" />
                <span class="text-xs text-amber-400">
                  {store.standbyDevicesCount()} 台待机
                </span>
              </div>
            {/if}
          </div>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-6 overflow-x-hidden">
        <div class="max-w-7xl mx-auto">
          {#key store.currentRoute}
            <svelte:component this={currentPage()} />
          {/key}
        </div>
      </main>

      <footer class="glass-card rounded-none border-0 border-t border-slate-700/50 py-3 px-6">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>EcoLiving v1.0.0 - 基于 Svelte 5 的智能能效管理系统</span>
          <span class="hidden sm:flex items-center gap-4">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-green-500" />
              语义同步总线正常
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-green-500" />
              IndexedDB 已连接
            </span>
          </span>
        </div>
      </footer>
    </div>
  </div>
{/if}
