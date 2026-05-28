<script lang="ts">
  import { Home, Layers, Camera, BarChart3, Heart, Cpu, Menu } from 'lucide-svelte'
  import { currentPage, isSidebarOpen, navigateTo } from '../stores/appStore'
  import type { PageRoute } from '../types'

  const menuItems: { id: PageRoute; label: string; icon: unknown }[] = [
    { id: 'dashboard', label: '仪表盘', icon: Home },
    { id: 'skin-3d', label: '3D肤质视图', icon: Layers },
    { id: 'capture', label: '数据采集', icon: Camera },
    { id: 'analysis', label: '肤况分析', icon: BarChart3 },
    { id: 'care', label: '护理方案', icon: Heart },
    { id: 'devices', label: '设备管理', icon: Cpu }
  ]

  function toggleSidebar() {
    isSidebarOpen.update(v => !v)
  }
</script>

<div class="h-full flex flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-300 {$isSidebarOpen ? 'w-64' : 'w-20'}">
  <div class="p-4 border-b border-gray-200/50 flex items-center justify-between">
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
        <span class="text-white font-bold text-lg">D</span>
      </div>
      {#if $isSidebarOpen}
        <div class="whitespace-nowrap">
          <h1 class="font-bold text-gray-800">DermaLogic</h1>
          <p class="text-xs text-gray-500">智能肤质追踪</p>
        </div>
      {/if}
    </div>
    <button 
      onclick={toggleSidebar}
      class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
    >
      <Menu class="w-5 h-5 text-gray-600" />
    </button>
  </div>

  <nav class="flex-1 p-3 space-y-1">
    {#each menuItems as item}
      <button
        onclick={() => navigateTo(item.id)}
        class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 {
          $currentPage === item.id 
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25' 
            : 'text-gray-600 hover:bg-gray-100'
        }"
      >
        <svelte:component this={item.icon} class="w-5 h-5 flex-shrink-0" />
        {#if $isSidebarOpen}
          <span class="font-medium whitespace-nowrap">{item.label}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="p-4 border-t border-gray-200/50">
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-400 to-primary-500 flex-shrink-0"></div>
      {#if $isSidebarOpen}
        <div class="min-w-0">
          <p class="font-medium text-gray-800 truncate">测试用户</p>
          <p class="text-xs text-gray-500 truncate">test@example.com</p>
        </div>
      {/if}
    </div>
  </div>
</div>
