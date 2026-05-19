<script lang="ts">
  
  import Sidebar from '@/components/layout/Sidebar.svelte';
  import Header from '@/components/layout/Header.svelte';
  import Dashboard from '@/routes/Dashboard.svelte';
  import Prediction from '@/routes/Prediction.svelte';
  import History from '@/routes/History.svelte';
  import Alerts from '@/routes/Alerts.svelte';
  import Settings from '@/routes/Settings.svelte';

  let currentRoute = $state('/');

  const navigate = (route: string) => {
    currentRoute = route;
    window.history.pushState({}, '', route);
  };

  const renderRoute = () => {
    switch (currentRoute) {
      case '/':
        return Dashboard;
      case '/prediction':
        return Prediction;
      case '/history':
        return History;
      case '/alerts':
        return Alerts;
      case '/settings':
        return Settings;
      default:
        return Dashboard;
    }
  };
</script>

<div class="flex h-screen bg-space-dark overflow-hidden">
  <Sidebar {currentRoute} onNavigate={navigate} />

  <div class="flex-1 flex flex-col overflow-hidden">
    <Header />

    <main class="flex-1 overflow-y-auto grid-bg">
      {#key currentRoute}
        {@const RouteComponent = renderRoute()}
        <RouteComponent />
      {/key}
    </main>
  </div>
</div>
