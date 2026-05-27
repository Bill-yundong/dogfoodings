<script lang="ts">
  import { onMount } from 'svelte';
  import { currentRoute, getRouteParams } from '@/router';
  import Sidebar from './components/Sidebar.svelte';
  import CargoHoldVisualization from './pages/CargoHoldVisualization.svelte';
  import CargoManagement from './pages/CargoManagement.svelte';
  import LoadCalculation from './pages/LoadCalculation.svelte';
  import SnapshotList from './pages/SnapshotList.svelte';
  import SnapshotDetail from './pages/SnapshotDetail.svelte';
  import CockpitTerminal from './pages/CockpitTerminal.svelte';
  import type { Component } from 'svelte';

  const routes = [
    { path: '/', component: CargoHoldVisualization },
    { path: '/cargo', component: CargoManagement },
    { path: '/calculate', component: LoadCalculation },
    { path: '/snapshots', component: SnapshotList },
    { path: '/snapshot/:id', component: SnapshotDetail },
    { path: '/cockpit', component: CockpitTerminal }
  ];

  let routeParams = $state<Record<string, string>>({});
  let matchedComponent = $state<Component>(CargoHoldVisualization);

  function updateRoute(path: string) {
    for (const route of routes) {
      const params = getRouteParams(route.path, path);
      if (params !== null) {
        matchedComponent = route.component;
        routeParams = params;
        break;
      }
    }
  }

  onMount(() => {
    updateRoute(window.location.pathname);
    const unsubscribe = currentRoute.subscribe((path) => {
      updateRoute(path);
    });
    return unsubscribe;
  });
</script>

<div class="flex h-screen overflow-hidden">
  <Sidebar />
  <main class="flex-1 overflow-auto">
    {#if matchedComponent === SnapshotDetail}
      <SnapshotDetail id={routeParams['id'] || ''} />
    {:else}
      <svelte:component this={matchedComponent} />
    {/if}
  </main>
</div>
