<script lang="ts">
  import StatusBadge from '$lib/components/common/StatusBadge.svelte';
  import type { SystemStatus } from '$lib/types';

  let {
    systemStatus,
    isRunning,
    onStart,
    onStop,
    onTriggerAnomaly,
    onReset,
    onNavChange
  } = $props<{
    systemStatus: SystemStatus;
    isRunning: boolean;
    onStart: () => void;
    onStop: () => void;
    onTriggerAnomaly: () => void;
    onReset: () => void;
    onNavChange: (id: string) => void;
  }>();

  const navItems = [
    { id: 'dashboard', label: '实时监控', icon: '📊' },
    { id: 'snapshots', label: '异常快照', icon: '📸' },
    { id: 'analysis', label: '复盘分析', icon: '📈' },
    { id: 'settings', label: '系统设置', icon: '⚙️' }
  ];

  let activeNav = $state('dashboard');

  const handleNavClick = (id: string) => {
    activeNav = id;
    onNavChange(id);
  };
</script>

<header class="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
          BP
        </div>
        <div>
          <h1 class="text-lg font-bold text-white">BoilerPulse</h1>
          <p class="text-xs text-slate-500">锅炉燃烧效率智能调优系统</p>
        </div>
      </div>

      <nav class="flex gap-1">
        {#each navItems as item}
          <button
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeNav === item.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            onclick={() => handleNavClick(item.id)}
          >
            <span class="mr-2">{item.icon}</span>
            {item.label}
          </button>
        {/each}
      </nav>
    </div>

    <div class="flex items-center gap-4">
      <StatusBadge status={systemStatus} />

      <div class="flex gap-2">
        {#if !isRunning}
          <button
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            onclick={onStart}
          >
            <span>▶</span> 启动
          </button>
        {:else}
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            onclick={onStop}
          >
            <span>⏹</span> 停止
          </button>
        {/if}
        <button
          class="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-medium transition-all"
          onclick={onTriggerAnomaly}
          disabled={!isRunning}
          class:opacity-50={!isRunning}
          class:cursor-not-allowed={!isRunning}
        >
          触发异常
        </button>
        <button
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all"
          onclick={onReset}
        >
          重置
        </button>
      </div>
    </div>
  </div>
</header>
