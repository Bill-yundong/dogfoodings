import type { KlineData, OrderBook, OrderBookEntry, OrderFlowEntry, Timeframe } from '../types';
import { dbStore } from '../storage/IndexedDBStore';

export interface WebSocketConfig {
  symbol: string;
  endpoints: {
    kline: string;
    orderbook: string;
    trades: string;
    liquidation: string;
  };
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
}

export type DataCallback<T> = (data: T) => void;

export class WebSocketClient {
  private config: WebSocketConfig;
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private pingTimers: Map<string, number> = new Map();
  private callbacks: Map<string, Set<DataCallback<any>>> = new Map();
  private isConnected: Map<string, boolean> = new Map();
  private messageQueue: Map<string, any[]> = new Map();
  private lastMessageTime: Map<string, number> = new Map();
  private simulateMode: boolean = true;
  private simulateIntervals: Map<string, number> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      symbol: 'BTCUSDT',
      endpoints: {
        kline: 'wss://stream.binance.com:9443/ws/btcusdt@kline_1s',
        orderbook: 'wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms',
        trades: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
        liquidation: 'wss://stream.binance.com:9443/ws/btcusdt@forceOrder'
      },
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      ...config
    };
  }

  connect(type: 'kline' | 'orderbook' | 'trades' | 'liquidation'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.simulateMode) {
        this.startSimulation(type);
        resolve();
        return;
      }

      const url = this.config.endpoints[type];
      const existingConn = this.connections.get(type);
      
      if (existingConn && existingConn.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        const ws = new WebSocket(url);
        this.connections.set(type, ws);

        ws.onopen = () => {
          console.log(`[WebSocket] ${type} 连接已建立`);
          this.isConnected.set(type, true);
          this.reconnectAttempts.set(type, 0);
          this.startPing(type);
          this.flushMessageQueue(type);
          resolve();
        };

        ws.onmessage = (event) => {
          this.lastMessageTime.set(type, Date.now());
          this.handleMessage(type, event.data);
        };

        ws.onerror = (error) => {
          console.error(`[WebSocket] ${type} 连接错误:`, error);
          reject(error);
        };

        ws.onclose = () => {
          console.log(`[WebSocket] ${type} 连接已关闭`);
          this.isConnected.set(type, false);
          this.stopPing(type);
          this.scheduleReconnect(type);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  connectAll(): Promise<void[]> {
    return Promise.all([
      this.connect('kline'),
      this.connect('orderbook'),
      this.connect('trades'),
      this.connect('liquidation')
    ]);
  }

  disconnect(type: 'kline' | 'orderbook' | 'trades' | 'liquidation'): void {
    const ws = this.connections.get(type);
    if (ws) {
      ws.close();
      this.connections.delete(type);
    }
    
    const simulateInterval = this.simulateIntervals.get(type);
    if (simulateInterval) {
      clearInterval(simulateInterval);
      this.simulateIntervals.delete(type);
    }
    
    this.isConnected.set(type, false);
    this.stopPing(type);
  }

  disconnectAll(): void {
    ['kline', 'orderbook', 'trades', 'liquidation'].forEach(type => {
      this.disconnect(type as any);
    });
  }

  on<T>(type: 'kline' | 'orderbook' | 'trades' | 'liquidation', callback: DataCallback<T>): () => void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Set());
    }
    this.callbacks.get(type)!.add(callback);
    
    return () => {
      this.callbacks.get(type)?.delete(callback);
    };
  }

  private handleMessage(type: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      const transformed = this.transformData(type, parsed);
      
      if (transformed) {
        this.emit(type, transformed);
      }
    } catch (e) {
      console.error(`[WebSocket] 解析 ${type} 消息失败:`, e);
    }
  }

  private transformData(type: string, data: any): any {
    const symbol = this.config.symbol;

    switch (type) {
      case 'kline': {
        if (data.k) {
          const k = data.k;
          return {
            symbol,
            timeframe: '1s' as Timeframe,
            kline: {
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              quoteVolume: parseFloat(k.q)
            } as KlineData
          };
        }
        break;
      }
      case 'orderbook': {
        const bids = data.bids?.map((b: any[]) => ({
          price: parseFloat(b[0]),
          quantity: parseFloat(b[1]),
          total: parseFloat(b[0]) * parseFloat(b[1])
        })) || [];
        
        const asks = data.asks?.map((a: any[]) => ({
          price: parseFloat(a[0]),
          quantity: parseFloat(a[1]),
          total: parseFloat(a[0]) * parseFloat(a[1])
        })) || [];

        if (bids.length > 0 && asks.length > 0) {
          const midPrice = (bids[0].price + asks[0].price) / 2;
          const spread = asks[0].price - bids[0].price;
          
          const bidVolume = bids.slice(0, 10).reduce((sum: number, b: OrderBookEntry) => sum + b.total, 0);
          const askVolume = asks.slice(0, 10).reduce((sum: number, a: OrderBookEntry) => sum + a.total, 0);
          const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);

          return {
            symbol,
            timestamp: data.T || Date.now(),
            bids,
            asks,
            midPrice,
            spread,
            imbalance
          } as OrderBook;
        }
        break;
      }
      case 'trades': {
        const side = data.m ? 'sell' : 'buy';
        const quantity = parseFloat(data.q);
        const price = parseFloat(data.p);
        
        return {
          id: `trade_${data.T}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          timestamp: data.T,
          price,
          quantity,
          side,
          type: 'market' as const,
          tradeId: data.t.toString(),
          delta: side === 'buy' ? quantity : -quantity
        } as OrderFlowEntry;
      }
      case 'liquidation': {
        const order = data.o;
        if (order) {
          const side = order.S === 'BUY' ? 'buy' : 'sell';
          const quantity = parseFloat(order.q);
          const price = parseFloat(order.p);
          
          return {
            id: `liq_${data.T}_${Math.random().toString(36).substr(2, 9)}`,
            symbol,
            timestamp: data.T,
            price,
            quantity,
            side,
            type: 'liquidation' as const,
            delta: side === 'buy' ? quantity : -quantity
          } as OrderFlowEntry;
        }
        break;
      }
    }
    return null;
  }

  private emit(type: string, data: any): void {
    const callbacks = this.callbacks.get(type);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[WebSocket] ${type} 回调错误:`, e);
        }
      });
    }
  }

  private startPing(type: string): void {
    this.stopPing(type);
    const timer = window.setInterval(() => {
      const ws = this.connections.get(type);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ pong: Date.now() }));
        } catch (e) {
          console.debug(`[WebSocket] ${type} ping failed`);
        }
      }
    }, this.config.pingInterval);
    this.pingTimers.set(type, timer);
  }

  private stopPing(type: string): void {
    const timer = this.pingTimers.get(type);
    if (timer) {
      clearInterval(timer);
      this.pingTimers.delete(type);
    }
  }

  private scheduleReconnect(type: string): void {
    const attempts = this.reconnectAttempts.get(type) || 0;
    if (attempts >= this.config.maxReconnectAttempts) {
      console.error(`[WebSocket] ${type} 达到最大重连次数 ${attempts}`);
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, attempts);
    console.log(`[WebSocket] ${type} 将在 ${delay}ms 后重连 (${attempts + 1}/${this.config.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnectAttempts.set(type, attempts + 1);
      this.connect(type as any).catch(e => {
        console.error(`[WebSocket] ${type} 重连失败:`, e);
      });
    }, delay);
  }

  private flushMessageQueue(type: string): void {
    const queue = this.messageQueue.get(type) || [];
    queue.forEach(msg => this.handleMessage(type, msg));
    this.messageQueue.delete(type);
  }

  getConnectionStatus(type: string): boolean {
    return this.isConnected.get(type) || false;
  }

  getLatency(type: string): number {
    const isConnected = this.isConnected.get(type);
    if (!isConnected) return -1;
    const lastMsg = this.lastMessageTime.get(type);
    return lastMsg ? Date.now() - lastMsg : -1;
  }

  setSimulateMode(enabled: boolean): void {
    this.simulateMode = enabled;
    if (enabled) {
      this.disconnectAll();
    }
  }

  private startSimulation(type: string): void {
    const symbol = this.config.symbol;
    let basePrice = 67500 + Math.random() * 5000;
    let lastVolume = 1000;

    this.isConnected.set(type, true);
    this.lastMessageTime.set(type, Date.now());

    const interval = window.setInterval(async () => {
      if (!this.isConnected.get(type)) {
        clearInterval(interval);
        return;
      }
      
      const now = Date.now();
      this.lastMessageTime.set(type, now);
      
      switch (type) {
        case 'kline': {
          const volatility = 0.001;
          const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
          const open = basePrice;
          const close = basePrice + change;
          const high = Math.max(open, close) * (1 + Math.random() * 0.0005);
          const low = Math.min(open, close) * (1 - Math.random() * 0.0005);
          const volume = lastVolume * (0.8 + Math.random() * 0.4);
          
          const timeframe = '1s' as Timeframe;
          const kline: KlineData = {
            time: Math.floor(now / 1000) * 1000,
            open,
            high,
            low,
            close,
            volume,
            quoteVolume: volume * (open + close) / 2
          };
          
          basePrice = close;
          lastVolume = volume;
          
          await dbStore.updateKlineIncremental(symbol, timeframe, kline);
          this.emit('kline', { symbol, timeframe, kline });
          break;
        }
        case 'orderbook': {
          const bids = [];
          const asks = [];
          
          for (let i = 0; i < 20; i++) {
            const bidPrice = basePrice * (1 - 0.0001 * (i + 1)) * (0.9999 + Math.random() * 0.0002);
            const askPrice = basePrice * (1 + 0.0001 * (i + 1)) * (0.9999 + Math.random() * 0.0002);
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
          const bidVolume = bids.slice(0, 10).reduce((sum: number, b: OrderBookEntry) => sum + b.total, 0);
          const askVolume = asks.slice(0, 10).reduce((sum: number, a: OrderBookEntry) => sum + a.total, 0);
          const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);
          
          const orderBook: OrderBook = {
            symbol,
            timestamp: now,
            bids,
            asks,
            midPrice,
            spread,
            imbalance
          };
          
          await dbStore.insertOrderBook(orderBook);
          this.emit('orderbook', orderBook);
          break;
        }
        case 'trades': {
          const numTrades = Math.floor(Math.random() * 5) + 1;
          
          for (let i = 0; i < numTrades; i++) {
            const side = Math.random() > 0.5 ? 'buy' : 'sell';
            const price = basePrice * (1 + (Math.random() - 0.5) * 0.001);
            const quantity = 0.01 + Math.random() * 2;
            
            const trade: OrderFlowEntry = {
              id: `trade_${now}_${i}_${Math.random().toString(36).substr(2, 6)}`,
              symbol,
              timestamp: now + i,
              price: Math.round(price * 100) / 100,
              quantity,
              side,
              type: 'market',
              delta: side === 'buy' ? quantity : -quantity
            };
            
            await dbStore.insertOrderFlow(trade);
            this.emit('trades', trade);
          }
          break;
        }
        case 'liquidation': {
          if (Math.random() < 0.05) {
            const side = Math.random() > 0.5 ? 'buy' : 'sell';
            const price = basePrice * (1 + (side === 'buy' ? -0.01 : 0.01) * Math.random());
            const quantity = 1 + Math.random() * 10;
            
            const liq: OrderFlowEntry = {
              id: `liq_${now}_${Math.random().toString(36).substr(2, 9)}`,
              symbol,
              timestamp: now,
              price: Math.round(price * 100) / 100,
              quantity,
              side,
              type: 'liquidation',
              delta: side === 'buy' ? quantity : -quantity
            };
            
            await dbStore.insertOrderFlow(liq);
            this.emit('liquidation', liq);
          }
          break;
        }
      }
      
      this.isConnected.set(type, true);
      this.lastMessageTime.set(type, now);
    }, type === 'kline' ? 1000 : type === 'orderbook' ? 100 : type === 'trades' ? 200 : 1000);

    this.simulateIntervals.set(type, interval);
  }

  setSymbol(symbol: string): void {
    this.config.symbol = symbol;
    if (this.simulateMode) {
      this.disconnectAll();
      ['kline', 'orderbook', 'trades', 'liquidation'].forEach(type => {
        this.startSimulation(type as any);
      });
    }
  }
}

export const wsClient = new WebSocketClient();
