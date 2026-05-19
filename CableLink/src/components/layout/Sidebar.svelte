<script lang="ts">
  let { currentRoute, onNavigate } = $props<{
    currentRoute: string;
    onNavigate: (route: string) => void;
  }>();

  let isCollapsed = $state(false);

  const menuItems = [
    { id: '/', label: '监控总览', icon: '📊' },
    { id: '/prediction', label: '预测分析', icon: '🔮' },
    { id: '/history', label: '历史数据', icon: '📈' },
    { id: '/alerts', label: '告警中心', icon: '⚠️' },
    { id: '/settings', label: '系统设置', icon: '⚙️' }
  ];
</script>

<aside
  class={`h-screen bg-space-gray/95 backdrop-blur-xl border-r border-tech-cyan/10 flex flex-col transition-all duration-300 ${
    isCollapsed ? 'w-16' : 'w-64'
  }`}
>
  <div class="p-4 border-b border-tech-cyan/10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-deep-sea to-tech-cyan flex items-center justify-center text-lg font-bold text-white shrink-0">
        C
      </div>
      {#if !isCollapsed}
        <div>
          <h1 class="font-bold text-white text-lg">CableLink</h1>
          <p class="text-xs text-gray-400">海缆温控系统</p>
        </div>
      {/if}
    </div>
  </div>

  <nav class="flex-1 py-4 overflow-y-auto">
    <ul class="space-y-1 px-2">
      {#each menuItems as item}
        <li>
          <button
            onclick={() => onNavigate(item.id)}
            aria-label={item.label}
            class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              currentRoute === item.id
                ? 'bg-tech-cyan/20 text-tech-cyan shadow-lg shadow-tech-cyan/10'
                : 'text-gray-400 hover:bg-space-light hover:text-white'
            }`}
          >
            <span class="text-xl" aria-hidden="true">{item.icon}</span>
            {#if !isCollapsed}
              <span class="font-medium text-sm">{item.label}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="p-4 border-t border-tech-cyan/10">
    <button
      onclick={() => isCollapsed = !isCollapsed}
      aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
      class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-space-light hover:text-white transition-colors"
    >
      <svg
        class={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  </div>
</aside>
