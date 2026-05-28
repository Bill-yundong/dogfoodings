import type { KlineData, OrderBook, OrderBookEntry, OrderFlowEntry } from '../types';

export function createMockKline(overrides: Partial<KlineData> = {}): KlineData {
  const now = Date.now();
  return {
    time: Math.floor(now / 1000) * 1000,
    open: 67500,
    high: 67600,
    low: 67400,
    close: 67550,
    volume: 1000,
    quoteVolume: 67500000,
    ...overrides
  };
}

export function createMockOrderBook(overrides: Partial<OrderBook> = {}): OrderBook {
  const basePrice = 67500;
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  for (let i = 0; i < 20; i++) {
    const bidPrice = basePrice * (1 - 0.0001 * (i + 1));
    const askPrice = basePrice * (1 + 0.0001 * (i + 1));
    const bidQty = 0.5 + Math.random() * 5;
    const askQty = 0.5 + Math.random() * 5;

    bids.push({
      price: Math.round(bidPrice * 100) / 100,
      quantity: bidQty,
      total: bidPrice * bidQty
    });
    asks.push({
      price: Math.round(askPrice * 100) / 100,
      quantity: askQty,
      total: askPrice * askQty
    });
  }

  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  const midPrice = (bids[0].price + asks[0].price) / 2;
  const spread = asks[0].price - bids[0].price;
  const bidVolume = bids.slice(0, 10).reduce((sum, b) => sum + b.total, 0);
  const askVolume = asks.slice(0, 10).reduce((sum, a) => sum + a.total, 0);
  const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);

  return {
    symbol: 'BTCUSDT',
    timestamp: Date.now(),
    bids,
    asks,
    midPrice,
    spread,
    imbalance,
    ...overrides
  };
}

export function createMockOrderFlowEntry(overrides: Partial<OrderFlowEntry> = {}): OrderFlowEntry {
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const quantity = 0.01 + Math.random() * 2;
  const price = 67500 + (Math.random() - 0.5) * 100;

  return {
    id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: 'BTCUSDT',
    timestamp: Date.now(),
    price: Math.round(price * 100) / 100,
    quantity,
    side,
    type: 'market',
    delta: side === 'buy' ? quantity : -quantity,
    ...overrides
  };
}

export function createMockKlineSeries(count: number, startPrice = 67500): KlineData[] {
  const klines: KlineData[] = [];
  let currentPrice = startPrice;
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const volatility = 0.001;
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.0005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0005);
    const volume = 500 + Math.random() * 1000;

    klines.push({
      time: Math.floor((now - i * 1000) / 1000) * 1000,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume * 100) / 100,
      quoteVolume: Math.round(volume * (open + close) / 2 * 100) / 100
    });

    currentPrice = close;
  }

  return klines;
}

export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
