<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { TradingSignal, StrategyConfig } from '../types';
  import { strategyEngine } from '../strategy/StrategyEngine';
  import { riskManager, type RiskCheckResult, type Position } from '../strategy/RiskManager';
  import { wsClient } from '../data/WebSocketClient';
  import { marketDepthAnalyzer } from '../analysis/MarketDepthAnalyzer';
  import { liquidationPressureEngine } from '../analysis/LiquidationPressureEngine';
  import { orderFlowAggregator } from '../data/OrderFlowAggregator';

  let { symbol = 'BTCUSDT' } = $props();

  let strategies = $state<StrategyConfig[]>([]);
  let signals = $state<TradingSignal[]>([]);
  let positions = $state<Position[]>([]);
  let selectedSignal = $state<TradingSignal | null>(null);
  let riskCheckResult = $state<RiskCheckResult | null>(null);
  let isAnalyzing = $state(false);
  let analysisInterval: number | null = null;
  let unsubscribeSignal: (() => void) | null = null;
  let unsubscribeOrderBook: (() => void) | null = null;
  let currentPrice = $state(0);

  const riskMetrics = $derived(riskManager.getRiskMetrics());

  onMount(async () => {
    strategies = strategyEngine.getStrategies();
    signals = strategyEngine.getSignals(20);
    positions = riskManager.getPositions();

    subscribeToData();

    analysisInterval = window.setInterval(async () => {
      await runAnalysis();
    }, 5000);

    unsubscribeSignal = strategyEngine.on((signal) => {
      signals = [signal, ...signals.slice(0, 19)];
      selectedSignal = signal;
      validateSignal(signal);
    });
  });

  onDestroy(() => {
    if (analysisInterval) clearInterval(analysisInterval);
    if (unsubscribeSignal) unsubscribeSignal();
    if (unsubscribeOrderBook) unsubscribeOrderBook();
  });

  function subscribeToData() {
    unsubscribeOrderBook = wsClient.on('orderbook', (data: any) => {
      if (data.symbol !== symbol) return;
      currentPrice = data.midPrice;
      riskManager.updatePositionPrices(symbol, currentPrice);
      positions = riskManager.getPositions();

      const triggered = riskManager.checkStopLossTakeProfit(symbol, currentPrice);
      triggered.forEach(({ position, action }) => {
        console.log(`[Strategy] ${action} 触发: ${position.id}`);
        riskManager.closePosition(position.id, currentPrice);
        positions = riskManager.getPositions();
      });
    });
  }

  async function runAnalysis() {
    if (isAnalyzing) return;
    isAnalyzing = true;

    try {
      const orderBook = await wsClient.getConnectionStatus('orderbook') 
        ? null 
        : null;
      
      const orderFlow = orderFlowAggregator.getCurrentBucket(symbol);
      
      const pressure = liquidationPressureEngine.getLiquidationHistory(symbol, 1);
      const liquidationPressure = pressure.length > 0 ? pressure[0] : null;

      const depthAnalysis = orderBook ? marketDepthAnalyzer.analyze(orderBook) : null;

      const context = await strategyEngine.buildContext(
        symbol,
        orderBook,
        orderFlow,
        liquidationPressure,
        depthAnalysis
      );

      const generatedSignals = await strategyEngine.analyze(context);
      
      if (generatedSignals.length > 0) {
        signals = [...generatedSignals, ...signals.slice(0, 20 - generatedSignals.length)];
      }

      positions = riskManager.getPositions();
    } catch (e) {
      console.error('[Strategy] 分析错误:', e);
    } finally {
      isAnalyzing = false;
    }
  }

  async function validateSignal(signal: TradingSignal) {
    const orderBook = await wsClient.getConnectionStatus('orderbook') ? null : null;
    const pressure = liquidationPressureEngine.getLiquidationHistory(symbol, 1);
    const liquidationPressure = pressure.length > 0 ? pressure[0] : null;

    riskCheckResult = await riskManager.validateSignal(signal, orderBook, liquidationPressure);
  }

  function toggleStrategy(strategyId: string, enabled: boolean) {
    strategyEngine.toggleStrategy(strategyId, enabled);
    strategies = strategyEngine.getStrategies();
  }

  function executeSignal(signal: TradingSignal | null) {
    if (!signal || !riskCheckResult?.passed) return;
    
    const position = riskManager.openPosition(signal, riskCheckResult);
    if (position) {
      positions = riskManager.getPositions();
      console.log(`[Strategy] 开仓成功: ${position.id}`);
    }
  }

  function closePosition(positionId: string) {
    const closed = riskManager.closePosition(positionId, currentPrice);
    if (closed) {
      positions = riskManager.getPositions();
      console.log(`[Strategy] 平仓成功: ${positionId}, PnL: ${closed.unrealizedPnL.toFixed(2)}`);
    }
  }

  function formatValue(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
    return value.toFixed(2);
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function getStrategyTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'order_flow': '订单流',
      'trend_following': '趋势跟踪',
      'mean_reversion': '均值回归',
      'arbitrage': '套利'
    };
    return labels[type] || type;
  }

  const riskLevelColor = $derived(
    (() => {
      const colors: Record<string, string> = {
        low: '#22c55e',
        medium: '#eab308',
        high: '#f97316',
        critical: '#ef4444'
      };
      return colors[riskMetrics.riskLevel] || '#9ca3af';
    })()
  );
