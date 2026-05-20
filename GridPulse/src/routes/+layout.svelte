<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Header from '$lib/components/layout/Header.svelte';
</script>

<div class="min-h-screen bg-dark-950 grid-bg">
  <div class="flex">
    <Sidebar />
    <div class="flex-1 min-h-screen ml-64">
      <Header />
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</div>
