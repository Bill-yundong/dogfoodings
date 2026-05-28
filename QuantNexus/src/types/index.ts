export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  midPrice: number;
  spread: number;
  imbalance: number;
}

export interface OrderFlowEntry {
  id: string;
  symbol: string;
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'liquidation';
  tradeId?: string;
  delta: number;
}

export interface AggregatedOrderFlow {
  timeBucket: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  buyOrders: number;
  sellOrders: number;
  liquidations: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  vwap: number;
}

export interface MarketDepthAnalysis {
  symbol: string;
  timestamp: number;
  bidDepth: number;
  askDepth: number;
  cumulativeVolume: {
    bid: { [key: number]: number };
    ask: { [key: number]: number };
  };
  supportLevels: number[];
  resistanceLevels: number[];
  liquidityRatio: number;
}

export interface LiquidationPressure {
  symbol: string;
  timestamp: number;
  totalLongLiq: number;
  totalShortLiq: number;
  estimatedLiqPrice: {
    long: number[];
    short: number[];
  };
  pressureIndex: number;
  fundingRate: number;
  openInterest: number;
}

export interface TradingSignal {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'long' | 'short' | 'close';
  strength: number;
  confidence: number;
  reason: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export interface RiskParameter {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxLeverage: number;
  positionMarginRatio: number;
  stopLossDistance: number;
  takeProfitRatio: number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  type: 'mean_reversion' | 'trend_following' | 'arbitrage' | 'order_flow';
  enabled: boolean;
  parameters: { [key: string]: number };
  riskParams: RiskParameter;
}

export interface SystemStatus {
  timestamp: number;
  latency: number;
  dataConsistency: number;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: number;
  pendingOperations: number;
  databaseSize: number;
}

export type Timeframe = '1s' | '5s' | '15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface DataSyncEvent {
  type: 'kline' | 'orderbook' | 'orderflow' | 'liquidation';
  symbol: string;
  timeframe?: Timeframe;
  count: number;
  duration: number;
  timestamp: number;
}