</script>

<div class="strategy-panel">
  <div class="panel-header">
    <h3>策略引擎</h3>
    <div class="header-stats">
      <span class="risk-badge" style="background: {riskLevelColor}20; color: {riskLevelColor}">
        {riskMetrics.riskLevel.toUpperCase()}
      </span>
      <span class="analyzing-indicator" class:active={isAnalyzing}>
        {isAnalyzing ? '分析中...' : '就绪'}
      </span>
    </div>
  </div>

  <div class="risk-overview">
    <div class="overview-grid">
      <div class="overview-item">
        <span class="ov-label">权益</span>
        <span class="ov-value">${formatValue(riskMetrics.equity)}</span>
      </div>
      <div class="overview-item">
        <span class="ov-label">可用余额</span>
        <span class="ov-value">${formatValue(riskMetrics.availableBalance)}</span>
      </div>
      <div class="overview-item">
        <span class="ov-label">未实现PnL</span>
        <span class="ov-value" class:positive={riskMetrics.unrealizedPnL >= 0}>
          {riskMetrics.unrealizedPnL >= 0 ? '+' : ''}${formatValue(riskMetrics.unrealizedPnL)}
        </span>
      </div>
      <div class="overview-item">
        <span class="ov-label">每日PnL</span>
        <span class="ov-value" class:positive={riskMetrics.dailyPnL >= 0}>
          {riskMetrics.dailyPnL >= 0 ? '+' : ''}${formatValue(riskMetrics.dailyPnL)}
        </span>
      </div>
      <div class="overview-item">
        <span class="ov-label">保证金比率</span>
        <span class="ov-value">{riskMetrics.marginRatio.toFixed(2)}x</span>
      </div>
      <div class="overview-item">
        <span class="ov-label">胜率</span>
        <span class="ov-value">{(riskMetrics.dailyWinRate * 100).toFixed(1)}%</span>
      </div>
    </div>
  </div>

  <div class="strategies-section">
    <div class="section-header">
      <h4>策略列表</h4>
      <span class="count">{strategies.length} 个策略</span>
    </div>
    <div class="strategies-list">
      {#each strategies as strategy}
        <div class="strategy-card" class:disabled={!strategy.enabled}>
          <div class="strategy-info">
            <div class="strategy-name">{strategy.name}</div>
            <div class="strategy-type">{getStrategyTypeLabel(strategy.type)}</div>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              checked={strategy.enabled} 
              onchange={(e) => toggleStrategy(strategy.id, (e.target as HTMLInputElement).checked)}
            />
            <span class="slider"></span>
          </label>
        </div>
      {/each}
    </div>
  </div>

  <div class="signals-section">
    <div class="section-header">
      <h4>交易信号</h4>
      <span class="count">{signals.length} 条信号</span>
    </div>
    <div class="signals-list">
      {#each signals as signal (signal.id)}
        <div 
          class="signal-card" 
          class:selected={selectedSignal?.id === signal.id}
          onclick={() => { selectedSignal = signal; validateSignal(signal); }}
        >
          <div class="signal-header">
            <span class="signal-type" class:long={signal.type === 'long'} class:short={signal.type === 'short'} class:close={signal.type === 'close'}>
              {signal.type.toUpperCase()}
            </span>
            <span class="signal-time">{formatTime(signal.timestamp)}</span>
          </div>
          <div class="signal-body">
            <div class="signal-price">
              <span class="price-label">入场</span>
              <span class="price-value">${signal.entryPrice.toFixed(2)}</span>
            </div>
            <div class="signal-strength">
              <div class="strength-bar">
                <div class="strength-fill" style="width: {signal.strength}%"></div>
              </div>
              <span class="strength-value">{signal.strength.toFixed(0)}%</span>
            </div>
          </div>
          <div class="signal-reason">{signal.reason}</div>
        </div>
      {/each}
      {#if signals.length === 0}
        <div class="no-signals">暂无信号</div>
      {/if}
    </div>
  </div>

  {#if selectedSignal && riskCheckResult}
    <div class="signal-detail">
      <div class="detail-header">
        <h4>信号详情</h4>
        <span class={`risk-status ${riskCheckResult.passed ? 'passed' : 'failed'}`}>
          {riskCheckResult.passed ? '✓ 风控通过' : '✗ 风控拒绝'}
        </span>
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">置信度</span>
          <span class="detail-value">{(selectedSignal.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">止损</span>
          <span class="detail-value">${selectedSignal.stopLoss.toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">止盈</span>
          <span class="detail-value">${selectedSignal.takeProfit.toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">风险分数</span>
          <span class="detail-value">{riskCheckResult.riskScore.toFixed(1)}</span>
        </div>
      </div>
      <div class="risk-reason">{riskCheckResult.reason}</div>
      {#if riskCheckResult.passed}
        <button class="execute-btn" onclick={() => executeSignal(selectedSignal)}>
          执行交易
        </button>
      {/if}
    </div>
  {/if}

  <div class="positions-section">
    <div class="section-header">
      <h4>当前持仓</h4>
      <span class="count">{positions.length} 个仓位</span>
    </div>
    <div class="positions-list">
      {#each positions as position (position.id)}
        <div class="position-card">
          <div class="position-header">
            <span class="position-side" class:long={position.side === 'long'} class:short={position.side === 'short'}>
              {position.side.toUpperCase()} {position.symbol}
            </span>
            <span class="position-leverage">{position.leverage}x</span>
          </div>
          <div class="position-body">
            <div class="position-row">
              <span class="row-label">数量</span>
              <span class="row-value">{position.size.toFixed(4)}</span>
            </div>
            <div class="position-row">
              <span class="row-label">入场价</span>
              <span class="row-value">${position.entryPrice.toFixed(2)}</span>
            </div>
            <div class="position-row">
              <span class="row-label">当前价</span>
              <span class="row-value">${position.currentPrice.toFixed(2)}</span>
            </div>
            <div class="position-row">
              <span class="row-label">止损</span>
              <span class="row-value sl">${position.stopLoss.toFixed(2)}</span>
            </div>
            <div class="position-row">
              <span class="row-label">止盈</span>
              <span class="row-value tp">${position.takeProfit.toFixed(2)}</span>
            </div>
            <div class="position-row pnl-row">
              <span class="row-label">未实现PnL</span>
              <span class="row-value pnl" class:positive={position.unrealizedPnL >= 0}>
                {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                ({position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <button class="close-btn" onclick={() => closePosition(position.id)}>
            平仓
          </button>
        </div>
      {/each}
      {#if positions.length === 0}
        <div class="no-positions">暂无持仓</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .strategy-panel {
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
    gap: 8px;
    align-items: center;
  }

  .risk-badge {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .analyzing-indicator {
    font-size: 10px;
    color: #6b7280;
    padding: 3px 8px;
    background: #1f2937;
    border-radius: 4px;
  }

  .analyzing-indicator.active {
    color: #3b82f6;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .risk-overview {
    background: #0f172a;
    border-radius: 6px;
    padding: 10px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .overview-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ov-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .ov-value {
    font-size: 12px;
    font-weight: 600;
    color: #e5e7eb;
    font-variant-numeric: tabular-nums;
  }

  .ov-value.positive {
    color: #22c55e;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .section-header h4 {
    font-size: 12px;
    font-weight: 600;
    color: #e5e7eb;
    margin: 0;
  }

  .count {
    font-size: 10px;
    color: #6b7280;
  }

  .strategies-section,
  .signals-section,
  .positions-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .strategies-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .strategy-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: #0f172a;
    border-radius: 4px;
    transition: opacity 0.2s;
  }

  .strategy-card.disabled {
    opacity: 0.5;
  }

  .strategy-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .strategy-name {
    font-size: 12px;
    font-weight: 500;
    color: #e5e7eb;
  }

  .strategy-type {
    font-size: 10px;
    color: #6b7280;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #374151;
    transition: .3s;
    border-radius: 20px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #22c55e;
  }

  input:checked + .slider:before {
    transform: translateX(16px);
  }

  .signals-list,
  .positions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    max-height: 200px;
    min-height: 0;
  }

  .signal-card {
    padding: 8px 10px;
    background: #0f172a;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .signal-card:hover {
    background: #1e293b;
  }

  .signal-card.selected {
    border-color: #3b82f6;
    background: #1e3a5f;
  }

  .signal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .signal-type {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .signal-type.long {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .signal-type.short {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .signal-type.close {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
  }

  .signal-time {
    font-size: 10px;
    color: #6b7280;
  }

  .signal-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .signal-price {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .price-label {
    font-size: 9px;
    color: #6b7280;
  }

  .price-value {
    font-size: 13px;
    font-weight: 600;
    color: #e5e7eb;
    font-variant-numeric: tabular-nums;
  }

  .signal-strength {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .strength-bar {
    width: 60px;
    height: 4px;
    background: #1f2937;
    border-radius: 2px;
    overflow: hidden;
  }

  .strength-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
    transition: width 0.3s;
  }

  .strength-value {
    font-size: 10px;
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
  }

  .signal-reason {
    font-size: 10px;
    color: #6b7280;
    line-height: 1.4;
  }

  .no-signals,
  .no-positions {
    padding: 20px;
    text-align: center;
    color: #6b7280;
    font-size: 12px;
  }

  .signal-detail {
    background: linear-gradient(135deg, #1e1b4b, #312e81);
    border-radius: 6px;
    padding: 10px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .detail-header h4 {
    font-size: 12px;
    font-weight: 600;
    color: #c7d2fe;
    margin: 0;
  }

  .risk-status {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
  }

  .risk-status.passed {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .risk-status.failed {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 6px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .detail-label {
    font-size: 9px;
    color: #a5b4fc;
  }

  .detail-value {
    font-size: 12px;
    font-weight: 600;
    color: #e0e7ff;
    font-variant-numeric: tabular-nums;
  }

  .risk-reason {
    font-size: 10px;
    color: #a5b4fc;
    margin-bottom: 8px;
  }

  .execute-btn {
    width: 100%;
    padding: 8px;
    background: #22c55e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .execute-btn:hover {
    background: #16a34a;
  }

  .position-card {
    padding: 10px;
    background: #0f172a;
    border-radius: 4px;
  }

  .position-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .position-side {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .position-side.long {
    color: #22c55e;
  }

  .position-side.short {
    color: #ef4444;
  }

  .position-leverage {
    padding: 2px 6px;
    background: #374151;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    color: #e5e7eb;
  }

  .position-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .position-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }

  .row-label {
    color: #6b7280;
  }

  .row-value {
    color: #d1d5db;
    font-variant-numeric: tabular-nums;
  }

  .row-value.sl {
    color: #ef4444;
  }

  .row-value.tp {
    color: #22c55e;
  }

  .pnl-row {
    padding-top: 4px;
    border-top: 1px solid #1f2937;
    margin-top: 4px;
  }

  .row-value.pnl {
    font-weight: 600;
  }

  .row-value.pnl.positive {
    color: #22c55e;
  }

  .row-value.pnl:not(.positive) {
    color: #ef4444;
  }

  .close-btn {
    width: 100%;
    padding: 6px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: #dc2626;
  }

  .signals-list::-webkit-scrollbar,
  .positions-list::-webkit-scrollbar {
    width: 4px;
  }

  .signals-list::-webkit-scrollbar-track,
  .positions-list::-webkit-scrollbar-track {
    background: #1f2937;
  }

  .signals-list::-webkit-scrollbar-thumb,
  .positions-list::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 2px;
  }

  .positive {
    color: #22c55e;
  }
</style>
