<script lang="ts">
  import { Router, Route, Link } from 'svelte-routing';
  import Sidebar from './components/Sidebar.svelte';
  import CargoHoldVisualization from './pages/CargoHoldVisualization.svelte';
  import CargoManagement from './pages/CargoManagement.svelte';
  import LoadCalculation from './pages/LoadCalculation.svelte';
  import SnapshotList from './pages/SnapshotList.svelte';
  import SnapshotDetail from './pages/SnapshotDetail.svelte';
  import CockpitTerminal from './pages/CockpitTerminal.svelte';
</script>

<div class="flex h-screen overflow-hidden">
  <Sidebar />
  <main class="flex-1 overflow-auto">
    <Router>
      <Route path="/" component={CargoHoldVisualization} />
      <Route path="/cargo" component={CargoManagement} />
      <Route path="/calculate" component={LoadCalculation} />
      <Route path="/snapshots" component={SnapshotList} />
      <Route path="/snapshot/:id" component={SnapshotDetail} />
      <Route path="/cockpit" component={CockpitTerminal} />
    </Router>
  </main>
</div>
