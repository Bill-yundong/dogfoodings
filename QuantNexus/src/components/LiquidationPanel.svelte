<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { LiquidationPressure, OrderBook, OrderFlowEntry } from '../types';
  import { liquidationPressureEngine, type LiquidationPrediction } from '../analysis/LiquidationPressureEngine';
  import { wsClient } from '../data/WebSocketClient';

  let { symbol = 'BTCUSDT' } = $props();

  let pressure: LiquidationPressure | null = $state(null);
  let prediction: LiquidationPrediction | null = $state(null);
  let alertLevel = $state<'low' | 'medium' | 'high' | 'extreme'>('low');
  let pressureHistory: LiquidationPressure[] = $state([]);
  let currentPrice = $state(0);
  let orderBook: OrderBook | null = $state(null);
  let recentLiqTrades: OrderFlowEntry[] = $state([]);
  let updateInterval: number | null = null;
  let unsubscribeLiq: (() => void) | null = null;
  let unsubscribeOb: (() => void) | null = null;

  const leverageLabels = ['1x', '2x', '3x', '5x', '10x', '20x', '50x', '100x'];

  onMount(async () => {
    subscribeToData();

    updateInterval = window.setInterval(async () => {
      if (orderBook && currentPrice > 0) {
        pressure = await liquidationPressureEngine.analyze(
          symbol,
          currentPrice,
          orderBook,
          recentLiqTrades
        );
        
        prediction = liquidationPressureEngine.predictLiquidationCascade(
          symbol,
          currentPrice,
          orderBook,
          300000
        );

        alertLevel = liquidationPressureEngine.getPressureAlertLevel(pressure);
        pressureHistory = liquidationPressureEngine.getLiquidationHistory(symbol, 50);
      }
    }, 2000);

    onDestroy(() => {
      if (updateInterval) clearInterval(updateInterval);
      if (unsubscribeLiq) unsubscribeLiq();
      if (unsubscribeOb) unsubscribeOb();
    });
  });

  function subscribeToData() {
    unsubscribeOb = wsClient.on<OrderBook>('orderbook', (data) => {
      if (data.symbol !== symbol) return;
      orderBook = data;
      currentPrice = data.midPrice;
    });

    unsubscribeLiq = wsClient.on<OrderFlowEntry>('liquidation', (entry) => {
      if (entry.symbol !== symbol) return;
      recentLiqTrades = [entry, ...recentLiqTrades.slice(0, 20)];
    });
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatValue(value: number): string {
    if (value >= 1000000000) return (value / 1000000000).toFixed(2) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
    return value.toFixed(2);
  }

  function formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  const pressureColor = $derived({
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    extreme: '#ef4444'
  });

  const alertClass = $derived(`alert-${alertLevel}`);

  function getLiqBarHeight(price: number, maxPrice: number): string {
    const ratio = Math.abs(currentPrice - price) / (currentPrice * 0.05);
    return `${Math.min(ratio * 100, 100)}%`;
  }
</script>

<div class="liquidation-panel">
  <div class="panel-header">
    <h3>清算压力分析</h3>
    <div class="alert-indicator {alertClass}">
      <span class="alert-dot"></span>
      <span class="alert-text">{alertLevel.toUpperCase()}</span>
    </div>
  </div>

  {#if pressure}
    <div class="pressure-index">
      <div class="index-label">清算压力指数</div>
      <div class="index-value" style="color: {pressureColor[alertLevel]}">
        {pressure.pressureIndex.toFixed(1)}
      </div>
      <div class="index-bar">
        <div class="index-fill" style="width: {pressure.pressureIndex}%; background: {pressureColor[alertLevel]}"></div>
      </div>
      <div class="index-labels">
        <span>低</span>
        <span>高</span>
      </div>
    </div>

    <div class="liquidation-visualization">
      <div class="liq-chart">
        <div class="price-scale">
          {#each pressure.estimatedLiqPrice.short.slice().reverse() as price, index}
            <div class="liq-bar-container">
              <div class="liq-bar ask-bar" style="height: {getLiqBarHeight(price, currentPrice * 1.05)}"></div>
              <span class="liq-price">{formatPrice(price)}</span>
              <span class="liq-leverage">{leverageLabels[leverageLabels.length - 1 - index]}</span>
            </div>
          {/each}
        </div>
        
        <div class="current-price-line">
          <span class="current-price">${formatPrice(currentPrice)}</span>
        </div>
        
        <div class="price-scale">
          {#each pressure.estimatedLiqPrice.long as price, index}
            <div class="liq-bar-container">
              <span class="liq-leverage">{leverageLabels[index]}</span>
              <span class="liq-price">{formatPrice(price)}</span>
              <div class="liq-bar bid-bar" style="height: {getLiqBarHeight(price, currentPrice * 0.95)}"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric">
        <span class="metric-label">多头清算</span>
        <span class="metric-value long">${formatValue(pressure.totalLongLiq)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">空头清算</span>
        <span class="metric-value short">${formatValue(pressure.totalShortLiq)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">资金费率</span>
        <span class="metric-value" class:positive={pressure.fundingRate > 0}>
          {formatPercent(pressure.fundingRate)}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">未平仓量</span>
        <span class="metric-value">${formatValue(pressure.openInterest)}</span>
      </div>
    </div>

    {#if prediction}
      <div class="prediction-card">
        <div class="prediction-header">
          <span class="prediction-title">级联预测</span>
          <span class="prediction-confidence">
            置信度: {prediction.confidence.toFixed(0)}%
          </span>
        </div>
        <div class="prediction-content">
          <div class="prediction-price">
            <span class="pred-label">预测价格</span>
            <span class="pred-value" class:positive={prediction.predictedPrice > currentPrice}>
              ${formatPrice(prediction.predictedPrice)}
            </span>
          </div>
          <div class="prediction-liq">
            <div class="liq-estimate">
              <span class="est-label">预计多头清算</span>
              <span class="est-value long">${formatValue(prediction.estimatedLongLiq)}</span>
            </div>
            <div class="liq-estimate">
              <span class="est-label">预计空头清算</span>
              <span class="est-value short">${formatValue(prediction.estimatedShortLiq)}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <div class="pressure-history">
      <div class="history-header">
        <span>压力趋势</span>
      </div>
      <div class="history-chart">
        {#each pressureHistory.slice(-20) as p, index}
          <div class="history-bar">
            <div
              class="history-fill"
              style="height: {p.pressureIndex}%;
                background: {p.pressureIndex > 70 ? '#ef4444' : p.pressureIndex > 50 ? '#f97316' : '#22c55e'}"
            ></div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>
  {/if}
</div>

<style>
  .liquidation-panel {
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

  .alert-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  .alert-low {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .alert-medium {
    background: rgba(234, 179, 8, 0.2);
    color: #eab308;
  }

  .alert-high {
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
  }

  .alert-extreme {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .alert-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .pressure-index {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .index-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .index-value {
    font-size: 32px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .index-bar {
    height: 6px;
    background: #1f2937;
    border-radius: 3px;
    overflow: hidden;
  }

  .index-fill {
    height: 100%;
    transition: width 0.5s, background 0.3s;
  }

  .index-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6b7280;
  }

  .liquidation-visualization {
    flex: 1;
    min-height: 0;
    background: #0f172a;
    border-radius: 6px;
    padding: 8px;
  }

  .liq-chart {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 4px;
  }

  .price-scale {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .liq-bar-container {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 18px;
  }

  .liq-bar {
    width: 30px;
    border-radius: 2px;
    transition: height 0.3s;
  }

  .ask-bar {
    background: rgba(239, 68, 68, 0.6);
  }

  .bid-bar {
    background: rgba(34, 197, 94, 0.6);
  }

  .liq-price {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: #9ca3af;
    min-width: 80px;
  }

  .liq-leverage {
    font-size: 9px;
    color: #6b7280;
    min-width: 35px;
  }

  .current-price-line {
    display: flex;
    justify-content: center;
    padding: 6px 0;
    border-top: 1px dashed #374151;
    border-bottom: 1px dashed #374151;
    margin: 4px 0;
  }

  .current-price {
    font-size: 13px;
    font-weight: 700;
    color: #f3f4f6;
    font-variant-numeric: tabular-nums;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    background: #0f172a;
    border-radius: 6px;
  }

  .metric-label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #e5e7eb;
  }

  .metric-value.long {
    color: #ef4444;
  }

  .metric-value.short {
    color: #22c55e;
  }

  .positive {
    color: #22c55e !important;
  }

  .prediction-card {
    background: linear-gradient(135deg, #1e1b4b, #312e81);
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .prediction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .prediction-title {
    font-size: 12px;
    font-weight: 600;
    color: #c7d2fe;
  }

  .prediction-confidence {
    font-size: 10px;
    color: #a5b4fc;
  }

  .prediction-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .prediction-price {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pred-label {
    font-size: 10px;
    color: #a5b4fc;
  }

  .pred-value {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #e0e7ff;
  }

  .prediction-liq {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .liq-estimate {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .est-label {
    font-size: 10px;
    color: #a5b4fc;
  }

  .est-value {
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .est-value.long {
    color: #fca5a5;
  }

  .est-value.short {
    color: #86efac;
  }

  .pressure-history {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .history-header {
    font-size: 11px;
    color: #9ca3af;
  }

  .history-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 40px;
    background: #0f172a;
    border-radius: 4px;
    padding: 4px;
  }

  .history-bar {
    flex: 1;
    display: flex;
    align-items: flex-end;
    height: 100%;
  }

  .history-fill {
    width: 100%;
    border-radius: 1px;
    transition: height 0.3s;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #6b7280;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #1f2937;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
