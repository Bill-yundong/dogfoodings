<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData } from 'lightweight-charts';
  import type { KlineData, AggregatedOrderFlow, Timeframe } from '../types';
  import { dbStore } from '../storage/IndexedDBStore';
  import { wsClient } from '../data/WebSocketClient';

  let { symbol = 'BTCUSDT', timeframe = '1s' as Timeframe } = $props();

  let chartContainer: HTMLDivElement;
  let chart: IChartApi | null = null;
  let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  let volumeSeries: ISeriesApi<'Histogram'> | null = null;
  let deltaSeries: ISeriesApi<'Histogram'> | null = null;
  let klinesData = $state<KlineData[]>([]);
  let unsubscribeKline: (() => void) | null = null;

  const chartOptions = {
    layout: {
      background: { color: '#0a0e1a' },
      textColor: '#a0aec0'
    },
    grid: {
      vertLines: { color: '#1a202c' },
      horzLines: { color: '#1a202c' }
    },
    rightPriceScale: {
      borderColor: '#2d3748'
    },
    timeScale: {
      borderColor: '#2d3748',
      timeVisible: true,
      secondsVisible: true
    },
    crosshair: {
      mode: 1
    }
  };

  const candlestickOptions = {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444'
  };

  const volumeOptions = {
    color: '#3b82f6',
    priceFormat: {
      type: 'volume' as const
    },
    priceScaleId: 'volume'
  };

  const deltaOptions = {
    color: '#8b5cf6',
    priceFormat: {
      type: 'volume' as const
    },
    priceScaleId: 'delta'
  };

  onMount(async () => {
    if (!chartContainer) return;

    chart = createChart(chartContainer, chartOptions);
    
    candlestickSeries = chart.addCandlestickSeries(candlestickOptions);
    
    volumeSeries = chart.addHistogramSeries({
      ...volumeOptions,
      color: '#3b82f680'
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    });

    deltaSeries = chart.addHistogramSeries({
      ...deltaOptions,
      color: '#8b5cf680'
    });
    deltaSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.6,
        bottom: 0.2
      }
    });

    await loadHistoricalData();
    subscribeToRealtimeData();

    const handleResize = () => {
      if (chart && chartContainer) {
        chart.applyOptions({
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    onDestroy(() => {
      window.removeEventListener('resize', handleResize);
      if (unsubscribeKline) unsubscribeKline();
      if (chart) chart.remove();
    });
  });

  async function loadHistoricalData() {
    const now = Date.now();
    const startTime = now - 3600000;
    
    klinesData = await dbStore.getKlines(symbol, timeframe, startTime, now, 500);
    
    if (klinesData.length === 0) {
      klinesData = generateMockData(500);
    }

    const candleData: CandlestickData[] = klinesData.map(k => ({
      time: k.time / 1000 as any,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close
    }));

    const volumeData: HistogramData[] = klinesData.map(k => ({
      time: k.time / 1000 as any,
      value: k.volume,
      color: k.close >= k.open ? '#22c55e80' : '#ef444480'
    }));

    const deltaData: HistogramData[] = klinesData.map((k, i) => ({
      time: k.time / 1000 as any,
      value: (k.close - k.open) * k.volume,
      color: k.close >= k.open ? '#22c55e60' : '#ef444460'
    }));

    candlestickSeries?.setData(candleData);
    volumeSeries?.setData(volumeData);
    deltaSeries?.setData(deltaData);
  }

  function generateMockData(count: number): KlineData[] {
    const data: KlineData[] = [];
    const now = Date.now();
    let price = 67500 + Math.random() * 5000;
    const interval = timeframeToMs(timeframe);

    for (let i = count - 1; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / 1000) * 1000;
      const volatility = 0.002;
      const change = (Math.random() - 0.5) * 2 * volatility * price;
      
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.001);
      const low = Math.min(open, close) * (1 - Math.random() * 0.001);
      const volume = 500 + Math.random() * 5000;

      data.push({
        time,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume: volume * (open + close) / 2
      });

      price = close;
    }

    return data;
  }

  function subscribeToRealtimeData() {
    unsubscribeKline = wsClient.on<{ symbol: string; timeframe: Timeframe; kline: KlineData }>('kline', (data) => {
      if (data.symbol !== symbol || data.timeframe !== timeframe) return;

      const { kline } = data;
      const candleUpdate: CandlestickData = {
        time: kline.time / 1000 as any,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close
      };

      const volumeUpdate: HistogramData = {
        time: kline.time / 1000 as any,
        value: kline.volume,
        color: kline.close >= kline.open ? '#22c55e80' : '#ef444480'
      };

      const deltaUpdate: HistogramData = {
        time: kline.time / 1000 as any,
        value: (kline.close - kline.open) * kline.volume,
        color: kline.close >= kline.open ? '#22c55e60' : '#ef444460'
      };

      candlestickSeries?.update(candleUpdate);
      volumeSeries?.update(volumeUpdate);
      deltaSeries?.update(deltaUpdate);
    });
  }

  function timeframeToMs(tf: Timeframe): number {
    const units: { [key in Timeframe]: number } = {
      '1s': 1000,
      '5s': 5000,
      '15s': 15000,
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };
    return units[tf];
  }

  function updateDelta(data: AggregatedOrderFlow) {
    if (!deltaSeries) return;
    
    const deltaUpdate: HistogramData = {
      time: data.timeBucket / 1000 as any,
      value: data.delta,
      color: data.delta >= 0 ? '#22c55e80' : '#ef444480'
    };
    
    deltaSeries.update(deltaUpdate);
  }

  export function addOrderFlowOverlay(data: AggregatedOrderFlow) {
    updateDelta(data);
  }
</script>

<div class="chart-container">
  <div class="chart-header">
    <div class="symbol-info">
      <span class="symbol">{symbol}</span>
      <span class="timeframe">{timeframe.toUpperCase()}</span>
    </div>
    <div class="chart-stats">
      <div class="stat">
        <span class="label">O</span>
        <span class="value">{klinesData.length > 0 ? klinesData[klinesData.length - 1]?.open.toFixed(2) : '--'}</span>
      </div>
      <div class="stat">
        <span class="label">H</span>
        <span class="value">{klinesData.length > 0 ? klinesData[klinesData.length - 1]?.high.toFixed(2) : '--'}</span>
      </div>
      <div class="stat">
        <span class="label">L</span>
        <span class="value">{klinesData.length > 0 ? klinesData[klinesData.length - 1]?.low.toFixed(2) : '--'}</span>
      </div>
      <div class="stat">
        <span class="label">C</span>
        <span class="value close">
          {klinesData.length > 0 ? klinesData[klinesData.length - 1]?.close.toFixed(2) : '--'}
        </span>
      </div>
    </div>
  </div>
  <div bind:this={chartContainer} class="chart-body"></div>
</div>

<style>
  .chart-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0a0e1a;
    border-radius: 8px;
    overflow: hidden;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #111827;
    border-bottom: 1px solid #1f2937;
  }

  .symbol-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .symbol {
    font-size: 18px;
    font-weight: 600;
    color: #f3f4f6;
  }

  .timeframe {
    padding: 4px 8px;
    background: #374151;
    border-radius: 4px;
    font-size: 12px;
    color: #9ca3af;
  }

  .chart-stats {
    display: flex;
    gap: 24px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .value {
    font-size: 14px;
    font-weight: 500;
    color: #d1d5db;
    font-variant-numeric: tabular-nums;
  }

  .value.close {
    color: #22c55e;
  }

  .chart-body {
    flex: 1;
    min-height: 0;
  }
</style>
