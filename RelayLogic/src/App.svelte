<script>
  import Header from './components/Header.svelte'
  import RealTimeMonitor from './components/RealTimeMonitor.svelte'
  import FaultTree from './components/FaultTree.svelte'
  import WaveformViewer from './components/WaveformViewer.svelte'
  import SemanticAlignment from './components/SemanticAlignment.svelte'
  import DeviceMaintenance from './components/DeviceMaintenance.svelte'
  import { activeTab } from './store.js'
</script>

<div class="app-container">
  <Header />
  
  <main class="main-content">
    <aside class="sidebar">
      <nav class="nav-menu">
        <button 
          class="nav-item { $activeTab === 'monitor' ? 'active' : '' }"
          onclick={() => $activeTab = 'monitor'}
        >
          <span class="icon">📊</span>
          实时监控
        </button>
        <button 
          class="nav-item { $activeTab === 'fault' ? 'active' : '' }"
          onclick={() => $activeTab = 'fault'}
        >
          <span class="icon">🌳</span>
          故障树分析
        </button>
        <button 
          class="nav-item { $activeTab === 'waveform' ? 'active' : '' }"
          onclick={() => $activeTab = 'waveform'}
        >
          <span class="icon">📈</span>
          故障录波
        </button>
        <button 
          class="nav-item { $activeTab === 'semantic' ? 'active' : '' }"
          onclick={() => $activeTab = 'semantic'}
        >
          <span class="icon">🔗</span>
          语义对齐
        </button>
        <button 
          class="nav-item { $activeTab === 'maintenance' ? 'active' : '' }"
          onclick={() => $activeTab = 'maintenance'}
        >
          <span class="icon">🔧</span>
          设备运维
        </button>
      </nav>
    </aside>

    <section class="content-area">
      {#if $activeTab === 'monitor'}
        <RealTimeMonitor />
      {:else if $activeTab === 'fault'}
        <FaultTree />
      {:else if $activeTab === 'waveform'}
        <WaveformViewer />
      {:else if $activeTab === 'semantic'}
        <SemanticAlignment />
      {:else if $activeTab === 'maintenance'}
        <DeviceMaintenance />
      {/if}
    </section>
  </main>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 240px;
    background: rgba(30, 41, 59, 0.95);
    border-right: 1px solid rgba(148, 163, 184, 0.2);
    padding: 20px 0;
  }

  .nav-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 12px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: transparent;
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .nav-item:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
  }

  .nav-item.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .nav-item .icon {
    font-size: 18px;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
</style>
