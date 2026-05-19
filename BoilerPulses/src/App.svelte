<script>
  import { onMount, onDestroy } from 'svelte';
  import { boilerState, systemStatus } from '../lib/stores/boilerStore.js';
  import { boilerSimulator } from '../lib/simulator/BoilerDataSimulator.js';
  import { mpcEngine } from '../lib/mpc/ModelPredictiveControl.js';
  import { semanticSync } from '../lib/sync/SemanticSynchronizer.js';
  import MonitorPanel from './MonitorPanel.svelte';
  import ControlPanel from './ControlPanel.svelte';
  import EfficiencyDashboard from './EfficiencyDashboard.svelte';
  import AnomalyAnalysis from './AnomalyAnalysis.svelte';

  let activeTab = 'monitor';
  let startTime = Date.now();

  const tabs = [
    { id: 'monitor', label: '实时监控', icon: '📊' },
    { id: 'control', label: '风机控制', icon: '🎛️' },
    { id: 'efficiency', label: '效率反馈', icon: '⚡' },
    { id: 'analysis', label: '异常分析', icon: '🔍' }
  ];

  onMount(() => {
    boilerSimulator.start(1000);
    semanticSync.registerSubscriber('energyMonitor', (context) => {
      console.log('Energy Monitor received:', context);
    });
    semanticSync.registerSubscriber('fanControl', (context) => {
      console.log('Fan Control received:', context);
    });
    setInterval(async () => {
      if ($boilerState.isRunning) {
        const result = await mpcEngine.optimizeAsync($boilerState);
        if ($boilerState.anomalyDetected) {
          captureAnomalySnapshot();
        }
      }
    }, 5000);
  });

  onDestroy(() => {
    boilerSimulator.stop();
  });

  async function captureAnomalySnapshot() {
    console.log('Anomaly detected, capturing snapshot...');
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
</script>

<div class="app-container grid-bg">
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">🔥</span>
        <div>
          <h1 class="logo-text">BoilerPulses</h1>
          <p class="logo-subtitle">锅炉燃烧效率智能调优系统</p>
        </div>
      </div>
    </div>

    <nav class="nav-tabs">
      {#each tabs as tab}
        <button
          class="nav-tab {activeTab === tab.id ? 'active' : ''}"
          on:click={() => activeTab = tab.id}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </nav>

    <div class="header-right">
      <div class="status-indicator">
        <div class="status-dot {$boilerState.anomalyDetected ? 'anomaly animate-pulse' : 'normal'}"></div>
        <span class="status-text">
          {$boilerState.anomalyDetected ? '异常告警' : '运行正常'}
        </span>
      </div>
      <div class="system-info">
        <div class="info-item">
          <span class="text-xs text-gray-500">运行时间</span>
          <span class="text-sm text-white font-mono">{formatUptime($systemStatus.uptime)}</span>
        </div>
        <div class="info-item">
          <span class="text-xs text-gray-500">数据点</span>
          <span class="text-sm text-white font-mono">{$systemStatus.dataPoints.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </header>

  <main class="app-main">
    {#if activeTab === 'monitor'}
      <MonitorPanel />
    {:else if activeTab === 'control'}
      <ControlPanel />
    {:else if activeTab === 'efficiency'}
      <EfficiencyDashboard />
    {:else if activeTab === 'analysis'}
      <AnomalyAnalysis />
    {/if}
  </main>

  <footer class="app-footer">
    <div class="footer-left">
      <span class="text-xs text-gray-500">语义同步状态:</span>
    </div>
    <div class="footer-right">
      <span class="text-xs text-gray-500">基于 Svelte 5 · MPC 异步模型预测控制 · IndexedDB 持久化存储</span>
    </div>
  </footer>
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    font-size: 2rem;
    animation: float 3s ease-in-out infinite;
  }

  .logo-text {
    font-size: 1.25rem;
    font-weight: bold;
    background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .logo-subtitle {
    font-size: 0.7rem;
    color: #64748b;
  }

  .nav-tabs {
    display: flex;
    gap: 0.5rem;
    background: rgba(30, 41, 59, 0.5);
    padding: 0.25rem;
    border-radius: 9999px;
    border: 1px solid rgba(51, 65, 85, 0.5);
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    border: none;
    background: transparent;
    color: #64748b;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .nav-tab:hover {
    color: #94a3b8;
    background: rgba(51, 65, 85, 0.5);
  }

  .nav-tab.active {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .tab-icon {
    font-size: 1rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 9999px;
    border: 1px solid rgba(51, 65, 85, 0.5);
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .status-dot.normal {
    background: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  }

  .status-dot.anomaly {
    background: #ef4444;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }

  .status-text {
    font-size: 0.875rem;
    color: #94a3b8;
  }

  .system-info {
    display: flex;
    gap: 1.5rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
  }

  .app-main {
    flex: 1;
    padding: 1.5rem 2rem;
    overflow-y: auto;
  }

  .app-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 2rem;
    background: rgba(15, 23, 42, 0.95);
    border-top: 1px solid rgba(51, 65, 85, 0.5);
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>
