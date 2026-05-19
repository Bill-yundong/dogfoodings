<script lang="ts">
  import { boilerStore } from '$lib/stores/boiler';
  import Header from '$lib/components/layout/Header.svelte';
  import DashboardPage from '$lib/pages/DashboardPage.svelte';
  import SnapshotsPage from '$lib/pages/SnapshotsPage.svelte';
  import AnalysisPage from '$lib/pages/AnalysisPage.svelte';
  import SettingsPage from '$lib/pages/SettingsPage.svelte';

  let currentPage = $state('dashboard');

  const handleStart = () => boilerStore.start();
  const handleStop = () => boilerStore.stop();
  const handleTriggerAnomaly = () => boilerStore.triggerAnomaly();
  const handleReset = () => boilerStore.reset();
  const handleNavChange = (id: string) => (currentPage = id);
</script>

<div class="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
  <Header
    systemStatus={$boilerStore.systemStatus}
    isRunning={$boilerStore.isRunning}
    onStart={handleStart}
    onStop={handleStop}
    onTriggerAnomaly={handleTriggerAnomaly}
    onReset={handleReset}
    onNavChange={handleNavChange}
  />

  <main class="flex-1 overflow-hidden">
    {#if currentPage === 'dashboard'}
      <DashboardPage />
    {:else if currentPage === 'snapshots'}
      <SnapshotsPage />
    {:else if currentPage === 'analysis'}
      <AnalysisPage />
    {:else if currentPage === 'settings'}
      <SettingsPage />
    {/if}
  </main>
</div>
