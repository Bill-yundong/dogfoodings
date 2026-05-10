<script lang="ts">
  import Header from './components/Header.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import SemanticMappingPanel from './components/SemanticMappingPanel.svelte';
  import TrendSimulationPanel from './components/TrendSimulationPanel.svelte';
  import SnapshotManager from './components/SnapshotManager.svelte';
  import { semanticMappingService } from './services/semanticMapping';
  import { interpolationService } from './services/interpolation';
  import { snapshotService } from './services/snapshot';
  import { dataStore } from './services/dataStore';

  let activeTab = $state<'dashboard' | 'mapping' | 'simulation' | 'snapshots'>('dashboard');
  let isInitialized = $state(false);
  let initError = $state<string | null>(null);

  async function initServices() {
    try {
      await dataStore.init();
      await semanticMappingService.init();
      await snapshotService.init();
      isInitialized = true;
    } catch (error) {
      initError = error instanceof Error ? error.message : '初始化失败';
    }
  }

  $effect(() => {
    initServices();
  });

  const tabs = [
    { id: 'dashboard' as const, label: '数据总览', icon: '📊' },
    { id: 'mapping' as const, label: '语义映射', icon: '🔄' },
    { id: 'simulation' as const, label: '趋势模拟', icon: '📈' },
    { id: 'snapshots' as const, label: '影像快照', icon: '📸' }
  ];
</script>

<div class="app-container">
  <Header />

  {#if initError}
    <div class="error-panel">
      <p>初始化错误: {initError}</p>
    </div>
  {:else if !isInitialized}
    <div class="loading-panel">
      <div class="spinner"></div>
      <p>正在初始化系统...</p>
    </div>
  {:else}
    <nav class="tab-nav">
      {#each tabs as tab}
        <button
          class={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onclick={() => (activeTab = tab.id)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      {/each}
    </nav>

    <main class="main-content">
      {#if activeTab === 'dashboard'}
        <Dashboard />
      {:else if activeTab === 'mapping'}
        <SemanticMappingPanel />
      {:else if activeTab === 'simulation'}
        <TrendSimulationPanel {interpolationService} />
      {:else if activeTab === 'snapshots'}
        <SnapshotManager {snapshotService} />
      {/if}
    </main>
  {/if}
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .loading-panel, .error-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 40px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-panel p {
    color: var(--danger-color);
    font-size: 16px;
  }

  .tab-nav {
    display: flex;
    gap: 8px;
    padding: 16px 20px;
    background: white;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: var(--bg-color);
    color: var(--text-primary);
  }

  .tab-btn.active {
    background: var(--primary-color);
    color: white;
  }

  .tab-icon {
    font-size: 16px;
  }

  .main-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
</style>