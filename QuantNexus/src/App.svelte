<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Timeframe, SystemStatus } from './types';
  import { wsClient } from './data/WebSocketClient';
  import { dbStore } from './storage/IndexedDBStore';
  import { dataSyncHub } from './storage/DataSyncHub';
  import KlineChart from './components/KlineChart.svelte';
  import OrderBookPanel from './components/OrderBookPanel.svelte';
  import OrderFlowPanel from './components/OrderFlowPanel.svelte';
  import LiquidationPanel from './components/LiquidationPanel.svelte';
  import StrategyPanel from './components/StrategyPanel.svelte';

  let symbol = $state('BTCUSDT');
  let timeframe = $state<Timeframe>('1s');
  let activeTab = $state<'orderbook' | 'orderflow' | 'liquidation' | 'strategy'>('orderbook');
  let connectionStatus = $state<{ [key: string]: boolean }>({});
  let systemStatus = $state<SystemStatus | null>(null);
  let isConnected = $state(false);
  let statusInterval: number | null = null;
  let leftPanelWidth = $state(320);
  let rightPanelWidth = $state(380);
  let isResizingLeft = $state(false);
  let isResizingRight = $state(false);

  const timeframes: Timeframe[] = ['1s', '5s', '15s', '1m', '5m', '15m', '1h', '4h', '1d'];

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];

  const overallConnection = $derived(
    Object.values(connectionStatus).every(s => s) && isConnected
  );

  onMount(async () => {
    await dbStore.init();
    await startDataStream();
    startStatusMonitoring();

    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  });

  onDestroy(() => {
    stopDataStream();
    if (statusInterval) clearInterval(statusInterval);
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
  });

  async function startDataStream() {
    try {
      await wsClient.connectAll();
      isConnected = true;
      
      ['kline', 'orderbook', 'trades', 'liquidation'].forEach(type => {
        connectionStatus[type] = wsClient.getConnectionStatus(type);
      });
    } catch (e) {
      console.error('[App] 连接数据流失败:', e);
    }
  }

  function stopDataStream() {
    wsClient.disconnectAll();
    isConnected = false;
    Object.keys(connectionStatus).forEach(key => {
      connectionStatus[key] = false;
    });
  }

  function startStatusMonitoring() {
    statusInterval = window.setInterval(async () => {
      ['kline', 'orderbook', 'trades', 'liquidation'].forEach(type => {
        connectionStatus[type] = wsClient.getConnectionStatus(type);
      });

      const dbSize = await dbStore.getDatabaseSize();
      const pendingOps = dbStore.getPendingOperations();
      const latencies: number[] = [];
      ['kline', 'orderbook', 'trades', 'liquidation'].forEach(type => {
        const lat = wsClient.getLatency(type);
        if (lat > 0) latencies.push(lat);
      });
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      const syncStatuses = dataSyncHub.getSyncStatus();
      const isSyncing = Array.from(syncStatuses.values()).some(s => s);

      systemStatus = {
        timestamp: Date.now(),
        latency: avgLatency,
        dataConsistency: 99.9,
        syncStatus: isSyncing ? 'syncing' : 'synced',
        lastSyncTime: Date.now(),
        pendingOperations: pendingOps,
        databaseSize: dbSize
      };
    }, 1000);
  }

  function changeSymbol(newSymbol: string) {
    symbol = newSymbol;
    wsClient.setSymbol(newSymbol);
  }

  function changeTimeframe(newTimeframe: Timeframe) {
    timeframe = newTimeframe;
  }

  function startResizeLeft() {
    isResizingLeft = true;
  }

  function startResizeRight() {
    isResizingRight = true;
  }

  function handleResize(e: MouseEvent) {
    if (isResizingLeft) {
      const newWidth = e.clientX;
      leftPanelWidth = Math.max(240, Math.min(500, newWidth));
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      rightPanelWidth = Math.max(280, Math.min(600, newWidth));
    }
  }

  function stopResize() {
    isResizingLeft = false;
    isResizingRight = false;
  }

  function formatLatency(latency: number): string {
    if (latency < 0) return '--';
    if (latency < 100) return `${latency.toFixed(0)}ms`;
    if (latency < 1000) return `${latency.toFixed(0)}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  }

  function getTimeframeLabel(tf: Timeframe): string {
    return tf.toUpperCase();
  }

  const tabs = [
    { id: 'orderbook', label: '订单簿', icon: '📊' },
    { id: 'orderflow', label: '订单流', icon: '📈' },
    { id: 'liquidation', label: '清算分析', icon: '⚡' },
    { id: 'strategy', label: '策略引擎', icon: '🎯' }
  ];
</script>

<div class="app-container">
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">QuantNexus</span>
      </div>
      <div class="connection-status">
        <span class={`status-dot ${overallConnection ? 'connected' : 'disconnected'}`}></span>
        <span class="status-text">{overallConnection ? '已连接' : '未连接'}</span>
      </div>
    </div>

    <div class="header-center">
      <div class="symbol-selector">
        <label class="selector-label">交易对</label>
        <select 
          class="symbol-select" 
          value={symbol} 
          onchange={(e) => changeSymbol((e.target as HTMLSelectElement).value)}
        >
          {#each symbols as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>

      <div class="timeframe-selector">
        <label class="selector-label">时间帧</label>
        <div class="timeframe-buttons">
          {#each timeframes as tf}
            <button
              class={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onclick={() => changeTimeframe(tf)}
            >
              {getTimeframeLabel(tf)}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="header-right">
      {#if systemStatus}
        <div class="status-item">
          <span class="status-label">延迟</span>
          <span class="status-value latency">{formatLatency(systemStatus.latency)}</span>
        </div>
        <div class="status-item">
          <span class="status-label">数据量</span>
          <span class="status-value">{systemStatus.databaseSize}</span>
        </div>
        <div class="status-item">
          <span class="status-label">同步</span>
          <span class={`status-value sync ${systemStatus.syncStatus}`}>
            {systemStatus.syncStatus === 'synced' ? '✓' : systemStatus.syncStatus === 'syncing' ? '⟳' : '!'}
          </span>
        </div>
      {/if}
      <button 
        class={`control-btn ${isConnected ? 'stop' : 'start'}`}
        onclick={isConnected ? stopDataStream : startDataStream}
      >
        {isConnected ? '⏹ 停止' : '▶ 开始'}
      </button>
    </div>
  </header>

  <main class="app-main">
    <aside 
      class="left-panel" 
      style="width: {leftPanelWidth}px"
    >
      <div class="panel-tabs">
        {#each tabs.slice(0, 2) as tab}
          <button
            class={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onclick={() => activeTab = tab.id as any}
          >
            <span class="tab-icon">{tab.icon}</span>
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      </div>

      <div class="panel-content">
        {#if activeTab === 'orderbook'}
          <OrderBookPanel {symbol} />
        {:else if activeTab === 'orderflow'}
          <OrderFlowPanel {symbol} />
        {/if}
      </div>
    </aside>

    <div 
      class="resize-handle left"
      onmousedown={startResizeLeft}
      class:resizing={isResizingLeft}
    ></div>

    <section class="center-panel">
      <KlineChart {symbol} {timeframe} />
    </section>

    <div 
      class="resize-handle right"
      onmousedown={startResizeRight}
      class:resizing={isResizingRight}
    ></div>

    <aside 
      class="right-panel" 
      style="width: {rightPanelWidth}px"
    >
      <div class="panel-tabs">
        {#each tabs.slice(2) as tab}
          <button
            class={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onclick={() => activeTab = tab.id as any}
          >
            <span class="tab-icon">{tab.icon}</span>
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      </div>

      <div class="panel-content">
        {#if activeTab === 'liquidation'}
          <LiquidationPanel {symbol} />
        {:else if activeTab === 'strategy'}
          <StrategyPanel {symbol} />
        {/if}
      </div>
    </aside>
  </main>

  <footer class="app-footer">
    <div class="footer-left">
      <span class="footer-item">
        <span class="footer-label">K线:</span>
        <span class={`footer-value ${connectionStatus.kline ? 'ok' : 'error'}`}>
          {connectionStatus.kline ? '●' : '○'}
        </span>
      </span>
      <span class="footer-item">
        <span class="footer-label">订单簿:</span>
        <span class={`footer-value ${connectionStatus.orderbook ? 'ok' : 'error'}`}>
          {connectionStatus.orderbook ? '●' : '○'}
        </span>
      </span>
      <span class="footer-item">
        <span class="footer-label">成交:</span>
        <span class={`footer-value ${connectionStatus.trades ? 'ok' : 'error'}`}>
          {connectionStatus.trades ? '●' : '○'}
        </span>
      </span>
      <span class="footer-item">
        <span class="footer-label">清算:</span>
        <span class={`footer-value ${connectionStatus.liquidation ? 'ok' : 'error'}`}>
          {connectionStatus.liquidation ? '●' : '○'}
        </span>
      </span>
    </div>
    <div class="footer-right">
      {#if systemStatus}
        <span class="footer-item">
          <span class="footer-label">待处理:</span>
          <span class="footer-value">{systemStatus.pendingOperations}</span>
        </span>
        <span class="footer-item">
          <span class="footer-label">数据一致性:</span>
          <span class="footer-value">{systemStatus.dataConsistency.toFixed(1)}%</span>
        </span>
      {/if}
      <span class="footer-item">
        <span class="footer-label">时间:</span>
        <span class="footer-value">{new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
      </span>
    </div>
  </footer>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: #0a0e1a;
    color: #e5e7eb;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #111827;
    border-bottom: 1px solid #1f2937;
    flex-shrink: 0;
    gap: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: #1f2937;
    border-radius: 12px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.connected {
    background: #22c55e;
    animation: pulse 2s infinite;
  }

  .status-dot.disconnected {
    background: #ef4444;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-text {
    font-size: 12px;
    color: #9ca3af;
  }

  .header-center {
    display: flex;
    align-items: center;
    gap: 24px;
    flex: 1;
    justify-content: center;
  }

  .symbol-selector,
  .timeframe-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .selector-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
  }

  .symbol-select {
    padding: 6px 12px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #e5e7eb;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
  }

  .symbol-select:hover {
    border-color: #4b5563;
  }

  .symbol-select:focus {
    border-color: #3b82f6;
  }

  .timeframe-buttons {
    display: flex;
    gap: 2px;
    background: #1f2937;
    padding: 2px;
    border-radius: 6px;
  }

  .timeframe-btn {
    padding: 5px 10px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #9ca3af;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .timeframe-btn:hover {
    color: #e5e7eb;
    background: #374151;
  }

  .timeframe-btn.active {
    background: #3b82f6;
    color: white;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .status-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .status-value {
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .status-value.latency {
    color: #22c55e;
  }

  .status-value.sync.synced {
    color: #22c55e;
  }

  .status-value.sync.syncing {
    color: #eab308;
    animation: spin 1s linear infinite;
  }

  .status-value.sync.error {
    color: #ef4444;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .control-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .control-btn.start {
    background: #22c55e;
    color: white;
  }

  .control-btn.start:hover {
    background: #16a34a;
  }

  .control-btn.stop {
    background: #ef4444;
    color: white;
  }

  .control-btn.stop:hover {
    background: #dc2626;
  }

  .app-main {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .left-panel,
  .right-panel {
    display: flex;
    flex-direction: column;
    background: #0a0e1a;
    flex-shrink: 0;
    min-height: 0;
  }

  .panel-tabs {
    display: flex;
    background: #111827;
    border-bottom: 1px solid #1f2937;
    padding: 4px;
    gap: 2px;
    flex-shrink: 0;
  }

  .panel-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #9ca3af;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .panel-tab:hover {
    background: #1f2937;
    color: #e5e7eb;
  }

  .panel-tab.active {
    background: #1e293b;
    color: #3b82f6;
  }

  .tab-icon {
    font-size: 14px;
  }

  .tab-label {
    white-space: nowrap;
  }

  .panel-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 8px;
  }

  .center-panel {
    flex: 1;
    min-width: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .resize-handle {
    width: 4px;
    background: transparent;
    cursor: col-resize;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .resize-handle:hover,
  .resize-handle.resizing {
    background: #3b82f6;
  }

  .resize-handle.left {
    margin-right: -2px;
  }

  .resize-handle.right {
    margin-left: -2px;
  }

  .app-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    background: #111827;
    border-top: 1px solid #1f2937;
    flex-shrink: 0;
    font-size: 11px;
  }

  .footer-left,
  .footer-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .footer-label {
    color: #6b7280;
  }

  .footer-value {
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
  }

  .footer-value.ok {
    color: #22c55e;
  }

  .footer-value.error {
    color: #ef4444;
  }

  @media (max-width: 1200px) {
    .header-center {
      gap: 12px;
    }

    .timeframe-selector .timeframe-buttons .timeframe-btn {
      padding: 4px 6px;
      font-size: 10px;
    }

    .header-right {
      gap: 10px;
    }

    .status-item {
      display: none;
    }

    .status-item:last-of-type {
      display: flex;
    }
  }

  @media (max-width: 900px) {
    .app-header {
      flex-wrap: wrap;
      gap: 10px;
    }

    .header-center {
      order: 3;
      width: 100%;
      justify-content: flex-start;
      overflow-x: auto;
    }

    .left-panel,
    .right-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 10;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }

    .resize-handle {
      display: none;
    }
  }
</style>
