<script lang="ts">
  import { Link } from 'svelte-routing';
  import { 
    Box, 
    Package, 
    Calculator, 
    Camera, 
    Settings, 
    PlaneTakeoff,
    ChevronRight
  } from 'lucide-svelte';

  let isCollapsed = $state(false);

  const navItems = [
    { path: '/', icon: Box, label: '货舱可视化' },
    { path: '/cargo', icon: Package, label: '货物管理' },
    { path: '/calculate', icon: Calculator, label: '配载计算' },
    { path: '/snapshots', icon: Camera, label: '配载快照' },
    { path: '/cockpit', icon: PlaneTakeoff, label: '机组终端' }
  ];
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
            getProps={({ location }) => {
              const isActive = location.pathname === item.path;
              return {
                class: `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-aviation-700 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`,
                style: isActive ? 'box-shadow: 0 10px 15px -3px rgba(10, 37, 64, 0.3);' : ''
              };
            }}
          >
            <svelte:component this={item.icon} class="w-5 h-5 flex-shrink-0" />
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
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
    >
      <Settings class="w-5 h-5 flex-shrink-0" />
      {#if !isCollapsed}
        <span class="text-sm whitespace-nowrap">系统设置</span>
      {/if}
    </button>
  </div>
</aside>
