<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { OrderFlowEntry, AggregatedOrderFlow } from '../types';
  import { orderFlowAggregator } from '../data/OrderFlowAggregator';
  import { wsClient } from '../data/WebSocketClient';

  let { symbol = 'BTCUSDT' } = $props();

  let currentDelta = $state(0);
  let cumulativeDelta = $state(0);
  let buyVolume = $state(0);
  let sellVolume = $state(0);
  let imbalance = $state(0);
  let liquidationCount = $state(0);
  let recentTrades: OrderFlowEntry[] = $state([]);
  let deltaIndicator = $state({
    cumulativeDelta: 0, deltaDivergence: 0, volumeDeltaRatio: 0, smoothedDelta: 0 });
  let flowImbalance = $state<{
    imbalance: number;
    direction: 'neutral' | 'bullish' | 'bearish';
    strength: number;
    absorptionDetected: boolean;
  }>({
    imbalance: 1, direction: 'neutral', strength: 0, absorptionDetected: false
  });
  let unsubscribeTrades: (() => void) | null = null;
  let unsubscribeLiq: (() => void) | null = null;
  let unsubscribeAgg: (() => void) | null = null;

  const maxRecentTrades = 50;

  onMount(() => {
    subscribeToData();

    const updateInterval = setInterval(() => {
      deltaIndicator = orderFlowAggregator.calculateDeltaIndicator(symbol, 20);
      flowImbalance = orderFlowAggregator.detectOrderFlowImbalance(symbol, 10, 2.0);
    }, 500);

    onDestroy(() => {
      clearInterval(updateInterval);
      if (unsubscribeTrades) unsubscribeTrades();
      if (unsubscribeLiq) unsubscribeLiq();
      if (unsubscribeAgg) unsubscribeAgg();
    });
  });

  function subscribeToData() {
    unsubscribeTrades = wsClient.on<OrderFlowEntry>('trades', (entry) => {
      if (entry.symbol !== symbol) return;
      
      orderFlowAggregator.addEntry(entry);
      
      recentTrades = [entry, ...recentTrades.slice(0, maxRecentTrades - 1)];
      
      if (entry.side === 'buy') {
        buyVolume += entry.quantity;
        currentDelta += entry.quantity;
      } else {
        sellVolume += entry.quantity;
        currentDelta -= entry.quantity;
      }
      
      cumulativeDelta += entry.delta;
      imbalance = buyVolume / (sellVolume || 1);
    });

    unsubscribeLiq = wsClient.on<OrderFlowEntry>('liquidation', (entry) => {
      if (entry.symbol !== symbol) return;
      
      orderFlowAggregator.addEntry(entry);
      liquidationCount++;
    });

    unsubscribeAgg = orderFlowAggregator.on((data) => {
      const current = orderFlowAggregator.getCurrentBucket(symbol);
      if (current) {
        currentDelta = current.delta;
      }
    });
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatQuantity(quantity: number): string {
    return quantity.toFixed(4);
  }

  function formatVolume(volume: number): string {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  const deltaColor = $derived(currentDelta >= 0 ? '#22c55e' : '#ef4444');
  const cumDeltaColor = $derived(cumulativeDelta >= 0 ? '#22c55e' : '#ef4444');
  const imbalanceColor = $derived(imbalance >= 1 ? '#22c55e' : '#ef4444');
</script>

<div class="orderflow-panel">
  <div class="panel-header">
    <h3>订单流分析</h3>
    <div class="header-stats">
      <div class="mini-stat">
        <span class="mini-label">Delta</span>
        <span class="mini-value" style="color: {deltaColor}">
          {currentDelta >= 0 ? '+' : ''}{currentDelta.toFixed(2)}
        </span>
      </div>
      <div class="mini-stat">
        <span class="mini-label">累计Delta</span>
        <span class="mini-value" style="color: {cumDeltaColor}">
          {cumulativeDelta >= 0 ? '+' : ''}{cumulativeDelta.toFixed(2)}
        </span>
      </div>
    </div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">买盘/卖盘</span>
        <span class="metric-ratio" style="color: {imbalanceColor}">
          {imbalance.toFixed(2)}x
        </span>
      </div>
      <div class="volume-bars">
        <div class="volume-bar buy-bar" style="width: {Math.min(buyVolume / (buyVolume + sellVolume) * 100, 100)}%"></div>
        <div class="volume-bar sell-bar" style="width: {Math.min(sellVolume / (buyVolume + sellVolume) * 100, 100)}%"></div>
      </div>
      <div class="volume-labels">
        <span class="buy-label">{formatVolume(buyVolume)}</span>
        <span class="sell-label">{formatVolume(sellVolume)}</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Delta指标</span>
        <span class="metric-value" class:positive={deltaIndicator.cumulativeDelta > 0}>
          {deltaIndicator.cumulativeDelta >= 0 ? '+' : ''}{deltaIndicator.cumulativeDelta.toFixed(2)}
        </span>
      </div>
      <div class="delta-submetrics">
        <div class="submetric">
          <span class="sub-label">背离</span>
          <span class="sub-value" class:positive={deltaIndicator.deltaDivergence > 0}>
            {deltaIndicator.deltaDivergence >= 0 ? '+' : ''}{deltaIndicator.deltaDivergence.toFixed(2)}
          </span>
        </div>
        <div class="submetric">
          <span class="sub-label">平滑Delta</span>
          <span class="sub-value" class:positive={deltaIndicator.smoothedDelta > 0}>
            {deltaIndicator.smoothedDelta >= 0 ? '+' : ''}{deltaIndicator.smoothedDelta.toFixed(3)}
          </span>
        </div>
        <div class="submetric">
          <span class="sub-label">V/D比率</span>
          <span class="sub-value" class:positive={deltaIndicator.volumeDeltaRatio > 0}>
            {(deltaIndicator.volumeDeltaRatio * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">订单流失衡</span>
        <span class="direction-badge" class:bullish={flowImbalance.direction === 'bullish'}
          class:bearish={flowImbalance.direction === 'bearish'}>
          {flowImbalance.direction.toUpperCase()}
        </span>
      </div>
      <div class="imbalance-meter">
        <div class="meter-bg">
          <div class="meter-fill" style="width: {flowImbalance.strength}%"></div>
        </div>
        <div class="meter-labels">
          <span>卖出</span>
          <span>买入</span>
        </div>
      </div>
      <div class="imbalance-details">
        <span class="detail">强度: {flowImbalance.strength.toFixed(1)}%</span>
        {#if flowImbalance.absorptionDetected}
          <span class="warning">吸收检测!</span>
        {/if}
      </div>
    </div>

    <div class="metric-card liquidation-card">
      <div class="metric-header">
        <span class="metric-title">清算</span>
        <span class="liquidation-count">{liquidationCount}</span>
      </div>
      <div class="liquidation-icon">⚡</div>
    </div>
  </div>

  <div class="recent-trades">
    <div class="trades-header">
      <h4>最近成交</h4>
      <span class="trades-count">{recentTrades.length} 笔</span>
    </div>
    <div class="trades-list">
      {#each recentTrades as trade (trade.id)}
        <div class="trade-row" class:buy={trade.side === 'buy'} class:liquidation={trade.type === 'liquidation'}>
          <span class="trade-time">{formatTime(trade.timestamp)}</span>
          <span class="trade-price">{formatPrice(trade.price)}</span>
          <span class="trade-qty">{formatQuantity(trade.quantity)}</span>
          <span class="trade-type">
            {trade.type === 'liquidation' ? '⚡' : trade.side === 'buy' ? '↑' : '↓'}
          </span>
        </div>
      {/each}
      {#if recentTrades.length === 0}
        <div class="no-trades">等待数据...</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .orderflow-panel {
    background: #111827;
    border-radius: 8px;
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #1f2937;
  }

  .panel-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: #e5e7eb;
    margin: 0;
  }

  .header-stats {
    display: flex;
    gap: 16px;
  }

  .mini-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .mini-label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .mini-value {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .metric-card {
    background: #0f172a;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metric-title {
    font-size: 11px;
    color: #9ca3af;
  }

  .metric-ratio {
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .metric-value {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .volume-bars {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    background: #1f2937;
  }

  .volume-bar {
    height: 100%;
    transition: width 0.3s;
  }

  .buy-bar {
    background: #22c55e;
  }

  .sell-bar {
    background: #ef4444;
  }

  .volume-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .buy-label {
    color: #22c55e;
  }

  .sell-label {
    color: #ef4444;
  }

  .delta-submetrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .submetric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .sub-label {
    font-size: 9px;
    color: #6b7280;
  }

  .sub-value {
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .positive {
    color: #22c55e;
  }

  .imbalance-meter {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meter-bg {
    height: 8px;
    background: linear-gradient(90deg, #ef4444, #374151, #22c55e);
    border-radius: 4px;
    position: relative;
  }

  .meter-fill {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6b7280;
  }

  .imbalance-details {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .detail {
    color: #9ca3af;
  }

  .warning {
    color: #f59e0b;
    font-weight: 600;
  }

  .direction-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .bullish {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .bearish {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .liquidation-card {
    align-items: center;
    justify-content: center;
  }

  .liquidation-count {
    font-size: 24px;
    font-weight: 700;
    color: #f59e0b;
  }

  .liquidation-icon {
    font-size: 32px;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .recent-trades {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #0f172a;
    border-radius: 6px;
    overflow: hidden;
  }

  .trades-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1e293b;
  }

  .trades-header h4 {
    font-size: 12px;
    font-weight: 600;
    color: #e5e7eb;
    margin: 0;
  }

  .trades-count {
    font-size: 11px;
    color: #6b7280;
  }

  .trades-list {
    flex: 1;
    overflow-y: auto;
    font-size: 11px;
  }

  .trade-row {
    display: grid;
    grid-template-columns: 70px 1fr 1fr 30px;
    padding: 4px 12px;
    gap: 8px;
    border-bottom: 1px solid #1e293b;
    align-items: center;
  }

  .trade-row:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .trade-time {
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }

  .trade-price {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .trade-qty {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #9ca3af;
  }

  .trade-type {
    text-align: center;
    font-size: 14px;
  }

  .buy .trade-price {
    color: #22c55e;
  }

  .trade-row:not(.buy) .trade-price {
    color: #ef4444;
  }

  .liquidation {
    background: rgba(245, 158, 11, 0.1);
  }

  .no-trades {
    padding: 20px;
    text-align: center;
    color: #6b7280;
  }

  .trades-list::-webkit-scrollbar {
    width: 4px;
  }

  .trades-list::-webkit-scrollbar-track {
    background: #1f2937;
  }

  .trades-list::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 2px;
  }
</style>
