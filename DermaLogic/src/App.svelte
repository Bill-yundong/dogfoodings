<script lang="ts">
  import { currentPage } from './stores/appStore'
  import Sidebar from './components/Sidebar.svelte'
  import Notification from './components/Notification.svelte'
  import Dashboard from './pages/Dashboard.svelte'
  import Skin3D from './pages/Skin3D.svelte'
  import Capture from './pages/Capture.svelte'
  import Analysis from './pages/Analysis.svelte'
  import Care from './pages/Care.svelte'
  import Devices from './pages/Devices.svelte'
</script>

<div class="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
  <Sidebar />
  
  <main class="flex-1 overflow-y-auto scrollbar-hide">
    {#if $currentPage === 'dashboard'}
      <Dashboard />
    {:else if $currentPage === 'skin-3d'}
      <Skin3D />
    {:else if $currentPage === 'capture'}
      <Capture />
    {:else if $currentPage === 'analysis'}
      <Analysis />
    {:else if $currentPage === 'care'}
      <Care />
    {:else if $currentPage === 'devices'}
      <Devices />
    {:else}
      <Dashboard />
    {/if}
  </main>
  
  <Notification />
</div>
