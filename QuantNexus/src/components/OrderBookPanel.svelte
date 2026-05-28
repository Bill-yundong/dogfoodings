<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { OrderBook, OrderBookEntry } from '../types';
  import { wsClient } from '../data/WebSocketClient';
  import { marketDepthAnalyzer } from '../analysis/MarketDepthAnalyzer';

  let { symbol = 'BTCUSDT' } = $props();

  let orderBook = $state<OrderBook | null>(null);
  let unsubscribeOrderBook: (() => void) | null = null;
  let depthLevels = 20;
  let maxTotal = 0;

  onMount(() => {
    subscribeToOrderBook();
  });

  onDestroy(() => {
    if (unsubscribeOrderBook) unsubscribeOrderBook();
  });

  $effect(() => {
    const currentSymbol = symbol;
    return () => {
      if (unsubscribeOrderBook) {
        unsubscribeOrderBook();
        unsubscribeOrderBook = null;
      }
    };
  });

  $effect(() => {
    symbol;
    orderBook = null;
    subscribeToOrderBook();
  });

  function subscribeToOrderBook() {
    unsubscribeOrderBook = wsClient.on<OrderBook>('orderbook', (data) => {
      if (data.symbol !== symbol) return;
      orderBook = data;
      updateMaxTotal();
    });
  }

  function updateMaxTotal() {
    if (!orderBook) return;
    
    const allTotals = [
      ...orderBook.bids.slice(0, depthLevels).map(b => b.total),
      ...orderBook.asks.slice(0, depthLevels).map(a => a.total)
    ];
    maxTotal = Math.max(...allTotals, 1);
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

  function formatTotal(total: number): string {
    if (total >= 1000000) {
      return (total / 1000000).toFixed(2) + 'M';
    } else if (total >= 1000) {
      return (total / 1000).toFixed(2) + 'K';
    }
    return total.toFixed(2);
  }

  function getBarWidth(total: number): string {
    return `${(total / maxTotal) * 100}%`;
  }

  function getSpreadClass(spread: number): string {
    const spreadPercent = spread / (orderBook?.midPrice || 1) * 100;
    if (spreadPercent < 0.01) return 'spread-tight';
    if (spreadPercent < 0.05) return 'spread-normal';
    return 'spread-wide';
  }

  $effect(() => {
    if (orderBook) {
      marketDepthAnalyzer.analyze(orderBook);
      marketDepthAnalyzer.calculateVolumeImbalance(orderBook);
    }
  });
</script>

<div class="orderbook-panel">
  <div class="panel-header">
    <h3>订单簿</h3>
    <div class="spread-info">
      <span class="spread-label">价差:</span>
      <span class="spread-value" class:getSpreadClass={orderBook?.spread || 0}>
        {orderBook ? `$${orderBook.spread.toFixed(2)}` : '--'}
      </span>
    </div>
  </div>

  <div class="orderbook-grid">
    <div class="asks-section">
      <div class="ask-header">
        <span>价格</span>
        <span>数量</span>
        <span>总额</span>
      </div>
      <div class="ask-rows">
        {#if orderBook}
          {#each [...orderBook.asks.slice(0, depthLevels)].reverse() as ask}
            <div class="ask-row">
              <div class="bar-bg" style="width: {getBarWidth(ask.total)}"></div>
              <span class="price ask-price">{formatPrice(ask.price)}</span>
              <span class="quantity">{formatQuantity(ask.quantity)}</span>
              <span class="total">{formatTotal(ask.total)}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="mid-price">
      <span class="price-label">中间价</span>
      <span class="price-value">
        {orderBook ? `$${formatPrice(orderBook.midPrice)}` : '--'}
      </span>
    </div>

    <div class="bids-section">
      <div class="bid-header">
        <span>价格</span>
        <span>数量</span>
        <span>总额</span>
      </div>
      <div class="bid-rows">
        {#if orderBook}
          {#each orderBook.bids.slice(0, depthLevels) as bid}
            <div class="bid-row">
              <div class="bar-bg bid-bar" style="width: {getBarWidth(bid.total)}"></div>
              <span class="price bid-price">{formatPrice(bid.price)}</span>
              <span class="quantity">{formatQuantity(bid.quantity)}</span>
              <span class="total">{formatTotal(bid.total)}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  {#if orderBook}
    <div class="depth-metrics">
      <div class="metric">
        <span class="metric-label">买盘深度</span>
        <span class="metric-value bid">
          {formatTotal(orderBook.bids.slice(0, 10).reduce((s, b) => s + b.total, 0))}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">卖盘深度</span>
        <span class="metric-value ask">
          {formatTotal(orderBook.asks.slice(0, 10).reduce((s, a) => s + a.total, 0))}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">失衡</span>
        <span class="metric-value" class:positive={orderBook.imbalance > 0} class:negative={orderBook.imbalance < 0}>
          {(orderBook.imbalance * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .orderbook-panel {
    background: #111827;
    border-radius: 8px;
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1f2937;
  }

  .panel-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: #e5e7eb;
    margin: 0;
  }

  .spread-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spread-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .spread-value {
    font-size: 12px;
    font-weight: 500;
  }

  .spread-tight {
    color: #22c55e;
  }

  .spread-normal {
    color: #eab308;
  }

  .spread-wide {
    color: #ef4444;
  }

  .orderbook-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .ask-header, .bid-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
    padding: 4px 8px;
    background: #1f2937;
    border-radius: 4px;
  }

  .ask-header span, .bid-header span {
    text-align: right;
  }

  .ask-header span:first-child, .bid-header span:first-child {
    text-align: left;
  }

  .ask-rows, .bid-rows {
    flex: 1;
    overflow-y: auto;
    font-size: 11px;
    min-height: 0;
  }

  .ask-row, .bid-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 3px 8px;
    position: relative;
    align-items: center;
    cursor: pointer;
    transition: background 0.15s;
  }

  .ask-row:hover, .bid-row:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .bar-bg {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    background: rgba(239, 68, 68, 0.15);
    transition: width 0.2s;
  }

  .bid-bar {
    background: rgba(34, 197, 94, 0.15);
  }

  .ask-row span, .bid-row span {
    position: relative;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ask-row span:first-child, .bid-row span:first-child {
    text-align: left;
  }

  .ask-price {
    color: #ef4444;
    font-weight: 500;
  }

  .bid-price {
    color: #22c55e;
    font-weight: 500;
  }

  .quantity {
    color: #d1d5db;
  }

  .total {
    color: #9ca3af;
  }

  .mid-price {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(239, 68, 68, 0.1));
    border-radius: 4px;
    margin: 4px 0;
  }

  .price-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .price-value {
    font-size: 16px;
    font-weight: 700;
    color: #f3f4f6;
    font-variant-numeric: tabular-nums;
  }

  .depth-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #1f2937;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .metric-value.bid {
    color: #22c55e;
  }

  .metric-value.ask {
    color: #ef4444;
  }

  .positive {
    color: #22c55e;
  }

  .negative {
    color: #ef4444;
  }

  .ask-rows::-webkit-scrollbar, .bid-rows::-webkit-scrollbar {
    width: 4px;
  }

  .ask-rows::-webkit-scrollbar-track, .bid-rows::-webkit-scrollbar-track {
    background: #1f2937;
  }

  .ask-rows::-webkit-scrollbar-thumb, .bid-rows::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 2px;
  }
</style>
