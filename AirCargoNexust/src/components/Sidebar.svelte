<script lang="ts">
  import Link from '@/router/Link.svelte';
  import { currentRoute } from '@/router';
  import { 
    Box, 
    Package, 
    Calculator, 
    Camera, 
    Settings, 
    PlaneTakeoff,
    ChevronRight,
    X,
    Database,
    Trash2
  } from 'lucide-svelte';
  import * as db from '@/db';
  import { loadAllData, addNotification } from '@/stores';

  let isCollapsed = $state(false);
  let showSettings = $state(false);

  const navItems = [
    { path: '/', icon: Box, label: '货舱可视化' },
    { path: '/cargo', icon: Package, label: '货物管理' },
    { path: '/calculate', icon: Calculator, label: '配载计算' },
    { path: '/snapshots', icon: Camera, label: '配载快照' },
    { path: '/cockpit', icon: PlaneTakeoff, label: '机组终端' }
  ];

  let isClearing = $state(false);

  async function handleClearData() {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复。')) return;

    isClearing = true;
    try {
      await db.clearAllData();
      await loadAllData();
      addNotification({ type: 'success', message: '所有数据已清除' });
      showSettings = false;
    } catch (e) {
      console.error('清除数据失败:', e);
      addNotification({ type: 'error', message: '清除数据失败，请重试' });
    } finally {
      isClearing = false;
    }
  }
</script>

<aside 
  class="h-full flex flex-col bg-dark-800 border-r border-dark-600 transition-all duration-300"
  class:is-collapsed={isCollapsed}
  style="width: {isCollapsed ? '64px' : '240px'}"
>
  <div class="p-4 border-b border-dark-600 flex items-center justify-between">
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="w-10 h-10 rounded-lg bg-aviation-700 flex items-center justify-center flex-shrink-0">
        <PlaneTakeoff class="w-6 h-6 text-white" />
      </div>
      {#if !isCollapsed}
        <div class="whitespace-nowrap">
          <div class="font-display font-bold text-white text-lg leading-tight">AirCargo</div>
          <div class="text-xs text-gray-400">Nexus v1.0</div>
        </div>
      {/if}
    </div>
    <button 
      onclick={() => isCollapsed = !isCollapsed}
      class="p-1 hover:bg-dark-600 rounded transition-colors flex-shrink-0"
    >
      <ChevronRight 
        class="w-5 h-5 text-gray-400 transition-transform"
        style="transform: rotate({isCollapsed ? '0deg' : '180deg'})"
      />
    </button>
  </div>

  <nav class="flex-1 py-4 overflow-y-auto">
    <ul class="space-y-1 px-2">
      {#each navItems as item}
        <li>
          <Link 
            to={item.path}
            class={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              $currentRoute === item.path
                ? 'bg-aviation-700 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {#if $currentRoute === item.path}
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-aviation-500 rounded-r"></div>
            {/if}
            <item.icon class="w-5 h-5 flex-shrink-0" />
            {#if !isCollapsed}
              <span class="text-sm whitespace-nowrap">{item.label}</span>
            {/if}
          </Link>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="p-4 border-t border-dark-600">
    <button 
      onclick={() => showSettings = true}
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
    >
      <Settings class="w-5 h-5 flex-shrink-0" />
      {#if !isCollapsed}
        <span class="text-sm whitespace-nowrap">系统设置</span>
      {/if}
    </button>
  </div>
</aside>

{#if showSettings}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div 
      class="absolute inset-0 backdrop-blur-sm"
      style="background: rgba(0, 0, 0, 0.6);"
      onclick={() => showSettings = false}
    />
    <div class="relative z-10 w-full max-w-md mx-4 glass-panel">
      <div class="flex items-center justify-between px-6 py-4 border-b border-dark-600">
        <h3 class="font-display font-semibold text-white text-lg">系统设置</h3>
        <button 
          onclick={() => showSettings = false}
          class="p-1 hover:bg-dark-600 rounded transition-colors"
        >
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div class="p-6 space-y-6">
        <div>
          <h4 class="hud-text mb-2">数据管理</h4>
          <p class="text-sm text-gray-400 mb-3">清除本地数据库中的所有货物、方案和快照数据。</p>
          <button 
            onclick={(e) => { e.stopPropagation(); handleClearData(); }}
            disabled={isClearing}
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-alert-red/20 text-alert-red hover:bg-alert-red/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 class="w-4 h-4" />
            {isClearing ? '清除中...' : '清除所有数据'}
          </button>
        </div>
        <div>
          <h4 class="hud-text mb-2">关于</h4>
          <div class="text-sm text-gray-400 space-y-1">
            <p>AirCargo Nexus v1.0</p>
            <p>航空货运装载平衡系统</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
