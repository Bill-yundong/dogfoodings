<script>
  import { onMount } from 'svelte'
  import { dataSync } from './lib/sync/dataSync.js'
  import MunicipalDashboard from './components/MunicipalDashboard.svelte'
  import NavigationDashboard from './components/NavigationDashboard.svelte'

  let activeTab = $state('municipal')
  let syncState = $state(null)

  const tabs = [
    { id: 'municipal', name: '市政管理', icon: '🏛️' },
    { id: 'navigation', name: '停车导航', icon: '🚗' }
  ]

  onMount(() => {
    dataSync.startAutoSync(5000)
    syncState = dataSync.getSyncState()
    
    const unsubscribe = dataSync.onStateChange((state) => {
      syncState = state
    })
    
    return () => {
      unsubscribe()
      dataSync.stopAutoSync()
      dataSync.destroy()
    }
  })
</script>

<div class="app">
  <header class="app-header">
    <div class="logo">
      <span class="logo-icon">🅿️</span>
      <div class="logo-text">
        <h1>ParkingGrid</h1>
        <p>城市静态交通平衡调控系统</p>
      </div>
    </div>
    
    <div class="system-status">
      <div class="status-item">
        <span class="status-label">数据同步</span>
        <span class={`status-value ${syncState?.isConnected ? 'connected' : 'disconnected'}`}>
          <span class="status-dot"></span>
          {syncState?.isConnected ? '实时同步' : '未连接'}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">已连接系统</span>
        <span class="status-value">{syncState?.systems || 0} 个</span>
      </div>
    </div>
  </header>

  <nav class="tabs">
    {#each tabs as tab}
      <button 
        class={`tab ${activeTab === tab.id ? 'active' : ''}`}
        onclick={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-name">{tab.name}</span>
      </button>
    {/each}
  </nav>

  <main class="content">
    {#if activeTab === 'municipal'}
      <MunicipalDashboard />
    {:else}
      <NavigationDashboard />
    {/if}
  </main>

  <footer class="app-footer">
    <div class="footer-info">
      <p>© 2025 ParkingGrid. 基于 Svelte 5 构建的智能停车管理系统</p>
      <div class="tech-stack">
        <span>Svelte 5</span>
        <span>•</span>
        <span>IndexedDB</span>
        <span>•</span>
        <span>随机森林</span>
        <span>•</span>
        <span>实时同步</span>
      </div>
    </div>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 32px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-icon {
    font-size: 40px;
  }

  .logo-text h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .logo-text p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin: 2px 0 0 0;
  }

  .system-status {
    display: flex;
    gap: 32px;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .status-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .status-value {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  .status-value.connected {
    color: #22c55e;
  }

  .status-value.disconnected {
    color: #ef4444;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6b7280;
    animation: pulse 2s infinite;
  }

  .status-value.connected .status-dot {
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }

  .status-value.disconnected .status-dot {
    background: #ef4444;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .tabs {
    display: flex;
    padding: 0 32px;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 24px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
  }

  .tab:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
  }

  .tab.active {
    color: #60a5fa;
    border-bottom-color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  .tab-icon {
    font-size: 20px;
  }

  .content {
    flex: 1;
    overflow: auto;
  }

  .app-footer {
    padding: 20px 32px;
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .footer-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .footer-info p {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
  }

  .tech-stack {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
  }

  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }

    .logo {
      flex-direction: column;
      text-align: center;
    }

    .system-status {
      width: 100%;
      justify-content: space-around;
    }

    .status-item {
      align-items: center;
    }

    .tabs {
      padding: 0;
      gap: 0;
    }

    .tab {
      flex: 1;
      justify-content: center;
      padding: 14px 16px;
    }

    .tab-name {
      display: none;
    }

    .footer-info {
      text-align: center;
    }

    .tech-stack {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
